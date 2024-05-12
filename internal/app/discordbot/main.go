package discordbot

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bwmarrin/discordgo"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/text/message"

	"github.com/aloop/discord-bot/database"
	"github.com/aloop/discord-bot/internal/app/blizzard"
	"github.com/aloop/discord-bot/internal/app/egs"
	"github.com/aloop/discord-bot/internal/app/webserver"
	appconfig "github.com/aloop/discord-bot/internal/pkg/config"
	appsecrets "github.com/aloop/discord-bot/internal/pkg/secrets"
	"github.com/aloop/discord-bot/internal/pkg/utils"
)

type chartTimePeriod struct {
	Period int    `json:"period"`
	Unit   string `json:"unit"`
}

var (
	configFilePath  string
	secretsFilePath string

	config         *appconfig.Config
	secrets        *appsecrets.Secrets
	db             *database.Queries
	DiscordSession *discordgo.Session
	blizzardClient *blizzard.BlizzardClient
	egsClient      *egs.EGSClient

	commands = []*discordgo.ApplicationCommand{
		{
			Name:        "wowtoken",
			Description: "Displays the current WoW token price in gold",
			Options: []*discordgo.ApplicationCommandOption{
				{
					Name:        "chart",
					Description: "Define the time period used when generating the price history chart",
					Type:        discordgo.ApplicationCommandOptionString,
					Choices: []*discordgo.ApplicationCommandOptionChoice{
						{
							Name:  "24 hours",
							Value: `{"period": 24, "unit": "hours"}`,
						},
						{
							Name:  "48 hours",
							Value: `{"period": 48, "unit": "hours"}`,
						},
						{
							Name:  "10 days",
							Value: `{"period": 10, "unit": "days"}`,
						},
						{
							Name:  "30 days",
							Value: `{"period": 30, "unit": "days"}`,
						},
						{
							Name:  "3 months",
							Value: `{"period": 3, "unit": "months"}`,
						},
						{
							Name:  "6 months",
							Value: `{"period": 6, "unit": "months"}`,
						},
						{
							Name:  "9 months",
							Value: `{"period": 9, "unit": "months"}`,
						},
						{
							Name:  "12 months",
							Value: `{"period": 12, "unit": "months"}`,
						},
					},
				},
			},
		},
	}

	commandHandlers = map[string]func(s *discordgo.Session, i *discordgo.InteractionCreate){
		"wowtoken": func(s *discordgo.Session, i *discordgo.InteractionCreate) {
			options := i.ApplicationCommandData().Options

			optionMap := make(
				map[string]*discordgo.ApplicationCommandInteractionDataOption,
				len(options),
			)
			for _, opt := range options {
				optionMap[opt.Name] = opt
			}

			chartOpts := chartTimePeriod{
				Unit:   "hours",
				Period: 48,
			}

			if option, ok := optionMap["chart"]; ok {
				if err := json.Unmarshal([]byte(option.StringValue()), &chartOpts); err != nil {
					log.Printf("Failed to parse /wowtoken options: %v", err)
					// TODO: Should probably send back an error response to the user
					return
				}
			}

			p := message.NewPrinter(message.MatchLanguage("en"))

			var t time.Time
			switch chartOpts.Unit {
			case "hours":
				t = time.Now().UTC().Add(time.Hour * time.Duration(chartOpts.Period) * -1)
			case "days":
				t = time.Now().UTC().AddDate(0, 0, chartOpts.Period*-1)
			case "months":
				t = time.Now().UTC().AddDate(0, chartOpts.Period*-1, 0)
			default:
				log.Println(`Invalid unit given, must be one of "hours", "days", or "months"`)
			}

			// Fetch a new token price if available
			_, err := blizzardClient.FetchTokenPrice()
			if err != nil {
				log.Println(err)
				return
			}

			tokenHistory, err := db.GetAllTokenPricesSince(
				context.Background(),
				pgtype.Timestamptz{Time: t, Valid: true},
			)
			if err != nil {
				log.Printf("Failed to fetch latest token price\n%v", err)
				return
			}

			var (
				lowestPrice  int64
				highestPrice int64
			)
			for i, token := range tokenHistory {
				if i == 0 {
					lowestPrice = token.Price
					highestPrice = token.Price
				}

				if token.Price < lowestPrice {
					lowestPrice = token.Price
				}

				if token.Price > highestPrice {
					highestPrice = token.Price
				}
			}

			latestToken := tokenHistory[0]

			timeSinceLastUpdate := int64(time.Now().UTC().Sub(latestToken.Updated.Time).Minutes())
			nextUpdateDelta := blizzard.WowTokenGracePeriod - timeSinceLastUpdate

			updateTimePluralStr := ""
			if nextUpdateDelta > 1 {
				updateTimePluralStr = "s"
			} else {
				nextUpdateDelta = 1
			}

			s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
				Type: discordgo.InteractionResponseChannelMessageWithSource,
				Data: &discordgo.InteractionResponseData{
					Embeds: []*discordgo.MessageEmbed{
						{
							Title: "World of Warcraft Token Price",
							Fields: []*discordgo.MessageEmbedField{
								{
									Name:  "Current Price",
									Value: p.Sprintf("🪙 **%d** gold", latestToken.Price),
								},
								{
									Name: fmt.Sprintf(
										"%d-%s High",
										chartOpts.Period,
										utils.Singularize(chartOpts.Unit),
									),
									Value:  p.Sprintf("🪙 **%d** gold", highestPrice),
									Inline: true,
								},
								{
									Name: fmt.Sprintf(
										"%d-%s Low",
										chartOpts.Period,
										utils.Singularize(chartOpts.Unit),
									),
									Value:  p.Sprintf("🪙 **%d** gold", lowestPrice),
									Inline: true,
								},
								{
									Name: "Next Update",
									Value: fmt.Sprintf(
										"In approximately **%d** minute%s",
										nextUpdateDelta,
										updateTimePluralStr,
									),
								},
							},
							Image: &discordgo.MessageEmbedImage{
								URL: fmt.Sprintf(
									"%s/wow-token/chart/%s/%d?t=%d",
									config.HTTP.Host,
									chartOpts.Unit,
									chartOpts.Period,
									latestToken.Updated.Time.UnixMilli(),
								),
							},
						},
					},
					Flags: discordgo.MessageFlagsEphemeral,
				},
			})
		},
	}
)

func Run(
	ctx context.Context,
	w io.Writer,
	getenv func(string) string,
	workdir string,
	args []string,
) error {
	ctx, cancel := signal.NotifyContext(ctx, os.Interrupt)
	defer cancel()

	// Use systemd credentials to load config & secrets if available
	basePath := getenv("CREDENTIALS_DIRECTORY")

	if basePath == "" {
		// Otherwise check the working directory instead
		basePath = workdir
	}

	defaultConfigFilePath := basePath + "/config.json"
	defaultSecretsFilePath := basePath + "/secrets.json"

	flag.StringVar(
		&configFilePath,
		"config",
		defaultConfigFilePath,
		"Path to the config file (JSON format)",
	)
	flag.StringVar(
		&secretsFilePath,
		"secrets",
		defaultSecretsFilePath,
		"Path to the secrets file (JSON format)",
	)
	dbUrl := flag.String("database-url", "", "Supply a database url")

	flag.Parse()

	config = appconfig.New(configFilePath)
	secrets = appsecrets.New(secretsFilePath)

	if *dbUrl == "" {
		dbUrl = &secrets.Database.ConnectionString
	}

	pool, err := pgxpool.New(ctx, *dbUrl)
	if err != nil {
		return err
	}
	defer pool.Close()

	db = database.New(pool)

	DiscordSession, err := discordgo.New("Bot " + secrets.Discord.Token)
	if err != nil {
		return errors.New(fmt.Sprintf("Failed to start bot: %v", err))
	}

	DiscordSession.AddHandler(func(s *discordgo.Session, r *discordgo.Ready) {
		log.Printf("Logged in as: %v#%v", s.State.User.Username, s.State.User.Discriminator)
	})

	DiscordSession.AddHandler(func(s *discordgo.Session, i *discordgo.InteractionCreate) {
		if h, ok := commandHandlers[i.ApplicationCommandData().Name]; ok {
			h(s, i)
		}
	})

	err = DiscordSession.Open()
	if err != nil {
		return errors.New(fmt.Sprintf("Cannot open the session: %v", err))
	}

	log.Println("Adding commands...")
	registeredCommands := make([]*discordgo.ApplicationCommand, len(commands))
	for i, v := range commands {
		cmd, err := DiscordSession.ApplicationCommandCreate(
			DiscordSession.State.User.ID,
			secrets.Discord.GuildID,
			v,
		)
		if err != nil {
			log.Panicf("Cannot create '%v' command: %v", v.Name, err)
		}
		registeredCommands[i] = cmd
	}

	defer DiscordSession.Close()

	// Initialize Epic Games Store API client
	egsClient = egs.New(config, db)
	// Initialize Blizzard API client
	blizzardClient = blizzard.New(ctx, config, secrets, db)

	err = webserver.Run(ctx, blizzardClient, config)
	if err != nil {
		return err
	}

	timerCtx, cancelTimers := context.WithCancel(ctx)

	blizzardClient.StartWowTokenFetchInterval(timerCtx)

	egsClient.StartFreeGamesFetchInterval(
		timerCtx,
		DiscordSession,
		secrets.Channels.Deals,
	)

	defer cancelTimers()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, os.Kill, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	log.Println("Removing commands...")

	for _, v := range registeredCommands {
		err := DiscordSession.ApplicationCommandDelete(
			DiscordSession.State.User.ID,
			secrets.Discord.GuildID,
			v.ID,
		)
		if err != nil {
			log.Panicf("Cannot delete '%v' command: %v", v.Name, err)
		}
	}

	log.Println("Gracefully shutting down.")

	return nil
}
