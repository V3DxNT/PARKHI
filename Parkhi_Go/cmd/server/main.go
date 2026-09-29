package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"yukti/backend/internal/api"
	"yukti/backend/internal/config"
	"yukti/backend/internal/copernicus"
	"yukti/backend/internal/cron"
	"yukti/backend/internal/grpc_client"
	"yukti/backend/internal/redis"
	"yukti/backend/internal/repository"
	"yukti/backend/pkg/logger"
)

func main() {
	logger.Info("Starting Yukti Go Backend Service...")

	// 1. Load Configuration
	cfg := config.Load()
	logger.Info("Configuration loaded (Port: %s, gRPC Target: %s, Max AOI: %.1f sq km)",
		cfg.Port, cfg.FastAPIGRPCAddr, cfg.MaxAOISqKm)

	// 2. Initialize PostgreSQL Database
	repo, err := repository.NewPostgresRepository(cfg.PostgresDSN)
	if err != nil {
		logger.Warn("PostgreSQL initialization warning: %v", err)
	}

	// 3. Initialize Redis Service
	rds := redis.NewRedisService(cfg.RedisURL)

	// 4. Initialize Copernicus CDSE Services
	authSvc := copernicus.NewCDSEAuthService(cfg, rds)
	catalogSvc := copernicus.NewCDSECatalogService(cfg, authSvc)
	downloadSvc := copernicus.NewCDSEDownloadService(cfg, authSvc)

	// 5. Initialize gRPC Bridge Client to ML Service
	grpcClient := grpc_client.NewGRPCBridgeClient(cfg)

	// 6. Initialize WebSocket Hub
	wsHub := api.NewWSHub()
	go wsHub.Run()

	// 7. Initialize API Handlers & net/http Router
	handler := api.NewAPIHandler(
		cfg,
		repo,
		rds,
		authSvc,
		catalogSvc,
		downloadSvc,
		grpcClient,
		wsHub,
	)
	router := api.NewRouter(handler)

	// 8. Initialize and Start Area Subscription Cron Scheduler (@every 3h)
	scheduler := cron.NewAreaSubscriptionScheduler(cfg, repo, handler)
	if err := scheduler.Start(); err != nil {
		logger.Warn("Could not start area subscription scheduler: %v", err)
	}

	// 9. Start HTTP Server
	serverAddr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 0, // Disabled to allow long-running SSE streaming & WebSocket connections
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Info("HTTP Server listening on http://localhost%s", serverAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP server failed: %v", err)
			os.Exit(1)
		}
	}()

	// 10. Graceful Shutdown on SIGINT / SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server gracefully...")
	scheduler.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown: %v", err)
	}

	logger.Info("Yukti Go Backend stopped cleanly.")
}
