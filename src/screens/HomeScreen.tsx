// ============================================================
// Home Screen — light minimal redesign (v2.0)
// · Noto Serif 감성 헤드라인
// · 날씨 카드 + 시간별 바 차트
// · 추천 옷차림 카드
// · 피드백 CTA 카드
// · 3슬롯 하단 바
// ============================================================
import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors, spacing, fontSize, fontWeight, borderRadius,
  FEEL_HEADLINE, FEEL_LABELS,
  CLOTHING_ITEM_DEFS,
} from '../theme';
import type { Wardrobe } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useWeatherStore } from '../stores/weatherStore';
import { useFeedbackStore } from '../stores/feedbackStore';
import { getDefaultSlot } from '../utils/formulas';
import { COLD_START_THRESHOLD } from '../utils/constants';
import type { FeedbackSlot } from '../types';

// ---- 기온 구간별 권장 CLO 범위 ----
// CLO 목표값: 더울수록 낮게, 추울수록 높게
function targetCloRange(temp: number): { min: number; max: number } {
  if (temp < 0)  return { min: 1.20, max: 99  };
  if (temp < 5)  return { min: 0.80, max: 1.30 };
  if (temp < 10) return { min: 0.55, max: 0.90 };
  if (temp < 15) return { min: 0.35, max: 0.60 };
  if (temp < 20) return { min: 0.20, max: 0.40 };
  if (temp < 25) return { min: 0.09, max: 0.25 };
  return                { min: 0.00, max: 0.15 };
}

// ---- 옷장 기반 상의 추천 ----
// 1. 사용자 옷장에서 목표 CLO 범위에 맞는 아이템을 착용 횟수 기준으로 정렬
// 2. 없으면 전체 카탈로그에서 가장 가까운 아이템 폴백
function getOutfitFromWardrobe(
  temp: number,
  wardrobe: Wardrobe,
): { top: string; bottom: string; outer: string | null } {
  const { min, max } = targetCloRange(temp);

  // 옷장에 있는 아이템 (착용 기록 있는 것)
  const ownedItems = CLOTHING_ITEM_DEFS.filter(
    def => (wardrobe[def.id as keyof Wardrobe] ?? 0) > 0
  );

  // 목표 CLO 범위에 드는 아이템 중 착용 횟수가 많은 것 우선
  const candidates = ownedItems
    .filter(def => def.clo >= min && def.clo <= max)
    .sort((a, b) =>
      (wardrobe[b.id as keyof Wardrobe] ?? 0) - (wardrobe[a.id as keyof Wardrobe] ?? 0)
    );

  let topLabel: string;
  if (candidates.length > 0) {
    // 상위 2개 아이템을 조합해서 표시
    const pick = candidates.slice(0, 2).map(c => c.label);
    topLabel = pick.join(' + ');
  } else if (ownedItems.length > 0) {
    // 범위 내 없으면 CLO가 가장 가까운 옷장 아이템
    const midClo = (min + max) / 2;
    const closest = ownedItems.reduce((prev, curr) =>
      Math.abs(curr.clo - midClo) < Math.abs(prev.clo - midClo) ? curr : prev
    );
    topLabel = closest.label;
  } else {
    // 옷장 데이터 없음 → 카탈로그 기반 폴백
    topLabel = getDefaultTop(temp);
  }

  return {
    top:    topLabel,
    bottom: getDefaultBottom(temp),
    outer:  getDefaultOuter(temp),
  };
}

function getDefaultTop(temp: number): string {
  if (temp < 5)  return '두꺼운 니트';
  if (temp < 10) return '캐시미어 니트';
  if (temp < 15) return '얇은 니트';
  if (temp < 20) return '얇은 셔츠';
  return '반팔 티셔츠';
}

function getDefaultBottom(temp: number): string {
  if (temp < 5)  return '기모 바지';
  if (temp < 10) return '울 슬랙스';
  if (temp < 15) return '슬랙스';
  return '면바지';
}

function getDefaultOuter(temp: number): string | null {
  if (temp < 5)  return '롱패딩';
  if (temp < 10) return '울 코트';
  if (temp < 15) return '가벼운 코트';
  if (temp < 20) return '가디건';
  return null;
}

// ---- 신뢰도 → 퍼센트 ----
function toConfidencePct(c: string): number | null {
  if (c === 'high')   return 85;
  if (c === 'medium') return 65;
  if (c === 'low')    return 45;
  return null;
}

const SLOT_LABELS: Record<FeedbackSlot, string> = {
  morning:   '아침',
  afternoon: '낮',
  evening:   '저녁',
};

// ---- 메트릭 셀 ----
function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const {
    data: weather,
    fetchWeather,
    isLoading: weatherLoading,
    error: weatherError,
  } = useWeatherStore();
  const {
    todayFeedback,
    prediction,
    feedbackCount,
    fetchTodayStatus,
    fetchTodayPrediction,
    fetchFeedbackCount,
  } = useFeedbackStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const LAT = useMemo(() => user?.default_lat  || 37.5665,  [user?.default_lat]);
  const LNG = useMemo(() => user?.default_lng  || 126.9780, [user?.default_lng]);

  useEffect(() => {
    Promise.all([
      fetchWeather(LAT, LNG),
      fetchTodayStatus(),
      fetchTodayPrediction(),
      fetchFeedbackCount(),
    ]);
  }, [LAT, LNG]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchWeather(LAT, LNG, true),
      fetchTodayStatus(),
      fetchTodayPrediction(),
      fetchFeedbackCount(),
    ]);
    setRefreshing(false);
  };

  const current    = weather?.current;
  const todayDaily = weather?.daily?.[0];
  const hourly     = weather?.hourly || [];

  const currentSlot: FeedbackSlot = getDefaultSlot(new Date().getHours());
  const doneSlotsSet = new Set(todayFeedback.map(f => f.feedback_slot));
  const allSlotsDone = doneSlotsSet.size >= 3;

  // 헤드라인용 슬롯 예측: 현재 → 오후 → 오전 → 저녁
  const primaryForecast = useMemo(() => {
    if (!prediction) return null;
    return prediction[currentSlot]
      ?? prediction.afternoon
      ?? prediction.morning
      ?? prediction.evening;
  }, [prediction, currentSlot]);

  const headlineScore = primaryForecast
    ? Math.round(Math.max(1, Math.min(7, primaryForecast.feel)))
    : null;
  const confidencePct = primaryForecast ? toConfidencePct(primaryForecast.confidence) : null;

  // 시간별 바 차트 데이터 (6·9·12·15·18·21시)
  const chartData = useMemo(() => {
    if (!hourly.length) return [];
    const currentHour = new Date().getHours();
    const targets = [6, 9, 12, 15, 18, 21];
    const points = targets.map(targetHour => {
      const today = new Date(); today.setHours(targetHour, 0, 0, 0);
      const ts = today.getTime() / 1000;
      const h = hourly.reduce((a, b) =>
        Math.abs(a.dt - ts) < Math.abs(b.dt - ts) ? a : b
      );
      return { hour: targetHour, temp: h.temp };
    });
    // 현재 시각에 가장 가까운 바
    const closestHour = points.reduce((prev, curr) =>
      Math.abs(curr.hour - currentHour) < Math.abs(prev.hour - currentHour) ? curr : prev
    ).hour;
    return points.map(p => ({ ...p, isCurrent: p.hour === closestHour }));
  }, [hourly]);

  const chartTemps = chartData.map(d => d.temp);
  const chartMin = chartTemps.length ? Math.min(...chartTemps) : 0;
  const chartMax = chartTemps.length ? Math.max(...chartTemps) : 1;
  const BAR_MAX_H = 52;
  const BAR_MIN_H = 12;

  const outfit = current
    ? getOutfitFromWardrobe(current.temp, user?.wardrobe ?? {})
    : null;
  const pop    = todayDaily ? Math.round(todayDaily.pop * 100) : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textTertiary} />
        }
      >
        {/* ── 헤드라인 ── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroCaption}>오늘의 체감</Text>
          <Text style={styles.heroHeadline}>
            {headlineScore
              ? FEEL_HEADLINE[headlineScore]
              : weatherLoading
                ? '날씨 불러오는 중...'
                : weatherError
                  ? '날씨 정보를\n불러오지 못했어요'
                  : '체감 예측을\n준비 중이에요'}
          </Text>
          {confidencePct !== null && (
            <View style={styles.confidenceRow}>
              <View style={styles.confidenceLine} />
              <Text style={styles.confidenceText}>예측 신뢰도 {confidencePct}%</Text>
            </View>
          )}
          {!prediction && !weatherLoading && (
            <View style={styles.confidenceRow}>
              <View style={styles.confidenceLine} />
              <Text style={styles.confidenceText}>
                피드백 {feedbackCount}/{COLD_START_THRESHOLD} 누적 중
              </Text>
            </View>
          )}
        </View>

        {/* ── 날씨 카드 ── */}
        {current ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('WeatherDetail')}
            activeOpacity={0.85}
          >
            <Text style={styles.cardCaption}>현재 날씨</Text>

            <View style={styles.weatherTop}>
              <Text style={styles.weatherTemp}>{Math.round(current.temp)}°</Text>
              <View style={styles.weatherRight}>
                <Text style={styles.weatherDesc}>{current.weather_desc}</Text>
                {todayDaily && (
                  <Text style={styles.weatherMinMax}>
                    최저 {Math.round(todayDaily.temp_min)}° · 최고 {Math.round(todayDaily.temp_max)}°
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.metricsGrid}>
              <View style={styles.metricsRow}>
                <MetricCell label="습도"   value={`${current.humidity}%`} />
                <View style={styles.metricVDivider} />
                <MetricCell label="강수"   value={pop !== null ? `${pop}%` : '-'} />
              </View>
              <View style={styles.divider} />
              <View style={styles.metricsRow}>
                <MetricCell label="바람"   value={`${current.wind_speed.toFixed(1)}m/s`} />
                <View style={styles.metricVDivider} />
                <MetricCell label="자외선" value="낮음" />
              </View>
            </View>

            {chartData.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.cardCaption}>시간별 기온</Text>
                <View style={styles.barChart}>
                  {chartData.map(({ hour, temp, isCurrent }) => {
                    const ratio = chartMax > chartMin
                      ? (temp - chartMin) / (chartMax - chartMin)
                      : 0.5;
                    const barH = Math.round(BAR_MIN_H + ratio * (BAR_MAX_H - BAR_MIN_H));
                    return (
                      <View key={hour} style={styles.barItem}>
                        {isCurrent && (
                          <Text style={styles.barTempLabel}>{Math.round(temp)}°</Text>
                        )}
                        <View style={[styles.bar, { height: barH }, isCurrent && styles.barCurrent]} />
                        <Text style={styles.barHourLabel}>{hour}시</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </TouchableOpacity>
        ) : weatherError ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>날씨 데이터를 불러오지 못했습니다</Text>
            <Text style={styles.errorDetail}>{weatherError}</Text>
          </View>
        ) : null}

        {/* ── 추천 옷차림 카드 ── */}
        {outfit && (
          <View style={styles.card}>
            <View style={styles.outfitCardHeader}>
              <Text style={styles.cardCaption}>추천 옷차림</Text>
              {user?.wardrobe && Object.keys(user.wardrobe).length > 0 && (
                <Text style={styles.wardrobeHint}>내 옷장 기반</Text>
              )}
            </View>
            {[
              { label: '상의',   value: outfit.top    },
              { label: '하의',   value: outfit.bottom  },
              ...(outfit.outer ? [{ label: '아우터', value: outfit.outer }] : []),
            ].map(({ label, value }, i, arr) => (
              <View
                key={label}
                style={[styles.outfitRow, i < arr.length - 1 && styles.outfitRowDivider]}
              >
                <Text style={styles.outfitLabel}>{label}</Text>
                <Text style={styles.outfitValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 피드백 CTA 카드 ── */}
        {allSlotsDone ? (
          <View style={styles.card}>
            <Text style={styles.cardCaption}>오늘 체감 기록 완료</Text>
            <Text style={styles.ctaDoneText}>모든 시간대 입력됐어요</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Feedback')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardCaption}>오늘 어떻게 느끼셨나요?</Text>
            <View style={styles.ctaRow}>
              <Text style={styles.ctaTitle}>오늘 체감 기록하기</Text>
              <View style={styles.ctaArrowCircle}>
                <Text style={styles.ctaArrow}>›</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ── 3슬롯 하단 ── */}
        {prediction ? (
          <View style={styles.slotRow}>
            {(['morning', 'afternoon', 'evening'] as FeedbackSlot[]).map(slot => {
              const f = prediction[slot];
              const score = Math.round(Math.max(1, Math.min(7, f.feel)));
              const isDone    = doneSlotsSet.has(slot);
              const isCurrent = slot === currentSlot;
              return (
                <View key={slot} style={[styles.slotCard, isCurrent && styles.slotCardCurrent]}>
                  <Text style={styles.slotLabel}>{SLOT_LABELS[slot]}</Text>
                  <Text style={styles.slotFeelLabel}>{FEEL_LABELS[score]}</Text>
                  {f.temp !== null && (
                    <Text style={styles.slotTemp}>{Math.round(f.temp)}°</Text>
                  )}
                  {isDone && <Text style={styles.slotDone}>✓</Text>}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.card, styles.coldStartCard]}>
            <Text style={styles.coldStartTitle}>나만의 예측 준비 중</Text>
            <Text style={styles.coldStartDesc}>
              피드백 {COLD_START_THRESHOLD}회 누적 시 활성화 ({feedbackCount}/{COLD_START_THRESHOLD})
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },

  // Hero
  heroSection:    { paddingVertical: spacing.lg, marginBottom: spacing.md },
  heroCaption:    { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm, letterSpacing: 0.3 },
  heroHeadline:   {
    fontFamily: 'NotoSerifKR_400Regular',
    fontSize:   fontSize.display,
    color:      colors.textPrimary,
    lineHeight: Math.round(fontSize.display * 1.25),
    marginBottom: spacing.md,
  },
  confidenceRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  confidenceLine: { width: 32, height: 1, backgroundColor: colors.textTertiary },
  confidenceText: { fontSize: fontSize.sm, color: colors.textTertiary },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius:    borderRadius.xl,
    padding:         spacing.lg,
    marginBottom:    spacing.md,
  },
  cardCaption: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  divider:     { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },

  // Weather top
  weatherTop:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.xs },
  weatherTemp:   { fontSize: 64, fontWeight: fontWeight.bold, color: colors.textPrimary, lineHeight: 72 },
  weatherRight:  { alignItems: 'flex-end' },
  weatherDesc:   { fontSize: fontSize.lg, color: colors.textPrimary, fontWeight: fontWeight.medium },
  weatherMinMax: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  // Metrics grid
  metricsGrid:    {},
  metricsRow:     { flexDirection: 'row', alignItems: 'stretch' },
  metricCell:     { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  metricVDivider: { width: 1, backgroundColor: colors.divider, marginHorizontal: spacing.md },
  metricLabel:    { fontSize: fontSize.sm, color: colors.textTertiary },
  metricValue:    { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },

  // Bar chart
  barChart:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 88, marginTop: spacing.xs },
  barItem:       { alignItems: 'center', flex: 1 },
  barTempLabel:  { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  bar:           { width: 20, borderRadius: 4, backgroundColor: colors.surfaceSecondary },
  barCurrent:    { backgroundColor: colors.textSecondary },
  barHourLabel:  { fontSize: 10, color: colors.textTertiary, marginTop: 4 },

  // Error card
  errorCard:   { backgroundColor: '#FFF5F5' },
  errorText:   { fontSize: fontSize.md, color: colors.error, marginBottom: spacing.xs },
  errorDetail: { fontSize: fontSize.xs, color: colors.textTertiary },

  // Outfit card
  outfitCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  wardrobeHint:     { fontSize: fontSize.xs, color: colors.textTertiary },
  outfitRow:       { flexDirection: 'row', alignItems: 'baseline', paddingVertical: spacing.sm },
  outfitRowDivider:{ borderBottomWidth: 1, borderBottomColor: colors.divider },
  outfitLabel:     { fontSize: fontSize.sm, color: colors.textTertiary, width: 48 },
  outfitValue:     { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary, flex: 1 },

  // CTA card
  ctaRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  ctaTitle:       { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  ctaDoneText:    { fontSize: fontSize.md, color: colors.textTertiary },
  ctaArrowCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaArrow: { fontSize: 22, color: colors.textSecondary, lineHeight: 26 },

  // 3-slot row
  slotRow:        { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  slotCard:       {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: borderRadius.xl, padding: spacing.md,
    alignItems: 'center',
  },
  slotCardCurrent: { backgroundColor: colors.surfaceSecondary },
  slotLabel:      { fontSize: fontSize.xs, color: colors.textTertiary, marginBottom: spacing.xs },
  slotFeelLabel:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 2 },
  slotTemp:       { fontSize: fontSize.sm, color: colors.textSecondary },
  slotDone:       { fontSize: fontSize.xs, color: colors.success, marginTop: 2 },

  // Cold start
  coldStartCard:  { alignItems: 'center' },
  coldStartTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 4 },
  coldStartDesc:  { fontSize: fontSize.sm, color: colors.textTertiary },
});
