package webserver

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aloop/discord-bot/internal/app/blizzard"
	"github.com/aloop/discord-bot/internal/pkg/config"
)

type handlerData struct {
	blizzard *blizzard.BlizzardClient
}

func Run(ctx context.Context, b *blizzard.BlizzardClient, c *config.Config) error {
	var (
		listener     net.Listener
		err          error
		isUnixSocket bool
		socketPath   string
	)

	h := &handlerData{
		blizzard: b,
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /wow-token/chart/{unit}/{period}", h.handleChartRequest)

	if strings.HasPrefix(c.HTTP.ListenHost, "unix:") {
		isUnixSocket = true
		socketPath = strings.TrimPrefix(c.HTTP.ListenHost, "unix:")

		listener, err = createUnixSocketListener(socketPath, c.HTTP.SocketPermissions)
		if err != nil {
			return fmt.Errorf("error creating unix socket listener: %w", err)
		}
	} else {
		addr := fmt.Sprintf("%s:%d", c.HTTP.ListenHost, c.HTTP.ListenPort)
		listener, err = net.Listen("tcp", addr)
		if err != nil {
			return fmt.Errorf("error creating tcp listener: %w", err)
		}
	}

	log.Println("Starting HTTP server")
	go func() {
		if err := http.Serve(listener, mux); err != nil {
			log.Panicf(
				"Failed to start HTTP server on %s:%d\n\n%v",
				c.HTTP.ListenHost,
				c.HTTP.ListenPort,
				err,
			)
		}
	}()

	if isUnixSocket {
		log.Printf("HTTP server started on unix socket at %s", socketPath)
	} else {
		log.Printf("HTTP server started on %s:%d", c.HTTP.ListenHost, c.HTTP.ListenPort)
	}

	return nil
}

func createUnixSocketListener(socketPath string, permissionsStr string) (net.Listener, error) {
	// Attempt to remove the socket if it already exists
	if err := os.Remove(socketPath); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("could not remove existing socket at \"%s\": %w", socketPath, err)
	}

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		return nil, fmt.Errorf(
			"could not create a listener for the unix socket at %s: %w",
			socketPath,
			err,
		)
	}

	permissions, err := strconv.ParseUint(permissionsStr, 8, 32)
	if err != nil {
		return nil, fmt.Errorf("failed to convert socketPermissions to octal uint32: %w", err)
	}

	if err := os.Chmod(socketPath, os.FileMode(permissions)); err != nil {
		return nil, fmt.Errorf("failed to set unix socket permissions: %w", err)
	}

	return listener, nil
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

	chart, lastUpdate, err := h.blizzard.GeneratePriceChart(unit, int(period))

	nextUpdate := lastUpdate.UTC().Add(time.Duration(blizzard.WowTokenGracePeriod) * time.Minute)

	if err != nil {
		log.Printf("failed to generate price chart for request: %v", err)
		http.Error(w, "500 Internal Server Error", http.StatusInternalServerError)
		return
	}

	secondsUntilUpdate := int64(time.Until(nextUpdate.UTC()).Seconds())

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Vary", "accept")
	w.Header().
		Set("Cache-Control", fmt.Sprintf("public, max-age=%d", secondsUntilUpdate))
	w.Header().Set("Last-Modified", lastUpdate.UTC().Format(http.TimeFormat))
	w.WriteHeader(http.StatusOK)
	_, err = chart.WriteTo(w)
	if err != nil {
		log.Printf("Failed while outputting WoW token graph image\n%v\n", err)
	}
}
