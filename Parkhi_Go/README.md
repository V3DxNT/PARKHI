# ⚡ Parkhi_Go: Geospatial Backend & Orchestration Service

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go&logoColor=white)](https://golang.org)
[![Protocol](https://img.shields.io/badge/gRPC-Client-244f5c?logo=grpc&logoColor=white)](https://grpc.io)
[![Events](https://img.shields.io/badge/SSE-Streaming-green)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

**Parkhi_Go** is the high-performance core orchestrator for the Parkhi platform. Written in Go 1.22, it connects the presentation layers (`Parki_Web` and `Parkhi_RN`) with external satellite data repositories (ESA Copernicus CDSE) and the deep learning service (`Parkhi_Py`).

---

## 🎯 Key Responsibilities

1. **Copernicus CDSE Catalog Ingestion:**
   - Authenticates via OAuth2 against the Copernicus Data Space Ecosystem (CDSE).
   - Queries OpenSearch Sentinel-2 L2A collections by geographic bounding box and temporal acquisition window.
   - Downloads raw SAFE archives and extracts 10m multispectral bands ($B02, B03, B04, B08$).
2. **Real-time Pipeline Streaming (SSE):**
   - Implements a low-latency Server-Sent Events (SSE) dispatcher for live client notification (`GET /api/jobs/{jobId}/stream`).
   - Translates raw model progress chunks into granular human-readable pipeline stages.
3. **gRPC ML Service Integration:**
   - Communicates with `Parkhi_Py` over high-speed binary gRPC protocol (`fastapi_grpc_addr = localhost:50051`).
   - Dispatches bounding-box coordinates, band tensor paths, and analysis modes.
4. **Surveillance & Alerting Engine:**
   - Manages recurring AOI monitoring subscriptions (`POST /api/subscriptions`).
   - Evaluates new satellite passes via background cron and sends automated SMTP email notifications upon significant change detection.
5. **Analytical Report Generation:**
   - Synthesizes comprehensive multi-page PDF evaluation reports with embedded metrics (PSNR, SSIM, SAM, ERGAS).

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Healthcheck and readiness probe |
| `POST` | `/api/tiles/search` | Search Copernicus Sentinel-2 tiles by AOI & date |
| `POST` | `/api/jobs` | Submit a new Super-Resolution inference job |
| `GET` | `/api/jobs/{id}/stream` | Server-Sent Events (SSE) real-time inference stream |
| `POST` | `/api/jobs/{id}/analyze` | Run downstream analysis (`urban`, `crop`, `disaster`) |
| `POST` | `/api/llm/summarize` | Generate geospatial intelligence briefing |
| `POST` | `/api/subscriptions` | Register persistent AOI surveillance email alert |

---

## 🚀 Running Locally

```bash
# Set up environment variables
cp .env.example .env

# Download dependencies
go mod download

# Run the server
go run cmd/server/main.go
```

The server binds to `http://localhost:8080`.
