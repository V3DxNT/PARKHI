package pdf

import (
	"bytes"
	"os"
	"testing"
	"time"

	"yukti/backend/internal/repository"
)

func TestGenerateJobReportPDF(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "pdf_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	gen := NewReportGenerator(tempDir, "http://localhost:8080")

	aoi := &repository.AOIGeneration{
		JobID:          "test-job-12345",
		TileID:         "S2A_MSIL2A_TEST_TILE",
		MinLat:         12.92,
		MaxLat:         12.96,
		MinLon:         77.52,
		MaxLon:         77.56,
		PSNR:           32.45,
		SSIM:           0.892,
		SAM:            0.041,
		ERGAS:          1.85,
		GenerationDate: time.Now(),
	}

	pdfBytes, err := gen.GenerateJobReportPDF(aoi.JobID, aoi)
	if err != nil {
		t.Fatalf("Expected PDF generation to succeed, got error: %v", err)
	}

	if len(pdfBytes) < 500 {
		t.Fatalf("Expected valid PDF bytes (> 500 bytes), got length %d", len(pdfBytes))
	}

	// Verify standard PDF header magic bytes "%PDF-"
	if !bytes.HasPrefix(pdfBytes, []byte("%PDF-")) {
		t.Fatalf("Generated file does not begin with standard PDF signature (%%PDF-)")
	}
}
