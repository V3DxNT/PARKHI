package geometry

import (
	"testing"
)

func TestCalculateAreaSqKm(t *testing.T) {
	// 0.1 deg lat x 0.1 deg lon around Bangalore (~11km x ~11km ≈ 121 sq km)
	bbox := &BoundingBox{
		MinLat: 12.9,
		MaxLat: 13.0,
		MinLon: 77.5,
		MaxLon: 77.6,
	}

	area := bbox.CalculateAreaSqKm()
	if area <= 0 {
		t.Fatalf("Expected positive area, got %f", area)
	}

	// 0.05 deg x 0.05 deg (~5.5km x 5.5km ≈ 30 sq km, should be <= 50 sq km)
	smallBbox := &BoundingBox{
		MinLat: 12.9,
		MaxLat: 12.95,
		MinLon: 77.5,
		MaxLon: 77.55,
	}
	if err := smallBbox.CheckAreaLimit(50.0); err != nil {
		t.Fatalf("Expected small bbox to be valid, got error: %v", err)
	}

	// Huge bbox covering entire state, should exceed 50 sq km limit
	hugeBbox := &BoundingBox{
		MinLat: 10.0,
		MaxLat: 15.0,
		MinLon: 75.0,
		MaxLon: 80.0,
	}
	if err := hugeBbox.CheckAreaLimit(50.0); err == nil {
		t.Fatalf("Expected huge bbox to exceed 50 sq km limit, but got no error")
	}
}

func TestParseFromGeoJSON(t *testing.T) {
	coords := [][][2]float64{
		{
			{77.5, 12.9},
			{77.6, 12.9},
			{77.6, 13.0},
			{77.5, 13.0},
			{77.5, 12.9},
		},
	}

	bbox, err := ParseFromGeoJSON(coords)
	if err != nil {
		t.Fatalf("Failed to parse GeoJSON: %v", err)
	}

	if bbox.MinLat != 12.9 || bbox.MaxLat != 13.0 || bbox.MinLon != 77.5 || bbox.MaxLon != 77.6 {
		t.Fatalf("Unexpected bbox values: %+v", bbox)
	}
}
