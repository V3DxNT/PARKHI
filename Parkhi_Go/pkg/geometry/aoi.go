package geometry

import (
	"errors"
	"fmt"
	"math"
)

const (
	EarthRadiusKm = 6371.0
	MaxAreaSqKm   = 50.0 // Configurable max allowed AOI per go_backend.md
)

// BoundingBox holds latitude and longitude bounds
type BoundingBox struct {
	MinLat float64 `json:"min_lat"`
	MaxLat float64 `json:"max_lat"`
	MinLon float64 `json:"min_lon"`
	MaxLon float64 `json:"max_lon"`
}

// Validate checks latitude and longitude ranges and ensures Min <= Max
func (b *BoundingBox) Validate() error {
	if b.MinLat < -90 || b.MaxLat > 90 || b.MinLat > b.MaxLat {
		return errors.New("invalid latitude range (must be between -90 and 90, and min <= max)")
	}
	if b.MinLon < -180 || b.MaxLon > 180 || b.MinLon > b.MaxLon {
		return errors.New("invalid longitude range (must be between -180 and 180, and min <= max)")
	}
	return nil
}

// CalculateAreaSqKm computes the spherical surface area of the bounding box on Earth in square kilometers
func (b *BoundingBox) CalculateAreaSqKm() float64 {
	minLatRad := b.MinLat * math.Pi / 180.0
	maxLatRad := b.MaxLat * math.Pi / 180.0
	minLonRad := b.MinLon * math.Pi / 180.0
	maxLonRad := b.MaxLon * math.Pi / 180.0

	// Spherical rectangle area: R^2 * |sin(lat2) - sin(lat1)| * |lon2 - lon1|
	deltaLon := math.Abs(maxLonRad - minLonRad)
	deltaSinLat := math.Abs(math.Sin(maxLatRad) - math.Sin(minLatRad))

	area := EarthRadiusKm * EarthRadiusKm * deltaLon * deltaSinLat
	return area
}

// CheckAreaLimit validates that the area is non-zero and within max allowed threshold (e.g. 50 sq km)
func (b *BoundingBox) CheckAreaLimit(maxSqKm float64) error {
	if maxSqKm <= 0 {
		maxSqKm = MaxAreaSqKm
	}
	if err := b.Validate(); err != nil {
		return err
	}
	area := b.CalculateAreaSqKm()
	if area <= 0 {
		return errors.New("bounding box area must be greater than 0")
	}
	if area > maxSqKm {
		return fmt.Errorf("requested AOI area (%.2f sq km) exceeds maximum allowable limit of %.2f sq km", area, maxSqKm)
	}
	return nil
}

// ToPolygonWKT returns the bounding box formatted as Well-Known Text (WKT) for PostGIS / OData
func (b *BoundingBox) ToPolygonWKT() string {
	b.Sanitize()
	return fmt.Sprintf("POLYGON((%.6f %.6f, %.6f %.6f, %.6f %.6f, %.6f %.6f, %.6f %.6f))",
		b.MinLon, b.MinLat,
		b.MaxLon, b.MinLat,
		b.MaxLon, b.MaxLat,
		b.MinLon, b.MaxLat,
		b.MinLon, b.MinLat,
	)
}

// ToGeoJSONCoordinates returns a standard GeoJSON Polygon coordinate array
func (b *BoundingBox) ToGeoJSONCoordinates() [][][2]float64 {
	b.Sanitize()
	return [][][2]float64{
		{
			{b.MinLon, b.MinLat},
			{b.MaxLon, b.MinLat},
			{b.MaxLon, b.MaxLat},
			{b.MinLon, b.MaxLat},
			{b.MinLon, b.MinLat},
		},
	}
}

// ParseFromGeoJSON extracts a bounding box from arbitrary GeoJSON Polygon coordinates
func ParseFromGeoJSON(coords [][][2]float64) (*BoundingBox, error) {
	if len(coords) == 0 || len(coords[0]) == 0 {
		return nil, errors.New("empty GeoJSON coordinates")
	}
	minLat, maxLat := 90.0, -90.0
	minLon, maxLon := 180.0, -180.0

	for _, pt := range coords[0] {
		lon, lat := SanitizeCoordinate(pt[0], pt[1])
		if lat < minLat {
			minLat = lat
		}
		if lat > maxLat {
			maxLat = lat
		}
		if lon < minLon {
			minLon = lon
		}
		if lon > maxLon {
			maxLon = lon
		}
	}

	bbox := &BoundingBox{
		MinLat: minLat,
		MaxLat: maxLat,
		MinLon: minLon,
		MaxLon: maxLon,
	}
	bbox.Sanitize()
	if err := bbox.Validate(); err != nil {
		return nil, err
	}
	return bbox, nil
}
