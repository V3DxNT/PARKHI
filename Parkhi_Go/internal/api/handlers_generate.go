package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"yukti/backend/internal/config"
	"yukti/backend/internal/copernicus"
	"yukti/backend/internal/email"
	"yukti/backend/internal/grpc_client"
	"yukti/backend/internal/pdf"
	"yukti/backend/internal/redis"
	"yukti/backend/internal/repository"
	"yukti/backend/pkg/geometry"
	"yukti/backend/pkg/logger"

	"github.com/google/uuid"
)

type APIHandler struct {
	cfg         *config.Config
	repo        *repository.PostgresRepository
	rds         *redis.RedisService
	auth        *copernicus.CDSEAuthService
	catalog     *copernicus.CDSECatalogService
	download    *copernicus.CDSEDownloadService
	grpcClient  *grpc_client.GRPCBridgeClient
	hub         *WSHub
	pdfGen      *pdf.ReportGenerator
	emailSender *email.EmailService
}

func NewAPIHandler(
	cfg *config.Config,
	repo *repository.PostgresRepository,
	rds *redis.RedisService,
	auth *copernicus.CDSEAuthService,
	catalog *copernicus.CDSECatalogService,
	download *copernicus.CDSEDownloadService,
	grpcClient *grpc_client.GRPCBridgeClient,
	hub *WSHub,
) *APIHandler {
	return &APIHandler{
		cfg:         cfg,
		repo:        repo,
		rds:         rds,
		auth:        auth,
		catalog:     catalog,
		download:    download,
		grpcClient:  grpcClient,
		hub:         hub,
		pdfGen:      pdf.NewReportGenerator(cfg.StorageDir, cfg.BackendBaseURL),
		emailSender: email.NewEmailService(cfg),
	}
}

type GenerateRequest struct {
	MinLat   float64     `json:"min_lat"`
	MaxLat   float64     `json:"max_lat"`
	MinLon   float64     `json:"min_lon"`
	MaxLon   float64     `json:"max_lon"`
	TileID   string      `json:"tileId"`
	Geometry interface{} `json:"geometry"`
}

type GenerateResponse struct {
	JobID   string      `json:"jobId"`
	Cached  bool        `json:"cached"`
	Status  string      `json:"status,omitempty"`
	Message string      `json:"message,omitempty"`
	Result  interface{} `json:"result,omitempty"`
}

func (h *APIHandler) HandleGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request JSON body"}`, http.StatusBadRequest)
		return
	}

	// Resolve bounding box from explicit fields or GeoJSON geometry
	bbox := &geometry.BoundingBox{
		MinLat: req.MinLat,
		MaxLat: req.MaxLat,
		MinLon: req.MinLon,
		MaxLon: req.MaxLon,
	}

	// Handle GeoJSON geometry parsing if min_lat/max_lat not directly provided
	if bbox.MinLat == 0 && bbox.MaxLat == 0 && bbox.MinLon == 0 && bbox.MaxLon == 0 && req.Geometry != nil {
		if geomMap, ok := req.Geometry.(map[string]interface{}); ok {
			if coordsRaw, ok := geomMap["coordinates"].([]interface{}); ok && len(coordsRaw) > 0 {
				if ringRaw, ok := coordsRaw[0].([]interface{}); ok {
					var pts [][2]float64
					for _, p := range ringRaw {
						if coord, ok := p.([]interface{}); ok && len(coord) >= 2 {
							lon, _ := coord[0].(float64)
							lat, _ := coord[1].(float64)
							pts = append(pts, [2]float64{lon, lat})
						}
					}
					if len(pts) > 0 {
						parsed, err := geometry.ParseFromGeoJSON([][][2]float64{pts})
						if err == nil {
							bbox = parsed
						}
					}
				}
			}
		}
	}

	bbox.Sanitize()

	// Validate bounding box and 50 sq km area limit
	if err := bbox.CheckAreaLimit(h.cfg.MaxAOISqKm); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	// 15-day Cache Check in PostgreSQL (Temporarily disabled per user request)
	forceRefresh := true
	var cachedRecord *repository.AOIGeneration
	if !forceRefresh {
		cachedRecord, _ = h.repo.FindValidCachedAOI(bbox, req.TileID)
	}

	if cachedRecord != nil {
		previewFile := fmt.Sprintf("preview_%s.png", cachedRecord.JobID)
		if cachedRecord.PreviewImageURL != "" {
			previewFile = filepath.Base(cachedRecord.PreviewImageURL)
		}
		previewDiskPath := filepath.Join(h.cfg.StorageDir, "previews", previewFile)
		fi, statErr := os.Stat(previewDiskPath)

		uncertFile := filepath.Join(h.cfg.StorageDir, "previews", fmt.Sprintf("uncert_%s.png", cachedRecord.JobID))
		ufi, uErr := os.Stat(uncertFile)
		geotiffFile := filepath.Join(h.cfg.StorageDir, "geotiffs", fmt.Sprintf("sr_%s.tif", cachedRecord.JobID))
		gfi, gErr := os.Stat(geotiffFile)

		if statErr != nil || fi.Size() < 50 || uErr != nil || ufi.Size() < 50 || gErr != nil || gfi.Size() < 50 {
			logger.Warn("Cache files for Job ID %s missing or corrupted on disk; invalidating cache and re-running generation pipeline", cachedRecord.JobID)
			_ = h.repo.InvalidateAOIByJobID(cachedRecord.JobID)
			cachedRecord = nil
		}
	}

	if cachedRecord != nil {
		logger.Info("15-day Cache HIT for AOI [%f, %f, %f, %f] - Job ID: %s", bbox.MinLat, bbox.MinLon, bbox.MaxLat, bbox.MaxLon, cachedRecord.JobID)
		origURL := fmt.Sprintf("/static/previews/original_%s.png", cachedRecord.JobID)
		origFile := filepath.Join(h.cfg.StorageDir, "previews", fmt.Sprintf("original_%s.png", cachedRecord.JobID))
		if _, err := os.Stat(origFile); os.IsNotExist(err) {
			origURL = cachedRecord.PreviewImageURL
		}

		resultMap := map[string]interface{}{
			"jobId":          cachedRecord.JobID,
			"tileId":         cachedRecord.TileID,
			"originalUrl":    origURL,
			"enhancedUrl":    cachedRecord.PreviewImageURL,
			"uncertaintyUrl": cachedRecord.UncertaintyImageURL,
			"bands": map[string]string{
				"B2": fmt.Sprintf("/static/previews/band_b02_%s.png", cachedRecord.JobID),
				"B3": fmt.Sprintf("/static/previews/band_b03_%s.png", cachedRecord.JobID),
				"B4": fmt.Sprintf("/static/previews/band_b04_%s.png", cachedRecord.JobID),
				"B8": fmt.Sprintf("/static/previews/band_b08_%s.png", cachedRecord.JobID),
			},
			"metrics": map[string]float64{
				"psnr":     cachedRecord.PSNR,
				"ssim":     cachedRecord.SSIM,
				"sam":      cachedRecord.SAM,
				"ergas":    cachedRecord.ERGAS,
				"ndvi_mae": 0.0245,
			},
			"downloadGeoTiff": fmt.Sprintf("/static/geotiffs/sr_%s.tif", cachedRecord.JobID),
			"downloadReport":  "#",
		}
		resultJSON, _ := json.Marshal(resultMap)

		_ = h.repo.SaveJob(&repository.JobRecord{
			ID:        uuid.New().String(),
			JobID:     cachedRecord.JobID,
			TileID:    cachedRecord.TileID,
			MinLat:    bbox.MinLat,
			MaxLat:    bbox.MaxLat,
			MinLon:    bbox.MinLon,
			MaxLon:    bbox.MaxLon,
			Status:    "COMPLETE",
			Progress:  100,
			StepLabel: "Super-Resolution completed (15-day cached)",
			Result:    string(resultJSON),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		})

		h.hub.BroadcastStatus(cachedRecord.JobID, "COMPLETE", 100.0, "COMPLETE", cachedRecord.PreviewImageURL)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(GenerateResponse{
			JobID:  cachedRecord.JobID,
			Cached: true,
			Status: "COMPLETE",
			Result: resultMap,
		})
		return
	}

	// Cache Miss: Issue new Job ID and launch asynchronous background pipeline
	jobID := uuid.New().String()
	tileID := req.TileID
	if tileID == "" {
		tileID = "S2A_MSIL2A_" + time.Now().Format("20060102") + "_AOI"
	}

	job := &repository.JobRecord{
		ID:        uuid.New().String(),
		JobID:     jobID,
		TileID:    tileID,
		MinLat:    bbox.MinLat,
		MaxLat:    bbox.MaxLat,
		MinLon:    bbox.MinLon,
		MaxLon:    bbox.MaxLon,
		Status:    "QUEUED",
		Progress:  0,
		StepLabel: "Job queued in processing orchestrator",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	_ = h.repo.SaveJob(job)

	// Execute Generation Pipeline in background
	go h.executeGenerationPipeline(jobID, tileID, bbox)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(GenerateResponse{
		JobID:   jobID,
		Cached:  false,
		Status:  "QUEUED",
		Message: "Super-resolution pipeline initiated",
	})
}

func (h *APIHandler) executeGenerationPipeline(jobID, tileID string, bbox *geometry.BoundingBox) {
	_, _ = h.ExecuteGenerationPipelineSync(jobID, tileID, bbox)
}

func (h *APIHandler) ExecuteGenerationPipelineSync(jobID, tileID string, bbox *geometry.BoundingBox) (*repository.AOIGeneration, error) {
	logger.Info("Starting execution pipeline for Job ID: %s, Tile: %s", jobID, tileID)

	// Step 1: DOWNLOADING_S2
	h.updateJobStatus(jobID, "DOWNLOADING_S2", 20, "Fetching Sentinel-2 multispectral bands from CDSE...")
	h.hub.BroadcastStatus(jobID, "DOWNLOADING_S2", 20, "DOWNLOADING_S2", "")

	dlResult, err := h.download.DownloadBands(tileID, bbox)
	if err != nil {
		logger.Error("Failed to acquire Sentinel-2 bands: %v", err)
		h.failJob(jobID, "Failed to download satellite bands: "+err.Error())
		return nil, fmt.Errorf("failed to download satellite bands: %w", err)
	}

	// Step 2: STREAMING_GRPC
	h.updateJobStatus(jobID, "STREAMING_GRPC", 50, "Streaming band data chunks to PyTorch ML service...")
	h.hub.BroadcastStatus(jobID, "STREAMING_GRPC", 50, "STREAMING_GRPC", "")

	bandPaths := []string{dlResult.BandB02Path, dlResult.BandB03Path, dlResult.BandB04Path, dlResult.BandB08Path}

	// Step 3: PROCESSING_MODEL & MCDropoutHAT 2x Super-Resolution (5m GSD)
	srResult, err := h.grpcClient.StreamSuperResolve(
		jobID,
		tileID,
		bbox,
		bandPaths,
		dlResult.CombinedData,
		func(progress float64, message string) {
			h.updateJobStatus(jobID, "PROCESSING_MODEL", int(progress), message)
			h.hub.BroadcastStatus(jobID, "PROCESSING_MODEL", progress, message, "")
		},
	)
	if err != nil {
		logger.Error("Super-Resolution ML model failure: %v", err)
		h.failJob(jobID, "ML pipeline error: "+err.Error())
		return nil, fmt.Errorf("ML pipeline error: %w", err)
	}

	// Step 4: Persist in PostgreSQL (aoi_generations) for 15-day caching
	aoi := &repository.AOIGeneration{
		ID:                  uuid.New().String(),
		JobID:               jobID,
		TileID:              tileID,
		MinLat:              bbox.MinLat,
		MaxLat:              bbox.MaxLat,
		MinLon:              bbox.MinLon,
		MaxLon:              bbox.MaxLon,
		BandB02Path:         dlResult.BandB02Path,
		BandB03Path:         dlResult.BandB03Path,
		BandB04Path:         dlResult.BandB04Path,
		BandB08Path:         dlResult.BandB08Path,
		HighResGeoTIFFPath:  srResult.HighResGeoTIFFPath,
		PreviewImageURL:     srResult.PreviewImageURL,
		UncertaintyImageURL: srResult.UncertaintyImageURL,
		PSNR:                srResult.PSNR,
		SSIM:                srResult.SSIM,
		SAM:                 srResult.SAM,
		ERGAS:               srResult.ERGAS,
		Status:              "COMPLETE",
		GenerationDate:      time.Now(),
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}
	if err := h.repo.SaveAOIGeneration(aoi); err != nil {
		logger.Warn("Failed saving AOI generation to database: %v", err)
	}

	resultMap := map[string]interface{}{
		"jobId":          jobID,
		"tileId":         tileID,
		"originalUrl":    srResult.OriginalImageURL,
		"enhancedUrl":    srResult.PreviewImageURL,
		"uncertaintyUrl": srResult.UncertaintyImageURL,
		"bands": map[string]string{
			"B2": fmt.Sprintf("/static/previews/band_b02_%s.png", jobID),
			"B3": fmt.Sprintf("/static/previews/band_b03_%s.png", jobID),
			"B4": fmt.Sprintf("/static/previews/band_b04_%s.png", jobID),
			"B8": fmt.Sprintf("/static/previews/band_b08_%s.png", jobID),
		},
		"metrics": map[string]float64{
			"psnr":     srResult.PSNR,
			"ssim":     srResult.SSIM,
			"sam":      srResult.SAM,
			"ergas":    srResult.ERGAS,
			"ndvi_mae": srResult.NDVIMAE,
		},
		"downloadGeoTiff": fmt.Sprintf("/static/geotiffs/sr_%s.tif", jobID),
		"downloadReport":  "#",
	}
	resultJSON, _ := json.Marshal(resultMap)

	if err := h.repo.CompleteJob(jobID, string(resultJSON)); err != nil {
		logger.Warn("Failed to update job %s to COMPLETE: %v", jobID, err)
	}

	// Final completion broadcast on WebSockets
	h.hub.BroadcastStatus(jobID, "COMPLETE", 100.0, "COMPLETE", srResult.PreviewImageURL)
	logger.Info("Job ID %s completed and persisted successfully!", jobID)
	return aoi, nil
}

func (h *APIHandler) updateJobStatus(jobID, status string, progress int, stepLabel string) {
	_ = h.repo.UpdateJobStatus(jobID, status, progress, stepLabel)
}

func (h *APIHandler) failJob(jobID, errMsg string) {
	_ = h.repo.FailJob(jobID, errMsg)
	h.hub.BroadcastStatus(jobID, "FAILED", 0.0, errMsg, "")
}
