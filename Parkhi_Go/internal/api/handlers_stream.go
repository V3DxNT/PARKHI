package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"yukti/backend/pkg/logger"
)

func (h *APIHandler) HandleJobStream(w http.ResponseWriter, r *http.Request) {
	// Extract jobId from path: /api/jobs/{jobId}/stream
	path := strings.TrimPrefix(r.URL.Path, "/api/jobs/")
	jobID := strings.TrimSuffix(path, "/stream")
	jobID = strings.TrimSpace(jobID)

	if jobID == "" {
		http.Error(w, "Missing job ID in stream path", http.StatusBadRequest)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported by client", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Disable HTTP write deadline for long-running streaming session
	rc := http.NewResponseController(w)
	_ = rc.SetWriteDeadline(time.Time{})

	// Send initial connection header and retry advice (3 seconds)
	fmt.Fprintf(w, "retry: 3000\n: connected\n\n")
	flusher.Flush()

	logger.Info("Client subscribed to SSE stream for Job ID: %s", jobID)

	ctx := r.Context()
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	keepAliveTicker := time.NewTicker(15 * time.Second)
	defer keepAliveTicker.Stop()

	lastProgress := -1

	for {
		select {
		case <-ctx.Done():
			logger.Info("SSE client disconnected from Job ID: %s", jobID)
			return

		case <-keepAliveTicker.C:
			// Send periodic keep-alive comment (starts with colon ':') every 15s to prevent browser & proxy timeouts
			if _, err := fmt.Fprintf(w, ": keepalive\n\n"); err != nil {
				return
			}
			flusher.Flush()

		case <-ticker.C:
			job, err := h.repo.GetJob(jobID)
			if err != nil || job == nil {
				// Check if the record already exists in aoi_generations (e.g. from 15-day cache or direct completion)
				aoi, aoiErr := h.repo.GetAOIByJobID(jobID)
				if aoiErr == nil && aoi != nil && aoi.Status == "COMPLETE" {
					origURL := fmt.Sprintf("/static/previews/original_%s.png", jobID)
					origFile := filepath.Join(h.cfg.StorageDir, "previews", fmt.Sprintf("original_%s.png", jobID))
					if _, err := os.Stat(origFile); os.IsNotExist(err) {
						origURL = aoi.PreviewImageURL
					}
					resData, _ := json.Marshal(map[string]interface{}{
						"jobId":          jobID,
						"tileId":         aoi.TileID,
						"originalUrl":    origURL,
						"enhancedUrl":    aoi.PreviewImageURL,
						"uncertaintyUrl": aoi.UncertaintyImageURL,
						"bands": map[string]string{
							"B2": fmt.Sprintf("/static/previews/band_b02_%s.png", aoi.JobID),
							"B3": fmt.Sprintf("/static/previews/band_b03_%s.png", aoi.JobID),
							"B4": fmt.Sprintf("/static/previews/band_b04_%s.png", aoi.JobID),
							"B8": fmt.Sprintf("/static/previews/band_b08_%s.png", aoi.JobID),
						},
						"metrics": map[string]float64{
							"psnr":  aoi.PSNR,
							"ssim":  aoi.SSIM,
							"sam":   aoi.SAM,
							"ergas": aoi.ERGAS,
						},
						"downloadGeoTiff": fmt.Sprintf("/static/geotiffs/sr_%s.tif", aoi.JobID),
						"downloadReport":  "#",
					})
					fmt.Fprintf(w, "event: progress\ndata: {\"progress\":100,\"label\":\"Super-Resolution completed (15-day cached)\"}\n\n")
					fmt.Fprintf(w, "event: completed\ndata: %s\n\n", string(resData))
					flusher.Flush()
					return
				}
				// Job might be newly submitted or in memory
				continue
			}

			if job.Progress != lastProgress && job.Status != "COMPLETE" && job.Status != "FAILED" {
				lastProgress = job.Progress
				progressData, _ := json.Marshal(map[string]interface{}{
					"progress": job.Progress,
					"label":    job.StepLabel,
				})
				fmt.Fprintf(w, "event: progress\ndata: %s\n\n", string(progressData))
				flusher.Flush()
			}

			if job.Status == "COMPLETE" {
				// Send completed event with result payload
				if job.Result != "" {
					fmt.Fprintf(w, "event: completed\ndata: %s\n\n", job.Result)
				} else {
					// Build completed payload from aoi_generations
					aoi, _ := h.repo.GetAOIByJobID(jobID)
					var resData []byte
					if aoi != nil {
						origURL := fmt.Sprintf("/static/previews/original_%s.png", jobID)
						origFile := filepath.Join(h.cfg.StorageDir, "previews", fmt.Sprintf("original_%s.png", jobID))
						if _, err := os.Stat(origFile); os.IsNotExist(err) {
							origURL = aoi.PreviewImageURL
						}
						resData, _ = json.Marshal(map[string]interface{}{
							"jobId":          jobID,
							"tileId":         aoi.TileID,
							"originalUrl":    origURL,
							"enhancedUrl":    aoi.PreviewImageURL,
							"uncertaintyUrl": aoi.UncertaintyImageURL,
							"bands": map[string]string{
								"B2": fmt.Sprintf("/static/previews/band_b02_%s.png", aoi.JobID),
								"B3": fmt.Sprintf("/static/previews/band_b03_%s.png", aoi.JobID),
								"B4": fmt.Sprintf("/static/previews/band_b04_%s.png", aoi.JobID),
								"B8": fmt.Sprintf("/static/previews/band_b08_%s.png", aoi.JobID),
							},
							"metrics": map[string]float64{
								"psnr":  aoi.PSNR,
								"ssim":  aoi.SSIM,
								"sam":   aoi.SAM,
								"ergas": aoi.ERGAS,
							},
							"downloadGeoTiff": fmt.Sprintf("/static/geotiffs/sr_%s.tif", aoi.JobID),
							"downloadReport":  "#",
						})
					}
					fmt.Fprintf(w, "event: completed\ndata: %s\n\n", string(resData))
				}
				flusher.Flush()
				return
			}

			if job.Status == "FAILED" {
				errData, _ := json.Marshal(map[string]string{
					"error": job.Error,
				})
				fmt.Fprintf(w, "event: error\ndata: %s\n\n", string(errData))
				flusher.Flush()
				return
			}
		}
	}
}
