# 🌐 Parki_Web: Satellite Super-Resolution Web Studio

[![Framework](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Styling](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Mapping](https://img.shields.io/badge/Leaflet-Maps-199900?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

**Parki_Web** is the desktop web dashboard for the Parkhi platform. It provides an intuitive, high-performance geospatial interface for satellite imagery search, deep-learning super-resolution execution, and multi-spectral analysis.

---

## 📸 Key Features & Interface

- **Cinematic Orbital Landing (`/`):** Three.js / CSS-driven interactive low-Earth orbit atmosphere with Sentinel-2 satellite telemetry visualization.
- **Fixed-Dimension AOI Selector (`/resolution`):** Leaflet-powered interactive bounding-box selector calibrated to $1.28\text{ km} \times 1.28\text{ km}$ patches corresponding directly to 256×256 10m Sentinel-2 tiles.
- **Copernicus Tile Carousel:** Live query against ESA Copernicus OpenSearch catalog displaying real-time cloud-cover percentages, capture timestamps, and thumbnail previews.
- **Live Inference Pipeline:** Server-Sent Events (SSE) listener rendering multi-stage inference progress (TOA calibration, tensor chunk streaming, MCDropout HAT inference, uncertainty extraction).
- **Interactive Multi-Mode Inspection:**
  - **Swipe Slider:** Real-time side-by-side comparison slider between raw 10m and enhanced 4m resolution.
  - **Uncertainty Heatmap Viewer:** Visualizes epistemic uncertainty to identify low-confidence regions (e.g., cloud edges, reflective bodies).
  - **Multi-Band Inspector:** Visual inspection of individual spectral bands ($B02$ Blue, $B03$ Green, $B04$ Red, $B08$ NIR).
  - **Downstream Analytics:** Toggles overlay masks for Urban Land Use, Crop NDVI Health, and Disaster Damage Assessment.
- **Report & GeoTIFF Export:** Direct one-click download for high-resolution georeferenced GeoTIFF rasters and synthesized PDF analytical reports.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router with Turbopack)
- **State Management:** React Context + `useReducer` with persistent fallbacks
- **Mapping:** Leaflet & React-Leaflet with OpenStreetMap and Copernicus WMS tile layers
- **Icons & UI:** Lucide React, Framer Motion animations, Tailwind CSS
- **Communication:** Server-Sent Events (SSE) + REST fetch to `Parkhi_Go`

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Configure environment (points to Go backend on port 8080)
cp .env.example .env.local

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build

```bash
npm run build
npm start
```
