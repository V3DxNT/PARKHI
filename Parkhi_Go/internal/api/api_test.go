package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"yukti/backend/internal/config"
	"yukti/backend/internal/copernicus"
	"yukti/backend/internal/grpc_client"
	"yukti/backend/internal/redis"
	"yukti/backend/internal/repository"
)

func setupTestRouter() http.Handler {
	cfg := &config.Config{
		Port:            "8080",
		PostgresDSN:     "",
		RedisURL:        "",
		CDSEClientID:    "cdse-public",
		FastAPIGRPCAddr: "localhost:50051",
		StorageDir:      "./testdata",
		MaxAOISqKm:      50.0,
	}

	repo, _ := repository.NewPostgresRepository("")
	rds := redis.NewRedisService("")
	auth := copernicus.NewCDSEAuthService(cfg, rds)
	catalog := copernicus.NewCDSECatalogService(cfg, auth)
	download := copernicus.NewCDSEDownloadService(cfg, auth)
	grpcClient := grpc_client.NewGRPCBridgeClient(cfg)
	hub := NewWSHub()
	go hub.Run()

	handler := NewAPIHandler(cfg, repo, rds, auth, catalog, download, grpcClient, hub)
	return NewRouter(handler)
}

func TestHealthEndpoint(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", rec.Code)
	}
}

func TestTileSearchEndpoint(t *testing.T) {
	router := setupTestRouter()

	reqBody, _ := json.Marshal(map[string]interface{}{
		"min_lat":  12.9,
		"max_lat":  12.95,
		"min_lon":  77.5,
		"max_lon":  77.55,
		"dateFrom": "2026-08-01",
		"dateTo":   "2026-08-30",
	})

	req := httptest.NewRequest(http.MethodPost, "/api/tiles/search", bytes.NewReader(reqBody))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestGenerateEndpointValidation(t *testing.T) {
	router := setupTestRouter()

	// Excessive area (> 50 sq km)
	reqBody, _ := json.Marshal(map[string]interface{}{
		"min_lat": 10.0,
		"max_lat": 15.0,
		"min_lon": 75.0,
		"max_lon": 80.0,
	})

	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(reqBody))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for excessive AOI, got %d", rec.Code)
	}
}

func TestGenerateEndpointValid(t *testing.T) {
	router := setupTestRouter()

	reqBody, _ := json.Marshal(map[string]interface{}{
		"min_lat": 12.9,
		"max_lat": 12.94,
		"min_lon": 77.5,
		"max_lon": 77.54,
	})

	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(reqBody))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted && rec.Code != http.StatusOK {
		t.Fatalf("Expected status 202 or 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestSubscribeValidation(t *testing.T) {
	router := setupTestRouter()

	// Missing / invalid email
	reqBody, _ := json.Marshal(map[string]interface{}{
		"email":   "invalid-email",
		"min_lat": 12.9,
		"max_lat": 12.94,
		"min_lon": 77.5,
		"max_lon": 77.54,
	})

	req := httptest.NewRequest(http.MethodPost, "/api/subscribe", bytes.NewReader(reqBody))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for invalid email, got %d", rec.Code)
	}

	// Excessive area (> 50 sq km)
	reqBodyExcessive, _ := json.Marshal(map[string]interface{}{
		"email":   "subscriber@example.com",
		"min_lat": 10.0,
		"max_lat": 15.0,
		"min_lon": 75.0,
		"max_lon": 80.0,
	})

	req2 := httptest.NewRequest(http.MethodPost, "/api/subscribe", bytes.NewReader(reqBodyExcessive))
	rec2 := httptest.NewRecorder()
	router.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for excessive area, got %d", rec2.Code)
	}
}

