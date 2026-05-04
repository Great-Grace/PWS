import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, colors, fontSize, fontWeight, layout, spacing } from '../theme';
import { useAuthStore } from '../stores/authStore';
import AppDialog, { AppDialogState } from '../components/AppDialog';

const TESTER_ID_REGEX = /^[a-z0-9_]{2,20}$/;

export default function LoginScreen() {
  const { signInWithTesterId } = useAuthStore();
  const [testerId, setTesterId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesterSheetVisible, setTesterSheetVisible] = useState(false);
  const [dialog, setDialog] = useState<AppDialogState | null>(null);

  const openTesterSheet = () => {
    setTesterSheetVisible(true);
  };

  const closeTesterSheet = () => {
    if (isLoading) return;
    setTesterSheetVisible(false);
  };

  const handleStart = async () => {
    const trimmed = testerId.trim().toLowerCase();

    if (!TESTER_ID_REGEX.test(trimmed)) {
      setDialog({
        title: '아이디 오류',
        message: '영문 소문자, 숫자, 언더스코어(_)만 사용 가능하며\n2~20자로 입력해주세요.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await signInWithTesterId(trimmed);
      setTesterSheetVisible(false);
    } catch (error: any) {
      setDialog({
        title: '로그인 실패',
        message: error.message || '잠시 후 다시 시도해주세요.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F0F9FF', '#EFF6FF', '#EEF2FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientRoot}
    >
      <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.hero}>
          <LinearGradient
            colors={['#00A6F4', '#155DFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoMark}
          >
            <CloudMark />
          </LinearGradient>
          <Text style={styles.title}>날씨 체감 기록</Text>
          <Text style={styles.subtitle}>오늘의 날씨, 나만의 체감으로 기록하세요</Text>
        </View>

        <Pressable
          onPress={openTesterSheet}
          accessibilityRole="button"
          accessibilityLabel="테스터로 시작하기"
          accessibilityHint="등록된 테스터 아이디로 앱을 시작합니다"
          style={({ pressed }) => [styles.providerShadow, pressed && styles.providerPressed]}
        >
          <View style={styles.providerButton}>
            <Text style={styles.providerMark}>T</Text>
            <Text style={styles.providerLabel}>테스터로 시작하기</Text>
          </View>
        </Pressable>

        <Text style={styles.legalText}>
          사전 등록된 테스터 ID로 이용할 수 있어요{`\n`}소셜 로그인은 현재 빌드에서 제공하지 않습니다
        </Text>
      </View>

      <Modal
        visible={isTesterSheetVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeTesterSheet}
      >
        <Pressable style={styles.modalOverlay} onPress={closeTesterSheet}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
            <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
              <Text style={styles.modalTitle}>테스터 로그인</Text>
              <Text style={styles.modalDescription}>
                현재 빌드는 사전 등록된 테스터 ID로만 시작할 수 있어요.
              </Text>
              <TextInput
                value={testerId}
                onChangeText={setTesterId}
                placeholder="테스터 아이디 입력"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="테스터 아이디"
                accessibilityHint="등록된 테스터 아이디를 입력하세요"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleStart}
                style={styles.input}
              />
              <Text style={styles.helperText}>등록된 ID 예: pws_dev · 영문 소문자/숫자/_ 조합 2~20자</Text>
              <Pressable
                onPress={handleStart}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="앱 시작하기"
                accessibilityState={{ disabled: isLoading }}
                style={({ pressed }) => [styles.confirmShadow, pressed && styles.providerPressed]}
              >
                <View style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}>
                  {isLoading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.confirmButtonText}>앱 시작하기</Text>}
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      <AppDialog dialog={dialog} onClose={() => setDialog(null)} />
      </SafeAreaView>
    </LinearGradient>
  );
}

function CloudMark() {
  return (
    <View style={styles.cloudMark}>
      <View style={styles.cloudBase} />
      <View style={styles.cloudLobeLeft} />
      <View style={styles.cloudLobeCenter} />
      <View style={styles.cloudLobeRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  gradientRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 87,
    paddingBottom: 54,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#00A6F4',
    shadowOpacity: 0.32,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 6,
  },
  cloudMark: {
    width: 42,
    height: 30,
    alignItems: 'center',
  },
  cloudBase: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 3,
    height: 15,
    borderRadius: 10,
    backgroundColor: colors.textInverse,
  },
  cloudLobeLeft: {
    position: 'absolute',
    left: 7,
    bottom: 9,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.textInverse,
  },
  cloudLobeCenter: {
    position: 'absolute',
    left: 15,
    bottom: 11,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textInverse,
  },
  cloudLobeRight: {
    position: 'absolute',
    right: 6,
    bottom: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.textInverse,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#57534D',
    textAlign: 'center',
  },
  actionStack: {
    gap: 12,
  },
  providerShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  providerPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  providerButton: {
    minHeight: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E7E5E4',
    backgroundColor: colors.surface,
  },
  providerMark: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  providerLabel: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  legalText: {
    marginTop: 32,
    textAlign: 'center',
    color: '#79716B',
    fontSize: 12,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalKeyboard: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  input: {
    height: 58,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  helperText: {
    marginTop: -6,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTertiary,
  },
  confirmShadow: {
    marginTop: spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButton: {
    height: 58,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
});
