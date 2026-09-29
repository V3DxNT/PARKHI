package geometry

import (
	"strings"
	"testing"
)

func TestSanitizeCoordinate(t *testing.T) {
	// Normal within range
	lon, lat := SanitizeCoordinate(77.5, 12.9)
	if lon != 77.5 || lat != 12.9 {
		t.Fatalf("Expected 77.5, 12.9, got %f, %f", lon, lat)
	}

	// Swapped axes: |lat| > 90 and |lon| <= 90
	lon, lat = SanitizeCoordinate(12.9, 95.0)
	if lon != 95.0 || lat != 12.9 {
		t.Fatalf("Expected swapped 95.0, 12.9, got %f, %f", lon, lat)
	}

	// World-wrapped longitude > 180 (e.g. 286.085739)
	lon, lat = SanitizeCoordinate(286.085739, 44.062138)
	// 286.085739 - 360 = -73.914261
	expectedLon := 286.085739 - 360.0
	if lon < expectedLon-0.0001 || lon > expectedLon+0.0001 {
		t.Fatalf("Expected wrapped longitude ~%f, got %f", expectedLon, lon)
	}
	if lat != 44.062138 {
		t.Fatalf("Expected lat 44.062138, got %f", lat)
	}

	// Extreme out-of-bounds latitude clamped to ±90
	_, lat = SanitizeCoordinate(0.0, 105.0) // If lon is 0, axes swap if |lat|>90
	// Here lon=0, lat=105 -> swapped to lon=105, lat=0
	if lat != 0.0 {
		t.Fatalf("Expected lat 0.0, got %f", lat)
	}
}

func TestBoundingBoxSanitize(t *testing.T) {
	// Case 1: Longitude > 180 degrees (from CDSE catalog bug)
	b := &BoundingBox{
		MinLat: 44.062138,
		MaxLat: 44.067562,
		MinLon: 286.085739,
		MaxLon: 286.096489,
	}
	b.Sanitize()

	if b.MinLon < -180.0 || b.MaxLon > 180.0 {
		t.Fatalf("Longitudes must be clamped to [-180, 180], got [%f, %f]", b.MinLon, b.MaxLon)
	}
	if b.MinLon > b.MaxLon {
		t.Fatalf("MinLon must be <= MaxLon, got %f > %f", b.MinLon, b.MaxLon)
	}

	// Case 2: Inverted axes (latitudes > 90 passed as lat)
	bSwapped := &BoundingBox{
		MinLat: 100.0,
		MaxLat: 101.0,
		MinLon: 20.0,
		MaxLon: 21.0,
	}
	bSwapped.Sanitize()
	if bSwapped.MinLat > 90.0 || bSwapped.MaxLat > 90.0 {
		t.Fatalf("Latitudes should have been swapped and clamped to <= 90, got [%f, %f]", bSwapped.MinLat, bSwapped.MaxLat)
	}
	if bSwapped.MinLon != 20.0 || bSwapped.MaxLon != 21.0 {
		// Actually, swapped means old MinLat (100) became MinLon (100), and old MinLon (20) became MinLat (20)
		if bSwapped.MinLat != 20.0 || bSwapped.MaxLat != 21.0 {
			t.Fatalf("Expected MinLat=20, MaxLat=21 after swap, got [%f, %f]", bSwapped.MinLat, bSwapped.MaxLat)
		}
	}

	// Case 3: Inverted Min/Max ordering
	bInverted := &BoundingBox{
		MinLat: 45.0,
		MaxLat: 44.0,
		MinLon: 10.0,
		MaxLon: 8.0,
	}
	bInverted.Sanitize()
	if bInverted.MinLat != 44.0 || bInverted.MaxLat != 45.0 {
		t.Fatalf("Expected MinLat=44, MaxLat=45, got [%f, %f]", bInverted.MinLat, bInverted.MaxLat)
	}
	if bInverted.MinLon != 8.0 || bInverted.MaxLon != 10.0 {
		t.Fatalf("Expected MinLon=8, MaxLon=10, got [%f, %f]", bInverted.MinLon, bInverted.MaxLon)
	}
}

func TestToPolygonWKT(t *testing.T) {
	b := &BoundingBox{
		MinLat: 44.062138,
		MaxLat: 44.067562,
		MinLon: 6.085739,
		MaxLon: 6.096489,
	}

	wkt := b.ToPolygonWKT()
	expectedPrefix := "POLYGON(("
	if !strings.HasPrefix(wkt, expectedPrefix) {
		t.Fatalf("Expected WKT to start with %s, got %s", expectedPrefix, wkt)
	}
	if strings.Contains(wkt, "286.085739") {
		t.Fatalf("WKT contains corrupted coordinate 286.085739: %s", wkt)
	}

	// Format precision check
	expected := "POLYGON((6.085739 44.062138, 6.096489 44.062138, 6.096489 44.067562, 6.085739 44.067562, 6.085739 44.062138))"
	if wkt != expected {
		t.Fatalf("Expected exact WKT %q, got %q", expected, wkt)
	}
}

func TestToProcessAPIBBox(t *testing.T) {
	b := &BoundingBox{
		MinLat: 44.062138,
		MaxLat: 44.067562,
		MinLon: 6.085739,
		MaxLon: 6.096489,
	}

	bboxSlice := b.ToProcessAPIBBox()
	if len(bboxSlice) != 4 {
		t.Fatalf("Expected 4 elements, got %d", len(bboxSlice))
	}
	// Sentinel Hub CRS84 requires [minLon, minLat, maxLon, maxLat]
	if bboxSlice[0] != 6.085739 || bboxSlice[1] != 44.062138 || bboxSlice[2] != 6.096489 || bboxSlice[3] != 44.067562 {
		t.Fatalf("Unexpected CRS84 bbox slice: %+v", bboxSlice)
	}

	grpcSlice := b.ToGRPCBBox()
	// gRPC requires [minLat, minLon, maxLat, maxLon]
	if grpcSlice[0] != 44.062138 || grpcSlice[1] != 6.085739 || grpcSlice[2] != 44.067562 || grpcSlice[3] != 6.096489 {
		t.Fatalf("Unexpected gRPC bbox slice: %+v", grpcSlice)
	}
}
