// ============================================================
// Home Screen — 날씨 대시보드 (v1.2)
// · 3-slot 체감 예측 카드 (아침 / 낮 / 저녁)
// · 온디바이스 퍼셉트론 결과 표시
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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';
import { useWeatherStore } from '../stores/weatherStore';
import { useFeedbackStore } from '../stores/feedbackStore';
import {
  getWeatherEmoji,
  getFeelInfo,
  getConfidenceLabel,
  getSlotFromHour,
  formatHour,
} from '../utils/formulas';
import { COLD_START_THRESHOLD } from '../utils/constants';
import type { FeedbackSlot } from '../types';
import type { SlotForecast } from '../stores/feedbackStore';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { data: weather, fetchWeather, isLoading: weatherLoading, error: weatherError } = useWeatherStore();
  const {
    todayFeedback,
    prediction,
    feedbackCount,
    fetchTodayStatus,
    fetchTodayPrediction,
    fetchFeedbackCount,
  } = useFeedbackStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const LAT           = useMemo(() => user?.default_lat  || 37.5665,  [user?.default_lat]);
  const LNG           = useMemo(() => user?.default_lng  || 126.9780, [user?.default_lng]);
  const LOCATION_NAME = user?.climate_zone || '위치 정보 없음';

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

  // 현재 슬롯 & 피드백 완료 여부
  const currentSlot: FeedbackSlot | null = getSlotFromHour(new Date().getHours());
  const doneSlotsSet = new Set(todayFeedback.map(f => f.feedback_slot));
  const currentSlotDone = currentSlot ? doneSlotsSet.has(currentSlot) : false;
  const allSlotsDone    = doneSlotsSet.size >= 3;

  // 일교차
  const tempRange = todayDaily
    ? Math.round(todayDaily.temp_max - todayDaily.temp_min)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>안녕하세요, {user?.nickname}님 👋</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── HERO ── */}
        {weatherLoading && !current && !weatherError && (
          <View style={styles.heroSection}>
            <Text style={styles.heroDesc}>날씨 정보를 불러오는 중...</Text>
          </View>
        )}

        {weatherError && (
          <View style={[styles.heroSection, styles.errorBox]}>
            <Text style={styles.heroEmoji}>⚠️</Text>
            <Text style={styles.heroDesc}>날씨 데이터를 불러오지 못했습니다.</Text>
            <Text style={styles.errorText}>
              OpenWeatherMap API 키 설정이 안 되었거나 활성화가 안 되었을 수 있습니다.
            </Text>
            <Text style={styles.errorSystemText}>{weatherError}</Text>
          </View>
        )}

        {current && !weatherError && (
          <View style={styles.heroSection}>
            <Text style={styles.heroLocation}>📍 {LOCATION_NAME}</Text>
            <View style={styles.heroMain}>
              <Text style={styles.heroTemp}>{Math.round(current.temp)}°</Text>
              <Text style={styles.heroEmoji}>{getWeatherEmoji(current.weather_code)}</Text>
            </View>
            <Text style={styles.heroDesc}>{current.weather_desc}</Text>
            {todayDaily && (
              <Text style={styles.heroHighLow}>
                최고 {Math.round(todayDaily.temp_max)}°   최저 {Math.round(todayDaily.temp_min)}°
                {tempRange !== null && tempRange >= 8 && (
                  <Text style={styles.heroRangeWarn}>  일교차 {tempRange}°</Text>
                )}
              </Text>
            )}
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMetaText}>습도 {current.humidity}%</Text>
              <Text style={styles.heroMetaDivider}>•</Text>
              <Text style={styles.heroMetaText}>바람 {current.wind_speed.toFixed(1)}m/s</Text>
            </View>
          </View>
        )}

        {/* ── 3-SLOT PREDICTION ── */}
        <View style={styles.predictionSection}>
          <Text style={styles.sectionTitle}>오늘의 내 체감 예측</Text>

          {prediction ? (
            <View style={styles.slotRow}>
              {SLOT_DISPLAY.map(({ slot, icon, label }) => (
                <SlotCard
                  key={slot}
                  icon={icon}
                  label={label}
                  forecast={prediction[slot]}
                  isCurrent={slot === currentSlot}
                  isDone={doneSlotsSet.has(slot)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.coldStartBanner}>
              <View style={styles.coldStartIcon}>
                <Text style={styles.coldStartEmoji}>🌱</Text>
              </View>
              <View style={styles.coldStartText}>
                <Text style={styles.coldStartTitle}>나만의 체감 예측 준비 중</Text>
                <Text style={styles.coldStartDesc}>
                  피드백 {COLD_START_THRESHOLD}회 누적 시 활성화 ({feedbackCount}/{COLD_START_THRESHOLD})
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── HOURLY ── */}
        {hourly.length > 0 && (
          <View style={styles.hourlySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>시간별 예보</Text>
              <TouchableOpacity onPress={() => navigation.navigate('WeatherDetail')}>
                <Text style={styles.moreText}>주간 예보 보기 →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyList}>
              {hourly.map((h, i) => (
                <View key={i} style={styles.hourlyItem}>
                  <Text style={styles.hourlyTime}>{i === 0 ? '지금' : formatHour(h.dt)}</Text>
                  <Text style={styles.hourlyEmoji}>{getWeatherEmoji(h.weather_code)}</Text>
                  <Text style={styles.hourlyTemp}>{Math.round(h.temp)}°</Text>
                  {h.pop > 0.1
                    ? <Text style={styles.hourlyPop}>💧{Math.round(h.pop * 100)}%</Text>
                    : <Text style={styles.hourlyPopEmpty}>-</Text>
                  }
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── FEEDBACK CTA ── */}
        <View style={styles.ctaContainer}>
          {allSlotsDone ? (
            <View style={styles.feedbackDone}>
              <Text style={styles.feedbackDoneEmoji}>✅</Text>
              <Text style={styles.feedbackDoneText}>오늘 모든 시간대 피드백 완료!</Text>
            </View>
          ) : currentSlotDone ? (
            <View style={styles.feedbackPartial}>
              <Text style={styles.feedbackPartialText}>
                이 시간대 완료 ({doneSlotsSet.size}/3)
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Feedback')}>
                <Text style={styles.feedbackPartialLink}>다음 시간대 입력 →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.feedbackCTA}
              onPress={() => navigation.navigate('Feedback')}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaEmoji}>📝</Text>
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>
                  {currentSlot
                    ? `${['오전 8시', '오후 1시', '오후 6시'][['morning','afternoon','evening'].indexOf(currentSlot)]} 피드백`
                    : '오늘 날씨 어떠셨나요?'}
                </Text>
                <Text style={styles.ctaSubtitle}>
                  체감 피드백으로 예측을 정교하게 만드세요 ({doneSlotsSet.size}/3)
                </Text>
              </View>
              <Text style={styles.ctaArrow}>→</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- 슬롯 표시 설정 ----
const SLOT_DISPLAY: { slot: FeedbackSlot; icon: string; label: string }[] = [
  { slot: 'morning',   icon: '🌅', label: '오전 8시' },
  { slot: 'afternoon', icon: '☀️', label: '오후 1시' },
  { slot: 'evening',   icon: '🌆', label: '오후 6시' },
];

// ---- Slot Card ----
function SlotCard({
  icon,
  label,
  forecast,
  isCurrent,
  isDone,
}: {
  icon:      string;
  label:     string;
  forecast:  SlotForecast;
  isCurrent: boolean;
  isDone:    boolean;
}) {
  const feelInfo = getFeelInfo(forecast.feel, forecast.humidity ?? undefined);

  return (
    <View style={[styles.slotCard, isCurrent && styles.slotCardCurrent]}>
      {/* 슬롯 헤더 */}
      <View style={styles.slotHeader}>
        <Text style={styles.slotIcon}>{icon}</Text>
        <Text style={styles.slotLabel}>{label}</Text>
        {isDone && <Text style={styles.slotDoneTag}>✓</Text>}
      </View>

      {/* 예측 기온 */}
      {forecast.temp !== null && (
        <Text style={styles.slotTemp}>{Math.round(forecast.temp)}°</Text>
      )}

      {/* 체감 레이블 */}
      <Text style={styles.slotFeelEmoji}>{feelInfo.emoji}</Text>
      <Text style={styles.slotFeelLabel}>{feelInfo.label}</Text>

      {/* Confidence */}
      <Text style={[
        styles.slotConfidence,
        forecast.confidence === 'cold_start' && styles.slotConfidenceColdStart,
      ]}>
        {getConfidenceLabel(forecast.confidence)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting:    { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  settingsIcon:{ fontSize: 24 },
  scroll:      { paddingBottom: spacing.xxl * 2 },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  heroLocation: {
    fontSize: fontSize.lg, color: colors.textPrimary,
    fontWeight: fontWeight.semibold, marginBottom: spacing.md, letterSpacing: 0.5,
  },
  heroMain:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  heroTemp:    { fontSize: 90, fontWeight: fontWeight.bold, color: colors.textPrimary, letterSpacing: -2, marginLeft: 20 },
  heroEmoji:   { fontSize: 60, marginLeft: spacing.sm },
  heroDesc:    { fontSize: fontSize.xl, color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: fontWeight.medium },
  heroHighLow: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  heroRangeWarn: { fontSize: fontSize.md, color: colors.warning, fontWeight: fontWeight.semibold },
  heroMetaRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  heroMetaText:    { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.medium },
  heroMetaDivider: { color: colors.textTertiary, marginHorizontal: spacing.sm },
  errorBox: {
    backgroundColor: 'rgba(255, 100, 100, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.5)',
  },
  errorText:       { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md },
  errorSystemText: { fontSize: fontSize.xs, color: colors.error, textAlign: 'center', marginTop: spacing.sm },

  // Prediction Section
  predictionSection: { marginHorizontal: spacing.lg, marginBottom: spacing.xl },
  sectionTitle:      { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },

  // 3-slot row
  slotRow:   { flexDirection: 'row', gap: spacing.sm },
  slotCard:  {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotCardCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  slotHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: 4 },
  slotIcon:      { fontSize: 14 },
  slotLabel:     { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  slotDoneTag:   { fontSize: fontSize.xs, color: colors.success, marginLeft: 2 },
  slotTemp:      { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: 2 },
  slotFeelEmoji: { fontSize: 22, marginBottom: 2 },
  slotFeelLabel: { fontSize: fontSize.xs, color: colors.textPrimary, fontWeight: fontWeight.semibold, textAlign: 'center', marginBottom: 4 },
  slotConfidence:{ fontSize: 10, color: colors.textTertiary },
  slotConfidenceColdStart: { color: colors.warning },

  // Cold Start
  coldStartBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  coldStartIcon:  { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  coldStartEmoji: { fontSize: 20 },
  coldStartText:  { flex: 1 },
  coldStartTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: 2 },
  coldStartDesc:  { fontSize: fontSize.sm, color: colors.textSecondary },

  // Hourly
  hourlySection: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  moreText:      { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  hourlyList:    { paddingHorizontal: spacing.lg, gap: spacing.sm },
  hourlyItem:    { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.xl, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center', width: 64 },
  hourlyTime:    { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.sm },
  hourlyEmoji:   { fontSize: 24, marginBottom: spacing.sm },
  hourlyTemp:    { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  hourlyPop:     { fontSize: 10, color: colors.primaryLight, marginTop: spacing.xs, fontWeight: fontWeight.semibold },
  hourlyPopEmpty:{ fontSize: 10, color: 'transparent', marginTop: spacing.xs },

  // CTA
  ctaContainer: { paddingHorizontal: spacing.lg },
  feedbackCTA:  {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderColor: colors.primary,
  },
  ctaEmoji:    { fontSize: 32 },
  ctaContent:  { flex: 1 },
  ctaTitle:    { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: 2 },
  ctaSubtitle: { fontSize: fontSize.sm, color: colors.primaryLight },
  ctaArrow:    { fontSize: fontSize.xl, color: colors.primary, fontWeight: fontWeight.bold },

  feedbackDone: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.sm,
  },
  feedbackDoneEmoji: { fontSize: 20 },
  feedbackDoneText:  { fontSize: fontSize.md, color: colors.success, fontWeight: fontWeight.medium },

  feedbackPartial: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl, padding: spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  feedbackPartialText: { fontSize: fontSize.md, color: colors.textSecondary },
  feedbackPartialLink: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.semibold },

  // Outfit (레거시 — LLM 유료 기능에서 재사용)
  outfitChip:  { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center' },
  outfitLabel: { fontSize: fontSize.xs, color: colors.textTertiary, marginBottom: 2 },
  outfitValue: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.semibold },
});
