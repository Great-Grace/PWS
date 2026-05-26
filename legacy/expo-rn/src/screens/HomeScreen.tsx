import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  layout,
  spacing,
} from '../theme';
import { useAuthStore } from '../stores/authStore';
import { useFeedbackStore } from '../stores/feedbackStore';
import { useWeatherStore } from '../stores/weatherStore';
import { formatTemp } from '../utils/formulas';
import { refreshHomeScreenData } from '../utils/homeRefresh';
import {
  getWeatherGuideRows,
  getWeatherReadyCards,
  type WeatherGuideRow,
  type WeatherReadyCard,
} from '../utils/weatherCopy';
import {
  isFigmaParitySessionId,
  isLocalTesterSessionId,
} from '../utils/testerAuth';

const FIGMA_HOME_WEATHER = {
  temp: 22,
  feels_like: 20,
  humidity: 45,
  wind_speed: 2,
  weather_desc: '맑음',
  uv_index: 8,
  precipitation_1h: 0,
};

const FIGMA_HOME_GUIDE_ROWS: WeatherGuideRow[] = [
  {
    label: '아침 (06-10시)',
    message: '조금 쌀쌀하게 느껴질 가능성이 높아요',
    tone: 'morning',
  },
  {
    label: '낮 (10-18시)',
    message: '조금 덥게 느껴질 가능성이 높아요',
    tone: 'day',
  },
  {
    label: '저녁 (18-22시)',
    message: '많이 쌀쌀하게 느껴질 가능성이 높아요',
    tone: 'night',
  },
];

function getTodayLabel(date: Date = new Date()) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function SunMark() {
  return (
    <View style={styles.sunMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.sunRay, styles.sunRayTop]} />
      <View style={[styles.sunRay, styles.sunRayRight]} />
      <View style={[styles.sunRay, styles.sunRayBottom]} />
      <View style={[styles.sunRay, styles.sunRayLeft]} />
      <View style={styles.sunCore} />
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { user, session } = useAuthStore();
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
    fetchTodayPrediction,
    fetchTodayStatus,
    fetchFeedbackCount,
  } = useFeedbackStore();

  const [refreshing, setRefreshing] = useState(false);

  const lat = useMemo(() => user?.default_lat || 37.5665, [user?.default_lat]);
  const lng = useMemo(() => user?.default_lng || 126.978, [user?.default_lng]);
  const localTesterMode = isLocalTesterSessionId(session?.user.id);
  const figmaParityMode = isFigmaParitySessionId(session?.user.id);

  const refreshHomeData = useCallback(
    async (force = false) => {
      if (localTesterMode) {
        await fetchTodayPrediction();
        return;
      }

      await refreshHomeScreenData(
        {
          fetchWeather,
          fetchTodayStatus,
          fetchFeedbackCount,
          fetchTodayPrediction,
        },
        { lat, lng, force }
      );
    },
    [
      fetchWeather,
      fetchTodayStatus,
      fetchFeedbackCount,
      fetchTodayPrediction,
      lat,
      lng,
      localTesterMode,
    ]
  );

  useEffect(() => {
    void refreshHomeData();
  }, [refreshHomeData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHomeData(true);
    setRefreshing(false);
  };

  const current = figmaParityMode ? FIGMA_HOME_WEATHER : weather?.current;
  const todayDaily = weather?.daily?.[0];

  const precipitation = figmaParityMode ? null : todayDaily ? Math.round(todayDaily.pop * 100) : null;
  const guideRows = figmaParityMode ? FIGMA_HOME_GUIDE_ROWS : getWeatherGuideRows(prediction);
  const readyCards = getWeatherReadyCards({
    uvIndex: current?.uv_index,
    humidity: current?.humidity,
    precipitationProbability: precipitation,
    windSpeed: current?.wind_speed,
  });
  const summaryMetaText = figmaParityMode
    ? '서울특별시 · 4월 11일'
    : `${user?.climate_zone || '서울특별시'} · ${getTodayLabel()}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textTertiary}
          />
        )}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryHeaderCopy}>
              <Text style={styles.summaryMeta}>{summaryMetaText}</Text>
              <Text style={styles.summaryTitle}>날씨 어시스턴트</Text>
            </View>
            <SunMark />
          </View>

          {current ? (
            <>
              <View style={styles.summaryTempRow}>
                <Text style={styles.summaryTemp}>{formatTemp(current.temp)}</Text>
                <Text style={styles.summaryCondition}>{current.weather_desc}</Text>
              </View>
              <Text style={styles.summaryStats}>
                체감 {formatTemp(current.feels_like)} · 습도 {current.humidity}% · 바람 {current.wind_speed.toFixed(1)}m/s
              </Text>
            </>
          ) : (
            <Text style={styles.errorDescription}>
              {weatherLoading ? '날씨를 불러오는 중이에요.' : weatherError || '날씨 정보를 준비 중이에요.'}
            </Text>
          )}
        </View>

        {current ? (
          <View style={styles.outfitGuideCard}>
            <View style={styles.guideHeaderRow}>
              <View style={styles.guideIconWrap}>
                <ShirtMark />
              </View>
              <Text style={styles.guideTitle}>오늘 옷차림 가이드</Text>
            </View>

            {guideRows.map((row) => (
              <View
                key={row.label}
                style={[
                  styles.guideBand,
                  row.tone === 'morning' && styles.guideBandMorning,
                  row.tone === 'day' && styles.guideBandDay,
                  row.tone === 'night' && styles.guideBandNight,
                ]}
              >
                <View style={styles.guideBandTimeWrap}>
                  <Text
                    style={[
                      styles.guideBandLabel,
                      row.tone === 'morning' && styles.guideBandLabelMorning,
                      row.tone === 'day' && styles.guideBandLabelDay,
                      row.tone === 'night' && styles.guideBandLabelNight,
                    ]}
                  >
                    {row.label}
                  </Text>
                </View>
                <Text style={styles.guideBandMessage}>{row.message}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate('Feedback')}
          accessibilityRole="button"
          accessibilityLabel="오늘 체감 기록하기"
          accessibilityHint="날씨 체감 기록 화면으로 이동합니다"
          style={styles.recordPromptCard}
        >
          <View>
            <Text style={styles.recordPromptTitle}>오늘 체감 기록하기</Text>
            <Text style={styles.recordPromptSubtitle}>날씨가 어떻게 느껴지셨나요?</Text>
          </View>
          <View style={styles.recordArrowWrap}>
            <ChevronMark color="#28231F" />
          </View>
        </Pressable>

        <View style={styles.prepSection}>
          <Text style={styles.prepSectionTitle}>오늘은 이런 준비가 좋아요</Text>
          <View style={styles.prepCards}>
            {readyCards.map((card) => (
              <ReadyCard key={card.title} {...card} />
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('WeatherDetail')}
          accessibilityRole="button"
          accessibilityLabel="다른 지역 날씨"
          accessibilityHint="다른 지역의 날씨와 옷차림을 확인합니다"
        >
          <LinearGradient
            colors={['#00A6F4', '#155DFC']}
            start={{ x: 0.08, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.regionButton}
          >
            <View style={styles.regionButtonCopy}>
              <View style={styles.regionTitleRow}>
                <RegionPinMark />
                <Text style={styles.regionButtonTitle}>다른 지역 날씨</Text>
              </View>
              <Text style={styles.regionButtonSubtitle}>다른 지역 날씨와 옷차림 확인하기</Text>
            </View>
            <View style={styles.regionArrowWrap}>
              <ChevronMark color={colors.textInverse} />
            </View>
          </LinearGradient>
        </Pressable>

        {weatherError ? (
          <SectionCard>
            <Text style={styles.errorTitle}>날씨 데이터를 가져오지 못했습니다</Text>
            <Text style={styles.errorDescription}>{weatherError}</Text>
          </SectionCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

function ReadyCard({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: 'warm' | 'cool' | 'purple' | 'green';
}) {
  const toneMap = {
    warm: {
      card: '#FFFBEB',
      border: 'rgba(254,230,133,0.5)',
      iconBg: '#FEF3C6',
      dot: '#E17100',
    },
    cool: {
      card: '#F8FAFC',
      border: 'rgba(226,232,240,0.5)',
      iconBg: '#F1F5F9',
      dot: '#45556C',
    },
    purple: {
      card: '#F5F3FF',
      border: 'rgba(221,214,255,0.5)',
      iconBg: '#EDE9FE',
      dot: '#7F22FE',
    },
    green: {
      card: '#ECFDF5',
      border: 'rgba(164,244,207,0.5)',
      iconBg: '#D0FAE5',
      dot: '#009966',
    },
  } as const;

  const palette = toneMap[tone];

  return (
    <View style={[styles.readyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={[styles.readyIconWrap, { backgroundColor: palette.iconBg }]}>
        <ReadyIcon tone={tone} />
      </View>
      <View style={styles.readyCopy}>
        <Text style={styles.readyTitle}>{title}</Text>
        <View style={styles.readyDetailRow}>
          <View style={[styles.readyDot, { backgroundColor: palette.dot }]} />
          <Text style={styles.readyDetail}>{detail}</Text>
        </View>
      </View>
    </View>
  );
}

function ReadyIcon({ tone }: { tone: WeatherReadyCard['tone'] }) {
  if (tone === 'warm') {
    return (
      <View style={styles.readySun}>
        <View style={styles.readySunCore} />
        <View style={[styles.readySunRay, styles.readySunRayTop]} />
        <View style={[styles.readySunRay, styles.readySunRayBottom]} />
        <View style={[styles.readySunRaySide, styles.readySunRayLeft]} />
        <View style={[styles.readySunRaySide, styles.readySunRayRight]} />
      </View>
    );
  }

  if (tone === 'cool') {
    return (
      <View style={styles.readyWind}>
        <View style={[styles.readyWindLine, styles.readyWindLineLong]} />
        <View style={[styles.readyWindLine, styles.readyWindLineMid]} />
        <View style={[styles.readyWindLine, styles.readyWindLineShort]} />
      </View>
    );
  }

  if (tone === 'purple') {
    return (
      <View style={styles.readyUmbrella}>
        <View style={styles.readyUmbrellaCanopy} />
        <View style={styles.readyUmbrellaStem} />
        <View style={styles.readyUmbrellaHook} />
      </View>
    );
  }

  return (
    <View style={styles.readyLeaf}>
      <View style={styles.readyLeafDrop} />
      <View style={styles.readyLeafStem} />
    </View>
  );
}

function ShirtMark() {
  return (
    <View style={styles.shirtMark}>
      <View style={styles.shirtCollarLeft} />
      <View style={styles.shirtCollarRight} />
      <View style={styles.shirtBody} />
      <View style={styles.shirtSleeveLeft} />
      <View style={styles.shirtSleeveRight} />
    </View>
  );
}

function RegionPinMark() {
  return (
    <View style={styles.regionPinMark}>
      <View style={styles.regionPinRing} />
      <View style={styles.regionPinDot} />
      <View style={styles.regionPinStem} />
    </View>
  );
}

function ChevronMark({ color }: { color: string }) {
  return (
    <View
      style={[
        styles.chevronMark,
        {
          borderTopColor: color,
          borderRightColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scroll: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 80,
    gap: 0,
  },
  summaryCard: {
    height: 174,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
    paddingHorizontal: 24,
    paddingTop: 5,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  summaryHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  summaryMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: '#79716B',
    fontWeight: fontWeight.regular,
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 28,
    color: '#1C1917',
    fontWeight: fontWeight.semibold,
  },
  sunMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '1.75deg' }],
  },
  sunCore: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#FF9300',
  },
  sunRay: {
    position: 'absolute',
    width: 3,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FF9300',
  },
  sunRayTop: {
    top: 1,
  },
  sunRayRight: {
    right: 1,
    transform: [{ rotate: '90deg' }],
  },
  sunRayBottom: {
    bottom: 1,
  },
  sunRayLeft: {
    left: 1,
    transform: [{ rotate: '90deg' }],
  },
  summaryTempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  summaryTemp: {
    fontSize: 60,
    lineHeight: 60,
    color: '#1C1917',
    fontWeight: fontWeight.bold,
  },
  summaryCondition: {
    marginLeft: 12,
    fontSize: 24,
    lineHeight: 32,
    color: '#A6A09B',
    fontWeight: fontWeight.regular,
  },
  summaryStats: {
    fontSize: 14,
    lineHeight: 20,
    color: '#57534D',
  },
  outfitGuideCard: {
    width: '88%',
    maxWidth: 390,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 16,
    marginTop: 24,
    marginBottom: 21,
    minHeight: 276,
    overflow: 'hidden',
    shadowColor: '#E7E5E4',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  guideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  guideIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 16,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shirtMark: {
    width: 22,
    height: 22,
    alignItems: 'center',
  },
  shirtBody: {
    position: 'absolute',
    left: 6,
    top: 7,
    width: 10,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#766D63',
  },
  shirtSleeveLeft: {
    position: 'absolute',
    left: 1,
    top: 6,
    width: 8,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#766D63',
    transform: [{ rotate: '-24deg' }],
  },
  shirtSleeveRight: {
    position: 'absolute',
    right: 1,
    top: 6,
    width: 8,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#766D63',
    transform: [{ rotate: '24deg' }],
  },
  shirtCollarLeft: {
    position: 'absolute',
    left: 8,
    top: 5,
    width: 4,
    height: 4,
    borderRadius: 1,
    backgroundColor: '#F5F5F4',
    transform: [{ rotate: '35deg' }],
    zIndex: 2,
  },
  shirtCollarRight: {
    position: 'absolute',
    right: 8,
    top: 5,
    width: 4,
    height: 4,
    borderRadius: 1,
    backgroundColor: '#F5F5F4',
    transform: [{ rotate: '-35deg' }],
    zIndex: 2,
  },
  guideTitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1917',
    fontWeight: fontWeight.semibold,
  },
  guideSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: '#9A9288',
  },
  guideBand: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    minHeight: 61,
    justifyContent: 'center',
  },
  guideBandMorning: {
    backgroundColor: '#F0F9FF',
    borderColor: 'rgba(184,230,254,0.5)',
  },
  guideBandDay: {
    backgroundColor: '#FFF2F0',
    borderColor: 'rgba(255,242,240,0.5)',
  },
  guideBandNight: {
    backgroundColor: '#F0F1FF',
    borderColor: '#F0F1FF',
  },
  guideBandTimeWrap: {
    marginBottom: 4,
  },
  guideBandLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeight.semibold,
  },
  guideBandLabelMorning: {
    color: '#2176A8',
  },
  guideBandLabelDay: {
    color: '#0069A8',
  },
  guideBandLabelNight: {
    color: '#0069A8',
  },
  guideBandMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#292524',
    fontWeight: fontWeight.medium,
  },
  guideHeadlineCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(254,230,133,0.5)',
    backgroundColor: '#FFFBEB',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  guideHeadlineEyebrow: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: '#7B3306',
    fontWeight: fontWeight.semibold,
    marginBottom: 8,
  },
  guideHeadlineText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.primaryLight,
  },
  recordPromptCard: {
    width: '88%',
    maxWidth: 390,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E7E5E4',
    minHeight: 100,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 20 },
    elevation: 7,
  },
  recordPromptTitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1917',
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  recordPromptSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#57534D',
  },
  recordArrowWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepSection: {
    width: '88%',
    maxWidth: 390,
    alignSelf: 'center',
    marginBottom: 31,
  },
  prepSectionTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: '#1C1917',
    fontWeight: fontWeight.semibold,
    marginBottom: 20,
  },
  prepCards: {
    gap: 12,
  },
  readyCard: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 82,
    paddingHorizontal: 17,
    paddingVertical: 17,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  readyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readySun: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  readySunCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E17100' },
  readySunRay: { position: 'absolute', width: 2, height: 5, borderRadius: 1, backgroundColor: '#E17100' },
  readySunRaySide: { position: 'absolute', width: 5, height: 2, borderRadius: 1, backgroundColor: '#E17100' },
  readySunRayTop: { top: 0, left: 9 },
  readySunRayBottom: { bottom: 0, left: 9 },
  readySunRayLeft: { left: 0, top: 9 },
  readySunRayRight: { right: 0, top: 9 },
  readyWind: { width: 21, height: 18, justifyContent: 'center' },
  readyWindLine: { height: 2, borderRadius: 1, backgroundColor: '#45556C', marginVertical: 2 },
  readyWindLineLong: { width: 18 },
  readyWindLineMid: { width: 14, marginLeft: 4 },
  readyWindLineShort: { width: 10, marginLeft: 1 },
  readyUmbrella: { width: 21, height: 20, alignItems: 'center' },
  readyUmbrellaCanopy: { width: 18, height: 9, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: '#7F22FE', marginTop: 3 },
  readyUmbrellaStem: { width: 2, height: 8, backgroundColor: '#7F22FE' },
  readyUmbrellaHook: { width: 7, height: 4, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#7F22FE', borderBottomRightRadius: 4, marginLeft: 5, marginTop: -1 },
  readyLeaf: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  readyLeafDrop: { width: 12, height: 15, borderRadius: 8, borderTopRightRadius: 2, backgroundColor: '#009966', transform: [{ rotate: '35deg' }] },
  readyLeafStem: { position: 'absolute', width: 2, height: 8, borderRadius: 1, backgroundColor: '#D0FAE5', transform: [{ rotate: '35deg' }] },
  readyCopy: {
    flex: 1,
  },
  readyTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1C1917',
    fontWeight: fontWeight.medium,
    marginBottom: 6,
  },
  readyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  readyDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: '#57534D',
  },
  regionButton: {
    width: '88%',
    maxWidth: 390,
    alignSelf: 'center',
    minHeight: 100,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginBottom: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#00A6F4',
    shadowOpacity: 0.3,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 20 },
    elevation: 8,
  },
  regionButtonCopy: {
    flex: 1,
    paddingRight: 16,
  },
  regionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  regionPinMark: {
    width: 17,
    height: 18,
    alignItems: 'center',
  },
  regionPinRing: {
    position: 'absolute',
    top: 1,
    width: 12,
    height: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textInverse,
  },
  regionPinDot: {
    position: 'absolute',
    top: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textInverse,
  },
  regionPinStem: {
    position: 'absolute',
    bottom: 1,
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.textInverse,
    transform: [{ rotate: '45deg' }],
  },
  regionButtonTitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textInverse,
    fontWeight: fontWeight.semibold,
  },
  regionButtonSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  regionArrowWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronMark: {
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: fontSize.md,
    lineHeight: 22,
    color: '#DC2626',
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  errorDescription: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
