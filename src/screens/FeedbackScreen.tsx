// ============================================================
// Feedback Screen — v1.3
// · 슬롯 탭 (아침/낮/저녁) 자유 선택 — 오늘 날짜 기준 어느 슬롯이든 가능
// · 탭 전환해도 각 슬롯의 입력값 유지 (슬롯별 독립 상태)
// · 오늘의 옷차림: 아이템 다중 선택 → CLO 합산 → clothing 1-3 자동 계산
// · 하루 리셋: 05:00 (getPwsDate 기준)
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
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
  ACTIVITY_LABELS,
  SUN_LABELS,
  SLEEP_LABELS,
  OUTDOOR_LABELS,
  CLOTHING_ITEM_DEFS,
  CLOTHING_LABELS,
} from '../theme';
import { useFeedbackStore } from '../stores/feedbackStore';
import { getDefaultSlot, computeClothingFromItems } from '../utils/formulas';
import type { FeedbackInput, FeedbackSlot, ClothingItemId } from '../types';

// ---- 슬롯 메타 ----
const SLOT_META: { slot: FeedbackSlot; label: string; timeHint: string }[] = [
  { slot: 'morning',   label: '아침', timeHint: '오전' },
  { slot: 'afternoon', label: '낮',   timeHint: '낮'   },
  { slot: 'evening',   label: '저녁', timeHint: '저녁' },
];

// ---- 슬롯 입력 상태 타입 ----
interface SlotDraft {
  feelScore:     number | null;
  humidFeel:     number | null;
  windFeel:      number | null;
  clothingItems: ClothingItemId[];
  activity:      number | null;
  sunExposure:   number | null;
  sleep:         number | null;
  outdoorHours:  number | null;
  showOptional:  boolean;
}

function emptyDraft(): SlotDraft {
  return {
    feelScore: null, humidFeel: null, windFeel: null,
    clothingItems: [], activity: null,
    sunExposure: null, sleep: null, outdoorHours: null,
    showOptional: false,
  };
}

type DraftMap = Record<FeedbackSlot, SlotDraft>;

function initDrafts(): DraftMap {
  return { morning: emptyDraft(), afternoon: emptyDraft(), evening: emptyDraft() };
}

// ---- 화면 ----
export default function FeedbackScreen({ navigation }: any) {
  const { submitFeedback, isSaving, todayFeedback } = useFeedbackStore();

  const defaultSlot = useMemo(() => getDefaultSlot(new Date().getHours()), []);
  const [activeSlot, setActiveSlot] = useState<FeedbackSlot>(defaultSlot);
  const [drafts, setDrafts] = useState<DraftMap>(initDrafts);
  const [submitting, setSubmitting] = useState<FeedbackSlot | null>(null);

  const draft = drafts[activeSlot];
  const doneSlotsSet = useMemo(
    () => new Set(todayFeedback.map(f => f.feedback_slot)),
    [todayFeedback]
  );

  const computedClothing = useMemo(
    () => draft.clothingItems.length ? computeClothingFromItems(draft.clothingItems) : null,
    [draft.clothingItems]
  );

  const canSubmit =
    draft.feelScore     !== null &&
    draft.humidFeel     !== null &&
    draft.windFeel      !== null &&
    draft.clothingItems.length > 0 &&
    draft.activity      !== null;

  // 현재 슬롯 draft 업데이트 헬퍼
  const updateDraft = useCallback((patch: Partial<SlotDraft>) => {
    setDrafts(prev => ({
      ...prev,
      [activeSlot]: { ...prev[activeSlot], ...patch },
    }));
  }, [activeSlot]);

  const toggleClothing = useCallback((id: ClothingItemId) => {
    setDrafts(prev => {
      const current = prev[activeSlot].clothingItems;
      const updated = current.includes(id)
        ? current.filter(i => i !== id)
        : [...current, id];
      return { ...prev, [activeSlot]: { ...prev[activeSlot], clothingItems: updated } };
    });
  }, [activeSlot]);

  const handleSubmit = async () => {
    if (!canSubmit || computedClothing === null) {
      Alert.alert('필수 항목을 모두 선택해주세요');
      return;
    }
    if (doneSlotsSet.has(activeSlot)) {
      const slotName = SLOT_META.find(m => m.slot === activeSlot)?.label ?? '';
      Alert.alert(`${slotName} 피드백 완료`, '이 시간대 피드백은 이미 저장됐어요.');
      return;
    }

    setSubmitting(activeSlot);
    try {
      const input: FeedbackInput = {
        feel_score:     draft.feelScore    as FeedbackInput['feel_score'],
        humid_feel:     draft.humidFeel    as FeedbackInput['humid_feel'],
        wind_feel:      draft.windFeel     as FeedbackInput['wind_feel'],
        clothing:       computedClothing,
        clothing_items: draft.clothingItems,
        activity:       draft.activity     as FeedbackInput['activity'],
        slot:           activeSlot,
      };
      if (draft.sunExposure  !== null) input.sun_exposure  = draft.sunExposure  as FeedbackInput['sun_exposure'];
      if (draft.sleep        !== null) input.sleep         = draft.sleep        as FeedbackInput['sleep'];
      if (draft.outdoorHours !== null) input.outdoor_hours = draft.outdoorHours as FeedbackInput['outdoor_hours'];

      await submitFeedback(input);

      // 제출 완료 후 해당 슬롯 draft 초기화
      setDrafts(prev => ({ ...prev, [activeSlot]: emptyDraft() }));

      const remaining = SLOT_META.filter(m => !doneSlotsSet.has(m.slot) && m.slot !== activeSlot);
      if (remaining.length > 0) {
        Alert.alert('저장 완료 🎉', `${remaining.map(m => m.label).join('·')} 피드백도 남아있어요`, [
          { text: '계속 입력', onPress: () => setActiveSlot(remaining[0].slot) },
          { text: '완료', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('모두 완료! 🎉', '오늘 세 시간대 피드백이 모두 저장됐어요', [
          { text: '확인', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '저장에 실패했습니다');
    } finally {
      setSubmitting(null);
    }
  };

  const isSavingThisSlot = submitting === activeSlot || isSaving;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.title}>오늘의 체감 피드백</Text>
        <Text style={styles.subtitle}>시간대를 선택하고 체감 온도를 기록해주세요</Text>

        {/* ── 슬롯 탭 ── */}
        <View style={styles.slotTabRow}>
          {SLOT_META.map(({ slot, label, timeHint }) => {
            const done     = doneSlotsSet.has(slot);
            const isActive = activeSlot === slot;
            const hasDraft = !done && (
              drafts[slot].feelScore !== null ||
              drafts[slot].clothingItems.length > 0
            );
            return (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.slotTab,
                  isActive && styles.slotTabActive,
                  done      && styles.slotTabDone,
                ]}
                onPress={() => setActiveSlot(slot)}
                activeOpacity={0.7}
              >
                <Text style={styles.slotTabIcon}>
                  {done ? '✅' : hasDraft ? '✏️' : '○'}
                </Text>
                <Text style={[styles.slotTabLabel, isActive && styles.slotTabLabelActive]}>
                  {label}
                </Text>
                <Text style={[styles.slotTabHint, isActive && styles.slotTabHintActive]}>
                  {timeHint}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {doneSlotsSet.has(activeSlot) ? (
          <View style={styles.doneBanner}>
            <Text style={styles.doneBannerText}>
              ✅ {SLOT_META.find(m => m.slot === activeSlot)?.label} 피드백이 저장됐어요
            </Text>
          </View>
        ) : null}

        {/* ── 체감 온도 ── */}
        <SelectorGroup
          label="🌡️ 체감 온도"
          required
          options={[1, 2, 3, 4, 5, 6, 7]}
          labels={FEEL_LABELS.slice(1) as unknown as string[]}
          chipColors={FEEL_COLORS.slice(1) as unknown as string[]}
          value={draft.feelScore}
          onChange={v => updateDraft({ feelScore: v })}
          size="large"
          wrap
        />

        {/* ── 습도 체감 ── */}
        <SelectorGroup
          label="💧 습도 체감"
          required
          options={[1, 2, 3, 4, 5]}
          labels={HUMID_LABELS.slice(1) as unknown as string[]}
          value={draft.humidFeel}
          onChange={v => updateDraft({ humidFeel: v })}
        />

        {/* ── 바람 체감 ── */}
        <SelectorGroup
          label="💨 바람 체감"
          required
          options={[0, 1, 2]}
          labels={WIND_LABELS as unknown as string[]}
          value={draft.windFeel}
          onChange={v => updateDraft({ windFeel: v })}
        />

        {/* ── 오늘의 옷차림 ── */}
        <View style={styles.selectorGroup}>
          <View style={styles.clothingHeader}>
            <Text style={styles.selectorLabel}>
              👕 오늘의 옷차림
              <Text style={styles.requiredMark}> *</Text>
            </Text>
            {computedClothing !== null && (
              <View style={styles.cloBadge}>
                <Text style={styles.cloBadgeText}>{CLOTHING_LABELS[computedClothing]}</Text>
              </View>
            )}
          </View>
          <Text style={styles.clothingHint}>중복 선택 가능 · 입은 옷을 모두 선택해주세요</Text>
          <View style={styles.clothingGrid}>
            {CLOTHING_ITEM_DEFS.map(item => {
              const selected = draft.clothingItems.includes(item.id as ClothingItemId);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.clothingChip, selected && styles.clothingChipOn]}
                  onPress={() => toggleClothing(item.id as ClothingItemId)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.clothingChipText, selected && styles.clothingChipTextOn]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 활동 수준 ── */}
        <SelectorGroup
          label="🏃 활동 수준"
          required
          options={[1, 2, 3]}
          labels={ACTIVITY_LABELS.slice(1) as unknown as string[]}
          value={draft.activity}
          onChange={v => updateDraft({ activity: v })}
        />

        {/* ── 추가 정보 (선택) ── */}
        <TouchableOpacity
          style={styles.optionalToggle}
          onPress={() => updateDraft({ showOptional: !draft.showOptional })}
        >
          <Text style={styles.optionalToggleText}>
            {draft.showOptional ? '▼' : '▶'} 추가 정보 (선택)
          </Text>
        </TouchableOpacity>

        {draft.showOptional && (
          <View style={styles.optionalSection}>
            <SelectorGroup
              label="☀️ 햇빛 노출"
              options={[0, 1, 2]}
              labels={SUN_LABELS as unknown as string[]}
              value={draft.sunExposure}
              onChange={v => updateDraft({ sunExposure: v })}
            />
            <SelectorGroup
              label="😴 수면 상태"
              options={[1, 2, 3]}
              labels={SLEEP_LABELS.slice(1) as unknown as string[]}
              value={draft.sleep}
              onChange={v => updateDraft({ sleep: v })}
            />
            <SelectorGroup
              label="🚶 야외 시간"
              options={[0, 1, 2, 3]}
              labels={OUTDOOR_LABELS as unknown as string[]}
              value={draft.outdoorHours}
              onChange={v => updateDraft({ outdoorHours: v })}
            />
          </View>
        )}

        {/* ── 제출 ── */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!canSubmit || doneSlotsSet.has(activeSlot)) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSavingThisSlot || doneSlotsSet.has(activeSlot)}
          activeOpacity={0.8}
        >
          {isSavingThisSlot ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.submitText}>
              {doneSlotsSet.has(activeSlot) ? '저장 완료' : '피드백 저장하기'}
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ---- 공용 셀렉터 ----
function SelectorGroup({
  label, required, options, labels, chipColors, value, onChange, size, wrap,
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
          const selected = value === opt;
          const bg = selected
            ? (chipColors ? chipColors[i] : colors.primary)
            : colors.surface;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.chip,
                size === 'large' && styles.chipLarge,
                wrap && styles.chipWrap,
                { backgroundColor: bg, borderColor: selected ? bg : colors.border },
              ]}
              onPress={() => onChange(opt)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.chipText,
                size === 'large' && styles.chipTextLarge,
                selected && styles.chipTextSelected,
              ]}>
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
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },

  title:    { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.lg },

  // Slot tabs
  slotTabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  slotTab: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  slotTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotTabDone:   { borderColor: colors.success },
  slotTabIcon:   { fontSize: 16, marginBottom: 2 },
  slotTabLabel:  { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  slotTabLabelActive: { color: colors.textInverse },
  slotTabHint:   { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  slotTabHintActive:  { color: 'rgba(255,255,255,0.7)' },

  // Done banner
  doneBanner: {
    backgroundColor: '#F0FBF4', borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.success,
  },
  doneBannerText: { fontSize: fontSize.sm, color: colors.success, textAlign: 'center' },

  // Selector group
  selectorGroup: { marginBottom: spacing.lg },
  selectorLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  requiredMark:  { color: colors.error },
  selectorRow:     { flexDirection: 'row', gap: spacing.xs },
  selectorRowWrap: { flexWrap: 'wrap' },

  // Generic chip
  chip: {
    flex: 1, paddingVertical: 12,
    borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1,
  },
  chipLarge:   { paddingVertical: 16 },
  chipWrap:    { flex: 0, minWidth: '13%', flexGrow: 1 },
  chipText:    { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium, textAlign: 'center' },
  chipTextLarge:    { fontSize: fontSize.sm },
  chipTextSelected: { color: colors.textInverse, fontWeight: fontWeight.bold },

  // Clothing
  clothingHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  clothingHint:  { fontSize: fontSize.xs, color: colors.textTertiary, marginBottom: spacing.sm },
  cloBadge: {
    backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  cloBadgeText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  clothingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  clothingChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 8,
    borderRadius: borderRadius.full, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  clothingChipOn:     { backgroundColor: colors.primary, borderColor: colors.primary },
  clothingChipText:   { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  clothingChipTextOn: { color: colors.textInverse, fontWeight: fontWeight.bold },

  // Optional
  optionalToggle:     { paddingVertical: spacing.md },
  optionalToggleText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  optionalSection:    { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },

  // Submit
  submitButton: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.xl,
  },
  submitButtonDisabled: { backgroundColor: colors.surfaceElevated },
  submitText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textInverse },
});
