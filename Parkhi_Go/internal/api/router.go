package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func NewRouter(handler *APIHandler) http.Handler {
	mux := http.NewServeMux()

	// 1. Health Check
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"UP","service":"Yukti Go Backend"}`))
	})

	// 2. Generation & Job Submissions
	mux.HandleFunc("/api/generate", handler.HandleGenerate)
	mux.HandleFunc("/api/subscribe", handler.HandleSubscribe)
	mux.HandleFunc("/api/tiles/search", handler.HandleTileSearch)
	mux.HandleFunc("/api/jobs", handler.HandleJobs)

	// 3. Downstream Analysis
	mux.HandleFunc("/api/analyze/crop", handler.HandleAnalyzeCrop)
	mux.HandleFunc("/api/analyze/urban", handler.HandleAnalyzeUrban)
	mux.HandleFunc("/api/analyze/disaster", handler.HandleAnalyzeDisaster)

	// 4. LLM Summary
	mux.HandleFunc("/api/llm/summarize", handler.HandleLLMSummarize)

	// 5. Job Sub-resources: /api/jobs/{id}/stream and /api/jobs/{id}/analyze
	mux.HandleFunc("/api/jobs/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/stream") {
			handler.HandleJobStream(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/analyze") {
			handler.HandleJobAnalyze(w, r)
			return
		}
		if r.Method == http.MethodPost && (r.URL.Path == "/api/jobs" || r.URL.Path == "/api/jobs/") {
			handler.HandleJobs(w, r)
			return
		}
		http.NotFound(w, r)
	})

	// 6. WebSockets
	mux.HandleFunc("/ws", handler.hub.HandleWS)

	// 7. Static Asset Serving (/static/previews, /previews/, /geotiffs/, etc.)
	staticH := NewStaticHandler(handler.cfg)
	mux.Handle("/static/", staticH)

	previewsDir := filepath.Join(handler.cfg.StorageDir, "previews")
	_ = os.MkdirAll(previewsDir, 0755)
	mux.Handle("/previews/", http.StripPrefix("/previews/", http.FileServer(http.Dir(previewsDir))))

	geotiffsDir := filepath.Join(handler.cfg.StorageDir, "geotiffs")
	_ = os.MkdirAll(geotiffsDir, 0755)
	mux.Handle("/geotiffs/", http.StripPrefix("/geotiffs/", http.FileServer(http.Dir(geotiffsDir))))

	// Wrap with Middleware pipeline: RateLimit -> Logging -> CORS -> Mux
	var rootHandler http.Handler = mux
	rootHandler = RateLimitMiddleware(handler.rds, rootHandler)
	rootHandler = LoggingMiddleware(rootHandler)
	rootHandler = CORSMiddleware(rootHandler)

	return rootHandler
}
