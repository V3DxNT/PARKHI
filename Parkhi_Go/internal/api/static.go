package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"yukti/backend/internal/config"
	"yukti/backend/pkg/logger"
)

func NewStaticHandler(cfg *config.Config) http.Handler {
	// Ensure standard static directories exist
	_ = os.MkdirAll(filepath.Join(cfg.StorageDir, "previews"), 0755)
	_ = os.MkdirAll(filepath.Join(cfg.StorageDir, "geotiffs"), 0755)
	_ = os.MkdirAll(filepath.Join(cfg.StorageDir, "overlays"), 0755)
	_ = os.MkdirAll(filepath.Join(cfg.StorageDir, "reports"), 0755)

	fileServer := http.FileServer(http.Dir(cfg.StorageDir))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Strip /static prefix
		trimmed := strings.TrimPrefix(r.URL.Path, "/static")
		if trimmed == "" || trimmed == "/" {
			http.NotFound(w, r)
			return
		}

		logger.Info("Serving static file: %s from storage", trimmed)
		r.URL.Path = trimmed
		fileServer.ServeHTTP(w, r)
	})
}
