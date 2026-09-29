package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"yukti/backend/pkg/geometry"
	"yukti/backend/pkg/logger"
)

type AnalyzeRequest struct {
	JobID          string  `json:"jobId"`
	Mode           string  `json:"mode"`                     // "crop", "urban", "disaster"
	HistoricalDate string  `json:"historicalDate,omitempty"` // For disaster
	MinLat         float64 `json:"min_lat,omitempty"`
	MaxLat         float64 `json:"max_lat,omitempty"`
	MinLon         float64 `json:"min_lon,omitempty"`
	MaxLon         float64 `json:"max_lon,omitempty"`
}

type AnalysisResponse struct {
	Mode             string       `json:"mode"`
	OverlayURL       string       `json:"overlayUrl"`
	BeforeOverlayURL string       `json:"beforeOverlayUrl,omitempty"`
	BeforeDate       string       `json:"beforeDate,omitempty"`
	Legend           []LegendItem `json:"legend"`
	Summary          string       `json:"summary"`
}

type LegendItem struct {
	Label string `json:"label"`
	Color string `json:"color"`
}

func (h *APIHandler) HandleJobAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Extract jobId from path: /api/jobs/{jobId}/analyze
	path := strings.TrimPrefix(r.URL.Path, "/api/jobs/")
	jobID := strings.TrimSuffix(path, "/analyze")
	jobID = strings.TrimSpace(jobID)

	var req AnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request JSON"}`, http.StatusBadRequest)
		return
	}
	if req.JobID == "" {
		req.JobID = jobID
	}

	h.runAnalysisPipeline(w, r, &req)
}

func (h *APIHandler) HandleAnalyzeCrop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	var req AnalyzeRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	req.Mode = "crop"
	h.runAnalysisPipeline(w, r, &req)
}

func (h *APIHandler) HandleAnalyzeUrban(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	var req AnalyzeRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	req.Mode = "urban"
	h.runAnalysisPipeline(w, r, &req)
}

func (h *APIHandler) HandleAnalyzeDisaster(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	var req AnalyzeRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	req.Mode = "disaster"
	h.runAnalysisPipeline(w, r, &req)
}

func (h *APIHandler) runAnalysisPipeline(w http.ResponseWriter, r *http.Request, req *AnalyzeRequest) {
	jobID := req.JobID
	if jobID == "" {
		jobID = "job-latest"
	}

	// Retrieve GeoTIFF from Postgres
	aoi, err := h.repo.GetAOIByJobID(jobID)
	geotiffPath := ""
	bbox := &geometry.BoundingBox{MinLat: 12.9, MaxLat: 13.1, MinLon: 77.5, MaxLon: 77.7}

	if err == nil && aoi != nil {
		geotiffPath = aoi.HighResGeoTIFFPath
		bbox.MinLat = aoi.MinLat
		bbox.MaxLat = aoi.MaxLat
		bbox.MinLon = aoi.MinLon
		bbox.MaxLon = aoi.MaxLon
	}

	logger.Info("Executing %s analysis for Job ID: %s", req.Mode, jobID)

	analysisRes, err := h.grpcClient.RunAnalysis(
		jobID,
		req.Mode,
		geotiffPath,
		req.HistoricalDate,
		bbox,
		nil,
	)
	if err != nil {
		logger.Error("Analysis RPC error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Update PostgreSQL with analysis outputs
	if aoi != nil {
		legendJSON, _ := json.Marshal(analysisRes.Legend)
		switch req.Mode {
		case "crop":
			aoi.NDVICropURL = analysisRes.OverlayURL
			aoi.CropSummary = analysisRes.Summary
			aoi.CropLegendJSON = string(legendJSON)
		case "urban":
			aoi.UrbanURL = analysisRes.OverlayURL
			aoi.UrbanSummary = analysisRes.Summary
			aoi.UrbanLegendJSON = string(legendJSON)
		case "disaster":
			aoi.DisasterURL = analysisRes.OverlayURL
			aoi.DisasterSummary = analysisRes.Summary
			aoi.DisasterLegendJSON = string(legendJSON)
			aoi.DisasterHistoricalDate = req.HistoricalDate
		}
		aoi.UpdatedAt = time.Now()
		_ = h.repo.SaveAOIGeneration(aoi)
	}

	var legendOut []LegendItem
	for _, l := range analysisRes.Legend {
		legendOut = append(legendOut, LegendItem{
			Label: l.Label,
			Color: l.Color,
		})
	}

	var beforeOverlayURL string
	if req.Mode == "disaster" {
		beforeOverlayURL = fmt.Sprintf("/static/overlays/disaster_pre_%s.png", jobID)
	}

	resp := AnalysisResponse{
		Mode:             req.Mode,
		OverlayURL:       analysisRes.OverlayURL,
		BeforeOverlayURL: beforeOverlayURL,
		BeforeDate:       req.HistoricalDate,
		Summary:          analysisRes.Summary,
		Legend:           legendOut,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
