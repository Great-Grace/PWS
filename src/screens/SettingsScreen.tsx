// ============================================================
// Settings Screen — 알림, 프로필, BMI, 계정 관리
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../config/supabase';
import { computeBMI, computeBMIBucket, computeBMIOffset } from '../utils/formulas';

export default function SettingsScreen() {
  const { user, updateProfile, signOut } = useAuthStore();
  const [notifyEnabled, setNotifyEnabled] = useState(user?.notify_enabled ?? true);
  const [notifyOutfit, setNotifyOutfit] = useState(user?.notify_outfit ?? true);
  const [notifyRain, setNotifyRain] = useState(user?.notify_rain ?? true);

  // BMI Modal State
  const [isBmiModalVisible, setBmiModalVisible] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  // Tester Feedback State
  const [isFeedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setSendingFeedback] = useState(false);

  const handleToggle = async (
    key: 'notify_enabled' | 'notify_outfit' | 'notify_rain',
    value: boolean
  ) => {
    try {
      await updateProfile({ [key]: value });
      if (key === 'notify_enabled') setNotifyEnabled(value);
      if (key === 'notify_outfit') setNotifyOutfit(value);
      if (key === 'notify_rain') setNotifyRain(value);
    } catch {
      Alert.alert('설정 저장에 실패했습니다');
    }
  };

  const handleSaveBmi = async () => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0 || w <= 0) {
      Alert.alert('정확한 키와 몸무게를 입력해주세요');
      return;
    }

    try {
      const bmi = computeBMI(h, w);
      await updateProfile({
        bmi_bucket: computeBMIBucket(bmi),
        bmi_offset: computeBMIOffset(bmi),
      });
      setBmiModalVisible(false);
      Alert.alert('저장 완료', '체형 데이터가 업데이트 되었습니다.\n새로운 체감 보정값이 24시간 내로 전체 예측에 적용됩니다.');
    } catch {
      Alert.alert('저장에 실패했습니다');
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('내용을 입력해주세요');
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
      Alert.alert('전송 완료', '피드백을 보내주셔서 감사합니다!');
    } catch {
      Alert.alert('전송 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '모든 데이터가 영구적으로 삭제됩니다.\n정말 삭제하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Delete user record (cascades to feedback_entries etc.)
              const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', user?.id);

              if (deleteError) throw deleteError;

              // 2. Delete Supabase Auth user via RPC
              // (서버 사이드에 delete_own_account RPC가 없으면 signOut만 수행)
              try {
                await supabase.rpc('delete_own_account');
              } catch {
                // RPC 미구현 시 무시 — 최소한 로그아웃은 수행
              }

              await signOut();
            } catch {
              Alert.alert('계정 삭제에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>⚙️ 설정</Text>

        {/* Profile Section */}
        <SectionHeader title="프로필" />
        <View style={styles.card}>
          <InfoRow label="닉네임" value={user?.nickname || '-'} />
          <InfoRow label="기준 동네" value={user?.climate_zone || '-'} />
          <InfoRow 
            label="체형 기반 예측" 
            value={user?.bmi_bucket ? '✓ 설정됨 (수정)' : '미설정 (설정하기)'} 
            valueStyle={user?.bmi_bucket ? styles.valueSuccess : styles.valueAction}
            onPress={() => setBmiModalVisible(true)}
          />
        </View>

        {/* Notification Section */}
        <SectionHeader title="알림" />
        <View style={styles.card}>
          <ToggleRow
            label="알림 활성화"
            value={notifyEnabled}
            onToggle={(v) => handleToggle('notify_enabled', v)}
          />
          <ToggleRow
            label="옷차림 추천 포함"
            value={notifyOutfit}
            onToggle={(v) => handleToggle('notify_outfit', v)}
          />
          <ToggleRow
            label="비 예보 알림"
            value={notifyRain}
            onToggle={(v) => handleToggle('notify_rain', v)}
          />
          <InfoRow label="알림 시간" value={user?.notify_time?.slice(0, 5) || '07:30'} />
        </View>

        {/* Data Section */}
        <SectionHeader title="데이터 & 개인정보" />
        <View style={styles.card}>
          <InfoRow label="가입일" value={user?.created_at?.split('T')[0] || '-'} />
          <InfoRow label="마지막 수정" value={user?.updated_at?.split('T')[0] || '-'} />
        </View>

        {/* Tester Feedback */}
        <SectionHeader title="테스터 피드백" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => setFeedbackModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.feedbackButtonText}>앱 피드백 보내기</Text>
            <Text style={styles.feedbackButtonArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSignOut}
          >
            <Text style={styles.actionText}>로그아웃</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.dangerText}>계정 삭제</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>PWS v1.0.0</Text>
      </ScrollView>

      {/* Tester Feedback Modal */}
      <Modal
        visible={isFeedbackModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>앱 피드백</Text>
            <Text style={styles.modalDesc}>
              버그, 불편한 점, 개선 아이디어 무엇이든 자유롭게 남겨주세요.
            </Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="내용을 입력해주세요..."
              placeholderTextColor={colors.textTertiary}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.feedbackCount}>{feedbackText.length}/500</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => { setFeedbackModalVisible(false); setFeedbackText(''); }}
              >
                <Text style={styles.modalButtonTextCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit, isSendingFeedback && styles.submitButtonDisabled]}
                onPress={handleSendFeedback}
                disabled={isSendingFeedback}
              >
                <Text style={styles.modalButtonTextSubmit}>
                  {isSendingFeedback ? '전송 중...' : '보내기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BMI Input Modal */}
      <Modal
        visible={isBmiModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setBmiModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>체형 기준 입력</Text>
            <Text style={styles.modalDesc}>
              체형(BMI) 정보를 입력하시면 몸무게 표면적 비율에 따라 추위/더위를 타는 정도를 자동으로 보정해드립니다.
            </Text>
            
            <View style={styles.modalInputRow}>
              <TextInput
                style={styles.modalInput}
                placeholder="키 (cm)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={heightCm}
                onChangeText={setHeightCm}
                maxLength={3}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="몸무게 (kg)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={weightKg}
                onChangeText={setWeightKg}
                maxLength={3}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setBmiModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleSaveBmi}
              >
                <Text style={styles.modalButtonTextSubmit}>저장하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function InfoRow({ 
  label, 
  value, 
  valueStyle,
  onPress 
}: { 
  label: string; 
  value: string; 
  valueStyle?: any;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.infoRow} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.infoRow}>{content}</View>;
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.surfaceElevated, true: colors.primaryDark }}
        thumbColor={value ? colors.primary : colors.textTertiary}
      />
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
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  dangerButton: {
    borderColor: colors.error,
  },
  dangerText: {
    fontSize: fontSize.md,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  version: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  feedbackInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    minHeight: 120,
    marginBottom: spacing.xs,
  },
  feedbackCount: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  feedbackButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  feedbackButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  feedbackButtonArrow: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
  valueAction: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  valueSuccess: {
    color: colors.success,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalInputRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  modalInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.surfaceElevated,
  },
  modalButtonSubmit: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.md,
  },
  modalButtonTextSubmit: {
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
});
