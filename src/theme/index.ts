// PWS Design System — Light Mode
// 미니멀하고 조용한 UI. 숫자보다 '체감'을 언어로 먼저 보여줌.

export const colors = {
  // Base
  background:      '#FFFFFF',
  surface:         '#F5F5F5',
  surfaceSecondary:'#EBEBEB',
  surfaceElevated: '#EBEBEB',
  card:            '#F5F5F5',

  // Primary — Monochrome
  primary:         '#1A1A1A',
  primaryLight:    '#3D3D3D',
  primaryDark:     '#000000',

  // Text
  textPrimary:     '#1A1A1A',
  textSecondary:   '#8C8C8C',
  textTertiary:    '#BBBBBB',
  textInverse:     '#FFFFFF',

  // Utility
  border:          '#E0E0E0',
  divider:         '#E8E8E8',
  error:           '#C0392B',
  success:         '#27AE60',
  warning:         '#E67E22',

  // Feel Scale (1=매우 추움 → 7=매우 더움) — 차분한 톤
  feelVeryCold:    '#5B9BD5',
  feelCold:        '#74AEDE',
  feelChilly:      '#9DC3E6',
  feelNeutral:     '#70AD47',
  feelWarm:        '#ED7D31',
  feelHot:         '#C55A11',
  feelVeryHot:     '#A4262C',

  // Confidence
  confidenceLow:   '#E67E22',
  confidenceMedium:'#F39C12',
  confidenceHigh:  '#27AE60',

  // Overlay
  overlay:         'rgba(0, 0, 0, 0.4)',
  glassBg:         'rgba(255, 255, 255, 0.95)',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const fontSize = {
  xs:      11,
  sm:      13,
  md:      15,
  lg:      17,
  xl:      20,
  xxl:     28,
  display: 48,
} as const;

export const fontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
};

// 체감 헤드라인용 Serif 폰트 패밀리
export const serifFont = 'NotoSerifKR_400Regular';

// Feel score labels (1-7 scale)
export const FEEL_LABELS = [
  '', '아주 추움', '추움', '쌀쌀', '딱 좋음', '더움', '땀날듯', '완전 더움',
] as const;
export const FEEL_COLORS = [
  '',
  colors.feelVeryCold,
  colors.feelCold,
  colors.feelChilly,
  colors.feelNeutral,
  colors.feelWarm,
  colors.feelHot,
  colors.feelVeryHot,
] as const;

// 감성 체감 문구 (홈 헤드라인용)
export const FEEL_HEADLINE = [
  '',
  '아주 춥게\n느껴질 거예요',
  '꽤 춥게\n느껴질 거예요',
  '조금 쌀쌀하게\n느껴질 거예요',
  '딱 좋은 날씨예요',
  '따뜻하게\n느껴질 거예요',
  '좀 덥게\n느껴질 거예요',
  '많이 덥게\n느껴질 거예요',
] as const;

export const HUMID_LABELS    = ['', '매우 건조', '건조', '보통', '눅눅', '매우 눅눅'] as const;
export const WIND_LABELS     = ['바람 없음', '약간', '많이'] as const;
export const CLOTHING_LABELS = ['', '얇게', '보통', '두껍게'] as const;
export const ACTIVITY_LABELS = ['', '정적/실내', '보통', '야외/활발'] as const;
export const SUN_LABELS      = ['주로 실내', '반반', '야외 직사광'] as const;
export const SLEEP_LABELS    = ['', '못 잠', '보통', '잘 잠'] as const;
export const OUTDOOR_LABELS  = ['거의 안 나감', '1~2시간', '3~5시간', '6시간+'] as const;

// ---- 오늘의 옷차림 — 아이템별 정의 ----
// clo: ISO 9920 CLO 단위 (단열값). 두꺼울수록 높음.
export interface ClothingItemDef {
  id: string;
  label: string;
  clo: number;
}

export const CLOTHING_ITEM_DEFS: ClothingItemDef[] = [
  { id: 'sleeveless',    label: '민소매',         clo: 0.04 },
  { id: 'tshirt',        label: '반팔 티셔츠',    clo: 0.09 },
  { id: 'longsleeve',    label: '긴팔 티셔츠',    clo: 0.12 },
  { id: 'shirt',         label: '셔츠/블라우스',  clo: 0.15 },
  { id: 'knit_thin',     label: '얇은 니트',      clo: 0.20 },
  { id: 'sweatshirt',    label: '맨투맨',         clo: 0.24 },
  { id: 'hoodie',        label: '후드티',         clo: 0.28 },
  { id: 'hoodie_zip',    label: '후드집업',       clo: 0.28 },
  { id: 'knit_thick',    label: '두꺼운 니트',    clo: 0.36 },
  { id: 'fleece',        label: '플리스',         clo: 0.36 },
  { id: 'light_jacket',  label: '바람막이',       clo: 0.22 },
  { id: 'cardigan',      label: '가디건',         clo: 0.25 },
  { id: 'blazer',        label: '블레이저/자켓',  clo: 0.35 },
  { id: 'light_padding', label: '경량 패딩',      clo: 0.55 },
  { id: 'padding',       label: '패딩',           clo: 0.90 },
  { id: 'heavy_coat',    label: '두꺼운 코트',    clo: 1.00 },
] as const;

// CLO 합산 → clothing 척도 1-3 변환 임계값
// thin(<0.18), normal(0.18–0.40), thick(≥0.40)
export const CLO_THIN_MAX   = 0.18;
export const CLO_NORMAL_MAX = 0.40;
