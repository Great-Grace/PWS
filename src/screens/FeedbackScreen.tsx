// ============================================================
// Feedback Screen — 7단계 체감 피드백 입력 (v1.2)
// · feel_score 1-7 확장
// · 현재 슬롯(아침/낮/저녁) 자동 감지 및 표시
// · 이미 제출한 슬롯이면 경고
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  FEEL_LABELS,
  FEEL_COLORS,
  HUMID_LABELS,
  WIND_LABELS,
  CLOTHING_LABELS,
  ACTIVITY_LABELS,
  SUN_LABELS,
  SLEEP_LABELS,
  OUTDOOR_LABELS,
} from '../theme';
import { useFeedbackStore } from '../stores/feedbackStore';
import { getSlotFromHour, getSlotLabel } from '../utils/formulas';
import type { FeedbackInput, FeedbackSlot } from '../types';

export default function FeedbackScreen({ navigation }: any) {
  const { submitFeedback, isSaving, todayFeedback } = useFeedbackStore();

  // 현재 슬롯 감지
  const currentSlot: FeedbackSlot | null = useMemo(
    () => getSlotFromHour(new Date().getHours()),
    []
  );
  const alreadyDoneThisSlot = useMemo(
    () => currentSlot
      ? todayFeedback.some(f => f.feedback_slot === currentSlot)
      : false,
    [currentSlot, todayFeedback]
  );

  // Required
  const [feelScore,  setFeelScore]  = useState<number | null>(null);
  const [humidFeel,  setHumidFeel]  = useState<number | null>(null);
  const [windFeel,   setWindFeel]   = useState<number | null>(null);
  const [clothing,   setClothing]   = useState<number | null>(null);
  const [activity,   setActivity]   = useState<number | null>(null);

  // Optional
  const [sunExposure,  setSunExposure]  = useState<number | null>(null);
  const [sleep,        setSleep]        = useState<number | null>(null);
  const [outdoorHours, setOutdoorHours] = useState<number | null>(null);

  const [showOptional, setShowOptional] = useState(false);

  const canSubmit =
    feelScore  !== null &&
    humidFeel  !== null &&
    windFeel   !== null &&
    clothing   !== null &&
    activity   !== null;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('필수 항목을 모두 선택해주세요');
      return;
    }
    if (alreadyDoneThisSlot && currentSlot) {
      Alert.alert(
        `${getSlotLabel(currentSlot)} 피드백 완료`,
        '이 시간대 피드백은 이미 저장되었어요. 다음 시간대에 다시 입력해주세요.',
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );
      return;
    }

    try {
      const input: FeedbackInput = {
        feel_score: feelScore as FeedbackInput['feel_score'],
        humid_feel: humidFeel as FeedbackInput['humid_feel'],
        wind_feel:  windFeel  as FeedbackInput['wind_feel'],
        clothing:   clothing  as FeedbackInput['clothing'],
        activity:   activity  as FeedbackInput['activity'],
      };

      if (sunExposure  !== null) input.sun_exposure  = sunExposure  as FeedbackInput['sun_exposure'];
      if (sleep        !== null) input.sleep         = sleep        as FeedbackInput['sleep'];
      if (outdoorHours !== null) input.outdoor_hours = outdoorHours as FeedbackInput['outdoor_hours'];

      await submitFeedback(input);
      Alert.alert('완료! 🎉', '피드백이 저장되고 예측이 업데이트됐어요', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('오류', error.message || '저장에 실패했습니다');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>오늘의 체감 피드백</Text>
        <Text style={styles.subtitle}>직관적으로 느낀 대로 선택해주세요</Text>

        {/* 현재 슬롯 배지 */}
        {currentSlot && (
          <View style={[
            styles.slotBadge,
            alreadyDoneThisSlot && styles.slotBadgeDone,
          ]}>
            <Text style={styles.slotBadgeText}>
              {alreadyDoneThisSlot
                ? `✅ ${getSlotLabel(currentSlot)} 피드백 완료`
                : `📍 ${getSlotLabel(currentSlot)} 피드백`}
            </Text>
          </View>
        )}

        {/* Feel Score — 7-step (Required) */}
        <SelectorGroup
          label="🌡️ 오늘 체감 온도"
          required
          options={[1, 2, 3, 4, 5, 6, 7]}
          labels={FEEL_LABELS.slice(1) as unknown as string[]}
          chipColors={FEEL_COLORS.slice(1) as unknown as string[]}
          value={feelScore}
          onChange={setFeelScore}
          size="large"
          wrap
        />

        {/* Humid Feel */}
        <SelectorGroup
          label="💧 습도 체감"
          required
          options={[1, 2, 3, 4, 5]}
          labels={HUMID_LABELS.slice(1) as unknown as string[]}
          value={humidFeel}
          onChange={setHumidFeel}
        />

        {/* Wind Feel */}
        <SelectorGroup
          label="💨 바람 체감"
          required
          options={[0, 1, 2]}
          labels={WIND_LABELS as unknown as string[]}
          value={windFeel}
          onChange={setWindFeel}
        />

        {/* Clothing */}
        <SelectorGroup
          label="👔 옷차림"
          required
          options={[1, 2, 3]}
          labels={CLOTHING_LABELS.slice(1) as unknown as string[]}
          value={clothing}
          onChange={setClothing}
        />

        {/* Activity */}
        <SelectorGroup
          label="🏃 활동 수준"
          required
          options={[1, 2, 3]}
          labels={ACTIVITY_LABELS.slice(1) as unknown as string[]}
          value={activity}
          onChange={setActivity}
        />

        {/* Optional Section */}
        <TouchableOpacity
          style={styles.optionalToggle}
          onPress={() => setShowOptional(!showOptional)}
        >
          <Text style={styles.optionalToggleText}>
            {showOptional ? '▼' : '▶'} 추가 정보 (선택)
          </Text>
        </TouchableOpacity>

        {showOptional && (
          <View style={styles.optionalSection}>
            <SelectorGroup
              label="☀️ 햇빛 노출"
              options={[0, 1, 2]}
              labels={SUN_LABELS as unknown as string[]}
              value={sunExposure}
              onChange={setSunExposure}
            />
            <SelectorGroup
              label="😴 수면 상태"
              options={[1, 2, 3]}
              labels={SLEEP_LABELS.slice(1) as unknown as string[]}
              value={sleep}
              onChange={setSleep}
            />
            <SelectorGroup
              label="🚶 야외 시간"
              options={[0, 1, 2, 3]}
              labels={OUTDOOR_LABELS as unknown as string[]}
              value={outdoorHours}
              onChange={setOutdoorHours}
            />
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!canSubmit || alreadyDoneThisSlot) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.submitText}>피드백 저장하기</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Reusable Selector Component ----
function SelectorGroup({
  label,
  required,
  options,
  labels,
  chipColors,
  value,
  onChange,
  size,
  wrap,
}: {
  label: string;
  required?: boolean;
  options: number[];
  labels: string[];
  chipColors?: string[];
  value: number | null;
  onChange: (v: number) => void;
  size?: 'large';
  wrap?: boolean;
}) {
  return (
    <View style={styles.selectorGroup}>
      <Text style={styles.selectorLabel}>
        {label}
        {required && <Text style={styles.requiredMark}> *</Text>}
      </Text>
      <View style={[styles.selectorRow, wrap && styles.selectorRowWrap]}>
        {options.map((opt, i) => {
          const isSelected = value === opt;
          const bgColor =
            isSelected && chipColors
              ? chipColors[i]
              : isSelected
              ? colors.primary
              : colors.surface;

          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.selectorChip,
                size === 'large' && styles.selectorChipLarge,
                wrap && styles.selectorChipWrap,
                { backgroundColor: bgColor, borderColor: isSelected ? bgColor : colors.border },
              ]}
              onPress={() => onChange(opt)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.selectorText,
                  size === 'large' && styles.selectorTextLarge,
                  isSelected && styles.selectorTextSelected,
                ]}
              >
                {labels[i]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    paddingBottom: spacing.xxl * 2,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Slot badge
  slotBadge: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  slotBadgeDone: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.success,
  },
  slotBadgeText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },

  // Selector
  selectorGroup: {
    marginBottom: spacing.lg,
  },
  selectorLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  requiredMark: {
    color: colors.error,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  selectorRowWrap: {
    flexWrap: 'wrap',
  },
  selectorChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  selectorChipLarge: {
    paddingVertical: 16,
  },
  selectorChipWrap: {
    flex: 0,
    minWidth: '13%',
    flexGrow: 1,
  },
  selectorText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  selectorTextLarge: {
    fontSize: fontSize.sm,
  },
  selectorTextSelected: {
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
  },

  // Optional
  optionalToggle: {
    paddingVertical: spacing.md,
  },
  optionalToggleText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  optionalSection: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },

  // Submit
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
  },
  submitText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
});
