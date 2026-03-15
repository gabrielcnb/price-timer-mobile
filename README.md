# price-timer-mobile

React Native app that uses the device camera and on-device OCR to detect prices in real time and convert them to hours/minutes of work at your hourly wage.

## Features

- Live camera feed with automatic price scanning every 3.5 seconds (auto mode)
- Manual region selection: draw a rectangle over any area to OCR only that zone (tap mode)
- Detects prices in multiple currencies: EUR, USD, GBP, BRL, JPY, INR
- Converts each detected price to work-time (e.g. "2h 15min") based on net hourly wage
- Tax/gross support: enter gross hourly rate and effective tax rate; displays both net and gross work-time
- Pinch-to-zoom gesture (Reanimated shared values, no race conditions)
- On-device OCR via Tesseract (TesseractOCR component) — no internet required for scanning
- Optional cloud fallback via ocr.space API for Expo Go compatibility
- Wage and currency stored persistently with expo-secure-store
- Bounding-box overlay drawn in screen coordinates aligned to camera frame geometry

## Stack

| Component          | Technology                                      |
|--------------------|-------------------------------------------------|
| Framework          | React Native 0.81 / Expo SDK 54                 |
| Navigation         | expo-router (file-based, typed routes)          |
| Camera             | expo-camera                                     |
| OCR (on-device)    | Tesseract (custom TesseractOCR native component)|
| OCR (cloud)        | ocr.space REST API                              |
| Gestures           | react-native-gesture-handler + Reanimated 4     |
| Storage            | expo-secure-store                               |
| Language           | TypeScript                                      |

## Setup / Installation

**Prerequisites:** Node.js, Expo CLI, and either Expo Go or a physical device build (EAS).

```bash
git clone https://github.com/YOUR_USER/price-timer-mobile.git
cd price-timer-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or run on a simulator.

For a production build with full native OCR support:

```bash
npx eas build --profile development --platform android
# or
npx eas build --profile development --platform ios
```

## Usage

1. On first launch, the app redirects to the wage setup screen.
2. Enter your gross hourly wage, currency, and optional tax rate. The net wage is calculated automatically.
3. The camera opens in **Auto** mode. Detected prices appear as overlay boxes with work-time labels in real time.
4. Switch to **Select** mode to draw a selection rectangle over a specific area. A bottom card shows all detected prices in that region with their work-time equivalents.
5. Tap the wage chip in the top bar to update your wage at any time.

## File Structure

```
price-timer-app/
├── app/
│   ├── index.tsx        # Entry point — routes to /wage or /camera based on stored wage
│   ├── camera.tsx       # Main camera screen: OCR loop, gestures, overlays, modes
│   └── wage.tsx         # Wage setup screen
├── components/
│   ├── PriceOverlay.tsx  # Bounding box overlay rendered over camera
│   └── TesseractOCR.tsx  # Native OCR component (imperative ref API)
├── hooks/
│   └── useWage.ts        # Wage/currency/tax state with secure store persistence
├── utils/
│   ├── priceParser.ts    # Regex price detection, coordinate mapping, formatMinutes
│   └── ocrService.ts     # ocr.space API client (cloud fallback)
├── app.json
└── package.json
```

## Configuration

The ocr.space service key is set in `utils/ocrService.ts`. The default `'helloworld'` demo key allows ~25 requests per 20 seconds and is sufficient for testing. Register at https://ocr.space/ocrapi for a free key with 25,000 requests/month.

| Setting             | Location               | Description                          |
|---------------------|------------------------|--------------------------------------|
| `SCAN_INTERVAL_MS`  | `app/camera.tsx`       | Auto-scan interval in milliseconds (default 3500) |
| OCR API key         | `utils/ocrService.ts`  | ocr.space API key                    |
| Expo SDK version    | `app.json`             | `54.0.0`                             |
