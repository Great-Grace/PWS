// ============================================================
// History Screen — 피드백 히스토리 캘린더 뷰
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';
import { colors, spacing, fontSize, fontWeight, borderRadius, FEEL_LABELS, FEEL_COLORS } from '../theme';
import { useFeedbackStore } from '../stores/feedbackStore';
import type { FeedbackEntry } from '../types';
import { formatDate } from '../utils/formulas';

// Korean locale
LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

export default function HistoryScreen() {
  const { fetchHistory, feedbackCount } = useFeedbackStore();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [markedDates, setMarkedDates] = useState<any>({});

  const loadMonth = useCallback(async (year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const data = await fetchHistory(startDate, endDate);
    setEntries(data);

    // Build marked dates
    const marks: any = {};
    data.forEach((e) => {
      const color = FEEL_COLORS[e.feel_score] || colors.primary;
      marks[e.feedback_date] = {
        marked: true,
        dotColor: color,
        selectedColor: color,
      };
    });
    setMarkedDates(marks);
  }, [fetchHistory]);

  // Load month data when feedbackCount changes or month navigation changes
  useEffect(() => {
    loadMonth(currentYear, currentMonth);
  }, [feedbackCount, currentYear, currentMonth]);

  const handleMonthChange = (month: DateData) => {
    setCurrentYear(month.year);
    setCurrentMonth(month.month);
  };

  const selectedEntry = entries.find((e) => e.feedback_date === selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>📅 피드백 기록</Text>

        <Calendar
          theme={{
            calendarBackground: colors.card,
            textSectionTitleColor: colors.textSecondary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.textPrimary,
            todayTextColor: colors.primary,
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.textTertiary,
            monthTextColor: colors.textPrimary,
            arrowColor: colors.primary,
          }}
          style={styles.calendar}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          onMonthChange={handleMonthChange}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...markedDates[selectedDate],
              selected: true,
              selectedColor: markedDates[selectedDate]?.dotColor || colors.primary,
            },
          }}
          markingType="dot"
        />

        {/* Selected day detail */}
        {selectedEntry ? (
          <View style={styles.detail}>
            <Text style={styles.detailDate}>{selectedDate}</Text>
            <View style={styles.detailRow}>
              <DetailChip
                label="체감"
                value={FEEL_LABELS[selectedEntry.feel_score]}
                color={FEEL_COLORS[selectedEntry.feel_score] as string}
              />
              <DetailChip label="옷차림" value={
                selectedEntry.clothing === 1 ? '얇게' :
                selectedEntry.clothing === 2 ? '보통' : '두껍게'
              } />
              <DetailChip label="활동" value={
                selectedEntry.activity === 1 ? '정적' :
                selectedEntry.activity === 2 ? '보통' : '활발'
              } />
            </View>
            {selectedEntry.actual_temp !== null && (
              <Text style={styles.detailMeta}>
                실제 기온: {selectedEntry.actual_temp}°C · 습도: {selectedEntry.actual_humidity}%
              </Text>
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

function DetailChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={[styles.chip, color ? { borderColor: color } : {}]}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={[styles.chipValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  calendar: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  detail: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailDate: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  chipValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  detailMeta: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  noData: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  noDataText: {
    fontSize: fontSize.md,
    color: colors.textTertiary,
  },
});
