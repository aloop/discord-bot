package main

import (
	"context"
	"log"
	"os"

	bot "github.com/aloop/discord-bot/internal/app/discordbot"
)

func main() {
	ctx := context.Background()

	wd, err := os.Getwd()
	if err != nil {
		log.Printf("Could not determine working directory \"%v\"", err)
	}

	if err := bot.Run(ctx, os.Stdout, os.Getenv, wd, os.Args); err != nil {
		log.Fatalf("%s\n", err)
	}
}
