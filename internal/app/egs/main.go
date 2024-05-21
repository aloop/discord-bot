package egs

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/aloop/discord-bot/database"
	"github.com/aloop/discord-bot/internal/pkg/config"
)

var httpClient = &http.Client{Timeout: 30 * time.Second}

type freeGames []*freeGame

type freeGame struct {
	Title         string      `json:"title"`
	Description   string      `json:"description"`
	StoreID       string      `json:"id"`
	Price         price       `json:"price"`
	UrlSlug       string      `json:"urlSlug"`
	ProductSlug   string      `json:"productSlug"`
	Images        []image     `json:"keyImages"`
	CatalogNs     catalogs    `json:"catalogNs"`
	OfferType     string      `json:"offerType"`
	OfferMappings []pageMap   `json:"offerMappings"`
	Promotions    promotional `json:"promotions"`
	startTime     time.Time
	endTime       time.Time
}

type catalogs struct {
	Mappings []pageMap `json:"mappings"`
}

type pageMap struct {
	PageSlug string `json:"pageSlug"`
	PageType string `json:"pageType"`
}

type promotional struct {
	PromotionalOffers []promotions `json:"promotionalOffers"`
}

type promotions struct {
	PromotionalOffers []promotion `json:"promotionalOffers"`
}

type promotion struct {
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
}

type price struct {
	Total totalPrice `json:"totalPrice"`
}

type totalPrice struct {
	DiscountPrice int `json:"discountPrice"`
}

type image struct {
	Type string `json:"type"`
	Url  string `json:"url"`
}

type FreeGames []*FreeGame

type FreeGame struct {
	Title        string
	Description  string
	URL          string
	ThumbnailURL string
	Starts       time.Time
	Ends         time.Time
}

type freeGameAPIResponse struct {
	Data struct {
		Catalog struct {
			SearchStore struct {
				Elements freeGames `json:"elements"`
			} `json:"searchStore"`
		} `json:"Catalog"`
	}
}

type EGSClient struct {
	config *config.Config
	db     *database.Queries
}

func New(
	config *config.Config,
	db *database.Queries,
) *EGSClient {
	return &EGSClient{
		config: config,
		db:     db,
	}
}

func (egs *EGSClient) StartFreeGamesFetchInterval(
	ctx context.Context,
	discord *discordgo.Session,
	channel string,
	period time.Duration,
) {
	ticker := time.NewTicker(period)

	go func() {
		for {
			select {
			case <-ticker.C:
				log.Println("EGS Free Games: Attempting to fetch latest free games")
				newGames, err := egs.FetchNewFreeGames()
				if err != nil {
					log.Println(err)
				}

				if len(newGames) > 0 {
					embeds := createDiscordMessageEmbeds(newGames)
					_, err := discord.ChannelMessageSendEmbeds(
						channel,
						embeds,
					)
					if err != nil {
						log.Println(err)
					}
				}
			case <-ctx.Done():
				ticker.Stop()
				log.Println("EGS Free Games: stopping fetch interval")
				return
			}
		}
	}()
}

func createDiscordMessageEmbeds(games FreeGames) []*discordgo.MessageEmbed {
	embeds := make([]*discordgo.MessageEmbed, 0, len(games))
	for _, game := range games {
		newEmbed := &discordgo.MessageEmbed{
			Title: game.Title,
			URL:   game.URL,
			Fields: []*discordgo.MessageEmbedField{
				{
					Name:  "Free at",
					Value: "Epic Games Store",
				},
				{
					Name:  "Description",
					Value: game.Description,
				},
				{
					Name:  "Free Until",
					Value: game.Ends.Local().Format("Monday, January 02, 2006 at 03:04PM MST"),
				},
			},
		}

		if game.ThumbnailURL != "" {
			newEmbed.Image = &discordgo.MessageEmbedImage{
				URL: game.ThumbnailURL,
			}
		}

		embeds = append(embeds, newEmbed)
	}

	return embeds
}

func (egs *EGSClient) FetchNewFreeGames() (FreeGames, error) {
	res, err := httpClient.Get(egs.config.EpicGamesStore.FreeGamesApiUrl)
	if err != nil {
		return nil,
			fmt.Errorf(
				"failed to fetch latest free games from the Epic Games Store API:\n%v",
				err,
			)
	}

	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode > 299 {
		return nil,
			fmt.Errorf(
				"failed to fetch latest free games from the Epic Games Store API - API returned Status: %s",
				res.Status,
			)
	}

	var result freeGameAPIResponse

	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil,
			fmt.Errorf("EGS API: Failed to parse json response:\n%+v", err)
	}

	newFreeGames := selectCurrentFreeGames(result.Data.Catalog.SearchStore.Elements)

	formattedFreeGames := make(FreeGames, 0, len(newFreeGames))

	currentFreeGames, err := egs.db.GetCurrentFreeGames(context.Background())
	if err != nil {
		log.Printf("EGS Free Games: Failed to fetch current free games from DB")
	}

OUTER:
	for _, game := range newFreeGames {
		for _, currentGame := range currentFreeGames {
			if currentGame.StoreID == game.StoreID && currentGame.Title == game.Title {
				continue OUTER
			}
		}

		gameUrl, err := url.JoinPath(egs.config.EpicGamesStore.ProductBaseUrl, game.getUrl())
		if err != nil {
			log.Printf("EGS Free Games: Failed to create url for game")
		}

		formattedGame := &FreeGame{
			Title:        game.Title,
			Description:  game.Description,
			Starts:       game.startTime,
			Ends:         game.endTime,
			URL:          gameUrl,
			ThumbnailURL: game.getThumbnail(),
		}
		formattedFreeGames = append(formattedFreeGames, formattedGame)

		// Store new free games in the database
		_, err = egs.db.AddFreeGame(context.Background(), database.AddFreeGameParams{
			Title:        game.Title,
			Description:  game.Description,
			StartDate:    pgtype.Timestamptz{Time: game.startTime, Valid: true},
			EndDate:      pgtype.Timestamptz{Time: game.endTime, Valid: true},
			Url:          gameUrl,
			ThumbnailUrl: formattedGame.ThumbnailURL,
			StoreID:      game.StoreID,
		})
		if err != nil {
			log.Printf("EGS Free Games: Failed to add free game to DB\n%+v", err)
		}
	}

	return formattedFreeGames, nil
}

func (g *freeGame) catalog(key string) string {
	for _, mapping := range g.CatalogNs.Mappings {
		if mapping.PageType == key {
			return mapping.PageSlug
		}
	}

	return ""
}

func (g *freeGame) setDates() {
	now := time.Now()
	for _, offers := range g.Promotions.PromotionalOffers {
		for _, offer := range offers.PromotionalOffers {
			if offer.StartDate.Before(now) && offer.EndDate.After(now) {
				g.startTime = offer.StartDate
				g.endTime = offer.EndDate
			}
		}
	}
}

func (g *freeGame) hasCurrentPromotion() bool {
	now := time.Now()
	return g.startTime.Before(now) && g.endTime.After(now)
}

func (game *freeGame) getUrl() string {
	slug := game.UrlSlug

	if str := game.catalog("productHome"); str != "" {
		slug = str
	} else if game.ProductSlug != "" {
		slug = game.ProductSlug
	}

	if index := strings.IndexByte(slug, '/'); index != -1 {
		slug = slug[:index]
	}

	return slug
}

func (game *freeGame) getThumbnail() string {
	url := ""
	for _, img := range game.Images {
		switch strings.ToLower(img.Type) {
		case "thumbnail":
			// Prefer thumbnail if available, so return immediately when found
			return img.Url
		case "offerimagewide":
			url = img.Url
		}
	}
	return url
}

func selectCurrentFreeGames(games freeGames) freeGames {
	filteredGames := make(freeGames, 0)

	for _, game := range games {
		game.setDates()
		if game.Price.Total.DiscountPrice <= 0 && game.hasCurrentPromotion() {
			filteredGames = append(filteredGames, game)
		}
	}

	return filteredGames
}
