package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
)

type Config struct {
	HTTP           HTTPConfig           `json:"http"`
	Blizzard       BlizzardConfig       `json:"blizzard"`
	EpicGamesStore EpicGamesStoreConfig `json:"epicGamesStore"`
}

type HTTPConfig struct {
	Host       string `json:"host"`
	ListenHost string `json:"listenHost"`
	ListenPort int    `json:"listenPort"`
}

type BlizzardConfig struct {
	AuthTokenUrl  string `json:"authTokenUrl"`
	TokenPriceUrl string `json:"tokenPriceUrl"`
}

type EpicGamesStoreConfig struct {
	ProductBaseUrl  string `json:"productBaseUrl"`
	FreeGamesApiUrl string `json:"freeGamesApiUrl"`
}

func New(path string) *Config {
	config := &Config{
		HTTP: HTTPConfig{
			Host:       "http://localhost",
			ListenHost: "127.0.0.1",
			ListenPort: 5000,
		},
		Blizzard: BlizzardConfig{
			AuthTokenUrl:  "https://us.battle.net/oauth/token?grant_type=client_credentials",
			TokenPriceUrl: "https://us.api.blizzard.com/data/wow/token/index?namespace=dynamic-us",
		},
		EpicGamesStore: EpicGamesStoreConfig{
			ProductBaseUrl:  "https://www.epicgames.com/store/en-US/product/",
			FreeGamesApiUrl: "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US",
		},
	}

	config.Load(path)
	config.ValidateConfig()

	return config
}

func (config *Config) Load(path string) {
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

	if err := json.Unmarshal(contents, &config); err != nil {
		log.Fatalf("Error loading config file \"%s\"\n\nError:\n%v", path, err)
	}
}

func (config *Config) ValidateConfig() {
	if config.HTTP.Host == "" {
		log.Fatal("Config: HTTP host not set! Exiting...")
	}

	if config.HTTP.ListenHost == "" {
		log.Fatal("Config: HTTP listen host not set! Exiting...")
	}

	if config.HTTP.ListenPort == 0 {
		log.Fatal("Config: HTTP listen port not set! Exiting...")
	}

	if config.Blizzard.AuthTokenUrl == "" {
		log.Fatal("Config: Blizzard auth token url not set! Exiting...")
	}

	if config.Blizzard.TokenPriceUrl == "" {
		log.Fatal("Config: Blizzard token price url not set! Exiting...")
	}

	if config.EpicGamesStore.ProductBaseUrl == "" {
		log.Fatal("Config: Epic Games Store product base url not set! Exiting...")
	}

	if config.EpicGamesStore.FreeGamesApiUrl == "" {
		log.Fatal("Config: Epic Games Store free games api url not set! Exiting...")
	}
}
