// ============================================================
// History Screen — 피드백 히스토리 캘린더 뷰 (v1.2)
// · 하루 = 최대 3슬롯 (morning/afternoon/evening)
// · 캘린더 마커: 대표 슬롯 feel_score 색상
// · 상세: 슬롯 탭 (2개 이상일 때만 표시)
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { colors, spacing, fontSize, fontWeight, borderRadius, FEEL_LABELS, FEEL_COLORS } from '../theme';
import { useFeedbackStore } from '../stores/feedbackStore';
import { formatDate, getSlotLabel } from '../utils/formulas';
import type { FeedbackEntry, FeedbackSlot } from '../types';

// Korean locale
LocaleConfig.locales['ko'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

const SLOT_ORDER: FeedbackSlot[] = ['morning', 'afternoon', 'evening'];

export default function HistoryScreen() {
  const { fetchHistory, feedbackCount } = useFeedbackStore();
  const [entries, setEntries]           = useState<FeedbackEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [currentYear,  setCurrentYear]  = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [markedDates,  setMarkedDates]  = useState<any>({});
  const [activeSlot,   setActiveSlot]   = useState<FeedbackSlot>('morning');

  const loadMonth = useCallback(async (year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const data = await fetchHistory(startDate, endDate);
    setEntries(data);

    // 날짜별 그룹화 → 대표 색상은 morning 슬롯 또는 첫 번째 슬롯
    const dateMap: Record<string, FeedbackEntry[]> = {};
    data.forEach(e => {
      if (!dateMap[e.feedback_date]) dateMap[e.feedback_date] = [];
      dateMap[e.feedback_date].push(e);
    });

    const marks: any = {};
    Object.entries(dateMap).forEach(([date, dayEntries]) => {
      const rep   = dayEntries.find(e => e.feedback_slot === 'morning') ?? dayEntries[0];
      const color = FEEL_COLORS[rep.feel_score] || colors.primary;
      marks[date] = { marked: true, dotColor: color, selectedColor: color };
    });
    setMarkedDates(marks);
  }, [fetchHistory]);

  useEffect(() => {
    loadMonth(currentYear, currentMonth);
  }, [feedbackCount, currentYear, currentMonth]);

  const handleMonthChange = (month: DateData) => {
    setCurrentYear(month.year);
    setCurrentMonth(month.month);
  };

  // 선택된 날짜 슬롯 맵
  const selectedDayEntries = entries.filter(e => e.feedback_date === selectedDate);
  const slotMap: Partial<Record<FeedbackSlot, FeedbackEntry>> = {};
  selectedDayEntries.forEach(e => { slotMap[e.feedback_slot] = e; });
  const availableSlots = SLOT_ORDER.filter(s => slotMap[s]);

  const displaySlot: FeedbackSlot =
    availableSlots.includes(activeSlot) ? activeSlot : (availableSlots[0] ?? 'morning');
  const displayEntry = slotMap[displaySlot] ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>📅 피드백 기록</Text>

        <Calendar
          theme={{
            calendarBackground:         colors.card,
            textSectionTitleColor:      colors.textSecondary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor:       colors.textPrimary,
            todayTextColor:             colors.primary,
            dayTextColor:               colors.textPrimary,
            textDisabledColor:          colors.textTertiary,
            monthTextColor:             colors.textPrimary,
            arrowColor:                 colors.primary,
          }}
          style={styles.calendar}
          onDayPress={(day: DateData) => {
            setSelectedDate(day.dateString);
            const slots = SLOT_ORDER.filter(s =>
              entries.some(e => e.feedback_date === day.dateString && e.feedback_slot === s)
            );
            if (slots.length) setActiveSlot(slots[0]);
          }}
          onMonthChange={handleMonthChange}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...markedDates[selectedDate],
              selected:      true,
              selectedColor: markedDates[selectedDate]?.dotColor || colors.primary,
            },
          }}
          markingType="dot"
        />

        {selectedDayEntries.length > 0 ? (
          <View style={styles.detail}>
            <Text style={styles.detailDate}>{selectedDate}</Text>

            {/* 슬롯 탭 — 2개 이상일 때만 */}
            {availableSlots.length > 1 && (
              <View style={styles.slotTabs}>
                {availableSlots.map(slot => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotTab, displaySlot === slot && styles.slotTabActive]}
                    onPress={() => setActiveSlot(slot)}
                  >
                    <Text style={[styles.slotTabText, displaySlot === slot && styles.slotTabTextActive]}>
                      {getSlotLabel(slot)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {displayEntry && (
              <>
                <View style={styles.detailRow}>
                  <DetailChip
                    label="체감"
                    value={FEEL_LABELS[displayEntry.feel_score] ?? '-'}
                    color={FEEL_COLORS[displayEntry.feel_score] as string}
                  />
                  <DetailChip label="옷차림" value={
                    displayEntry.clothing === 1 ? '얇게' :
                    displayEntry.clothing === 2 ? '보통' : '두껍게'
                  } />
                  <DetailChip label="활동" value={
                    displayEntry.activity === 1 ? '정적' :
                    displayEntry.activity === 2 ? '보통' : '활발'
                  } />
                </View>
                {displayEntry.actual_temp !== null && (
                  <Text style={styles.detailMeta}>
                    기온 {displayEntry.actual_temp}°C · 습도 {displayEntry.actual_humidity}%
                    {displayEntry.actual_wind !== null && ` · 바람 ${displayEntry.actual_wind}m/s`}
                  </Text>
                )}
              </>
            )}
          </View>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>
              {selectedDate === formatDate(new Date())
                ? '오늘 아직 피드백을 입력하지 않았어요'
                : '이 날에는 피드백이 없어요'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={[styles.chip, color ? { borderColor: color } : {}]}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={[styles.chipValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { padding: spacing.lg, paddingBottom: spacing.xxl },
  title:     { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.md },
  calendar:  { borderRadius: borderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },

  detail: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailDate: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.sm },

  slotTabs:          { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  slotTab:           { flex: 1, paddingVertical: spacing.xs, borderRadius: borderRadius.md, backgroundColor: colors.surfaceElevated, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  slotTabActive:     { backgroundColor: colors.primaryDark, borderColor: colors.primary },
  slotTabText:       { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  slotTabTextActive: { color: colors.textPrimary, fontWeight: fontWeight.bold },

  detailRow:  { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  chip:       { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  chipLabel:  { fontSize: fontSize.xs, color: colors.textTertiary },
  chipValue:  { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginTop: 2 },
  detailMeta: { fontSize: fontSize.sm, color: colors.textTertiary },

  noData:     { backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  noDataText: { fontSize: fontSize.md, color: colors.textTertiary },
});
