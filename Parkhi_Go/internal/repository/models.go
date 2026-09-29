package repository

import (
	"time"
)

// AOIGeneration represents a super-resolution mapping record in PostgreSQL
type AOIGeneration struct {
	ID                     string     `json:"id"`
	JobID                  string     `json:"job_id"`
	TileID                 string     `json:"tile_id"`
	MinLat                 float64    `json:"min_lat"`
	MaxLat                 float64    `json:"max_lat"`
	MinLon                 float64    `json:"min_lon"`
	MaxLon                 float64    `json:"max_lon"`
	BandB02Path            string     `json:"band_b02_path"`
	BandB03Path            string     `json:"band_b03_path"`
	BandB04Path            string     `json:"band_b04_path"`
	BandB08Path            string     `json:"band_b08_path"`
	HighResGeoTIFFPath     string     `json:"high_res_geotiff_path"`
	PreviewImageURL        string     `json:"preview_image_url"`
	UncertaintyImageURL    string     `json:"uncertainty_image_url"`
	PSNR                   float64    `json:"psnr"`
	SSIM                   float64    `json:"ssim"`
	SAM                    float64    `json:"sam"`
	ERGAS                  float64    `json:"ergas"`
	NDVICropURL            string     `json:"ndvi_crop_url"`
	CropSummary            string     `json:"crop_summary"`
	CropLegendJSON         string     `json:"crop_legend_json"`
	UrbanURL               string     `json:"urban_url"`
	UrbanSummary           string     `json:"urban_summary"`
	UrbanLegendJSON        string     `json:"urban_legend_json"`
	DisasterURL            string     `json:"disaster_url"`
	DisasterSummary        string     `json:"disaster_summary"`
	DisasterLegendJSON     string     `json:"disaster_legend_json"`
	DisasterHistoricalDate string     `json:"disaster_historical_date"`
	Status                 string     `json:"status"`
	ErrorMessage           string     `json:"error_message"`
	GenerationDate         time.Time  `json:"generation_date"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

// JobRecord represents the execution lifecycle of an asynchronous generation/analysis job
type JobRecord struct {
	ID        string    `json:"id"`
	JobID     string    `json:"job_id"`
	TileID    string    `json:"tile_id"`
	MinLat    float64   `json:"min_lat"`
	MaxLat    float64   `json:"max_lat"`
	MinLon    float64   `json:"min_lon"`
	MaxLon    float64   `json:"max_lon"`
	Status    string    `json:"status"` // QUEUED, DOWNLOADING_S2, STREAMING_GRPC, PROCESSING_MODEL, COMPLETE, FAILED
	Progress  int       `json:"progress"`
	StepLabel string    `json:"step_label"`
	Error     string    `json:"error,omitempty"`
	Result    string    `json:"result,omitempty"` // Serialized JSON of final SR result
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Subscription represents a recurring area monitoring subscriber
type Subscription struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	MinLat          float64    `json:"min_lat"`
	MaxLat          float64    `json:"max_lat"`
	MinLon          float64    `json:"min_lon"`
	MaxLon          float64    `json:"max_lon"`
	IsActive        bool       `json:"is_active"`
	LastProcessedAt *time.Time `json:"last_processed_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}
