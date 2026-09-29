package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
	"yukti/backend/pkg/logger"
)

type Config struct {
	Port            string
	PostgresDSN     string
	RedisURL        string
	CDSEUsername    string
	CDSEPassword    string
	CDSEClientID    string
	FastAPIGRPCAddr string
	CloudinaryURL   string
	StorageDir      string
	MaxAOISqKm      float64
	SMTPHost        string
	SMTPPort        string
	SMTPUser        string
	SMTPPass        string
	BackendBaseURL  string
}

func Load() *Config {
	// Attempt to load .env file from current or parent directories
	if err := godotenv.Load(".env"); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			logger.Info("No .env file found, using system environment variables")
		}
	}

	maxSqKm, err := strconv.ParseFloat(getEnv("MAX_AOI_SQ_KM", "50.0"), 64)
	if err != nil || maxSqKm <= 0 {
		maxSqKm = 50.0
	}

	port := getEnv("PORT", "8080")
	return &Config{
		Port:            port,
		PostgresDSN:     getEnv("POSTGRES_DSN", "postgres://postgres:postgres@localhost:5432/srm_db?sslmode=disable"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379"),
		CDSEUsername:    getEnv("CDSE_USERNAME", ""),
		CDSEPassword:    getEnv("CDSE_PASSWORD", ""),
		CDSEClientID:    getEnv("CDSE_CLIENT_ID", "cdse-public"),
		FastAPIGRPCAddr: getEnv("FASTAPI_GRPC_ADDR", "localhost:50051"),
		CloudinaryURL:   getEnv("CLOUDINARY_URL", ""),
		StorageDir:      getEnv("STORAGE_DIR", "./data"),
		MaxAOISqKm:      maxSqKm,
		SMTPHost:        getEnv("SMTP_HOST", ""),
		SMTPPort:        getEnv("SMTP_PORT", "587"),
		SMTPUser:        getEnv("SMTP_USER", ""),
		SMTPPass:        getEnv("SMTP_PASS", ""),
		BackendBaseURL:  getEnv("BACKEND_BASE_URL", "http://localhost:"+port),
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return fallback
}
