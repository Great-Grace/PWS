import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '../theme';
import { DISTRICT_COORDS, KOREA_REGIONS } from '../utils/regions';
import AppDialog, { AppDialogState } from '../components/AppDialog';
import type { WeatherData, DailyForecast } from '../types';
import { getOutfitGuideByTemp } from '../utils/weatherCopy';
import { useWeatherStore } from '../stores/weatherStore';

const FAVORITE_AREAS = [
  { label: '강남역', sublabel: '강남구', value: '서울특별시 강남구' },
  { label: '잠실', sublabel: '송파구', value: '서울특별시 송파구' },
  { label: '판교', sublabel: '성남시', value: '경기도 성남시' },
  { label: '동탄', sublabel: '화성시', value: '경기도 화성시' },
  { label: '송도', sublabel: '연수구', value: '인천광역시 연수구' },
  { label: '해운대', sublabel: '해운대구', value: '부산광역시 해운대구' },
] as const;
const PROVINCE_SHORTLIST = ['서울특별시', '경기도', '인천광역시', '부산광역시'];

type Step = 1 | 2 | 3;
type QuickRange = 'today' | 'tomorrow' | '3days' | 'week';

function weekdayLabel(dt: number) {
  return ['일', '월', '화', '수', '목', '금', '토'][new Date(dt * 1000).getDay()];
}

function monthDayLabel(dt: number) {
  const date = new Date(dt * 1000);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function forecastDayLabel(selectedRange: QuickRange, index: number, dt: number) {
  if (index === 0) {
    return selectedRange === 'tomorrow' ? '내일' : '오늘';
  }
  return weekdayLabel(dt);
}

function weatherTone(forecast: DailyForecast | undefined) {
  const code = forecast?.weather_code ?? 800;
  if (code >= 200 && code < 700) {
    return {
      surface: '#5B5EEB',
      icon: 'rain' as const,
    };
  }
  return {
    surface: '#0A84FF',
    icon: 'sun' as const,
  };
}

export default function WeatherDetailScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<QuickRange>('3days');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<AppDialogState | null>(null);

  const filteredRegions = useMemo(() => {
    const entries = Object.keys(DISTRICT_COORDS);
    if (!search.trim()) return [];
    const query = search.trim();
    return entries.filter((entry) => entry.includes(query)).slice(0, 12);
  }, [search]);

  const selectedForecasts = useMemo(() => {
    if (!weatherData) return [];
    if (selectedRange === 'tomorrow') return weatherData.daily.slice(1, 2);
    const selectedDays = selectedRange === 'today' ? 1 : selectedRange === '3days' ? 3 : 7;
    return weatherData.daily.slice(0, selectedDays);
  }, [selectedRange, weatherData]);
  const heroForecast = selectedForecasts[0];
  const tone = weatherTone(heroForecast);
  const outfit = getOutfitGuideByTemp(
    Math.round(((heroForecast?.temp_min ?? 18) + (heroForecast?.temp_max ?? 24)) / 2),
    heroForecast,
  );

  const handleRegionSelect = (value: string) => {
    setSelectedRegion(value);
    setSearch('');
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!selectedRegion) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!selectedRegion) return;
      const coords = DISTRICT_COORDS[selectedRegion];
      if (!coords) {
        setDialog({
          title: '지역을 다시 선택해주세요',
          message: '선택한 지역 정보를 찾을 수 없어요.',
        });
        return;
      }
      setLoading(true);
      try {
        await useWeatherStore.getState().fetchWeather(coords.lat, coords.lng, true);
        const weatherState = useWeatherStore.getState();
        if (weatherState.error || !weatherState.data) {
          throw new Error(weatherState.error || '날씨 정보를 가져오지 못했습니다');
        }
        setWeatherData(weatherState.data);
        setStep(3);
        return;
      } catch (error: any) {
        setDialog({
          title: '날씨 조회 실패',
          message: error.message || '잠시 후 다시 시도해주세요.',
        });
      } finally {
        setLoading(false);
      }
      return;
    }
    navigation.goBack();
  };

  const renderStepDots = () => (
    <View style={styles.stepRow}>
      {[1, 2, 3].map((value, index) => {
        const isDone = value < step;
        const isActive = value === step;
        return (
          <View key={value} style={styles.stepWrap}>
            <View style={[styles.stepDot, isDone && styles.stepDotDone, isActive && styles.stepDotActive]}>
              {isDone ? (
                <CheckMark color={colors.textInverse} />
              ) : (
                <Text style={[styles.stepDotText, isActive && styles.stepDotTextInverse]}>{value}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{value === 1 ? '지역' : value === 2 ? '기간' : '확인'}</Text>
            {index < 2 ? <View style={styles.stepDividerDot} /> : null}
          </View>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (step === 1) {
                navigation.goBack();
                return;
              }
              setStep((current) => (current === 3 ? 2 : 1));
            }}
            accessibilityRole="button"
            accessibilityLabel={step === 1 ? '뒤로 가기' : '이전 단계'}
            style={styles.backButton}
          >
            <BackArrowMark />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{step === 1 ? '지역 선택' : step === 2 ? '기간 선택' : selectedRegion?.split(' ')[1] ?? selectedRegion}</Text>
            {step === 3 ? <Text style={styles.subtitle}>{selectedForecasts.length}일간의 날씨와 옷차림</Text> : null}
          </View>
        </View>

        {renderStepDots()}

        {step === 1 ? (
          <>
            <Text style={styles.sectionQuestion}>어디 날씨를 확인할까요?</Text>
            <View style={styles.searchBox}>
              <SearchMark />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="지역명 검색 (예: 강남, 판교, 잠실)"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="지역명 검색"
                accessibilityHint="날씨를 확인할 지역명을 입력하세요"
                style={styles.searchInput}
              />
            </View>

            {search.trim() ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>검색 결과</Text>
                <View style={styles.cardGrid}>
                  {filteredRegions.map((region) => (
                    <SelectCard key={region} label={region.split(' ')[1]} sublabel={region.split(' ')[0]} selected={selectedRegion === region} onPress={() => handleRegionSelect(region)} />
                  ))}
                </View>
              </View>
            ) : (
              <>
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>자주 찾는 지역</Text>
                  <View style={styles.cardGrid}>
                    {FAVORITE_AREAS.map((region) => (
                      <SelectCard
                        key={region.value}
                        label={region.label}
                        sublabel={region.sublabel}
                        selected={selectedRegion === region.value}
                        onPress={() => handleRegionSelect(region.value)}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>시/도 선택</Text>
                  <View style={styles.listStack}>
                    {PROVINCE_SHORTLIST.map((province) => (
                      <Pressable
                        key={province}
                        style={styles.listRow}
                        onPress={() => handleRegionSelect(`${province} ${KOREA_REGIONS.find((item) => item.province === province)?.districts[0]}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`${province} 선택`}
                      >
                        <Text style={styles.listRowTitle}>{province}</Text>
                        <ListChevronMark />
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.sectionQuestion}>언제 날씨를 확인할까요?</Text>
            <Text style={styles.fieldLabel}>시작일</Text>
            <View style={styles.fieldBox}><Text style={styles.fieldPlaceholder}>오늘부터</Text></View>
            <Text style={styles.fieldLabel}>종료일</Text>
            <View style={styles.fieldBox}><Text style={styles.fieldPlaceholder}>{selectedRange === 'today' ? '오늘' : selectedRange === 'tomorrow' ? '내일' : selectedRange === '3days' ? '3일 후' : '7일 후'}</Text></View>

            <View style={styles.rangeHero}>
              <Text style={styles.rangeHeroLabel}>선택 기간</Text>
              <Text style={styles.rangeHeroValue}>{selectedRange === 'today' ? '오늘' : selectedRange === 'tomorrow' ? '1일' : selectedRange === '3days' ? '3일' : '7일'}</Text>
              <Text style={styles.rangeHeroSub}>{selectedRegion}</Text>
            </View>

            <Text style={styles.sectionLabel}>빠른 선택</Text>
            <View style={styles.rangeGrid}>
              <RangeChip label="오늘" active={selectedRange === 'today'} onPress={() => setSelectedRange('today')} />
              <RangeChip label="내일" active={selectedRange === 'tomorrow'} onPress={() => setSelectedRange('tomorrow')} />
              <RangeChip label="3일" active={selectedRange === '3days'} onPress={() => setSelectedRange('3days')} />
              <RangeChip label="일주일" active={selectedRange === 'week'} onPress={() => setSelectedRange('week')} />
            </View>
          </>
        ) : null}

        {step === 3 && heroForecast ? (
          <>
            <View style={styles.dayTabs}>
              {selectedForecasts.map((forecast, index) => (
                <View key={forecast.dt} style={[styles.dayTab, index === 0 && styles.dayTabActive]}>
                  <Text style={[styles.dayTabEyebrow, index === 0 && styles.dayTabTextActive]}>{forecastDayLabel(selectedRange, index, forecast.dt)}</Text>
                  <Text style={[styles.dayTabText, index === 0 && styles.dayTabTextActive]}>{monthDayLabel(forecast.dt)}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.summaryHero, { backgroundColor: tone.surface }]}>
              <Text style={styles.summaryHeroDate}>{monthDayLabel(heroForecast.dt)}</Text>
              <Text style={styles.summaryHeroTemp}>{Math.round(heroForecast.temp_min)}-{Math.round(heroForecast.temp_max)}°</Text>
              <Text style={styles.summaryHeroMeta}>
                {heroForecast.weather_desc} · 습도 {heroForecast.humidity}% · 풍속 {heroForecast.wind_speed.toFixed(1)}m/s
              </Text>
              <WeatherHeroMark kind={tone.icon} />
            </View>

            <TimeOutfitCard label="아침" time="06-10시" tone="warm" items={outfit.morning} />
            <TimeOutfitCard label="낮" time="10-18시" tone="neutral" items={outfit.day} />
            <TimeOutfitCard label="저녁" time="18-22시" tone="cool" items={outfit.evening} />

            <View style={styles.metricRow}>
              <MetricCard label="습도" value={`${heroForecast.humidity}%`} />
              <MetricCard label="풍속" value={`${heroForecast.wind_speed.toFixed(1)}m/s`} />
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleNext}
          disabled={loading || (step === 1 && !selectedRegion)}
          accessibilityRole="button"
          accessibilityLabel={step === 3 ? '완료' : '다음'}
          accessibilityState={{ disabled: loading || (step === 1 && !selectedRegion) }}
          style={({ pressed }) => [styles.footerShadow, pressed && styles.footerPressed]}
        >
          <View style={[styles.footerButton, step === 1 && !selectedRegion && styles.footerButtonDisabled]}>
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.footerButtonText, step === 1 && !selectedRegion && styles.footerButtonTextDisabled]}>
                {step === 3 ? '완료' : '다음'}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
      <AppDialog dialog={dialog} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}

function SelectCard({ label, sublabel, selected, onPress }: { label: string; sublabel: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${sublabel} 선택`}
      accessibilityState={{ selected }}
      style={[styles.selectCard, selected && styles.selectCardActive]}
    >
      <View style={styles.selectCardTitleRow}>
        <PinIcon active={selected} />
        <Text style={styles.selectCardLabel}>{label}</Text>
      </View>
      <Text style={styles.selectCardSublabel}>{sublabel}</Text>
    </Pressable>
  );
}

function PinIcon({ active }: { active: boolean }) {
  const color = active ? colors.accent : '#79716B';
  return (
    <View style={styles.pinIcon}>
      <View style={[styles.pinRing, { borderColor: color }]}>
        <View style={[styles.pinDot, { backgroundColor: color }]} />
      </View>
      <View style={[styles.pinStem, { backgroundColor: color }]} />
    </View>
  );
}

function BackArrowMark() {
  return (
    <View style={styles.backArrowMark}>
      <View style={styles.backArrowLine} />
      <View style={styles.backArrowHead} />
    </View>
  );
}

function SearchMark() {
  return (
    <View style={styles.searchMark}>
      <View style={styles.searchMarkRing} />
      <View style={styles.searchMarkHandle} />
    </View>
  );
}

function CheckMark({ color }: { color: string }) {
  return (
    <View
      style={[
        styles.checkMark,
        {
          borderRightColor: color,
          borderBottomColor: color,
        },
      ]}
    />
  );
}

function ListChevronMark() {
  return <View style={styles.listChevronMark} />;
}

function RangeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} 선택`}
      accessibilityState={{ selected: active }}
      style={[styles.rangeChip, active && styles.rangeChipActive]}
    >
      <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TimeOutfitCard({ label, time, tone, items }: { label: string; time: string; tone: 'warm' | 'neutral' | 'cool'; items: string[] }) {
  const toneStyle = tone === 'warm'
    ? { backgroundColor: '#FFFBEA', borderColor: '#FDD65C' }
    : tone === 'cool'
      ? { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }
      : { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' };

  return (
    <View style={[styles.timeCard, toneStyle]}>
      <Text style={styles.timeCardTitle}>{label}</Text>
      <Text style={styles.timeCardTime}>{time}</Text>
      <View style={styles.timeChipRow}>
        {items.map((item) => (
          <View key={`${label}-${item}`} style={styles.timeChip}>
            <Text style={styles.timeChipText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function WeatherHeroMark({ kind }: { kind: 'sun' | 'rain' }) {
  if (kind === 'rain') {
    return (
      <View style={styles.summaryHeroIcon}>
        <View style={styles.weatherCloudBase} />
        <View style={styles.weatherCloudLobeLeft} />
        <View style={styles.weatherCloudLobeRight} />
        <View style={[styles.weatherDrop, styles.weatherDropLeft]} />
        <View style={[styles.weatherDrop, styles.weatherDropRight]} />
      </View>
    );
  }

  return (
    <View style={styles.summaryHeroIcon}>
      <View style={styles.weatherSunCore} />
      <View style={[styles.weatherSunRay, styles.weatherSunRayTop]} />
      <View style={[styles.weatherSunRay, styles.weatherSunRayBottom]} />
      <View style={[styles.weatherSunRaySide, styles.weatherSunRayLeft]} />
      <View style={[styles.weatherSunRaySide, styles.weatherSunRayRight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 132 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    marginHorizontal: -24,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
  },
  backButton: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backArrowMark: { width: 18, height: 14, justifyContent: 'center' },
  backArrowLine: { position: 'absolute', left: 2, right: 1, height: 2, borderRadius: 2, backgroundColor: colors.textPrimary },
  backArrowHead: { width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: colors.textPrimary, transform: [{ rotate: '45deg' }] },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  subtitle: { marginTop: 2, fontSize: 14, lineHeight: 20, color: '#79716B' },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingBottom: 28,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
    marginBottom: 24,
  },
  stepWrap: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  stepDotDone: { backgroundColor: colors.accent },
  stepDotActive: { backgroundColor: colors.accent },
  stepDotText: { fontSize: 12, lineHeight: 16, color: colors.textSecondary, fontWeight: fontWeight.bold },
  stepDotTextInverse: { color: colors.textInverse },
  stepLabel: { fontSize: 12, lineHeight: 17, color: colors.textSecondary, fontWeight: fontWeight.medium },
  stepLabelActive: { color: colors.textPrimary },
  checkMark: { width: 7, height: 11, borderRightWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }], marginTop: -2 },
  stepDividerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textTertiary, marginLeft: 10 },
  sectionQuestion: { fontSize: 14, lineHeight: 20, fontWeight: fontWeight.semibold, color: '#44403B', marginBottom: 12 },
  searchBox: { height: 59.5, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#F5F5F4', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 24 },
  searchMark: { width: 20, height: 20, marginRight: 10 },
  searchMarkRing: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#A6A09B',
  },
  searchMarkHandle: {
    position: 'absolute',
    right: 2,
    bottom: 3,
    width: 8,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#A6A09B',
    transform: [{ rotate: '45deg' }],
  },
  searchInput: { flex: 1, fontSize: 16, lineHeight: 22, color: colors.textPrimary },
  sectionBlock: { marginBottom: 24 },
  sectionLabel: { fontSize: 14, lineHeight: 20, color: '#44403B', fontWeight: fontWeight.semibold, marginBottom: 12 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  selectCard: { width: '48.2%', minHeight: 80, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#F5F5F4', paddingHorizontal: 18, paddingVertical: 16, justifyContent: 'center' },
  selectCardActive: { borderColor: '#0A84FF', backgroundColor: colors.accentSurface },
  selectCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pinIcon: { width: 16, height: 16, alignItems: 'center' },
  pinRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 3, height: 3, borderRadius: 1.5 },
  pinStem: { width: 1.5, height: 5, borderRadius: 1, marginTop: -1 },
  selectCardLabel: { fontSize: 16, lineHeight: 24, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  selectCardSublabel: { paddingLeft: 23, fontSize: 12, lineHeight: 16, color: '#79716B', fontWeight: fontWeight.medium },
  listStack: { gap: 10 },
  listRow: { height: 59.5, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#F5F5F4', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listRowTitle: { fontSize: 16, lineHeight: 24, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  listChevronMark: { width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: colors.textTertiary, transform: [{ rotate: '45deg' }] },
  fieldLabel: { fontSize: 13, lineHeight: 18, color: colors.textPrimary, fontWeight: fontWeight.bold, marginBottom: 8 },
  fieldBox: { height: 52, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', paddingHorizontal: 14, marginBottom: 14 },
  fieldPlaceholder: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  rangeHero: { borderRadius: 16, padding: 16, marginVertical: 16, backgroundColor: '#0A84FF' },
  rangeHeroLabel: { fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.88)' },
  rangeHeroValue: { fontSize: 34, lineHeight: 40, color: colors.textInverse, fontWeight: fontWeight.bold, marginTop: 3 },
  rangeHeroSub: { fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.88)', marginTop: 6 },
  rangeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rangeChip: { minWidth: 86, height: 44, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  rangeChipActive: { backgroundColor: colors.accentSurface, borderColor: colors.accent },
  rangeChipText: { fontSize: 13, lineHeight: 18, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  rangeChipTextActive: { color: colors.accent },
  dayTabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dayTab: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: borderRadius.full, backgroundColor: colors.surfaceSecondary },
  dayTabActive: { backgroundColor: colors.accent, shadowColor: '#0A4FA8', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  dayTabEyebrow: { fontSize: 10, lineHeight: 14, color: colors.textSecondary },
  dayTabText: { fontSize: 16, lineHeight: 22, color: colors.textPrimary, fontWeight: fontWeight.bold },
  dayTabTextActive: { color: colors.textInverse },
  summaryHero: { borderRadius: 16, padding: 16, marginBottom: 16, minHeight: 142, justifyContent: 'center', shadowColor: '#0A4FA8', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  summaryHeroDate: { fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.88)' },
  summaryHeroTemp: { fontSize: 42, lineHeight: 50, color: colors.textInverse, fontWeight: fontWeight.bold, marginTop: 5 },
  summaryHeroMeta: { fontSize: 13, lineHeight: 18, color: colors.textInverse, marginTop: 7 },
  summaryHeroIcon: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherSunCore: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.textInverse },
  weatherSunRay: { position: 'absolute', width: 3, height: 7, borderRadius: 2, backgroundColor: colors.textInverse },
  weatherSunRaySide: { position: 'absolute', width: 7, height: 3, borderRadius: 2, backgroundColor: colors.textInverse },
  weatherSunRayTop: { top: 3 },
  weatherSunRayBottom: { bottom: 3 },
  weatherSunRayLeft: { left: 3 },
  weatherSunRayRight: { right: 3 },
  weatherCloudBase: { position: 'absolute', top: 15, width: 24, height: 10, borderRadius: 7, backgroundColor: colors.textInverse },
  weatherCloudLobeLeft: { position: 'absolute', top: 10, left: 7, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.textInverse },
  weatherCloudLobeRight: { position: 'absolute', top: 12, right: 7, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textInverse },
  weatherDrop: { position: 'absolute', top: 27, width: 3, height: 7, borderRadius: 2, backgroundColor: colors.textInverse, transform: [{ rotate: '16deg' }] },
  weatherDropLeft: { left: 11 },
  weatherDropRight: { right: 11 },
  timeCard: { borderRadius: 14, borderWidth: 1, padding: 13, marginBottom: 12 },
  timeCardTitle: { fontSize: 16, lineHeight: 22, fontWeight: fontWeight.bold, color: colors.textPrimary },
  timeCardTime: { fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginBottom: 10 },
  timeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8 },
  timeChipText: { fontSize: 14, lineHeight: 20, color: colors.textPrimary, fontWeight: fontWeight.medium },
  metricRow: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 13 },
  metricLabel: { fontSize: 12, lineHeight: 17, color: colors.textSecondary, marginBottom: 5 },
  metricValue: { fontSize: 18, lineHeight: 24, color: colors.textPrimary, fontWeight: fontWeight.bold },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, elevation: 20, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#F5F5F4' },
  footerShadow: { shadowOpacity: 0, elevation: 0 },
  footerPressed: { opacity: 0.92 },
  footerButton: { height: 56, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  footerButtonDisabled: { backgroundColor: '#E7E5E4' },
  footerButtonText: { fontSize: 16, lineHeight: 24, color: colors.textInverse, fontWeight: fontWeight.semibold },
  footerButtonTextDisabled: { color: '#A6A09B' },
});
