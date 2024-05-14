package webserver

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/aloop/discord-bot/internal/app/blizzard"
	"github.com/aloop/discord-bot/internal/pkg/config"
)

type handlerData struct {
	blizzard *blizzard.BlizzardClient
}

func Run(ctx context.Context, b *blizzard.BlizzardClient, c *config.Config) error {
	h := &handlerData{
		blizzard: b,
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /wow-token/chart/{unit}/{period}", h.handleChartRequest)

	log.Println("Starting HTTP server")
	go func() {
		if err := http.ListenAndServe(fmt.Sprintf("%s:%d", c.HTTP.ListenHost, c.HTTP.ListenPort), mux); err != nil {
			log.Panicf(
				"Failed to start HTTP server on %s:%d\n\n%v",
				c.HTTP.ListenHost,
				c.HTTP.ListenPort,
				err,
			)
		}
	}()

	log.Printf("HTTP server started on %s:%d", c.HTTP.ListenHost, c.HTTP.ListenPort)

	return nil
}

func (h *handlerData) handleChartRequest(w http.ResponseWriter, req *http.Request) {
	unit := req.PathValue("unit")
	periodStr := req.PathValue("period")

	period, err := strconv.ParseInt(periodStr, 10, 64)
	if err != nil {
		http.Error(w, "400 Bad Request", http.StatusBadRequest)
		return
	}

	switch unit {
	case "hours":
		if period < 1 || period > 96 {
			http.Error(w, "400 Bad Request - Must be between 1 to 96 hours", http.StatusBadRequest)
			return
		}
	case "days":
		if period < 1 || period > 90 {
			http.Error(w, "400 Bad Request - Must be between 1 to 90 days", http.StatusBadRequest)
			return
		}
	case "months":
		if period < 1 || period > 12 {
			http.Error(w, "400 Bad Request - Must be between 1 to 12 months", http.StatusBadRequest)
			return
		}
	default:
		http.NotFound(w, req)
		return
	}

	img, err := h.blizzard.GeneratePriceChart(unit, int(period))
	if err != nil {
		log.Println(err)

		w.WriteHeader(http.StatusInternalServerError)
		_, err := w.Write([]byte("500 Internal Server Error"))
		if err != nil {
			log.Printf("Failed to write HTTP error response\n%v\n", err)
		}

		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "image/png")
	_, err = img.WriteTo(w)
	if err != nil {
		log.Printf("Failed while outputting WoW token graph image\n%v\n", err)
	}
}
