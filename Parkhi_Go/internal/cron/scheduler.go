package cron

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"yukti/backend/internal/api"
	"yukti/backend/internal/config"
	"yukti/backend/internal/email"
	"yukti/backend/internal/pdf"
	"yukti/backend/internal/repository"
	"yukti/backend/pkg/geometry"
	"yukti/backend/pkg/logger"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
)

type AreaSubscriptionScheduler struct {
	cron        *cron.Cron
	cfg         *config.Config
	repo        *repository.PostgresRepository
	pipeline    *api.APIHandler
	pdfGen      *pdf.ReportGenerator
	emailSender *email.EmailService
	mu          sync.Mutex
	isRunning   bool
}

func NewAreaSubscriptionScheduler(
	cfg *config.Config,
	repo *repository.PostgresRepository,
	pipeline *api.APIHandler,
) *AreaSubscriptionScheduler {
	return &AreaSubscriptionScheduler{
		cron:        cron.New(),
		cfg:         cfg,
		repo:        repo,
		pipeline:    pipeline,
		pdfGen:      pdf.NewReportGenerator(cfg.StorageDir, cfg.BackendBaseURL),
		emailSender: email.NewEmailService(cfg),
	}
}

func (s *AreaSubscriptionScheduler) Start() error {
	// Schedule: Run every 3 hours
	_, err := s.cron.AddFunc("@every 3h", s.executeDueSubscriptions)
	if err != nil {
		return fmt.Errorf("failed to schedule recurring area subscription job: %w", err)
	}

	s.cron.Start()
	logger.Info("Area Subscription Cron Scheduler started successfully (interval: @every 3h)")
	return nil
}

func (s *AreaSubscriptionScheduler) Stop() {
	if s.cron != nil {
		s.cron.Stop()
		logger.Info("Area Subscription Cron Scheduler stopped")
	}
}

// TriggerNow allows manual invocation of due subscriptions (useful for testing or initial runs)
func (s *AreaSubscriptionScheduler) TriggerNow() {
	go s.executeDueSubscriptions()
}

func (s *AreaSubscriptionScheduler) executeDueSubscriptions() {
	s.mu.Lock()
	if s.isRunning {
		logger.Warn("A previous subscription cycle is still executing. Skipping this trigger.")
		s.mu.Unlock()
		return
	}
	s.isRunning = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.isRunning = false
		s.mu.Unlock()
	}()

	logger.Info("Checking for due area subscriptions (cycle interval: 3 hours)...")

	dueSubs, err := s.repo.GetDueSubscriptions(3 * time.Hour)
	if err != nil {
		logger.Error("Failed to query due subscriptions: %v", err)
		return
	}

	if len(dueSubs) == 0 {
		logger.Info("No subscriptions currently due for processing.")
		return
	}

	logger.Info("Found %d subscription(s) due for super-resolution processing", len(dueSubs))

	for _, sub := range dueSubs {
		jobID := uuid.New().String()
		tileID := "S2A_MSIL2A_" + time.Now().Format("20060102") + "_CRON"
		bbox := &geometry.BoundingBox{
			MinLat: sub.MinLat,
			MaxLat: sub.MaxLat,
			MinLon: sub.MinLon,
			MaxLon: sub.MaxLon,
		}
		bbox.Sanitize()

		logger.Info("Executing periodic pipeline for subscription %s (AOI [%.4f, %.4f, %.4f, %.4f], Job: %s)",
			sub.Email, sub.MinLat, sub.MinLon, sub.MaxLat, sub.MaxLon, jobID)

		// Create tracking JobRecord in PostgreSQL
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
			StepLabel: "Scheduled periodic surveillance run initiated",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		_ = s.repo.SaveJob(job)

		// Execute Generation Pipeline synchronously with force=true (bypasses 15-day PostGIS cache)
		aoi, err := s.pipeline.ExecuteGenerationPipelineSync(jobID, tileID, bbox)
		if err != nil {
			logger.Error("Scheduled generation pipeline failed for subscription %s (Job ID %s): %v", sub.Email, jobID, err)
			continue
		}

		// Generate PDF Intelligence Dossier
		pdfBytes, err := s.pdfGen.GenerateJobReportPDF(jobID, aoi)
		if err != nil {
			logger.Error("Failed to generate PDF report for Job ID %s: %v", jobID, err)
			continue
		}

		// Try to locate original GeoTIFF file on disk
		var tiffBytes []byte
		tiffCandidates := []string{}
		if aoi != nil && aoi.HighResGeoTIFFPath != "" {
			tiffCandidates = append(tiffCandidates, aoi.HighResGeoTIFFPath)
		}
		tiffCandidates = append(tiffCandidates,
			filepath.Join(s.cfg.StorageDir, "geotiffs", fmt.Sprintf("sr_%s.tif", jobID)),
		)
		if aoi != nil && aoi.JobID != "" && aoi.JobID != jobID {
			tiffCandidates = append(tiffCandidates,
				filepath.Join(s.cfg.StorageDir, "geotiffs", fmt.Sprintf("sr_%s.tif", aoi.JobID)),
			)
		}
		for _, cand := range tiffCandidates {
			if fi, err := os.Stat(cand); err == nil && fi.Size() > 0 {
				if data, err := os.ReadFile(cand); err == nil && len(data) > 0 {
					tiffBytes = data
					break
				}
			}
		}

		// Dispatch Email with PDF attachment and GeoTIFF attachment (if available)
		if err := s.emailSender.SendReportEmail(sub.Email, jobID, pdfBytes, tiffBytes); err != nil {
			logger.Error("Failed to email report to %s for Job ID %s: %v", sub.Email, jobID, err)
		}

		// Update last_processed_at timestamp in database
		if err := s.repo.UpdateSubscriptionLastProcessed(sub.ID, time.Now()); err != nil {
			logger.Warn("Failed to update last_processed_at for subscription %s: %v", sub.ID, err)
		} else {
			logger.Info("Completed periodic cycle for subscription %s (Job ID: %s)", sub.Email, jobID)
		}
	}
}
