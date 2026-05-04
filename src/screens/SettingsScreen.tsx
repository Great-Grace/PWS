import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../config/supabase';
import { APP_VERSION } from '../config/appInfo';
import { computeBMI, computeBMIBucket, computeBMIOffset } from '../utils/formulas';
import AppDialog, { AppDialogState } from '../components/AppDialog';

const TERMS_SUMMARY =
  '서비스는 지역별 날씨 정보, 개인 체감 기록, 옷차림 추천, 히스토리 및 통계 기능을 제공합니다.\n\n회원은 약관과 관련 법령을 준수해야 하며 허위 정보 입력, 타인 정보 도용, 서비스 운영 방해를 해서는 안 됩니다.';

const PRIVACY_SUMMARY =
  '회원 식별 정보, 지역 정보, 체감 피드백, 서비스 이용 로그를 수집합니다.\n\n수집 정보는 개인화된 날씨·옷차림 추천 제공, 계정 관리, 서비스 품질 개선에 사용되며 회원 탈퇴 또는 목적 달성 시 지체 없이 파기합니다.';

export default function SettingsScreen() {
  const { user, updateProfile, signOut } = useAuthStore();
  const figmaParityMode = __DEV__ && !!user?.id && user.id.startsWith('dev-');

  const [isBmiModalVisible, setBmiModalVisible] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  const [isFeedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setSendingFeedback] = useState(false);
  const [dialog, setDialog] = useState<AppDialogState | null>(null);

  const profileSummary = useMemo(() => {
    if (figmaParityMode) return '지우진';
    const parts = [user?.nickname || '미설정'];
    if (user?.climate_zone) parts.push(user.climate_zone);
    return parts.join(' · ');
  }, [figmaParityMode, user?.nickname, user?.climate_zone]);

  const profileDescription = figmaParityMode
    ? '남성 · BMI 31.1'
    : user?.climate_zone || '위치 미설정';

  const correctionRows = useMemo(() => {
    if (figmaParityMode) {
      return [
        { label: '추위 민감도', value: '+0°', fill: '50%' as DimensionValue },
        { label: '더위 민감도', value: '+0°', fill: '50%' as DimensionValue },
        { label: '습도 민감도', value: '+0°', fill: '50%' as DimensionValue },
      ];
    }
    const base = user?.bmi_offset ?? 0;
    const signed = base > 0 ? `+${base.toFixed(1)}°` : `${base.toFixed(1)}°`;
    return [
      { label: '체질 보정', value: signed, fill: `${Math.min(88, Math.max(12, 50 + base * 16))}%` as DimensionValue },
      { label: '개인화 학습', value: user?.weight_updated_at ? '반영됨' : '대기 중', fill: (user?.weight_updated_at ? '64%' : '24%') as DimensionValue },
    ];
  }, [figmaParityMode, user?.bmi_offset, user?.weight_updated_at]);

  const handleToggle = async (
    key: 'notify_enabled' | 'notify_outfit' | 'notify_rain',
    value: boolean
  ) => {
    try {
      await updateProfile({ [key]: value });
    } catch {
      setDialog({
        title: '설정 저장 실패',
        message: '설정 저장에 실패했습니다.',
        primaryLabel: '확인',
      });
    }
  };

  const handleSaveBmi = async () => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);

    if (!h || !w || h <= 0 || w <= 0) {
      setDialog({
        title: '입력 오류',
        message: '정확한 키와 몸무게를 입력해주세요.',
        primaryLabel: '확인',
      });
      return;
    }

    try {
      const bmi = computeBMI(h, w);
      await updateProfile({
        bmi_bucket: computeBMIBucket(bmi),
        bmi_offset: computeBMIOffset(bmi),
      });
      setBmiModalVisible(false);
      setHeightCm('');
      setWeightKg('');
      setDialog({
        title: '저장 완료',
        message: '체형 데이터가 업데이트되었습니다.',
        primaryLabel: '확인',
      });
    } catch {
      setDialog({
        title: '저장 실패',
        message: '체형 저장에 실패했습니다.',
        primaryLabel: '확인',
      });
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      setDialog({
        title: '내용을 입력해주세요',
        message: '피드백 내용을 입력하면 전송할 수 있어요.',
        primaryLabel: '확인',
      });
      return;
    }

    setSendingFeedback(true);
    try {
      const { error } = await supabase
        .from('tester_feedback')
        .insert({ user_id: user?.id, message: feedbackText.trim() });

      if (error) throw error;

      setFeedbackText('');
      setFeedbackModalVisible(false);
      setDialog({
        title: '전송 완료',
        message: '피드백을 보내주셔서 감사합니다.',
        primaryLabel: '확인',
      });
    } catch {
      setDialog({
        title: '전송 실패',
        message: '잠시 후 다시 시도해주세요.',
        primaryLabel: '확인',
      });
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleSignOut = () => {
    setDialog({
      title: '로그아웃',
      message: '정말 로그아웃하시겠어요?',
      secondaryLabel: '취소',
      primaryLabel: '로그아웃',
      destructive: true,
      onPrimary: signOut,
    });
  };

  const showTerms = () => {
    setDialog({
      title: '이용약관',
      message: TERMS_SUMMARY,
      primaryLabel: '확인',
    });
  };

  const showPrivacyPolicy = () => {
    setDialog({
      title: '개인정보 처리방침',
      message: PRIVACY_SUMMARY,
      primaryLabel: '확인',
    });
  };

  const handleDeleteAccount = () => {
    setDialog({
      title: '계정 삭제',
      message: '모든 데이터가 영구적으로 삭제됩니다.\n정말 삭제하시겠어요?',
      secondaryLabel: '취소',
      primaryLabel: '삭제',
      destructive: true,
      onPrimary: async () => {
        try {
          if (!user?.id) return;
          const { error: rpcError } = await supabase.rpc('delete_own_account');
          if (rpcError) throw rpcError;
          await signOut();
        } catch {
          setDialog({
            title: '계정 삭제 실패',
            message: '계정 삭제가 완료되지 않았습니다. 잠시 후 다시 시도해주세요.',
            primaryLabel: '확인',
          });
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>설정</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroProfileRow}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>
                {figmaParityMode ? '지' : (user?.nickname || '계정').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{profileSummary}</Text>
              <Text style={styles.heroDescription}>{profileDescription}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setBmiModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="프로필 수정"
            style={styles.heroActionButton}
          >
            <Text style={styles.heroActionText}>프로필 수정</Text>
          </Pressable>
        </View>

        <Section title="위치">
          <SettingItemRow
            label="현재 위치"
            value={user?.climate_zone || '위치 미설정'}
          />
        </Section>

        <Section title="알림">
          <ToggleRow
            label="알림 받기"
            description="날씨 추천 알림을 받습니다"
            value={figmaParityMode ? true : user?.notify_enabled ?? true}
            onToggle={(value) => handleToggle('notify_enabled', value)}
          />
          <ToggleRow
            label="아침 알림"
            description="오전 8시 날씨 추천"
            value={figmaParityMode ? true : user?.notify_outfit ?? true}
            onToggle={(value) => handleToggle('notify_outfit', value)}
          />
          <ToggleRow
            label="저녁 알림"
            description="오후 6시 체감 기록 요청"
            value={figmaParityMode ? false : user?.notify_rain ?? true}
            onToggle={(value) => handleToggle('notify_rain', value)}
          />
        </Section>

        <Section title="추천 설정">
          <InfoActionRow label="체감 민감도" value={figmaParityMode ? '보통' : user?.weight_updated_at ? '개인화 적용' : '기록 후 자동 보정'} />
          <InfoActionRow
            label="체질 프로필"
            value={figmaParityMode ? '표준' : user?.bmi_bucket ? '표준' : '미설정'}
            onPress={() => setBmiModalVisible(true)}
          />
        </Section>

        <Section title="체질 보정">
          <View style={styles.correctionCard}>
            {correctionRows.map((row) => (
              <View key={row.label} style={styles.correctionRow}>
                <View style={styles.correctionHeader}>
                  <Text style={styles.correctionLabel}>{row.label}</Text>
                  <View style={styles.correctionValuePill}>
                    <Text style={styles.correctionValueText}>{row.value}</Text>
                  </View>
                </View>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: row.fill }]} />
                </View>
              </View>
            ))}
            <Text style={styles.correctionHint}>
              {figmaParityMode
                ? '슬라이더를 조정하여 당신의 체질에 맞게 추천을 개인화하세요'
                : '피드백 기록과 체형 기준이 쌓이면 추천 보정값에 자동 반영됩니다.'}
            </Text>
          </View>
        </Section>

        <Section title="앱 정보">
          <InfoActionRow label="버전" value={APP_VERSION} />
          <InfoActionRow label="이용약관" value="" onPress={showTerms} />
          <InfoActionRow label="개인정보 처리방침" value="" onPress={showPrivacyPolicy} />
        </Section>

        {figmaParityMode ? null : (
          <Section title="지원">
            <InfoActionRow label="앱 피드백 보내기" value="" onPress={() => setFeedbackModalVisible(true)} />
          </Section>
        )}

        <View style={styles.actionGroup}>
          <Pressable
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="로그아웃"
            style={[styles.actionButton, styles.signOutButton]}
          >
            <Text style={styles.actionButtonText}>로그아웃</Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="계정 삭제"
            accessibilityHint="계정과 저장된 데이터를 삭제하기 전 확인 창을 엽니다"
            style={[styles.actionButton, styles.deleteAccountButton]}
          >
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>계정 삭제</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={isFeedbackModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <ModalCard
          title="앱 피드백"
          description="버그, 불편한 점, 개선 아이디어를 자유롭게 남겨주세요."
          onCancel={() => {
            setFeedbackModalVisible(false);
            setFeedbackText('');
          }}
          onConfirm={handleSendFeedback}
          confirmLabel={isSendingFeedback ? '전송 중...' : '보내기'}
          confirmDisabled={isSendingFeedback}
        >
          <TextInput
            style={[styles.modalInput, styles.feedbackInput]}
            placeholder="내용을 입력해주세요..."
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="앱 피드백 내용"
            accessibilityHint="버그, 불편한 점, 개선 아이디어를 입력하세요"
            value={feedbackText}
            onChangeText={setFeedbackText}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.feedbackCount}>{feedbackText.length}/500</Text>
        </ModalCard>
      </Modal>

      <Modal
        visible={isBmiModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setBmiModalVisible(false)}
      >
        <ModalCard
          title="체형 기준 입력"
          description="입력한 키와 몸무게를 바탕으로 추위/더위 보정값을 계산합니다."
          onCancel={() => setBmiModalVisible(false)}
          onConfirm={handleSaveBmi}
          confirmLabel="저장하기"
        >
          <View style={styles.modalRow}>
            <TextInput
              style={styles.modalInput}
              placeholder="키 (cm)"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="키"
              accessibilityHint="센티미터 단위로 키를 입력하세요"
              keyboardType="numeric"
              value={heightCm}
              onChangeText={setHeightCm}
              maxLength={3}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="몸무게 (kg)"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="몸무게"
              accessibilityHint="킬로그램 단위로 몸무게를 입력하세요"
              keyboardType="numeric"
              value={weightKg}
              onChangeText={setWeightKg}
              maxLength={3}
            />
          </View>
        </ModalCard>
      </Modal>
      <AppDialog dialog={dialog} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}

function SettingItemRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.locationRow}>
      <View style={styles.locationLeft}>
        <View style={styles.locationIconWrap}>
          <LocationMark />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowValue}>{value}</Text>
        <RowChevronMark />
      </View>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoActionRow({
  label,
  value,
  onPress,
  highlight = false,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  highlight?: boolean;
}) {
  const content = (
    <View style={styles.rowContent}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
        {onPress ? <RowChevronMark /> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.row}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

function RowChevronMark() {
  return <View style={styles.rowChevronMark} />;
}

function LocationMark() {
  return (
    <View style={styles.locationMark}>
      <View style={styles.locationMarkRing} />
      <View style={styles.locationMarkStem} />
    </View>
  );
}

function NotificationMark() {
  return (
    <View style={styles.notificationMark}>
      <View style={styles.notificationBellBody} />
      <View style={styles.notificationBellStem} />
      <View style={styles.notificationBellClapper} />
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.toggleIcon}>
        <NotificationMark />
      </View>
      <View style={styles.toggleCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Pressable
        onPress={() => onToggle(!value)}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={description}
        accessibilityState={{ checked: value }}
        style={[styles.customToggle, value && styles.customToggleOn]}
      >
        <View style={[styles.customToggleThumb, value && styles.customToggleThumbOn]} />
      </Pressable>
    </View>
  );
}

function ModalCard({
  title,
  description,
  children,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
}) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalDescription}>{description}</Text>
        {children}
        <View style={styles.modalActions}>
          <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="취소" style={[styles.modalButton, styles.modalButtonMuted]}>
            <Text style={styles.modalButtonMutedText}>취소</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={confirmDisabled}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            accessibilityState={{ disabled: confirmDisabled }}
            style={[styles.modalButton, styles.modalButtonPrimary, confirmDisabled && styles.modalButtonDisabled]}
          >
            <Text style={styles.modalButtonPrimaryText}>{confirmLabel}</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 128,
  },
  header: {
    minHeight: 89,
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
  heroCard: {
    marginHorizontal: 24,
    marginTop: 24,
    minHeight: 179,
    backgroundColor: '#FAFAF9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  heroIconText: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
  },
  heroProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#57534D',
  },
  heroActionButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  heroActionText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#44403B',
    fontWeight: fontWeight.semibold,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  locationRow: {
    minHeight: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationMark: { width: 18, height: 20, alignItems: 'center' },
  locationMarkRing: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  locationMarkStem: {
    width: 7,
    height: 7,
    marginTop: -3,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.textPrimary,
    transform: [{ rotate: '-45deg' }],
  },
  row: {
    minHeight: 89,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  rowValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    lineHeight: 20,
    color: '#79716B',
    fontWeight: fontWeight.semibold,
  },
  rowValueHighlight: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  rowChevronMark: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.textTertiary,
    transform: [{ rotate: '45deg' }],
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
    paddingHorizontal: spacing.md,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationMark: { width: 18, height: 20, alignItems: 'center', justifyContent: 'center' },
  notificationBellBody: {
    width: 13,
    height: 13,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 2,
    borderColor: colors.textPrimary,
    borderBottomWidth: 0,
  },
  notificationBellStem: {
    width: 15,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
    marginTop: -2,
  },
  notificationBellClapper: {
    width: 5,
    height: 5,
    marginTop: 1,
    borderRadius: 3,
    backgroundColor: colors.textPrimary,
  },
  customToggle: {
    width: 56,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#E7E5E4',
    padding: 4,
    justifyContent: 'center',
  },
  customToggleOn: {
    backgroundColor: '#0A84FF',
    shadowColor: '#00A6F4',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  customToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  customToggleThumbOn: {
    alignSelf: 'flex-end',
  },
  toggleDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#79716B',
  },
  correctionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    padding: 18,
  },
  correctionRow: {
    marginBottom: spacing.md,
  },
  correctionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  correctionLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  correctionValuePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  correctionValueText: {
    fontSize: fontSize.xs,
    lineHeight: 16,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#D9E8FF',
    overflow: 'visible',
    justifyContent: 'center',
  },
  sliderFill: {
    width: '55%',
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  sliderThumb: {
    position: 'absolute',
    left: '50%',
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginLeft: -7,
  },
  correctionHint: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    lineHeight: 18,
    color: colors.textTertiary,
  },
  feedbackCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  feedbackCardText: {
    flex: 1,
    gap: 4,
  },
  feedbackCardTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  feedbackCardDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  feedbackCardArrow: {
    fontSize: 24,
    lineHeight: 24,
    color: colors.textTertiary,
  },
  actionGroup: {
    gap: spacing.sm,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  actionButton: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  deleteAccountButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionButtonText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  dangerButtonText: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  modalDescription: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalInput: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.textPrimary,
  },
  feedbackInput: {
    minHeight: 130,
  },
  feedbackCount: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textAlign: 'right',
    fontSize: fontSize.xs,
    lineHeight: 18,
    color: colors.textTertiary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonMuted: {
    backgroundColor: colors.surfaceSecondary,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonMutedText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  modalButtonPrimaryText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.textInverse,
    fontWeight: fontWeight.semibold,
  },
});
