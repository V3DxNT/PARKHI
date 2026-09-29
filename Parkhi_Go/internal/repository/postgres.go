package repository

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"yukti/backend/pkg/geometry"
	"yukti/backend/pkg/logger"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(dsn string) (*PostgresRepository, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		logger.Warn("PostgreSQL ping failed (running without active DB or will retry): %v", err)
	} else {
		logger.Info("Connected to PostgreSQL successfully")
	}

	repo := &PostgresRepository{db: db}
	if err := repo.Migrate(); err != nil {
		logger.Warn("Database migration error (check if postgres is online): %v", err)
	}

	return repo, nil
}

func (r *PostgresRepository) Migrate() error {
	query := `
	CREATE TABLE IF NOT EXISTS aoi_generations (
		id TEXT PRIMARY KEY,
		job_id TEXT UNIQUE NOT NULL,
		tile_id TEXT NOT NULL,
		min_lat DOUBLE PRECISION NOT NULL,
		max_lat DOUBLE PRECISION NOT NULL,
		min_lon DOUBLE PRECISION NOT NULL,
		max_lon DOUBLE PRECISION NOT NULL,
		band_b02_path TEXT DEFAULT '',
		band_b03_path TEXT DEFAULT '',
		band_b04_path TEXT DEFAULT '',
		band_b08_path TEXT DEFAULT '',
		high_res_geotiff_path TEXT DEFAULT '',
		preview_image_url TEXT DEFAULT '',
		uncertainty_image_url TEXT DEFAULT '',
		psnr DOUBLE PRECISION DEFAULT 0,
		ssim DOUBLE PRECISION DEFAULT 0,
		sam DOUBLE PRECISION DEFAULT 0,
		ergas DOUBLE PRECISION DEFAULT 0,
		ndvi_crop_url TEXT DEFAULT '',
		crop_summary TEXT DEFAULT '',
		crop_legend_json TEXT DEFAULT '',
		urban_url TEXT DEFAULT '',
		urban_summary TEXT DEFAULT '',
		urban_legend_json TEXT DEFAULT '',
		disaster_url TEXT DEFAULT '',
		disaster_summary TEXT DEFAULT '',
		disaster_legend_json TEXT DEFAULT '',
		disaster_historical_date TEXT DEFAULT '',
		status TEXT NOT NULL DEFAULT 'PENDING',
		error_message TEXT DEFAULT '',
		generation_date TIMESTAMPTZ NOT NULL,
		created_at TIMESTAMPTZ NOT NULL,
		updated_at TIMESTAMPTZ NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_aoi_coords ON aoi_generations (min_lat, max_lat, min_lon, max_lon);
	CREATE INDEX IF NOT EXISTS idx_aoi_generation_date ON aoi_generations (generation_date);

	CREATE TABLE IF NOT EXISTS jobs (
		id TEXT PRIMARY KEY,
		job_id TEXT UNIQUE NOT NULL,
		tile_id TEXT NOT NULL,
		min_lat DOUBLE PRECISION NOT NULL,
		max_lat DOUBLE PRECISION NOT NULL,
		min_lon DOUBLE PRECISION NOT NULL,
		max_lon DOUBLE PRECISION NOT NULL,
		status TEXT NOT NULL DEFAULT 'QUEUED',
		progress INTEGER DEFAULT 0,
		step_label TEXT DEFAULT '',
		error TEXT DEFAULT '',
		result TEXT DEFAULT '',
		created_at TIMESTAMPTZ NOT NULL,
		updated_at TIMESTAMPTZ NOT NULL
	);

	CREATE TABLE IF NOT EXISTS subscriptions (
		id TEXT PRIMARY KEY,
		email TEXT NOT NULL,
		min_lat DOUBLE PRECISION NOT NULL,
		max_lat DOUBLE PRECISION NOT NULL,
		min_lon DOUBLE PRECISION NOT NULL,
		max_lon DOUBLE PRECISION NOT NULL,
		is_active BOOLEAN NOT NULL DEFAULT TRUE,
		last_processed_at TIMESTAMPTZ,
		created_at TIMESTAMPTZ NOT NULL,
		updated_at TIMESTAMPTZ NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_subscriptions_coords ON subscriptions (min_lat, max_lat, min_lon, max_lon);
	CREATE INDEX IF NOT EXISTS idx_subscriptions_due ON subscriptions (is_active, last_processed_at);
	`
	_, err := r.db.Exec(query)
	return err
}

// FindValidCachedAOI applies the 15-day invalidation rule:
// Returns the record if coordinates match (within 0.005 degree tolerance) and generation_date is < 15 days old.
func (r *PostgresRepository) FindValidCachedAOI(bbox *geometry.BoundingBox, tileID string) (*AOIGeneration, error) {
	if r.db == nil {
		return nil, sql.ErrNoRows
	}

	tolerance := 0.005 // Approx 500m coordinate tolerance for AOI snapping
	fifteenDaysAgo := time.Now().AddDate(0, 0, -15)

	var query string
	var args []interface{}

	if tileID != "" {
		query = `
			SELECT id, job_id, tile_id, min_lat, max_lat, min_lon, max_lon,
			       COALESCE(band_b02_path, ''), COALESCE(band_b03_path, ''), COALESCE(band_b04_path, ''), COALESCE(band_b08_path, ''),
			       COALESCE(high_res_geotiff_path, ''), COALESCE(preview_image_url, ''), COALESCE(uncertainty_image_url, ''),
			       COALESCE(psnr, 0), COALESCE(ssim, 0), COALESCE(sam, 0), COALESCE(ergas, 0),
			       COALESCE(ndvi_crop_url, ''), COALESCE(crop_summary, ''), COALESCE(crop_legend_json, ''),
			       COALESCE(urban_url, ''), COALESCE(urban_summary, ''), COALESCE(urban_legend_json, ''),
			       COALESCE(disaster_url, ''), COALESCE(disaster_summary, ''), COALESCE(disaster_legend_json, ''), COALESCE(disaster_historical_date, ''),
			       COALESCE(status, ''), COALESCE(error_message, ''), generation_date, created_at, updated_at
			FROM aoi_generations
			WHERE status = 'COMPLETE'
			  AND generation_date >= $1
			  AND ABS(min_lat - $2) <= $6
			  AND ABS(max_lat - $3) <= $6
			  AND ABS(min_lon - $4) <= $6
			  AND ABS(max_lon - $5) <= $6
			  AND tile_id = $7
			ORDER BY generation_date DESC
			LIMIT 1;
		`
		args = []interface{}{fifteenDaysAgo, bbox.MinLat, bbox.MaxLat, bbox.MinLon, bbox.MaxLon, tolerance, tileID}
	} else {
		query = `
			SELECT id, job_id, tile_id, min_lat, max_lat, min_lon, max_lon,
			       COALESCE(band_b02_path, ''), COALESCE(band_b03_path, ''), COALESCE(band_b04_path, ''), COALESCE(band_b08_path, ''),
			       COALESCE(high_res_geotiff_path, ''), COALESCE(preview_image_url, ''), COALESCE(uncertainty_image_url, ''),
			       COALESCE(psnr, 0), COALESCE(ssim, 0), COALESCE(sam, 0), COALESCE(ergas, 0),
			       COALESCE(ndvi_crop_url, ''), COALESCE(crop_summary, ''), COALESCE(crop_legend_json, ''),
			       COALESCE(urban_url, ''), COALESCE(urban_summary, ''), COALESCE(urban_legend_json, ''),
			       COALESCE(disaster_url, ''), COALESCE(disaster_summary, ''), COALESCE(disaster_legend_json, ''), COALESCE(disaster_historical_date, ''),
			       COALESCE(status, ''), COALESCE(error_message, ''), generation_date, created_at, updated_at
			FROM aoi_generations
			WHERE status = 'COMPLETE'
			  AND generation_date >= $1
			  AND ABS(min_lat - $2) <= $6
			  AND ABS(max_lat - $3) <= $6
			  AND ABS(min_lon - $4) <= $6
			  AND ABS(max_lon - $5) <= $6
			ORDER BY generation_date DESC
			LIMIT 1;
		`
		args = []interface{}{fifteenDaysAgo, bbox.MinLat, bbox.MaxLat, bbox.MinLon, bbox.MaxLon, tolerance}
	}

	var aoi AOIGeneration
	err := r.db.QueryRow(query, args...).Scan(
		&aoi.ID, &aoi.JobID, &aoi.TileID, &aoi.MinLat, &aoi.MaxLat, &aoi.MinLon, &aoi.MaxLon,
		&aoi.BandB02Path, &aoi.BandB03Path, &aoi.BandB04Path, &aoi.BandB08Path,
		&aoi.HighResGeoTIFFPath, &aoi.PreviewImageURL, &aoi.UncertaintyImageURL,
		&aoi.PSNR, &aoi.SSIM, &aoi.SAM, &aoi.ERGAS,
		&aoi.NDVICropURL, &aoi.CropSummary, &aoi.CropLegendJSON,
		&aoi.UrbanURL, &aoi.UrbanSummary, &aoi.UrbanLegendJSON,
		&aoi.DisasterURL, &aoi.DisasterSummary, &aoi.DisasterLegendJSON, &aoi.DisasterHistoricalDate,
		&aoi.Status, &aoi.ErrorMessage, &aoi.GenerationDate, &aoi.CreatedAt, &aoi.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &aoi, nil
}

// InvalidateExpiredAOIs cleans or flags records older than 15 days
func (r *PostgresRepository) InvalidateExpiredAOIs() error {
	if r.db == nil {
		return nil
	}
	fifteenDaysAgo := time.Now().AddDate(0, 0, -15)
	query := `DELETE FROM aoi_generations WHERE generation_date < $1`
	_, err := r.db.Exec(query, fifteenDaysAgo)
	return err
}

// InvalidateAOIByJobID removes a specific AOI cache entry when its files are missing or corrupt
func (r *PostgresRepository) InvalidateAOIByJobID(jobID string) error {
	if r.db == nil {
		return nil
	}
	query := `DELETE FROM aoi_generations WHERE job_id = $1`
	_, err := r.db.Exec(query, jobID)
	return err
}

// SaveAOIGeneration upserts an AOI record
func (r *PostgresRepository) SaveAOIGeneration(aoi *AOIGeneration) error {
	if r.db == nil {
		return nil
	}
	query := `
		INSERT INTO aoi_generations (
			id, job_id, tile_id, min_lat, max_lat, min_lon, max_lon,
			band_b02_path, band_b03_path, band_b04_path, band_b08_path,
			high_res_geotiff_path, preview_image_url, uncertainty_image_url,
			psnr, ssim, sam, ergas,
			ndvi_crop_url, crop_summary, crop_legend_json,
			urban_url, urban_summary, urban_legend_json,
			disaster_url, disaster_summary, disaster_legend_json, disaster_historical_date,
			status, error_message, generation_date, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11,
			$12, $13, $14,
			$15, $16, $17, $18,
			$19, $20, $21,
			$22, $23, $24,
			$25, $26, $27, $28,
			$29, $30, $31, $32, $33
		)
		ON CONFLICT (job_id) DO UPDATE SET
			tile_id = EXCLUDED.tile_id,
			band_b02_path = EXCLUDED.band_b02_path,
			band_b03_path = EXCLUDED.band_b03_path,
			band_b04_path = EXCLUDED.band_b04_path,
			band_b08_path = EXCLUDED.band_b08_path,
			high_res_geotiff_path = EXCLUDED.high_res_geotiff_path,
			preview_image_url = EXCLUDED.preview_image_url,
			uncertainty_image_url = EXCLUDED.uncertainty_image_url,
			psnr = EXCLUDED.psnr,
			ssim = EXCLUDED.ssim,
			sam = EXCLUDED.sam,
			ergas = EXCLUDED.ergas,
			ndvi_crop_url = EXCLUDED.ndvi_crop_url,
			crop_summary = EXCLUDED.crop_summary,
			crop_legend_json = EXCLUDED.crop_legend_json,
			urban_url = EXCLUDED.urban_url,
			urban_summary = EXCLUDED.urban_summary,
			urban_legend_json = EXCLUDED.urban_legend_json,
			disaster_url = EXCLUDED.disaster_url,
			disaster_summary = EXCLUDED.disaster_summary,
			disaster_legend_json = EXCLUDED.disaster_legend_json,
			disaster_historical_date = EXCLUDED.disaster_historical_date,
			status = EXCLUDED.status,
			error_message = EXCLUDED.error_message,
			generation_date = EXCLUDED.generation_date,
			updated_at = EXCLUDED.updated_at;
	`
	_, err := r.db.Exec(
		query,
		aoi.ID, aoi.JobID, aoi.TileID, aoi.MinLat, aoi.MaxLat, aoi.MinLon, aoi.MaxLon,
		aoi.BandB02Path, aoi.BandB03Path, aoi.BandB04Path, aoi.BandB08Path,
		aoi.HighResGeoTIFFPath, aoi.PreviewImageURL, aoi.UncertaintyImageURL,
		aoi.PSNR, aoi.SSIM, aoi.SAM, aoi.ERGAS,
		aoi.NDVICropURL, aoi.CropSummary, aoi.CropLegendJSON,
		aoi.UrbanURL, aoi.UrbanSummary, aoi.UrbanLegendJSON,
		aoi.DisasterURL, aoi.DisasterSummary, aoi.DisasterLegendJSON, aoi.DisasterHistoricalDate,
		aoi.Status, aoi.ErrorMessage, aoi.GenerationDate, aoi.CreatedAt, aoi.UpdatedAt,
	)
	return err
}

func (r *PostgresRepository) GetAOIByJobID(jobID string) (*AOIGeneration, error) {
	if r.db == nil {
		return nil, sql.ErrNoRows
	}
	query := `
		SELECT id, job_id, tile_id, min_lat, max_lat, min_lon, max_lon,
		       COALESCE(band_b02_path, ''), COALESCE(band_b03_path, ''), COALESCE(band_b04_path, ''), COALESCE(band_b08_path, ''),
		       COALESCE(high_res_geotiff_path, ''), COALESCE(preview_image_url, ''), COALESCE(uncertainty_image_url, ''),
		       COALESCE(psnr, 0), COALESCE(ssim, 0), COALESCE(sam, 0), COALESCE(ergas, 0),
		       COALESCE(ndvi_crop_url, ''), COALESCE(crop_summary, ''), COALESCE(crop_legend_json, ''),
		       COALESCE(urban_url, ''), COALESCE(urban_summary, ''), COALESCE(urban_legend_json, ''),
		       COALESCE(disaster_url, ''), COALESCE(disaster_summary, ''), COALESCE(disaster_legend_json, ''), COALESCE(disaster_historical_date, ''),
		       COALESCE(status, ''), COALESCE(error_message, ''), generation_date, created_at, updated_at
		FROM aoi_generations
		WHERE job_id = $1
		LIMIT 1;
	`
	var aoi AOIGeneration
	err := r.db.QueryRow(query, jobID).Scan(
		&aoi.ID, &aoi.JobID, &aoi.TileID, &aoi.MinLat, &aoi.MaxLat, &aoi.MinLon, &aoi.MaxLon,
		&aoi.BandB02Path, &aoi.BandB03Path, &aoi.BandB04Path, &aoi.BandB08Path,
		&aoi.HighResGeoTIFFPath, &aoi.PreviewImageURL, &aoi.UncertaintyImageURL,
		&aoi.PSNR, &aoi.SSIM, &aoi.SAM, &aoi.ERGAS,
		&aoi.NDVICropURL, &aoi.CropSummary, &aoi.CropLegendJSON,
		&aoi.UrbanURL, &aoi.UrbanSummary, &aoi.UrbanLegendJSON,
		&aoi.DisasterURL, &aoi.DisasterSummary, &aoi.DisasterLegendJSON, &aoi.DisasterHistoricalDate,
		&aoi.Status, &aoi.ErrorMessage, &aoi.GenerationDate, &aoi.CreatedAt, &aoi.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &aoi, nil
}

func (r *PostgresRepository) GetLatestCompletedAOI() (*AOIGeneration, error) {
	if r.db == nil {
		return nil, sql.ErrNoRows
	}
	query := `
		SELECT id, job_id, tile_id, min_lat, max_lat, min_lon, max_lon,
		       COALESCE(band_b02_path, ''), COALESCE(band_b03_path, ''), COALESCE(band_b04_path, ''), COALESCE(band_b08_path, ''),
		       COALESCE(high_res_geotiff_path, ''), COALESCE(preview_image_url, ''), COALESCE(uncertainty_image_url, ''),
		       COALESCE(psnr, 0), COALESCE(ssim, 0), COALESCE(sam, 0), COALESCE(ergas, 0),
		       COALESCE(ndvi_crop_url, ''), COALESCE(crop_summary, ''), COALESCE(crop_legend_json, ''),
		       COALESCE(urban_url, ''), COALESCE(urban_summary, ''), COALESCE(urban_legend_json, ''),
		       COALESCE(disaster_url, ''), COALESCE(disaster_summary, ''), COALESCE(disaster_legend_json, ''), COALESCE(disaster_historical_date, ''),
		       COALESCE(status, ''), COALESCE(error_message, ''), generation_date, created_at, updated_at
		FROM aoi_generations
		WHERE status = 'COMPLETE'
		ORDER BY generation_date DESC
		LIMIT 1;
	`
	var aoi AOIGeneration
	err := r.db.QueryRow(query).Scan(
		&aoi.ID, &aoi.JobID, &aoi.TileID, &aoi.MinLat, &aoi.MaxLat, &aoi.MinLon, &aoi.MaxLon,
		&aoi.BandB02Path, &aoi.BandB03Path, &aoi.BandB04Path, &aoi.BandB08Path,
		&aoi.HighResGeoTIFFPath, &aoi.PreviewImageURL, &aoi.UncertaintyImageURL,
		&aoi.PSNR, &aoi.SSIM, &aoi.SAM, &aoi.ERGAS,
		&aoi.NDVICropURL, &aoi.CropSummary, &aoi.CropLegendJSON,
		&aoi.UrbanURL, &aoi.UrbanSummary, &aoi.UrbanLegendJSON,
		&aoi.DisasterURL, &aoi.DisasterSummary, &aoi.DisasterLegendJSON, &aoi.DisasterHistoricalDate,
		&aoi.Status, &aoi.ErrorMessage, &aoi.GenerationDate, &aoi.CreatedAt, &aoi.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &aoi, nil
}

// SaveJob creates or updates a job status record
func (r *PostgresRepository) SaveJob(job *JobRecord) error {
	if r.db == nil {
		return nil
	}
	query := `
		INSERT INTO jobs (id, job_id, tile_id, min_lat, max_lat, min_lon, max_lon, status, progress, step_label, error, result, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT (job_id) DO UPDATE SET
			status = EXCLUDED.status,
			progress = EXCLUDED.progress,
			step_label = EXCLUDED.step_label,
			error = EXCLUDED.error,
			result = EXCLUDED.result,
			updated_at = EXCLUDED.updated_at;
	`
	_, err := r.db.Exec(query, job.ID, job.JobID, job.TileID, job.MinLat, job.MaxLat, job.MinLon, job.MaxLon, job.Status, job.Progress, job.StepLabel, job.Error, job.Result, job.CreatedAt, job.UpdatedAt)
	return err
}

// UpdateJobStatus directly updates the status, progress, and step_label for a job
func (r *PostgresRepository) UpdateJobStatus(jobID, status string, progress int, stepLabel string) error {
	if r.db == nil {
		return nil
	}
	query := `UPDATE jobs SET status = $1, progress = $2, step_label = $3, updated_at = $4 WHERE job_id = $5`
	_, err := r.db.Exec(query, status, progress, stepLabel, time.Now(), jobID)
	return err
}

// CompleteJob marks a job as complete with its final result JSON
func (r *PostgresRepository) CompleteJob(jobID, resultJSON string) error {
	if r.db == nil {
		return nil
	}
	query := `UPDATE jobs SET status = 'COMPLETE', progress = 100, step_label = 'Super-Resolution completed successfully', result = $1, updated_at = $2 WHERE job_id = $3`
	_, err := r.db.Exec(query, resultJSON, time.Now(), jobID)
	return err
}

// FailJob marks a job as failed with an error message
func (r *PostgresRepository) FailJob(jobID, errMsg string) error {
	if r.db == nil {
		return nil
	}
	query := `UPDATE jobs SET status = 'FAILED', error = $1, updated_at = $2 WHERE job_id = $3`
	_, err := r.db.Exec(query, errMsg, time.Now(), jobID)
	return err
}

// GetJob retrieves a job record by job_id
func (r *PostgresRepository) GetJob(jobID string) (*JobRecord, error) {
	if r.db == nil {
		return nil, sql.ErrNoRows
	}
	query := `SELECT id, job_id, tile_id, min_lat, max_lat, min_lon, max_lon, status, progress, step_label, COALESCE(error, ''), COALESCE(result, ''), created_at, updated_at FROM jobs WHERE job_id = $1`
	var job JobRecord
	err := r.db.QueryRow(query, jobID).Scan(
		&job.ID, &job.JobID, &job.TileID, &job.MinLat, &job.MaxLat, &job.MinLon, &job.MaxLon,
		&job.Status, &job.Progress, &job.StepLabel, &job.Error, &job.Result,
		&job.CreatedAt, &job.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &job, nil
}

// InsertSubscription registers a new recurring monitoring subscriber
func (r *PostgresRepository) InsertSubscription(sub *Subscription) error {
	if r.db == nil {
		return fmt.Errorf("database not initialized")
	}
	query := `
		INSERT INTO subscriptions (
			id, email, min_lat, max_lat, min_lon, max_lon,
			is_active, last_processed_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(
		query,
		sub.ID, sub.Email, sub.MinLat, sub.MaxLat, sub.MinLon, sub.MaxLon,
		sub.IsActive, sub.LastProcessedAt, sub.CreatedAt, sub.UpdatedAt,
	)
	return err
}

// GetDueSubscriptions returns subscriptions due for a periodic run
func (r *PostgresRepository) GetDueSubscriptions(interval time.Duration) ([]*Subscription, error) {
	if r.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	threshold := time.Now().Add(-interval)
	query := `
		SELECT id, email, min_lat, max_lat, min_lon, max_lon,
		       is_active, last_processed_at, created_at, updated_at
		FROM subscriptions
		WHERE is_active = TRUE
		  AND (last_processed_at IS NULL OR last_processed_at <= $1)
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(query, threshold)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*Subscription
	for rows.Next() {
		var s Subscription
		var lastProcessed sql.NullTime
		if err := rows.Scan(
			&s.ID, &s.Email, &s.MinLat, &s.MaxLat, &s.MinLon, &s.MaxLon,
			&s.IsActive, &lastProcessed, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if lastProcessed.Valid {
			s.LastProcessedAt = &lastProcessed.Time
		}
		list = append(list, &s)
	}
	return list, nil
}

// UpdateSubscriptionLastProcessed marks the completion timestamp of a run
func (r *PostgresRepository) UpdateSubscriptionLastProcessed(id string, t time.Time) error {
	if r.db == nil {
		return fmt.Errorf("database not initialized")
	}
	query := `UPDATE subscriptions SET last_processed_at = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(query, t, id)
	return err
}

