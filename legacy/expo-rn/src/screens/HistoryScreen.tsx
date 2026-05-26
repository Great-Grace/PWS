import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import {
  borderRadius,
  CLOTHING_ITEM_DEFS,
  colors,
  FEEL_COLORS,
  fontSize,
  fontWeight,
  spacing,
} from '../theme';
import { useFeedbackStore } from '../stores/feedbackStore';
import { useAuthStore } from '../stores/authStore';
import { getPwsDate, getSlotLabel } from '../utils/formulas';
import type { ClothingItemId, FeedbackEntry, FeedbackSlot } from '../types';
import { isFigmaParitySessionId } from '../utils/testerAuth';

LocaleConfig.locales.ko = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

const SLOT_ORDER: FeedbackSlot[] = ['morning', 'afternoon', 'evening'];
const HISTORY_FEEL_LABELS = ['-', '매우 추움', '추움', '선선함', '적당함', '따뜻함', '더움', '매우 더움'];
const REAL_FEEL_SCALE = { min: 1, mid: 4, max: 7 };
const FIGMA_FEEL_SCALE = { min: 0, mid: 2, max: 5 };

function makeFigmaHistoryEntry(
  id: string,
  date: string,
  slot: FeedbackSlot,
  feelScore: FeedbackEntry['feel_score'],
  clothingItems: FeedbackEntry['clothing_items']
): FeedbackEntry {
  return {
    id,
    user_id: 'dev-pws_dev',
    feedback_date: date,
    feedback_slot: slot,
    feel_score: feelScore,
    humid_feel: 2,
    wind_feel: 1,
    clothing: 2,
    clothing_items: clothingItems,
    activity: 2,
    sun_exposure: null,
    sleep: null,
    outdoor_hours: null,
    actual_temp: null,
    actual_humidity: null,
    actual_wind: null,
    actual_tmrt_api: null,
    tmrt_corrected: null,
    actual_precip: null,
    clothing_offset: null,
    activity_offset: null,
    sleep_offset: null,
    adjusted_feel: null,
    personal_feel: null,
    exposure_weight: null,
    weighted_feel: null,
    env_base: null,
    created_at: `${date}T12:00:00.000Z`,
    updated_at: `${date}T12:00:00.000Z`,
  };
}

const FIGMA_HISTORY_ENTRIES: FeedbackEntry[] = [
  makeFigmaHistoryEntry('figma-0411', '2026-04-11', 'afternoon', 4, ['tshirt', 'cardigan', 'jeans']),
  makeFigmaHistoryEntry('figma-0410', '2026-04-10', 'evening', 2, ['longsleeve', 'light_jacket', 'slacks']),
  makeFigmaHistoryEntry('figma-0409', '2026-04-09', 'afternoon', 4, ['tshirt', 'shirt', 'hoodie_zip', 'jeans']),
  makeFigmaHistoryEntry('figma-0408', '2026-04-08', 'afternoon', 5, ['tshirt', 'slacks']),
  makeFigmaHistoryEntry('figma-0407', '2026-04-07', 'afternoon', 2, ['longsleeve', 'jeans']),
  makeFigmaHistoryEntry('figma-0406', '2026-04-06', 'afternoon', 4, ['shirt', 'slacks']),
  makeFigmaHistoryEntry('figma-0405', '2026-04-05', 'afternoon', 4, ['tshirt', 'slacks']),
];
const FIGMA_CLOTHING_LABELS: Partial<Record<ClothingItemId, string>> = {
  tshirt: '반팔티',
  longsleeve: '긴팔티',
  shirt: '반팔 블라우스&셔츠',
  hoodie_zip: '져지',
  light_jacket: '자켓',
};

function averageFeel(entries: FeedbackEntry[]) {
  if (!entries.length) return null;
  return Math.round(entries.reduce((sum, entry) => sum + entry.feel_score, 0) / entries.length);
}

function formatCalendarTitle(year: number, month: number) {
  return `${year}년 ${month}월`;
}

function feelText(score: number | null) {
  return score ? HISTORY_FEEL_LABELS[score] : '-';
}

function humidityText(value: number) {
  if (value === 1) return '매우 건조';
  if (value === 2) return '건조';
  if (value === 3) return '보통';
  if (value === 4) return '눅눅';
  return '매우 눅눅';
}

function windText(value: number) {
  if (value === 0) return '없음';
  if (value === 1) return '약간';
  return '많이';
}

function clothingText(value: number) {
  if (value === 1) return '얇게';
  if (value === 2) return '보통';
  return '두껍게';
}

function activityText(value: number) {
  if (value === 1) return '정적';
  if (value === 2) return '보통';
  return '활발';
}

function formatRecordDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

function clothingItemsText(entry: FeedbackEntry, figmaParityMode = false) {
  if (!entry.clothing_items?.length) return `${clothingText(entry.clothing)} 옷차림`;
  return entry.clothing_items
    .map((id) => figmaParityMode ? FIGMA_CLOTHING_LABELS[id] ?? CLOTHING_ITEM_DEFS.find((item) => item.id === id)?.label : CLOTHING_ITEM_DEFS.find((item) => item.id === id)?.label)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
}

function bestOutfit(entries: FeedbackEntry[]) {
  const scoreMap = new Map<string, { count: number; totalFeel: number }>();
  entries.forEach((entry) => {
    const key = clothingItemsText(entry);
    const prev = scoreMap.get(key) ?? { count: 0, totalFeel: 0 };
    scoreMap.set(key, { count: prev.count + 1, totalFeel: prev.totalFeel + entry.feel_score });
  });
  const ranked = Array.from(scoreMap.entries())
    .map(([label, stats]) => ({
      label,
      average: stats.totalFeel / stats.count,
      count: stats.count,
    }))
    .sort((a, b) => b.average - a.average || b.count - a.count);
  return ranked[0] ?? null;
}

function scoreOutOfTen(score: number, scale: { min: number; max: number }) {
  const normalized = (score - scale.min) / (scale.max - scale.min);
  return Math.round(Math.max(0, Math.min(1, normalized)) * 10);
}

function getDateSet(entries: FeedbackEntry[]) {
  return Array.from(new Set(entries.map((entry) => entry.feedback_date))).sort();
}

function getCurrentStreak(entries: FeedbackEntry[]) {
  const dates = getDateSet(entries);
  if (!dates.length) return 0;
  let streak = 1;
  for (let i = dates.length - 1; i > 0; i -= 1) {
    const current = new Date(dates[i]);
    const prev = new Date(dates[i - 1]);
    const diffDays = Math.round((current.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) streak += 1;
    else break;
  }
  return streak;
}

function getMaxStreak(entries: FeedbackEntry[]) {
  const dates = getDateSet(entries);
  if (!dates.length) return 0;
  let max = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i += 1) {
    const date = new Date(dates[i]);
    const prev = new Date(dates[i - 1]);
    const diffDays = Math.round((date.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
  }
  return max;
}

export default function HistoryScreen() {
  const { fetchHistory, feedbackCount } = useFeedbackStore();
  const { session } = useAuthStore();
  const figmaParityMode = isFigmaParitySessionId(session?.user.id);

  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(getPwsDate());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [activeSlot, setActiveSlot] = useState<FeedbackSlot>('morning');

  const loadMonth = useCallback(async (year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    const data = await fetchHistory(startDate, endDate);
    setEntries(data);

    const grouped: Record<string, FeedbackEntry[]> = {};
    data.forEach((entry) => {
      if (!grouped[entry.feedback_date]) grouped[entry.feedback_date] = [];
      grouped[entry.feedback_date].push(entry);
    });

    const nextMarks: Record<string, any> = {};
    Object.entries(grouped).forEach(([date, dateEntries]) => {
      const ordered = SLOT_ORDER
        .map((slot) => dateEntries.find((entry) => entry.feedback_slot === slot))
        .filter(Boolean) as FeedbackEntry[];
      const representative = ordered[0];
      nextMarks[date] = {
        dots: ordered.map((entry) => ({
          key: entry.feedback_slot,
          color: FEEL_COLORS[entry.feel_score] || colors.accent,
        })),
        selectedColor: FEEL_COLORS[representative?.feel_score ?? 4] || colors.accent,
      };
    });

    setMarkedDates(nextMarks);
  }, [fetchHistory]);

  useEffect(() => {
    loadMonth(currentYear, currentMonth);
  }, [feedbackCount, currentYear, currentMonth]);

  const displayEntries = figmaParityMode ? FIGMA_HISTORY_ENTRIES : entries;
  const displaySelectedDate = figmaParityMode && selectedDate === getPwsDate() ? '2026-04-11' : selectedDate;
  const selectedEntries = useMemo(
    () => displayEntries.filter((entry) => entry.feedback_date === displaySelectedDate),
    [displayEntries, displaySelectedDate]
  );
  const selectedSlotMap = useMemo(() => {
    const map: Partial<Record<FeedbackSlot, FeedbackEntry>> = {};
    selectedEntries.forEach((entry) => {
      map[entry.feedback_slot] = entry;
    });
    return map;
  }, [selectedEntries]);
  const availableSlots = SLOT_ORDER.filter((slot) => selectedSlotMap[slot]);
  const displaySlot = availableSlots.includes(activeSlot) ? activeSlot : (availableSlots[0] ?? 'morning');
  const displayEntry = selectedSlotMap[displaySlot] ?? null;

  const completedDays = figmaParityMode ? 11 : new Set(displayEntries.map((entry) => entry.feedback_date)).size;
  const monthAverage = figmaParityMode ? 3.3 : averageFeel(displayEntries);
  const selectedAverage = averageFeel(selectedEntries);
  const recentEntries = displayEntries.slice(0, 3);
  const bestCombo = figmaParityMode ? { label: '반팔티 + 슬랙스', average: 4.5, count: 3 } : bestOutfit(displayEntries);
  const currentStreak = figmaParityMode ? 7 : getCurrentStreak(displayEntries);
  const maxStreak = figmaParityMode ? 12 : Math.max(getMaxStreak(displayEntries), currentStreak);
  const weeklyTrend = useMemo(() => buildWeeklyTrend(displayEntries), [displayEntries]);
  const feelScale = figmaParityMode ? FIGMA_FEEL_SCALE : REAL_FEEL_SCALE;
  const displayYear = figmaParityMode ? 2026 : currentYear;
  const displayMonth = figmaParityMode ? 4 : currentMonth;
  const displayMarkedDates = useMemo(() => {
    if (!figmaParityMode) return markedDates;
    return FIGMA_HISTORY_ENTRIES.reduce<Record<string, any>>((acc, entry) => {
      const bucket = acc[entry.feedback_date] ?? { dots: [] };
      bucket.dots.push({
        key: entry.feedback_slot,
        color: FEEL_COLORS[entry.feel_score] || colors.accent,
      });
      bucket.selectedColor = FEEL_COLORS[entry.feel_score] || colors.accent;
      acc[entry.feedback_date] = bucket;
      return acc;
    }, {});
  }, [figmaParityMode, markedDates]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>히스토리</Text>
          <Text style={styles.subtitle}>나의 체감 기록과 분석</Text>
        </View>

        <LinearGradient
          colors={['#FF6900', '#FF2056']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroPrimary}>
              <View style={styles.heroIconBox}>
                <StreakMark />
              </View>
              <View>
                <Text style={styles.heroLabel}>연속 기록</Text>
                <Text style={styles.heroValue}>{currentStreak}일</Text>
              </View>
            </View>
            <View style={styles.heroMetricBlock}>
              <Text style={styles.heroLabel}>최장 기록</Text>
              <Text style={styles.heroValue}>{maxStreak}일</Text>
            </View>
          </View>

          <Text style={styles.heroFootnote}>
            목표까지 {figmaParityMode ? 5 : Math.max(0, 7 - currentStreak)}일 남았어요!
          </Text>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>주간 쾌적도 추이</Text>
          <View style={styles.trendCard}>
            <TrendChart points={weeklyTrend} scale={feelScale} />
            <View style={styles.trendAverageBox}>
              <Text style={styles.trendAverageLabel}>체감 평균</Text>
              <Text style={styles.trendAverageValue}>
                {monthAverage ? `${monthAverage}/${figmaParityMode ? 5 : 7}` : '-'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionHeading}>캘린더</Text>
            <View style={styles.monthPill}>
              <Text style={styles.monthPillText}>{formatCalendarTitle(displayYear, displayMonth)}</Text>
            </View>
          </View>
          <View style={styles.sectionCard}>
            <Calendar
              style={styles.calendar}
              current={`${displayYear}-${String(displayMonth).padStart(2, '0')}-01`}
              hideArrows={figmaParityMode}
              hideExtraDays={figmaParityMode}
              renderHeader={figmaParityMode ? () => null : undefined}
              theme={{
                calendarBackground: colors.surface,
                textSectionTitleColor: '#78716C',
                selectedDayBackgroundColor: colors.accent,
                selectedDayTextColor: colors.textInverse,
                todayTextColor: colors.accent,
                dayTextColor: colors.textPrimary,
                textDisabledColor: colors.textTertiary,
                monthTextColor: colors.textPrimary,
                arrowColor: colors.accent,
                textMonthFontWeight: '700',
              }}
              markingType="multi-dot"
              onDayPress={(day: DateData) => {
                setSelectedDate(day.dateString);
                const slots = SLOT_ORDER.filter((slot) =>
                  displayEntries.some((entry) => entry.feedback_date === day.dateString && entry.feedback_slot === slot)
                );
                if (slots.length) setActiveSlot(slots[0]);
              }}
              onMonthChange={(month: DateData) => {
                setCurrentYear(month.year);
                setCurrentMonth(month.month);
              }}
              markedDates={{
                ...markedDates,
                ...displayMarkedDates,
                [displaySelectedDate]: {
                  ...displayMarkedDates[displaySelectedDate],
                  selected: true,
                  selectedColor: displayMarkedDates[displaySelectedDate]?.selectedColor || colors.accent,
                },
              }}
            />
            <View style={styles.calendarLegend}>
              <View style={styles.calendarLegendDot} />
              <Text style={styles.calendarLegendText}>이달 {completedDays}일 기록됨</Text>
            </View>
          </View>
        </View>

        {selectedEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {selectedDate === getPwsDate() ? '오늘은 아직 기록이 없어요' : '선택한 날짜에 기록이 없어요'}
            </Text>
            <Text style={styles.emptyDescription}>캘린더에서 다른 날짜를 선택하거나 오늘의 체감을 입력해보세요.</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>최근 기록</Text>
          <View style={styles.recordsStack}>
            {recentEntries.map((entry) => (
              <View key={`${entry.id}-${entry.feedback_slot}`} style={styles.recordCard}>
                <View style={styles.recordRow}>
                  <View style={styles.recordMetaWrap}>
                    <Text style={styles.recordDate}>{formatRecordDate(entry.feedback_date)}</Text>
                    <View style={styles.recordSlotPill}>
                      <Text style={styles.recordSlotText}>{getSlotLabel(entry.feedback_slot)}</Text>
                    </View>
                  </View>
                  <View style={styles.recordFeelPill}>
                    <Text style={styles.recordFeelText}>{feelText(entry.feel_score)}</Text>
                  </View>
                </View>
                <View style={styles.recordSummaryBox}>
                  <Text style={styles.recordSummaryText}>{clothingItemsText(entry, figmaParityMode)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {bestCombo ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>옷차림 분석</Text>
            <LinearGradient
              colors={['#00BBA7', '#0092B8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.outfitAnalysisCard}
            >
              <Text style={styles.outfitAnalysisEyebrow}>가장 쾌적했던 조합</Text>
              <Text style={styles.outfitAnalysisTitle}>{bestCombo.label}</Text>
              <View style={styles.outfitAnalysisScoreBox}>
                <Text style={styles.outfitAnalysisScore}>
                  {scoreOutOfTen(bestCombo.average, feelScale)}/10
                </Text>
                <Text style={styles.outfitAnalysisCopy}>
                  {figmaParityMode ? '평균 기온 21°에서\n최고의 쾌적도' : '평균 체감 기준 상위 조합'}
                </Text>
              </View>
            </LinearGradient>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function buildWeeklyTrend(entries: FeedbackEntry[]) {
  const byDate = new Map<string, FeedbackEntry[]>();
  entries.forEach((entry) => {
    const bucket = byDate.get(entry.feedback_date) ?? [];
    bucket.push(entry);
    byDate.set(entry.feedback_date, bucket);
  });

  const dates = Array.from(byDate.keys()).sort().slice(-7);
  if (!dates.length) {
    const today = new Date(getPwsDate());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      return { label, value: null };
    });
  }

  return dates.map((date) => ({
    label: formatTrendLabel(date),
    value: averageFeel(byDate.get(date) ?? []),
  }));
}

function formatTrendLabel(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function TrendChart({
  points,
  scale,
}: {
  points: { label: string; value: number | null }[];
  scale: { min: number; mid: number; max: number };
}) {
  const displayPoints = points;
  const plotWidth = 302;
  const plotHeight = 160;
  const xStep = plotWidth / Math.max(1, displayPoints.length - 1);
  const scaleRange = scale.max - scale.min;
  const plotted = displayPoints.map((point, index) => {
    const rawValue = point.value ?? scale.min;
    const value = Math.max(scale.min, Math.min(scale.max, rawValue));
    return {
      ...point,
      x: index * xStep,
      y: (1 - (value - scale.min) / scaleRange) * plotHeight,
      hasValue: point.value !== null,
    };
  });
  const segments = plotted.slice(0, -1).map((point, index) => {
    const next = plotted[index + 1];
    const dx = next.x - point.x;
    const dy = next.y - point.y;
    return {
      key: `${point.label}-${next.label}`,
      left: (point.x + next.x) / 2 - Math.sqrt(dx * dx + dy * dy) / 2,
      top: (point.y + next.y) / 2 - 1,
      width: Math.sqrt(dx * dx + dy * dy),
      angle: `${Math.atan2(dy, dx)}rad`,
      visible: point.hasValue && next.hasValue,
    };
  });

  return (
    <View style={styles.trendChart}>
      <View style={styles.trendGridLineTop} />
      <View style={styles.trendGridLineMiddle} />
      <View style={styles.trendGridLineBottom} />
      <View style={styles.trendYAxis}>
        <Text style={styles.trendAxisText}>{scale.max}</Text>
        <Text style={styles.trendAxisText}>{scale.mid}</Text>
        <Text style={styles.trendAxisText}>{scale.min}</Text>
      </View>
      <View style={styles.trendPlot}>
        {segments.map((segment) => segment.visible ? (
          <View
            key={segment.key}
            style={[
              styles.trendLineSegment,
              {
                left: segment.left,
                top: segment.top,
                width: segment.width,
                transform: [{ rotate: segment.angle }],
              },
            ]}
          />
        ) : null)}
        {plotted.map((point, index) => point.hasValue ? (
          <View
            key={`${point.label}-${index}`}
            style={[
              styles.trendPointDot,
              {
                left: point.x - 5.5,
                top: point.y - 5.5,
              },
            ]}
          />
        ) : null)}
        <View style={styles.trendXAxis}>
          {displayPoints.map((point, index) => (
            <Text key={`${point.label}-${index}`} style={styles.trendLabel}>{point.label}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function StreakMark() {
  return (
    <View style={styles.streakMark}>
      <View style={styles.streakFlameBody} />
      <View style={styles.streakFlameCore} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 128,
  },
  header: {
    minHeight: 109,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: '#79716B',
  },
  heroCard: {
    marginHorizontal: 24,
    marginTop: 24,
    minHeight: 169,
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  heroPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakMark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakFlameBody: {
    width: 18,
    height: 24,
    borderRadius: 12,
    borderTopRightRadius: 3,
    backgroundColor: colors.textInverse,
    transform: [{ rotate: '36deg' }],
  },
  streakFlameCore: {
    position: 'absolute',
    bottom: 6,
    width: 8,
    height: 12,
    borderRadius: 6,
    borderTopRightRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ rotate: '36deg' }],
  },
  heroLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 30,
    lineHeight: 36,
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
  },
  heroMetricBlock: {
    alignItems: 'flex-end',
  },
  heroFootnote: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 16,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.9)',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthPill: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  monthPillText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  calendar: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginBottom: 14,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeading: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    marginBottom: 16,
  },
  trendCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    backgroundColor: colors.surface,
    padding: 22,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  trendChart: {
    height: 200,
    position: 'relative',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  trendGridLineTop: {
    position: 'absolute',
    left: 24,
    right: 0,
    top: 10,
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
    borderStyle: 'dashed',
  },
  trendGridLineMiddle: {
    position: 'absolute',
    left: 24,
    right: 0,
    top: 92,
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
    borderStyle: 'dashed',
  },
  trendGridLineBottom: {
    position: 'absolute',
    left: 24,
    right: 0,
    bottom: 35,
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
  },
  trendYAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 32,
    width: 18,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  trendAxisText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#78716C',
  },
  trendPlot: {
    position: 'relative',
    width: 302,
    height: 192,
  },
  trendLineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 999,
    backgroundColor: '#57534D',
  },
  trendPointDot: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#57534D',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  trendXAxis: {
    position: 'absolute',
    left: -12,
    right: -12,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#78716C',
  },
  trendAverageBox: {
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendAverageLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: '#57534D',
  },
  trendAverageValue: {
    marginTop: 2,
    fontSize: 24,
    lineHeight: 32,
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
  },
  calendarLegend: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  calendarLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  calendarLegendText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#57534D',
  },
  recordsStack: {
    gap: 8,
  },
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordMetaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordDate: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  recordSlotPill: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recordSlotText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  recordFeelPill: {
    borderRadius: borderRadius.full,
    backgroundColor: '#0A84FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  recordFeelText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textInverse,
    fontWeight: fontWeight.semibold,
  },
  recordSummaryBox: {
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  recordSummaryText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  outfitAnalysisCard: {
    minHeight: 203,
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 3,
  },
  outfitAnalysisEyebrow: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 7,
  },
  outfitAnalysisTitle: {
    fontSize: fontSize.xl,
    lineHeight: 32,
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
    marginBottom: 16,
  },
  outfitAnalysisScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 79,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  outfitAnalysisScore: {
    fontSize: 30,
    lineHeight: 36,
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
  },
  outfitAnalysisCopy: {
    fontSize: fontSize.sm,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.86)',
    maxWidth: 150,
  },
});
