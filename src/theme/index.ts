// PWS Design System — Dark Mode First
// 날씨 앱 특성상 다크 UI가 데이터 가독성 & 배터리 효율에 유리

export const colors = {
  // Base
  background: '#0F1120',
  surface: '#1A1D33',
  surfaceElevated: '#242845',
  card: '#1E2240',

  // Primary — Sky Blue gradient
  primary: '#4DA8FF',
  primaryLight: '#7EC4FF',
  primaryDark: '#2B7FD4',

  // Accent — Warm (체감 예측 강조)
  accent: '#FF8C42',
  accentLight: '#FFB07A',

  // Feel Scale Colors (1=very cold → 5=very hot)
  feelVeryCold: '#4A90D9',
  feelCold: '#7EC4FF',
  feelNeutral: '#6DD47E',
  feelWarm: '#FFB347',
  feelVeryHot: '#FF6B6B',

  // Confidence
  confidenceLow: '#FF8C42',
  confidenceMedium: '#FFD166',
  confidenceHigh: '#6DD47E',

  // Text
  textPrimary: '#F0F2FF',
  textSecondary: '#9DA3C2',
  textTertiary: '#5D6383',
  textInverse: '#0F1120',

  // Utility
  border: '#2A2E4A',
  divider: '#1E2240',
  error: '#FF6B6B',
  success: '#6DD47E',
  warning: '#FFD166',

  // Overlay
  overlay: 'rgba(15, 17, 32, 0.7)',
  glassBg: 'rgba(26, 29, 51, 0.85)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  display: 48,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Feel score labels
export const FEEL_LABELS = ['', '매우 추움', '추움', '적당', '더움', '매우 더움'] as const;
export const FEEL_COLORS = ['', colors.feelVeryCold, colors.feelCold, colors.feelNeutral, colors.feelWarm, colors.feelVeryHot] as const;

export const HUMID_LABELS = ['', '매우 건조', '건조', '보통', '눅눅', '매우 눅눅'] as const;
export const WIND_LABELS = ['바람 없음', '약간', '많이'] as const;
export const CLOTHING_LABELS = ['', '얇게', '보통', '두껍게'] as const;
export const ACTIVITY_LABELS = ['', '정적/실내', '보통', '야외/활발'] as const;
export const SUN_LABELS = ['주로 실내', '반반', '야외 직사광'] as const;
export const SLEEP_LABELS = ['', '못 잠', '보통', '잘 잠'] as const;
export const OUTDOOR_LABELS = ['거의 안 나감', '1~2시간', '3~5시간', '6시간+'] as const;
