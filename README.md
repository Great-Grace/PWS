<p align="center">
  <img src=".github/assets/banner.png" alt="PWS Banner" width="100%" onerror="this.style.display='none'" />
</p>

<h1 align="center">PWS — Personal Weather Sensitivity</h1>

<p align="center">
  <strong>On-device ML engine for personalized thermal comfort prediction</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey.svg" alt="Platform" />
  <img src="https://img.shields.io/badge/tests-172%20passed-brightgreen.svg" alt="Tests" />
  <a href="https://github.com/Great-Grace/PWS/stargazers"><img src="https://img.shields.io/github/stars/Great-Grace/PWS.svg?style=social" alt="Stars" /></a>
</p>

<p align="center">
  <a href="#why-pws">Why PWS</a> ·
  <a href="#ml-engine">ML Engine</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## Why PWS

Every weather app shows the same "feels like" temperature to all users. But a 25°C day feels completely different to a lean person in a t-shirt versus an overweight person in a jacket — depending on body type, activity level, sleep quality, and clothing.

**PWS solves this with an on-device perceptron that learns from each user's feedback**, grounded in the peer-reviewed UTCI (Universal Thermal Climate Index) thermal comfort model.

| Conventional Weather Apps | PWS |
|---|---|
| Fixed "feels like" formula | Per-user learned weights |
| Server-side ML inference | Fully on-device, zero data sent |
| No thermal comfort model | UTCI 126-term polynomial (Brode et al. 2012) |
| Platform-divergent math | Identical formulas across TypeScript / Swift / Kotlin |

### Who is this for?

- **End users**: People who want weather predictions tailored to their body and lifestyle
- **Developers**: Anyone building weather, IoT, HVAC, or wearable apps who needs a reusable thermal comfort engine
- **Researchers**: Reproducible UTCI implementation with literature references for thermal comfort studies

---

## ML Engine

PWS ships a **standalone, reusable thermal comfort ML engine** that can be integrated into any weather app, smart home system, or wearable — independently of the mobile app.

### UTCI Polynomial — Brode et al. 2012

The Universal Thermal Climate Index is the ISO-standard metric for outdoor thermal comfort. PWS implements the full 6th-order polynomial (126 terms):

```
UTCI = f(Ta, ΔT, va, Tmrt)

where:
  Ta   = air temperature (°C)
  ΔT   = relative humidity → saturation vapor pressure delta
  va   = wind speed at 10m (m/s)
  Tmrt = mean radiant temperature (°C)
```

- **Reference**: Brode, P., et al. (2012). "Derivation of the UTCI." *Int J Biometeorol*, 56(3), 481–495.
- **Implementation**: [`shared/domain/formulas.ts`](shared/domain/formulas.ts) (782 lines)
- **Vapor pressure**: Hardy (1998) ITS-90 formulation

### 11-Dimensional Feature Vector

The perceptron operates on a carefully engineered feature space:

| # | Feature | Description |
|---|---|---|
| 1 | `norm_temp` | Normalized air temperature |
| 2 | `norm_humidity` | Normalized relative humidity |
| 3 | `norm_wind` | Normalized wind speed |
| 4 | `norm_tmrt` | Normalized mean radiant temperature |
| 5 | `heat_index_bonus` | Nonlinear heat-humidity interaction |
| 6 | `wind_chill_penalty` | Nonlinear wind-temperature interaction |
| 7 | `precipitation` | Binary precipitation indicator |
| 8–9 | `sin_hour`, `cos_hour` | Cyclical hour-of-day encoding |
| 10–11 | `sin_season`, `cos_season` | Cyclical day-of-year encoding |

### On-Device Perceptron

Each user has **3 independent perceptrons** (morning / afternoon / evening), each with 11 weights + 1 bias:

```
ŷ = clamp(w · x + b, 1, 7)

// Online SGD with L2 regularization
w ← w - η · (∇L + λ · w)

where:
  η = 0.02   (learning rate)
  λ = 0.001  (L2 regularization)
```

- **Output**: Ordinal 7-point scale (very cold → very hot)
- **Cold-start priors**: Physics-calibrated initial weights (e.g., `w_temp = 4.9`, `w_wind_chill = -1.6`)
- **Confidence levels**: `cold_start` (<7 feedbacks) → `low` (7–14) → `medium` (15–29) → `high` (30+)

### CLO Clothing Insulation Model

PWS uses the CLO (Clothing Insulation) standard from thermal comfort science to quantify the thermal effect of clothing:

| Item | CLO | Item | CLO |
|---|---|---|---|
| Sleeveless | 0.04 | Thin jacket | 0.25 |
| Short-sleeve tee | 0.08 | Thick sweater | 0.35 |
| Long-sleeve shirt | 0.15 | Light coat | 0.55 |
| Hoodie | 0.20 | Heavy coat | 1.00 |

**Clothing scale** = `sum(CLO items)`, mapped to: thin (<0.18), normal (0.18–0.40), thick (≥0.40)

---

## Architecture

```
PWS/
├── shared/domain/              ← Reference ML implementation (TypeScript)
│   ├── formulas.ts             ← UTCI polynomial + feature engineering + perceptron
│   ├── clothing.ts             ← CLO insulation model
│   ├── prediction.ts           ← Confidence level resolution
│   └── weatherData.ts          ← OpenWeatherMap / Open-Meteo parser
│
├── apps/ios-native/            ← iOS (Swift / SwiftUI)
│   └── PWSNativePreview/
│       ├── Domain/             ← Contract + Repository patterns
│       ├── Features/           ← Home, Feedback, History, Settings
│       └── Design/             ← Apple-inspired design system
│
├── apps/android-native/        ← Android (Kotlin / Jetpack Compose)
│   └── app/src/main/java/
│       └── .../nativepreview/
│           ├── domain/         ← Reducer (MVI) + NativeSession
│           └── ui/             ← Compose screens
│
└── supabase/                   ← Backend (Auth, Postgres, Edge Functions)
    └── functions/
        └── weather-onecall/    ← Weather API proxy (30-min cache TTL)
```

### Design Patterns

| Pattern | Where | Purpose |
|---|---|---|
| **Contract** | iOS Domain | Encapsulates URL building, headers, request serialization |
| **Repository** | iOS / Android | InMemory → Persistent → Supabase → Fallback layers |
| **Reducer (MVI)** | Android | Centralized state machine with synchronized dispatch |
| **Constructor DI** | All layers | Testability via dependency injection |
| **HTTP Transport** | iOS / Android | Protocol-based abstraction for network testing |

### Cross-Platform ML Parity

The **same mathematical formulas** are implemented in three languages:

| Component | TypeScript | Swift | Kotlin |
|---|---|---|---|
| UTCI polynomial | `formulas.ts` | `PWSTokens.swift` | `PwsFormula.kt` |
| Perceptron | `formulas.ts` | `PWSTokens.swift` | `PwsFormula.kt` |
| CLO model | `clothing.ts` | `PWSTokens.swift` | `PwsFormula.kt` |
| Feature vector | `formulas.ts` | `PWSTokens.swift` | `PwsFormula.kt` |

This guarantees identical predictions regardless of platform.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode 15+ (iOS)
- Android Studio + JDK 21 (Android)
- Supabase project ([free tier](https://supabase.com/pricing))

### Setup

```bash
git clone https://github.com/Great-Grace/PWS.git
cd PWS/app
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm install
```

### Build & Run

```bash
# iOS
open apps/ios-native/PWSNativePreview.xcodeproj
# Xcode → PWSNativePreview target → Run

# Android
npm run native:android:debug
```

### Run Tests

```bash
npm test                        # TypeScript (shared domain)
npm run native:ios:verify       # iOS build + tests
npm run native:android:verify   # Android build + tests
```

---

## Test Coverage

| Platform | Test Files | Tests | Lines |
|---|---|---|---|
| TypeScript | 11 | ~35 assertions | 1,032 |
| iOS Swift | 4 | 41 tests | 1,088 |
| Android Kotlin | 19 | ~96 tests | 2,265 |
| **Total** | **34** | **~172** | **4,385** |

Tests cover: UTCI polynomial accuracy, feature vector normalization, perceptron weight updates, CLO calculations, weather API parsing, auth contracts, and release readiness gates.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

**Quick links for contributors:**

- 🧠 **ML improvements**: New features, weight optimization, alternative thermal comfort models
- 📱 **Platform expansion**: Flutter, Web, watchOS
- 📊 **Datasets**: Weather feedback data collection and release
- 📖 **Documentation**: API docs, usage guides, paper translations
- 🌐 **Localization**: English, Japanese, and other languages

---

## Security

- No hardcoded secrets in source code
- All API keys loaded from environment variables at build time
- `.env` is gitignored and was never committed
- Supabase Row-Level Security (RLS) enforced
- Account deletion with full data cleanup

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## Citation

If you use the UTCI implementation from this project:

```bibtex
@software{pws2026,
  title  = {PWS: Personal Weather Sensitivity},
  author = {Great-Grace},
  year   = {2026},
  url    = {https://github.com/Great-Grace/PWS}
}
```

Original UTCI paper:

```bibtex
@article{brode2012utci,
  title   = {Derivation of the UTCI},
  author  = {Brode, Peter and others},
  journal = {International Journal of Biometeorology},
  volume  = {56},
  number  = {3},
  pages   = {481--495},
  year    = {2012}
}
```

---

<p align="center">
  Built with ☀️ by <a href="https://github.com/Great-Grace">Great-Grace</a>
</p>
