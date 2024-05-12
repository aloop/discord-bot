package blizzard

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/wcharczuk/go-chart/v2"
	"github.com/wcharczuk/go-chart/v2/drawing"
	"golang.org/x/text/message"

	"github.com/aloop/discord-bot/database"
	"github.com/aloop/discord-bot/internal/pkg/config"
	"github.com/aloop/discord-bot/internal/pkg/secrets"
	"github.com/aloop/discord-bot/internal/pkg/utils"
)

const (
	graphBg             string = "36393f"
	graphLineColor      string = "FFD700"
	WowTokenGracePeriod        = 20 // Minutes
)

var (
	httpClient = &http.Client{Timeout: 30 * time.Second}
	p          = message.NewPrinter(message.MatchLanguage("en"))
)

type BlizzardClient struct {
	config  *config.Config
	secrets *secrets.Secrets
	db      *database.Queries
	token   *BlizzardClientToken
	ctx     context.Context
}

type BlizzardClientToken struct {
	token     string
	expiresAt int64
}

type BlizzardAuthTokenAPIResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int64  `json:"expires_in"`
}

type WowTokenPriceAPIResponse struct {
	Updated int64 `json:"last_updated_timestamp"`
	Price   int64 `json:"price"`
}

type WowTokenPrice struct {
	Updated time.Time
	Price   int64
}

func New(
	ctx context.Context,
	config *config.Config,
	secrets *secrets.Secrets,
	db *database.Queries,
) *BlizzardClient {
	return &BlizzardClient{
		config:  config,
		secrets: secrets,
		db:      db,
		ctx:     ctx,
		token: &BlizzardClientToken{
			token:     "",
			expiresAt: 0,
		},
	}
}

func (b *BlizzardClient) fetchAuthToken() (string, error) {
	if b.token.token != "" && b.token.expiresAt > time.Now().Unix() {
		return b.token.token, nil
	}

	req, err := http.NewRequest("POST", b.config.Blizzard.AuthTokenUrl, nil)
	if err != nil {
		return "", err
	}

	basicAuthCreds := base64.StdEncoding.EncodeToString(
		[]byte(fmt.Sprintf("%s:%s", b.secrets.Blizzard.ClientID, b.secrets.Blizzard.ClientSecret)),
	)

	req.Header.Add(
		"Authorization",
		fmt.Sprintf("Basic %s", basicAuthCreds),
	)

	res, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}

	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode > 299 {
		return "", errors.New(
			fmt.Sprintf(
				"HTTP Status %s. Failed to obtain an auth token from the Blizzard API. Please verify that credentials are accurate",
				res.Status,
			),
		)
	}

	var result BlizzardAuthTokenAPIResponse
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return "", errors.New(
			fmt.Sprintf("Failed to fetch latest free games from the EGS api:\n%v", err),
		)
	}

	b.token.token = result.AccessToken
	b.token.expiresAt = time.Now().Unix() + result.ExpiresIn

	return b.token.token, nil
}

func (b *BlizzardClient) FetchTokenPrice() (WowTokenPrice, error) {
	data, err := b.db.GetLatestTokenPrice(b.ctx)
	if err != nil {
		log.Printf(
			"Failed to get latest token price from the database. Falling back to API request\n%v",
			err,
		)
	} else {
		timeSinceLastUpdate := int64(time.Now().UTC().Sub(data.Updated.Time).Minutes())

		if timeSinceLastUpdate < WowTokenGracePeriod {
			log.Println("WoW Token: we have the latest result in our database, returning it")
			return WowTokenPrice{
				Updated: data.Updated.Time,
				Price:   data.Price,
			}, nil
		}
	}

	log.Println("Fetching latest WoW token price")

	req, err := http.NewRequest("GET", b.config.Blizzard.TokenPriceUrl, nil)
	if err != nil {
		return WowTokenPrice{}, err
	}

	token, err := b.fetchAuthToken()
	if err != nil {
		return WowTokenPrice{}, err
	}

	req.Header.Add(
		"Authorization",
		fmt.Sprintf("Bearer %s", token),
	)

	res, err := httpClient.Do(req)
	if err != nil {
		return WowTokenPrice{}, err
	}

	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode > 299 {
		return WowTokenPrice{}, errors.New(
			fmt.Sprintf("HTTP error %s while attempting to fetch WoW Token price", res.Status),
		)
	}

	var result WowTokenPriceAPIResponse
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return WowTokenPrice{}, errors.New(
			fmt.Sprintf("Failed to read body while fetching WoW Token price:\n%v", err),
		)
	}

	result.Price = result.Price / 100 / 100

	resultTime := time.UnixMilli(result.Updated)

	newTokenPrice := WowTokenPrice{
		Updated: resultTime,
		Price:   result.Price,
	}

	_, err = b.db.AddTokenPrice(b.ctx, database.AddTokenPriceParams{
		Updated: pgtype.Timestamptz{
			Time:  resultTime,
			Valid: true,
		},
		Price: newTokenPrice.Price,
	})
	if err != nil {
		log.Printf("WoW Token: Failed to add new price to database\n%v", err)
	}

	log.Println("fetched latest token price, returning it")

	return newTokenPrice, nil
}

func (b *BlizzardClient) StartWowTokenFetchInterval(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)

	// Do an initial fetch before deferring to the timer
	_, err := b.FetchTokenPrice()
	if err != nil {
		log.Println(err)
	}

	go func() {
		for {
			select {
			case <-ticker.C:
				log.Println("WoW Token: Attempting to fetch latest token price")
				_, err := b.FetchTokenPrice()
				if err != nil {
					log.Println(err)
				}
			case <-ctx.Done():
				ticker.Stop()
				log.Println("WoW Token: stopping fetch interval")
				return
			}
		}
	}()
}

func (b *BlizzardClient) GeneratePriceChart(unit string, period int) (*bytes.Buffer, error) {
	var t time.Time

	dateFormatter := chart.TimeValueFormatterWithFormat("Jan 2 - 03:04PM")
	smoothing := 1

	switch unit {
	case "hours":
		t = time.Now().UTC().Add(time.Hour * time.Duration(period) * -1)
	case "days":
		t = time.Now().UTC().AddDate(0, 0, period*-1)
		dateFormatter = chart.TimeValueFormatterWithFormat("Jan 2")

		if period > 10 {
			smoothing = 64
		} else {
			smoothing = 32
		}
	case "months":
		t = time.Now().UTC().AddDate(0, period*-1, 0)
		dateFormatter = chart.TimeValueFormatterWithFormat("Jan 2, 2006")

		if period > 3 {
			smoothing = 128
		} else {
			smoothing = 64
		}
	default:
		err := errors.New(fmt.Sprintf(`Invalid unit type "%s" given`, unit))
		return bytes.NewBuffer([]byte{}), err
	}

	rows, err := b.db.GetAllTokenPricesSince(b.ctx, pgtype.Timestamptz{Time: t, Valid: true})
	if err != nil {
		err := errors.New(fmt.Sprintf("Failed to get token prices from database"))
		return bytes.NewBuffer([]byte{}), err
	}

	var dates []time.Time
	var prices []float64
	for _, token := range rows {
		dates = append(dates, token.Updated.Time)
		prices = append(prices, float64(token.Price))
	}

	if len(dates) < 2 {
		err := errors.New(fmt.Sprintf("Not enough price history to generate chart"))
		return bytes.NewBuffer([]byte{}), err
	}

	formattedUnit := unit
	if period == 1 {
		formattedUnit = utils.Singularize(unit)
	}

	title := fmt.Sprintf(
		"WoW Token Price History - Last %d %s",
		period,
		formattedUnit,
	)

	timeSeries := &chart.TimeSeries{
		Style: chart.Style{
			StrokeColor: drawing.ColorFromHex(graphLineColor),
		},
		XValues: dates,
		YValues: prices,
	}

	smoothedSeries := &chart.SMASeries{
		Style: chart.Style{
			StrokeColor: drawing.ColorFromHex(graphLineColor),
			FillColor:   drawing.ColorFromHex(graphLineColor).WithAlpha(24),
			StrokeWidth: 3.0,
		},
		InnerSeries: timeSeries,
		Period:      smoothing,
	}

	graph := chart.Chart{
		Width:  400,
		Height: 300,
		TitleStyle: chart.Style{
			FontColor: drawing.ColorWhite,
			FontSize:  10,
		},
		Canvas: chart.Style{
			FillColor: drawing.ColorFromHex(graphBg),
		},
		Background: chart.Style{
			FillColor: drawing.ColorFromHex(graphBg),
			Padding: chart.Box{
				Top:    50,
				Left:   10,
				Right:  10,
				Bottom: 25,
			},
		},
		Title: title,
		XAxis: chart.XAxis{
			Style: chart.Style{
				FontColor: drawing.ColorWhite,
			},
			ValueFormatter: dateFormatter,
		},
		YAxis: chart.YAxis{
			Style: chart.Style{
				FontColor: drawing.ColorWhite,
			},
			NameStyle: chart.Style{
				FontColor: drawing.ColorWhite.WithAlpha(78),
			},
			ValueFormatter: func(v interface{}) string {
				if val, isFloat := v.(float64); isFloat {
					return p.Sprintf("%d", int64(val))
				}

				return ""
			},
		},
		Series: []chart.Series{
			smoothedSeries,
		},
	}

	buffer := bytes.NewBuffer([]byte{})
	err = graph.Render(chart.PNG, buffer)
	if err != nil {
		log.Fatalf("Failed to render graph: %v", err)
	}

	return buffer, nil
}
