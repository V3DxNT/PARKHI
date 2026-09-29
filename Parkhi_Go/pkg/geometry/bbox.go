package geometry

import (
	"fmt"
	"math"
)

// Clamp restricts a value between a min and max threshold
func Clamp(val, min, max float64) float64 {
	if val < min {
		return min
	}
	if val > max {
		return max
	}
	return val
}

// SanitizeCoordinate normalizes a single [lon, lat] coordinate pair:
// 1. Detects and corrects swapped latitude/longitude axes (if |lat| > 90 and |lon| <= 90).
// 2. Normalizes world-wrapped longitudes (e.g. from Leaflet continuous panning > 180 or < -180).
// 3. Strictly clamps longitude to [-180.0, 180.0] and latitude to [-90.0, 90.0].
func SanitizeCoordinate(lon, lat float64) (float64, float64) {
	// Auto-detect swapped axes
	if math.Abs(lat) > 90.0 && math.Abs(lon) <= 90.0 {
		lon, lat = lat, lon
	}

	// Normalize world-wrapped longitudes
	if lon > 180.0 || lon < -180.0 {
		for lon > 180.0 {
			lon -= 360.0
		}
		for lon < -180.0 {
			lon += 360.0
		}
	}

	// Strict clamping
	lon = Clamp(lon, -180.0, 180.0)
	lat = Clamp(lat, -90.0, 90.0)

	return lon, lat
}

// Sanitize inspects and sanitizes bounding box parameters in place:
// - Auto-detects inverted lat/lon axes when latitudes exceed ±90°
// - Normalizes world-wrapped longitudes
// - Enforces strict clamping: lon in [-180.0, 180.0], lat in [-90.0, 90.0]
// - Ensures Min <= Max ordering for both axes
func (b *BoundingBox) Sanitize() *BoundingBox {
	if b == nil {
		return &BoundingBox{}
	}

	// 1. Axis swap detection: If latitudes exceed [-90, 90] but longitudes do not,
	// the caller inverted latitude and longitude
	if (math.Abs(b.MinLat) > 90.0 || math.Abs(b.MaxLat) > 90.0) &&
		(math.Abs(b.MinLon) <= 90.0 && math.Abs(b.MaxLon) <= 90.0) {
		b.MinLat, b.MinLon = b.MinLon, b.MinLat
		b.MaxLat, b.MaxLon = b.MaxLon, b.MaxLat
	}

	// 2. World-wrap longitude normalization (e.g., 286.085739 becomes -73.914261)
	if b.MinLon > 180.0 || b.MinLon < -180.0 {
		for b.MinLon > 180.0 {
			b.MinLon -= 360.0
		}
		for b.MinLon < -180.0 {
			b.MinLon += 360.0
		}
	}
	if b.MaxLon > 180.0 || b.MaxLon < -180.0 {
		for b.MaxLon > 180.0 {
			b.MaxLon -= 360.0
		}
		for b.MaxLon < -180.0 {
			b.MaxLon += 360.0
		}
	}

	// 3. Strict coordinate bounds clamping
	b.MinLon = Clamp(b.MinLon, -180.0, 180.0)
	b.MaxLon = Clamp(b.MaxLon, -180.0, 180.0)
	b.MinLat = Clamp(b.MinLat, -90.0, 90.0)
	b.MaxLat = Clamp(b.MaxLat, -90.0, 90.0)

	// 4. Ensure Min <= Max ordering
	if b.MinLat > b.MaxLat {
		b.MinLat, b.MaxLat = b.MaxLat, b.MinLat
	}
	if b.MinLon > b.MaxLon {
		b.MinLon, b.MaxLon = b.MaxLon, b.MinLon
	}

	return b
}

// NewBoundingBox constructs and immediately sanitizes a BoundingBox
func NewBoundingBox(minLon, minLat, maxLon, maxLat float64) *BoundingBox {
	bbox := &BoundingBox{
		MinLat: minLat,
		MaxLat: maxLat,
		MinLon: minLon,
		MaxLon: maxLon,
	}
	return bbox.Sanitize()
}

// NewBoundingBoxFromSlice parses a 4-element coordinate slice.
// Supports both [minLon, minLat, maxLon, maxLat] and [minLat, minLon, maxLat, maxLon] orders.
func NewBoundingBoxFromSlice(slice []float64) (*BoundingBox, error) {
	if len(slice) != 4 {
		return nil, fmt.Errorf("expected 4 elements for bounding box, got %d", len(slice))
	}

	// If slice looks like [lat, lon, lat, lon] (i.e. first/third elements > 90), detect it
	c0, c1, c2, c3 := slice[0], slice[1], slice[2], slice[3]
	if (math.Abs(c0) > 90.0 || math.Abs(c2) > 90.0) && (math.Abs(c1) <= 90.0 && math.Abs(c3) <= 90.0) {
		// c0 is lon, c1 is lat, c2 is lon, c3 is lat -> [minLon, minLat, maxLon, maxLat]
		return NewBoundingBox(c0, c1, c2, c3), nil
	}

	// Assume [minLon, minLat, maxLon, maxLat] standard
	bbox := &BoundingBox{
		MinLon: c0,
		MinLat: c1,
		MaxLon: c2,
		MaxLat: c3,
	}
	return bbox.Sanitize(), nil
}

// ToProcessAPIBBox returns [minLon, minLat, maxLon, maxLat] for CDSE Sentinel Hub Process API (CRS84)
func (b *BoundingBox) ToProcessAPIBBox() []float64 {
	b.Sanitize()
	return []float64{b.MinLon, b.MinLat, b.MaxLon, b.MaxLat}
}

// ToGRPCBBox returns [minLat, minLon, maxLat, maxLon] for internal gRPC Python bridge
func (b *BoundingBox) ToGRPCBBox() []float64 {
	b.Sanitize()
	return []float64{b.MinLat, b.MinLon, b.MaxLat, b.MaxLon}
}
