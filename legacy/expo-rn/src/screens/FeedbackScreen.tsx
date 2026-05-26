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
  CLOTHING_ITEM_DEFS,
  CLOTHING_LABELS,
} from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useFeedbackStore } from '../stores/feedbackStore';
import { useAuthStore } from '../stores/authStore';
import { getDefaultSlot, computeClothingFromItems } from '../utils/formulas';
import type { FeedbackInput, FeedbackSlot, ClothingItemId } from '../types';
import AppDialog, { AppDialogState } from '../components/AppDialog';
import { isFigmaParitySessionId } from '../utils/testerAuth';

// ---- 슬롯 메타 ----
const SLOT_META: { slot: FeedbackSlot; label: string; timeHint: string }[] = [
  { slot: 'morning',   label: '아침', timeHint: '06-10시' },
  { slot: 'afternoon', label: '낮',   timeHint: '10-18시' },
  { slot: 'evening',   label: '저녁', timeHint: '18-22시' },
];

const FEEDBACK_FEEL_LABELS = ['매우 추움', '추움', '선선함', '적당함', '따뜻함', '더움', '매우 더움'];
const FEEDBACK_HUMID_LABELS = ['건조함', '쾌적함', '습함', '매우 습함'];
const FEEDBACK_WIND_LABELS = ['바람 없음', '약한 바람', '보통 바람', '강한 바람'];

type ClothingSectionKey = 'top' | 'outer' | 'bottom';
type FeedbackClothingItem = (typeof CLOTHING_ITEM_DEFS)[number] & { id: ClothingItemId };

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
  openClothingSection: ClothingSectionKey | null;
}

function emptyDraft(): SlotDraft {
  return {
    feelScore: 4,
    humidFeel: 2,
    windFeel: 1,
    clothingItems: [],
    activity: 2,
    sunExposure: null, sleep: null, outdoorHours: null,
    showOptional: false,
    openClothingSection: null,
  };
}

type DraftMap = Record<FeedbackSlot, SlotDraft>;

function initDrafts(): DraftMap {
  return { morning: emptyDraft(), afternoon: emptyDraft(), evening: emptyDraft() };
}

const CLOTHING_SECTIONS: Record<ClothingSectionKey, readonly ClothingItemId[]> = {
  top: ['sleeveless', 'tshirt', 'longsleeve', 'shirt', 'knit_thin', 'sweatshirt', 'hoodie', 'hoodie_zip', 'knit_thick', 'fleece'],
  outer: ['light_jacket', 'cardigan', 'blazer', 'light_padding', 'padding', 'heavy_coat'],
  bottom: ['shorts', 'pants', 'slacks', 'jeans'],
} as const;

const CLOTHING_SECTION_META: { key: ClothingSectionKey; label: string }[] = [
  { key: 'top', label: '상의' },
  { key: 'outer', label: '아우터' },
  { key: 'bottom', label: '하의' },
];

function clothingItemsForSection(section: ClothingSectionKey): FeedbackClothingItem[] {
  const sectionIds = new Set<string>(CLOTHING_SECTIONS[section]);
  return CLOTHING_ITEM_DEFS.filter((item): item is FeedbackClothingItem => sectionIds.has(item.id));
}

const CLOTHING_SECTION_ITEMS: Record<ClothingSectionKey, FeedbackClothingItem[]> = {
  top: clothingItemsForSection('top'),
  outer: clothingItemsForSection('outer'),
  bottom: clothingItemsForSection('bottom'),
};

// ---- 화면 ----
export default function FeedbackScreen({ navigation }: any) {
  const { submitFeedback, isSaving, todayFeedback } = useFeedbackStore();
  const { session } = useAuthStore();
  const figmaParityMode = isFigmaParitySessionId(session?.user.id);

  const defaultSlot = useMemo(
    () => (figmaParityMode ? 'afternoon' : getDefaultSlot(new Date().getHours())),
    [figmaParityMode]
  );
  const [activeSlot, setActiveSlot] = useState<FeedbackSlot>(defaultSlot);
  const [drafts, setDrafts] = useState<DraftMap>(initDrafts);
  const [submitting, setSubmitting] = useState<FeedbackSlot | null>(null);
  const [dialog, setDialog] = useState<AppDialogState | null>(null);

  const draft = drafts[activeSlot];
  const doneSlotsSet = useMemo(
    () => new Set(todayFeedback.map(f => f.feedback_slot)),
    [todayFeedback]
  );

  const computedClothing = useMemo(
    () => draft.clothingItems.length ? computeClothingFromItems(draft.clothingItems) : 2,
    [draft.clothingItems]
  );

  const canSubmit =
    draft.feelScore     !== null &&
    draft.humidFeel     !== null &&
    draft.windFeel      !== null;

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
    if (!canSubmit) {
      setDialog({
        title: '필수 항목을 확인해주세요',
        message: '기온, 습도, 바람 체감을 모두 선택하면 기록을 저장할 수 있어요.',
        primaryLabel: '확인',
      });
      return;
    }
    if (doneSlotsSet.has(activeSlot)) {
      const slotName = SLOT_META.find(m => m.slot === activeSlot)?.label ?? '';
      setDialog({
        title: `${slotName} 피드백 완료`,
        message: '이 시간대 피드백은 이미 저장됐어요.',
        primaryLabel: '확인',
      });
      return;
    }

    setSubmitting(activeSlot);
    try {
      const input: FeedbackInput = {
        feel_score:     draft.feelScore    as FeedbackInput['feel_score'],
        humid_feel:     draft.humidFeel    as FeedbackInput['humid_feel'],
        wind_feel:      draft.windFeel     as FeedbackInput['wind_feel'],
        clothing:       computedClothing as FeedbackInput['clothing'],
        clothing_items: draft.clothingItems,
        activity:       (draft.activity ?? 2) as FeedbackInput['activity'],
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
        setDialog({
          title: '저장 완료',
          message: `${remaining.map(m => m.label).join('·')} 피드백도 남아있어요`,
          secondaryLabel: '완료',
          onSecondary: () => navigation.goBack(),
          primaryLabel: '계속 입력',
          onPrimary: () => setActiveSlot(remaining[0].slot),
        });
      } else {
        setDialog({
          title: '모두 완료',
          message: '오늘 세 시간대 피드백이 모두 저장됐어요',
          primaryLabel: '확인',
          onPrimary: () => navigation.goBack(),
        });
      }
    } catch (error: any) {
      setDialog({
        title: '저장하지 못했어요',
        message: error.message || '잠시 후 다시 시도해주세요.',
        primaryLabel: '확인',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const isSavingThisSlot = submitting === activeSlot || isSaving;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>오늘 체감 기록</Text>
          <Text style={styles.subtitle}>날씨가 어떻게 느껴지셨나요?</Text>
        </View>

        {/* ── 슬롯 탭 ── */}
        <View style={styles.slotSection}>
          <Text style={styles.sectionLabel}>시간대</Text>
          <View style={styles.slotTabRow}>
            {SLOT_META.map(({ slot, label, timeHint }) => {
              const done     = doneSlotsSet.has(slot);
              const isActive = activeSlot === slot;
              const tabContent = (
                <>
                  <SlotMark active={isActive} done={done} slot={slot} />
                  <Text style={[styles.slotTabLabel, isActive && styles.slotTabLabelActive]}>
                    {label}
                  </Text>
                  <Text style={[styles.slotTabHint, isActive && styles.slotTabHintActive]}>
                    {timeHint}
                  </Text>
                </>
              );
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotTabTouch, done && !isActive && styles.slotTabDone]}
                  onPress={() => setActiveSlot(slot)}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} ${timeHint}`}
                  accessibilityState={{ selected: isActive, disabled: done }}
                  activeOpacity={0.78}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={['#00A6F4', '#155DFC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.slotTab}
                    >
                      {tabContent}
                    </LinearGradient>
                  ) : (
                    <View style={styles.slotTab}>{tabContent}</View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {doneSlotsSet.has(activeSlot) ? (
          <View style={styles.doneBanner}>
          <Text style={styles.doneBannerText}>
            {SLOT_META.find(m => m.slot === activeSlot)?.label} 피드백이 저장됐어요
          </Text>
        </View>
        ) : null}

        {/* ── 오늘의 옷차림 ── */}
        <View style={styles.clothingSection}>
          <View style={styles.clothingHeader}>
            <Text style={styles.selectorLabel}>
              오늘 옷차림
            </Text>
            {computedClothing !== null && !figmaParityMode && (
              <View style={styles.cloBadge}>
                <Text style={styles.cloBadgeText}>{CLOTHING_LABELS[computedClothing]}</Text>
              </View>
            )}
          </View>
          {CLOTHING_SECTION_META.map(({ key, label }) => (
            <ClothingSectionPicker
              key={key}
              section={key}
              label={label}
              open={draft.openClothingSection === key}
              selectedIds={draft.clothingItems}
              onToggle={toggleClothing}
              onToggleOpen={() => updateDraft({
                openClothingSection: draft.openClothingSection === key ? null : key,
              })}
            />
          ))}
        </View>

        {/* ── 체감 온도 ── */}
        <SelectorGroup
          label="기온 체감"
          options={[1, 2, 3, 4, 5, 6, 7]}
          labels={FEEDBACK_FEEL_LABELS}
          value={draft.feelScore}
          onChange={v => updateDraft({ feelScore: v })}
          size="large"
          wrap
        />

        {/* ── 습도 체감 ── */}
        <SelectorGroup
          label="습도 체감"
          options={[1, 2, 3, 4]}
          labels={FEEDBACK_HUMID_LABELS}
          value={draft.humidFeel}
          onChange={v => updateDraft({ humidFeel: v })}
          tint="sky"
        />

        {/* ── 바람 체감 ── */}
        <SelectorGroup
          label="바람 체감"
          options={[0, 1, 2, 3]}
          labels={FEEDBACK_WIND_LABELS}
          value={draft.windFeel}
          onChange={v => updateDraft({ windFeel: v })}
          wrap
        />

        {/* ── 제출 ── */}
        <TouchableOpacity
          style={styles.submitTouch}
          onPress={handleSubmit}
          disabled={!canSubmit || isSavingThisSlot || doneSlotsSet.has(activeSlot)}
          accessibilityRole="button"
          accessibilityLabel={doneSlotsSet.has(activeSlot) ? '저장 완료' : '기록 저장하기'}
          accessibilityState={{ disabled: !canSubmit || isSavingThisSlot || doneSlotsSet.has(activeSlot) }}
          activeOpacity={0.8}
        >
          {isSavingThisSlot ? (
            <View style={[styles.submitButton, styles.submitButtonLoading]}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : !canSubmit || doneSlotsSet.has(activeSlot) ? (
            <View style={[styles.submitButton, styles.submitButtonDisabled]}>
              <Text style={[styles.submitText, styles.submitTextDisabled]}>
                {doneSlotsSet.has(activeSlot) ? '저장 완료' : '기록 저장하기'}
              </Text>
              <View style={[styles.submitArrowBox, styles.submitArrowBoxDisabled]}>
                <ChevronMark color={colors.mutedButtonText} />
              </View>
            </View>
          ) : (
            <View style={styles.submitButton}>
              <Text style={styles.submitText}>기록 저장하기</Text>
              <View style={styles.submitArrowBox}>
                <ChevronMark color={colors.textPrimary} />
              </View>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>
      <AppDialog dialog={dialog} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}

// ---- 공용 셀렉터 ----
function SlotMark({ active, done, slot }: { active: boolean; done: boolean; slot: FeedbackSlot }) {
  const iconColor = active ? colors.textInverse : done ? '#00865A' : '#A8A29E';
  return (
    <View style={[styles.slotMark, active && styles.slotMarkActive, done && !active && styles.slotMarkDone]}>
      {slot === 'morning' ? <MorningMark color={iconColor} /> : null}
      {slot === 'afternoon' ? <SunMark color={iconColor} /> : null}
      {slot === 'evening' ? <EveningMark color={iconColor} /> : null}
    </View>
  );
}

function MorningMark({ color }: { color: string }) {
  return (
    <View style={styles.markCanvas}>
      <View style={[styles.sparkVertical, { backgroundColor: color }]} />
      <View style={[styles.sparkHorizontal, { backgroundColor: color }]} />
      <View style={[styles.sparkDot, styles.sparkDotTopRight, { backgroundColor: color }]} />
      <View style={[styles.sparkDot, styles.sparkDotBottomLeft, { backgroundColor: color }]} />
    </View>
  );
}

function SunMark({ color }: { color: string }) {
  return (
    <View style={styles.markCanvas}>
      <View style={[styles.sunCore, { backgroundColor: color }]} />
      <View style={[styles.sunRay, styles.sunRayTop, { backgroundColor: color }]} />
      <View style={[styles.sunRay, styles.sunRayBottom, { backgroundColor: color }]} />
      <View style={[styles.sunRaySide, styles.sunRayLeft, { backgroundColor: color }]} />
      <View style={[styles.sunRaySide, styles.sunRayRight, { backgroundColor: color }]} />
      <View style={[styles.sunRay, styles.sunRayTopLeft, { backgroundColor: color }]} />
      <View style={[styles.sunRay, styles.sunRayTopRight, { backgroundColor: color }]} />
      <View style={[styles.sunRay, styles.sunRayBottomLeft, { backgroundColor: color }]} />
      <View style={[styles.sunRay, styles.sunRayBottomRight, { backgroundColor: color }]} />
    </View>
  );
}

function EveningMark({ color }: { color: string }) {
  return (
    <View style={styles.markCanvas}>
      <View style={[styles.eveningPill, { backgroundColor: color }]} />
      <View style={[styles.eveningPill, styles.eveningPillSmall, { backgroundColor: color }]} />
    </View>
  );
}

function AccordionSection({
  label,
  open,
  onPress,
  children,
}: {
  label: string;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.accordionSection}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${open ? '닫기' : '열기'}`}
        accessibilityState={{ expanded: open }}
        activeOpacity={0.8}
      >
        <Text style={styles.accordionLabel}>{label}</Text>
        <AccordionChevronMark open={open} />
      </TouchableOpacity>
      {open ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

function ClothingSectionPicker({
  section,
  label,
  open,
  selectedIds,
  onToggle,
  onToggleOpen,
}: {
  section: ClothingSectionKey;
  label: string;
  open: boolean;
  selectedIds: readonly ClothingItemId[];
  onToggle: (id: ClothingItemId) => void;
  onToggleOpen: () => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <AccordionSection label={label} open={open} onPress={onToggleOpen}>
      <View style={styles.clothingGrid}>
        {CLOTHING_SECTION_ITEMS[section].map(item => {
          const selected = selectedSet.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.clothingChip, selected && styles.clothingChipOn]}
              onPress={() => onToggle(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              activeOpacity={0.7}
            >
              <Text style={[styles.clothingChipText, selected && styles.clothingChipTextOn]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </AccordionSection>
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

function AccordionChevronMark({ open }: { open: boolean }) {
  return (
    <View
      style={[
        styles.accordionChevronMark,
        open && styles.accordionChevronMarkOpen,
      ]}
    />
  );
}

function SelectorGroup({
  label, required, options, labels, value, onChange, size, wrap, tint,
}: {
  label: string;
  required?: boolean;
  options: number[];
  labels: string[];
  value: number | null;
  onChange: (v: number) => void;
  size?: 'large';
  wrap?: boolean;
  tint?: 'sky';
}) {
  return (
    <View style={[styles.selectorGroup, tint === 'sky' && styles.selectorGroupSky]}>
      <Text style={styles.selectorLabel}>
        {label}
        {required && <Text style={styles.requiredMark}> *</Text>}
      </Text>
      <View style={[styles.selectorRow, wrap && styles.selectorRowWrap]}>
        {options.map((opt, i) => {
          const selected = value === opt;
          return (
            <TouchableOpacity
              key={`${opt}-${i}`}
              style={[
                styles.chipTouch,
                size === 'large' && styles.chipLarge,
                wrap && styles.chipWrap,
                selected && styles.chipTouchSelected,
              ]}
              onPress={() => onChange(opt)}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${labels[i]}`}
              accessibilityState={{ selected }}
              activeOpacity={0.7}
            >
              {selected ? (
                <LinearGradient
                  colors={['#00A6F4', '#155DFC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.chip}
                >
                  <Text style={[
                    styles.chipText,
                    size === 'large' && styles.chipTextLarge,
                    styles.chipTextSelected,
                  ]}>
                    {labels[i]}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.chip}>
                  <Text style={[
                    styles.chipText,
                    size === 'large' && styles.chipTextLarge,
                  ]}>
                    {labels[i]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 128 },

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
  title:    { fontSize: 24, lineHeight: 32, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, color: '#79716B', fontWeight: fontWeight.regular },

  // Slot tabs
  slotSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: colors.background,
  },
  sectionLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
    color: '#44403B',
    marginBottom: 16,
  },
  slotTabRow: { flexDirection: 'row', gap: 12 },
  slotTabTouch: {
    flex: 1,
    minHeight: 107,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    overflow: 'hidden',
  },
  slotTab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    minHeight: 107,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  slotTabDone:   { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
  slotMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    backgroundColor: '#F5F5F4',
  },
  slotMarkActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  slotMarkDone: { backgroundColor: '#D1FAE5' },
  markCanvas: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  sparkVertical: { position: 'absolute', width: 2, height: 15, borderRadius: 1 },
  sparkHorizontal: { position: 'absolute', width: 15, height: 2, borderRadius: 1 },
  sparkDot: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5 },
  sparkDotTopRight: { right: 2, top: 3 },
  sparkDotBottomLeft: { left: 2, bottom: 3 },
  sunCore: { width: 8, height: 8, borderRadius: 4 },
  sunRay: { position: 'absolute', width: 2, height: 5, borderRadius: 1 },
  sunRaySide: { position: 'absolute', width: 5, height: 2, borderRadius: 1 },
  sunRayTop: { top: 0, left: 9 },
  sunRayBottom: { bottom: 0, left: 9 },
  sunRayLeft: { left: 0, top: 9 },
  sunRayRight: { right: 0, top: 9 },
  sunRayTopLeft: { top: 2, left: 3, transform: [{ rotate: '-45deg' }] },
  sunRayTopRight: { top: 2, right: 3, transform: [{ rotate: '45deg' }] },
  sunRayBottomLeft: { bottom: 2, left: 3, transform: [{ rotate: '45deg' }] },
  sunRayBottomRight: { bottom: 2, right: 3, transform: [{ rotate: '-45deg' }] },
  eveningPill: { width: 8, height: 16, borderRadius: 5 },
  eveningPillSmall: { position: 'absolute', width: 3, height: 12, right: 4, opacity: 0.5 },
  slotTabLabel:  { fontSize: 16, lineHeight: 24, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  slotTabLabelActive: { color: colors.textInverse },
  slotTabHint:   { fontSize: 12, lineHeight: 16, color: '#79716B', marginTop: 3, fontWeight: fontWeight.regular },
  slotTabHintActive:  { color: 'rgba(255,255,255,0.8)' },

  // Done banner
  doneBanner: {
    backgroundColor: '#ECFDF5', borderRadius: 13,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 24,
    marginBottom: 14,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  doneBannerText: { fontSize: 12, lineHeight: 17, color: '#00865A', textAlign: 'center', fontWeight: fontWeight.semibold },

  // Selector group
  selectorGroup: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: colors.background,
  },
  selectorGroupSky: { backgroundColor: 'rgba(240,249,255,0.32)' },
  selectorLabel: { fontSize: 14, lineHeight: 20, fontWeight: fontWeight.semibold, color: '#44403B', marginBottom: 16 },
  requiredMark:  { color: colors.error },
  selectorRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectorRowWrap: { flexWrap: 'wrap' },

  // Generic chip
  chipTouch: {
    flex: 0,
    flexGrow: 0,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    overflow: 'hidden',
  },
  chipTouchSelected: {
    borderColor: '#00A6F4',
    shadowColor: '#00A6F4',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chip: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 17,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLarge:   { height: 44 },
  chipWrap:    { flex: 0, flexGrow: 0 },
  chipText:    { fontSize: 14, lineHeight: 20, color: '#57534E', fontWeight: fontWeight.regular, textAlign: 'center' },
  chipTextLarge:    { fontSize: 14 },
  chipTextSelected: { color: colors.textInverse, fontWeight: fontWeight.semibold },

  // Clothing
  clothingSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(255,251,235,0.32)',
  },
  clothingHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  cloBadge: {
    backgroundColor: colors.accentSurface, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  cloBadgeText: { fontSize: fontSize.xs, color: colors.accent, fontWeight: fontWeight.semibold },
  clothingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  clothingChip: {
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: borderRadius.full, borderWidth: 1,
    borderColor: '#F5F5F4', backgroundColor: colors.surface,
  },
  clothingChipOn:     { backgroundColor: colors.accent, borderColor: colors.accent },
  clothingChipText:   { fontSize: 13, lineHeight: 18, color: '#57534E', fontWeight: fontWeight.regular },
  clothingChipTextOn: { color: colors.textInverse, fontWeight: fontWeight.semibold },
  accordionSection: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  accordionHeader: {
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accordionLabel: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  accordionChevronMark: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#A8A29E',
    transform: [{ rotate: '45deg' }],
  },
  accordionChevronMarkOpen: {
    transform: [{ rotate: '-135deg' }],
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
  },

  // Optional
  optionalToggle:     {
    marginHorizontal: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    marginTop: 2,
    marginBottom: 18,
  },
  optionalToggleText: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, fontWeight: fontWeight.medium },
  optionalSection:    { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },

  // Submit
  submitTouch: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 24,
  },
  submitButton: {
    minHeight: 88,
    borderRadius: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  submitButtonLoading: { justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.58 },
  submitText: { fontSize: 17, lineHeight: 24, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  submitTextDisabled: { color: colors.mutedButtonText },
  submitArrowBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F4',
  },
  submitArrowBoxDisabled: { backgroundColor: '#EFEFEF' },
  chevronMark: {
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
});
