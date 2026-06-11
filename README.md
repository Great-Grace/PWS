<p align="center">
  <h1 align="center">PWS — Personal Weather Sensitivity</h1>
  <p align="center">
    <strong>온디바이스 ML로 개인화된 체감 온도를 예측하는 오픈소스 모바일 엔진</strong>
  </p>
  <p align="center">
    <a href="#getting-started">Getting Started</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#ml-engine">ML Engine</a> ·
    <a href="CONTRIBUTING.md">Contributing</a> ·
    <a href="LICENSE">License</a>
  </p>
</p>

---

## Why PWS?

기존 날씨 앱은 모든 사용자에게 동일한 "체감 온도"를 보여줍니다. 하지만 같은 25°C라도
체질, 활동량, 옷차림, 수면 상태에 따라每个人的感受完全不同.

**PWS는 UTCI(Universal Thermal Climate Index) 열쾌적 지수를 기반으로, 온디바이스
퍼셉트론이 사용자 피드백을 통해 학습하여 개별화된 체감 온도를 예측합니다.**

### 핵심 가치

| 기존 날씨 앱 | PWS |
|---|---|
| 고정된 체감 온도 공식 | 사용자별 학습된 가중치 |
| 서버 ML 의존 | 외부 전송 없는 온디바이스 추론 |
| 열쾌적 모델 없음 | Brode et al. 2012 UTCI 126항 다항식 |
| 플랫폼별 분산 구현 | TypeScript/Swift/Kotlin 수학적 동치 |

---

## ML Engine

PWS의 핵심은 **open-source thermal comfort ML engine**입니다.
이 모듈은任何 날씨 앱이나 IoT 프로젝트에 독립적으로 통합할 수 있습니다.

### UTCI Polynomial (Brode et al. 2012)

기상학계 표준인 Universal Thermal Climate Index를 6차 다항식으로 구현했습니다.

```
UTCI = f(Ta, ΔT, va, Tmrt)  // 126 terms, 6th-order polynomial
```

- **참고 문헌**: Brode, P., et al. (2012). "Derivation of the UTCI." *International Journal of Biometeorology*, 56(3), 481–495.
- **구현**: `shared/domain/formulas.ts` (782 lines)

### 11-Dimensional Feature Vector

```typescript
features = [
  norm_temp,           // 정규화된 기온
  norm_humidity,       // 정규화된 습도
  norm_wind,           // 정규화된 풍속
  norm_tmrt,           // 평균 복사 온도
  heat_index_bonus,    // 열지수 비선형 항
  wind_chill_penalty,  // 풍한 비선형 항
  precipitation,       // 강수 여부
  sin_hour, cos_hour,  // 시간 순환 인코딩
  sin_season, cos_season // 계절 순환 인코딩
]
```

### On-Device Perceptron

사용자 1명당 시간대별(아침/오후/저녁) 3개의 독립적인 퍼셉트론:

```
prediction = clamp(dot(weights, features) + bias, 1, 7)

// SGD online learning with L2 regularization
weights -= lr * (gradient + lambda * weights)
```

- **학습률**: 0.02 | **L2 정규화**: 0.001
- **피드백 7단계**: 매우 추움 → 매우 더움 (ordinal scale)
- **신뢰도 시스템**: cold_start(<7) → low(7-14) → medium(15-29) → high(30+)

### CLO Clothing Insulation Model

열공학 표준 CLO(Clothing Insulation) 값을 사용하여 옷차림의 열효과를 정량화:

| 옷차림 | CLO 값 |
|---|---|
| 민소매 | 0.04 |
| 반팔 티셔츠 | 0.08 |
| 긴팔 셔츠 | 0.15 |
| 얇은 자켓 | 0.25 |
| 두꺼운 코트 | 1.00 |

---

## Architecture

```
PWS/
├── shared/domain/          # 공유 ML 엔진 (TypeScript, 참조 구현)
│   ├── formulas.ts         # UTCI 다항식 + 특성 엔지니어링 + 퍼셉트론
│   ├── clothing.ts         # CLO 단열값 모델
│   ├── prediction.ts       # 신뢰도 해석
│   └── weatherData.ts      # 기상 API 파서
│
├── apps/ios-native/        # iOS (Swift/SwiftUI)
│   └── PWSNativePreview/
│       ├── Domain/         # Contract 패턴 + Repository 패턴
│       ├── Features/       # Home, Feedback, History, Settings
│       └── Design/         # Apple-inspired design system
│
├── apps/android-native/    # Android (Kotlin/Jetpack Compose)
│   └── app/src/main/java/
│       └── com.wxxtae.pws.nativepreview/
│           ├── domain/     # Reducer 패턴 + NativeSession
│           └── ui/         # Compose screens
│
└── supabase/               # Backend (Auth, Postgres, Edge Functions)
    └── functions/
        └── weather-onecall/ # 기상 API 프록시 (캐시 TTL 30분)
```

### Design Patterns

- **Contract Pattern**: iOS에서 URL 구성, 헤더 생성, 요청 직렬화를 캡슐화
- **Repository Pattern**: InMemory → Persistent → Supabase → Fallback 계층
- **Reducer Pattern**: Android에서 Redux/MVI 스타일 상태 관리
- **Constructor Injection**: 모든 의존성을 주입하여 테스트 용이성 확보

---

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode 15+ (iOS)
- Android Studio + JDK 21 (Android)
- Supabase 프로젝트 (무료 플랜)

### Setup

```bash
git clone https://github.com/Great-Grace/PWS.git
cd PWS/app
cp .env.example .env  # Supabase 키 설정
npm install
```

### iOS Build

```bash
open apps/ios-native/PWSNativePreview.xcodeproj
# Xcode에서 PWSNativePreview target → Archive
```

### Android Build

```bash
npm run native:android:debug
npm run native:android:release
```

### Run Tests

```bash
# TypeScript (shared domain)
npm test

# iOS
npm run native:ios:verify

# Android
npm run native:android:verify
```

---

## Test Coverage

| 플랫폼 | 테스트 파일 | 테스트 수 | 라인 수 |
|---|---|---|---|
| TypeScript | 11 | ~35 asserts | 1,032 |
| iOS Swift | 4 | 41 tests | 1,088 |
| Android Kotlin | 19 | ~96 tests | 2,265 |
| **Total** | **34** | **~172** | **4,385** |

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Ways to Contribute

- **ML 모델 개선**: 새로운 특성 추가, 가중치 최적화, 다른 열쾌적 모델 통합
- **플랫폼 확장**: Flutter, Web, watchOS 등 새 플랫폼 지원
- **데이터셋**: 기상 피드백 데이터셋 구축 및 공개
- **문서화**: API 문서, 사용 가이드, 논문 번역
- **번역**: 영어, 일본어 등 다국어 지원

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Citation

이 프로젝트의 UTCI 구현을 사용하는 경우 다음을 인용해 주세요:

```bibtex
@software{pws2026,
  title = {PWS: Personal Weather Sensitivity},
  author = {Great-Grace},
  year = {2026},
  url = {https://github.com/Great-Grace/PWS}
}
```

UTCI 원 논문:
```bibtex
@article{brode2012utci,
  title = {Derivation of the UTCI},
  author = {Brode, Peter and others},
  journal = {International Journal of Biometeorology},
  volume = {56},
  number = {3},
  pages = {481--495},
  year = {2012}
}
```
