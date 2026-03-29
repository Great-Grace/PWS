// ============================================================
// Home Screen — 날씨 대시보드
// 날씨앱으로서의 시각적 극대화 + 개인화 예측 통합
// ============================================================
import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';
import { useWeatherStore } from '../stores/weatherStore';
import { useFeedbackStore } from '../stores/feedbackStore';
import {
  getWeatherEmoji,
  getFeelInfo,
  getConfidenceLabel,
  formatHour,
} from '../utils/formulas';
import { COLD_START_THRESHOLD } from '../utils/constants';

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

  // Stabilize coordinates so useEffect doesn't re-fire unnecessarily
  const LAT = useMemo(() => user?.default_lat || 37.5665, [user?.default_lat]);
  const LNG = useMemo(() => user?.default_lng || 126.9780, [user?.default_lng]);
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

  const current = weather?.current;
  const todayDaily = weather?.daily?.[0];
  const hourly = weather?.hourly || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>안녕하세요, {user?.nickname}님 👋</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* =========================================
            HERO WEATHER DASHBOARD (Massive Focus)
            ========================================= */}
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
              </Text>
            )}

            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMetaText}>습도 {current.humidity}%</Text>
              <Text style={styles.heroMetaDivider}>•</Text>
              <Text style={styles.heroMetaText}>바람 {current.wind_speed.toFixed(1)}m/s</Text>
            </View>
          </View>
        )}

        {/* =========================================
            PERSONAL PREDICTION (Integrated)
            ========================================= */}
        <View style={styles.predictionSection}>
          {prediction ? (
            <View style={styles.predictionContent}>
              <View style={styles.predictionHeader}>
                <Text style={styles.predictionTitle}>오늘의 체감 예측</Text>
                <View style={[
                  styles.confidenceBadge,
                  { backgroundColor: 
                    prediction.confidence === 'high' ? colors.confidenceHigh :
                    prediction.confidence === 'medium' ? colors.confidenceMedium :
                    colors.confidenceLow
                  }
                ]}>
                  <Text style={styles.confidenceText}>
                    {getConfidenceLabel(prediction.confidence)}
                  </Text>
                </View>
              </View>

              {(() => {
                const feel = getFeelInfo(prediction.predicted_feel);
                return (
                  <Text style={styles.predictionFeel}>
                    {feel.emoji} {feel.label} 느낌이에요
                  </Text>
                );
              })()}
              
              {prediction.recommendation_msg && (
                <Text style={styles.recommendation}>
                  {prediction.recommendation_msg}
                </Text>
              )}

              {prediction.outfit_suggestion && (
                <View style={styles.outfitRow}>
                  <OutfitChip label="상의" value={prediction.outfit_suggestion.top} />
                  <OutfitChip label="하의" value={prediction.outfit_suggestion.bottom} />
                  {prediction.outfit_suggestion.outer && (
                    <OutfitChip label="겉옷" value={prediction.outfit_suggestion.outer} />
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.coldStartBanner}>
              <View style={styles.coldStartBannerIcon}>
                <Text style={styles.coldStartEmoji}>🌱</Text>
              </View>
              <View style={styles.coldStartBannerText}>
                <Text style={styles.coldStartBannerTitle}>나만의 체감 예측 준비 중</Text>
                <Text style={styles.coldStartBannerDesc}>
                  피드백 {COLD_START_THRESHOLD}회 누적 시 활성화 ({feedbackCount}/{COLD_START_THRESHOLD})
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* =========================================
            HOURLY FORECAST 
            ========================================= */}
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
                  <Text style={styles.hourlyTime}>
                    {i === 0 ? '지금' : formatHour(h.dt)}
                  </Text>
                  <Text style={styles.hourlyEmoji}>
                    {getWeatherEmoji(h.weather_code)}
                  </Text>
                  <Text style={styles.hourlyTemp}>{Math.round(h.temp)}°</Text>
                  {h.pop > 0.1 ? (
                    <Text style={styles.hourlyPop}>
                      💧{Math.round(h.pop * 100)}%
                    </Text>
                  ) : (
                    <Text style={styles.hourlyPopEmpty}>-</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* =========================================
            FEEDBACK CTA
            ========================================= */}
        <View style={styles.ctaContainer}>
          {!todayFeedback ? (
            <TouchableOpacity
              style={styles.feedbackCTA}
              onPress={() => navigation.navigate('Feedback')}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaEmoji}>📝</Text>
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>오늘 날씨 어떠셨나요?</Text>
                <Text style={styles.ctaSubtitle}>체감 피드백을 남겨 예측을 정교하게 만드세요</Text>
              </View>
              <Text style={styles.ctaArrow}>→</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.feedbackDone}>
              <Text style={styles.feedbackDoneEmoji}>✅</Text>
              <Text style={styles.feedbackDoneText}>
                오늘의 피드백을 완료했어요! 내일 또 만나요.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OutfitChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.outfitChip}>
      <Text style={styles.outfitLabel}>{label}</Text>
      <Text style={styles.outfitValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  settingsIcon: {
    fontSize: 24,
  },
  scroll: {
    paddingBottom: spacing.xxl * 2,
  },

  // Hero Section (거대한 날씨 대시보드)
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  heroLocation: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTemp: {
    fontSize: 90,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -2,
    marginLeft: 20, // 이모지 공간 균형
  },
  heroEmoji: {
    fontSize: 60,
    marginLeft: spacing.sm,
  },
  heroDesc: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  heroHighLow: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  heroMetaText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  heroMetaDivider: {
    color: colors.textTertiary,
    marginHorizontal: spacing.sm,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 100, 100, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.5)',
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  errorSystemText: {
    fontSize: fontSize.xs,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Prediction Section
  predictionSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  predictionContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  predictionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
  predictionFeel: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  recommendation: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  outfitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  outfitChip: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  outfitLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  outfitValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },

  // Cold Start Banner (미니멀 디자인)
  coldStartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coldStartBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  coldStartEmoji: {
    fontSize: 20,
  },
  coldStartBannerText: {
    flex: 1,
  },
  coldStartBannerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  coldStartBannerDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Hourly Section
  hourlySection: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  moreText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  hourlyList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  hourlyItem: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    width: 64,
  },
  hourlyTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  hourlyEmoji: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  hourlyTemp: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  hourlyPop: {
    fontSize: 10,
    color: colors.primaryLight,
    marginTop: spacing.xs,
    fontWeight: fontWeight.semibold,
  },
  hourlyPopEmpty: {
    fontSize: 10,
    color: 'transparent',
    marginTop: spacing.xs,
  },

  // CTA
  ctaContainer: {
    paddingHorizontal: spacing.lg,
  },
  feedbackCTA: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ctaEmoji: {
    fontSize: 32,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: fontSize.sm,
    color: colors.primaryLight,
  },
  ctaArrow: {
    fontSize: fontSize.xl,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  feedbackDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  feedbackDoneEmoji: {
    fontSize: 20,
  },
  feedbackDoneText: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
});
