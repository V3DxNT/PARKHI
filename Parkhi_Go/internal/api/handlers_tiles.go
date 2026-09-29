package api

import (
	"encoding/json"
	"net/http"

	"yukti/backend/pkg/geometry"
)

type TileSearchRequest struct {
	Geometry interface{} `json:"geometry"`
	MinLat   float64     `json:"min_lat"`
	MaxLat   float64     `json:"max_lat"`
	MinLon   float64     `json:"min_lon"`
	MaxLon   float64     `json:"max_lon"`
	DateFrom string      `json:"dateFrom"`
	DateTo   string      `json:"dateTo"`
}

func (h *APIHandler) HandleTileSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req TileSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	bbox := &geometry.BoundingBox{
		MinLat: req.MinLat,
		MaxLat: req.MaxLat,
		MinLon: req.MinLon,
		MaxLon: req.MaxLon,
	}

	// Parse GeoJSON if provided
	if bbox.MinLat == 0 && bbox.MaxLat == 0 && bbox.MinLon == 0 && bbox.MaxLon == 0 && req.Geometry != nil {
		if geomMap, ok := req.Geometry.(map[string]interface{}); ok {
			if coordsRaw, ok := geomMap["coordinates"].([]interface{}); ok && len(coordsRaw) > 0 {
				if ringRaw, ok := coordsRaw[0].([]interface{}); ok {
					var pts [][2]float64
					for _, p := range ringRaw {
						if coord, ok := p.([]interface{}); ok && len(coord) >= 2 {
							lon, _ := coord[0].(float64)
							lat, _ := coord[1].(float64)
							pts = append(pts, [2]float64{lon, lat})
						}
					}
					if len(pts) > 0 {
						parsed, err := geometry.ParseFromGeoJSON([][][2]float64{pts})
						if err == nil {
							bbox = parsed
						}
					}
				}
			}
		}
	}

	// Default fallback coordinates if unprovided (e.g. Bangalore center)
	if bbox.MinLat == 0 && bbox.MaxLat == 0 && bbox.MinLon == 0 && bbox.MaxLon == 0 {
		bbox = &geometry.BoundingBox{MinLat: 12.9, MaxLat: 13.1, MinLon: 77.5, MaxLon: 77.7}
	}

	bbox.Sanitize()
	if err := bbox.Validate(); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Invalid bounding box: " + err.Error()})
		return
	}

	tiles, err := h.catalog.SearchTiles(bbox, req.DateFrom, req.DateTo)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tiles)
}

func (h *APIHandler) HandleJobs(w http.ResponseWriter, r *http.Request) {
	// Proxies to HandleGenerate for unified API support
	h.HandleGenerate(w, r)
}
