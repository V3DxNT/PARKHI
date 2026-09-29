package copernicus

import (
	"fmt"
	"regexp"
	"testing"
	"time"

	"yukti/backend/pkg/geometry"
)

func TestTimeRangeFormatting(t *testing.T) {
	tileID := "S2B_MSIL2A_20260810T052649_T43QBA"

	timeFrom := ""
	timeTo := ""

	re := regexp.MustCompile(`(20\d{2})[-_]?(\d{2})[-_]?(\d{2})`)
	if match := re.FindStringSubmatch(tileID); len(match) == 4 {
		parsedTime, err := time.Parse("2006-01-02", fmt.Sprintf("%s-%s-%s", match[1], match[2], match[3]))
		if err != nil {
			t.Fatalf("Failed to parse time: %v", err)
		}
		timeFrom = fmt.Sprintf("%04d-%02d-%02dT00:00:00Z", parsedTime.Year(), parsedTime.Month(), parsedTime.Day())
		dEnd := parsedTime.AddDate(0, 0, 2)
		timeTo = fmt.Sprintf("%04d-%02d-%02dT23:59:59Z", dEnd.Year(), dEnd.Month(), dEnd.Day())
	}

	expectedFrom := "2026-08-10T00:00:00Z"
	expectedTo := "2026-08-12T23:59:59Z"

	if timeFrom != expectedFrom {
		t.Fatalf("Expected timeFrom=%s, got %s", expectedFrom, timeFrom)
	}
	if timeTo != expectedTo {
		t.Fatalf("Expected timeTo=%s, got %s", expectedTo, timeTo)
	}

	// Verify timeTo does NOT match the corrupted pattern "2026-08-12T1212:09:09Z"
	if timeTo == "2026-08-12T1212:09:09Z" {
		t.Fatalf("timeTo matches corrupted 1212:09:09Z pattern!")
	}
}

func TestCatalogWKTQuerySanitization(t *testing.T) {
	// Corrupted bbox with longitude > 180 (e.g. 286.085739)
	bbox := &geometry.BoundingBox{
		MinLat: 44.062138,
		MaxLat: 44.067562,
		MinLon: 286.085739,
		MaxLon: 286.096489,
	}

	bbox.Sanitize()
	wkt := bbox.ToPolygonWKT()

	if bbox.MinLon > 180.0 || bbox.MaxLon > 180.0 {
		t.Fatalf("Bounding box longitudes must be <= 180.0, got [%f, %f]", bbox.MinLon, bbox.MaxLon)
	}

	if wkt == "" {
		t.Fatalf("Expected non-empty WKT")
	}

	// Verify standard CRS84 slice
	crs84 := bbox.ToProcessAPIBBox()
	if len(crs84) != 4 || crs84[0] > 180.0 || crs84[2] > 180.0 {
		t.Fatalf("Invalid CRS84 bounding box: %+v", crs84)
	}
}
