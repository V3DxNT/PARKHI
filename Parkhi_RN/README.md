# 📱 Parkhi_RN: Native Mobile Geospatial Intelligence Client

[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-black?logo=apple&logoColor=white)](https://reactnative.dev)
[![React Native](https://img.shields.io/badge/React%20Native-Expo%2051-61DAFB?logo=react&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

**Parkhi_RN** is the cross-platform mobile application for the Parkhi ecosystem, built using React Native and Expo. It delivers native performance, smooth 60 FPS gesture controls, and low-latency satellite intelligence directly to field researchers and decision-makers on mobile devices.

---

## 📸 Mobile User Experience

- **Cinematic Orbit Hero (`HomeScreen`):** Parallax atmospheric hero with live Sentinel-2 orbit status, platform statistics, and interactive satellite feature teasers.
- **Native Gesture Comparison Slider (`SwipeSlider`):** Hardware-accelerated pan-responder slider allowing instant comparison between raw 10m Sentinel-2 imagery and sub-4m super-resolved output.
- **Multispectral Band Inspector (`BandsInspector`):** Dedicated touch cards for isolating individual spectral channels ($B02$ Blue, $B03$ Green, $B04$ Red, $B08$ NIR).
- **Epistemic Uncertainty Visualizer (`UncertaintyView`):** Interactive confidence map with pinch-to-zoom and fullscreen modal inspection.
- **Downstream Analysis Overlays (`AnalysisCards`):** Touch-to-toggle overlay maps for Urban Footprints, Crop Health (NDVI), and Disaster Damage Assessment.
- **Offline / Resilient Demo Mode:** Seamless local asset fallback guarantees full functionality during remote field operations without internet access.

---

## 🛠️ Architecture & State

- **Framework:** React Native with Expo SDK 51
- **Navigation:** Custom lightweight floating bottom glass tab bar with safe area insets
- **Gestures & Animations:** Native `PanResponder` and Animated API for ultra-smooth 60 FPS sliding
- **State Store:** Typed React Context + `useReducer` mirroring web client state (`lib/store.tsx`)
- **Networking:** Native `XMLHttpRequest` SSE streaming + `fetch` API connector (`lib/api.ts`)

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start Expo development bundler
npx expo start

# Run on iOS Simulator (macOS)
npx expo start --ios

# Run on Android Emulator
npx expo start --android
```
