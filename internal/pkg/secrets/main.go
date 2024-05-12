package secrets

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
)

type Secrets struct {
	Discord  DiscordSecrets  `json:"discord"`
	Channels ChannelsSecrets `json:"channels"`
	Blizzard BlizzardSecrets `json:"blizzard"`
	Database DatabaseSecrets `json:"database"`
}

type DiscordSecrets struct {
	ClientID string `json:"clientId"`
	GuildID  string `json:"guildId"`
	Token    string `json:"token"`
}

type ChannelsSecrets struct {
	Deals string `json:"deals"`
}

type BlizzardSecrets struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
}

type DatabaseSecrets struct {
	ConnectionString string `json:"connectionString"`
}

func New(path string) *Secrets {
	secrets := &Secrets{}
	secrets.Load(path)
	secrets.Validate()
	return secrets
}

func (secrets *Secrets) Load(path string) {
	contents, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			log.Fatal(
				fmt.Printf("The file at \"%s\" either does not exist, or could not be read", path),
			)
		} else {
			log.Fatal(err)
		}
	}

	if err := json.Unmarshal(contents, &secrets); err != nil {
		log.Fatalf("Error loading config file \"%s\"\n\nError:\n%v", path, err)
	}
}

func (secrets *Secrets) Validate() {
	if secrets.Discord.ClientID == "" {
		log.Fatal("Secrets: Discord Client ID not set! Exiting...")
	}

	if secrets.Discord.GuildID == "" {
		log.Fatal("Secrets: Discord Guild ID not set! Exiting...")
	}

	if secrets.Discord.Token == "" {
		log.Fatal("Secrets: Discord Token not set! Exiting...")
	}

	if secrets.Channels.Deals == "" {
		log.Fatal("Secrets: Deals Channel ID not set! Exiting...")
	}

	if secrets.Blizzard.ClientID == "" {
		log.Fatal("Secrets: Blizzard Client ID not set! Exiting...")
	}

	if secrets.Blizzard.ClientSecret == "" {
		log.Fatal("Secrets: Blizzard Client Secret not set! Exiting...")
	}
}
