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

const TESTER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { signInWithEmailPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!TESTER_EMAIL_REGEX.test(trimmedEmail)) {
      setDialog({
        title: '이메일 오류',
        message: '배정받은 TestFlight 이메일을 입력해주세요.\n예: pws_tf_01@test.pws',
      });
      return;
    }

    if (!trimmedPassword) {
      setDialog({
        title: '비밀번호 오류',
        message: '테스터 공통 비밀번호를 입력해주세요.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailPassword(trimmedEmail, trimmedPassword);
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
          accessibilityLabel="이메일로 로그인"
          accessibilityHint="배정된 TestFlight 이메일과 비밀번호로 로그인합니다"
          style={({ pressed }) => [styles.providerShadow, pressed && styles.providerPressed]}
        >
          <View style={styles.providerButton}>
            <Text style={styles.providerMark}>T</Text>
            <Text style={styles.providerLabel}>이메일로 로그인</Text>
          </View>
        </Pressable>

        <Text style={styles.legalText}>
          사전 등록된 TestFlight 계정으로 이용할 수 있어요{`\n`}소셜 로그인은 현재 빌드에서 제공하지 않습니다
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
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="테스터 로그인 닫기"
            style={StyleSheet.absoluteFill}
            onPress={closeTesterSheet}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            pointerEvents="box-none"
            style={styles.modalKeyboard}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>테스터 로그인</Text>
              <Text style={styles.modalDescription}>
                배정받은 이메일과 공통 비밀번호를 입력하세요.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="pws_tf_01@test.pws"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="테스터 이메일"
                accessibilityHint="배정받은 TestFlight 이메일을 입력하세요"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="next"
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="비밀번호"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleStart}
                style={styles.input}
              />
              <Text style={styles.helperText}>일반 QA는 pws_tf_* 계정, 탈퇴 테스트는 pws_delete_* 계정만 사용하세요.</Text>
              <Pressable
                onPress={handleStart}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="이메일로 로그인"
                accessibilityState={{ disabled: isLoading }}
                style={({ pressed }) => [styles.confirmShadow, pressed && styles.providerPressed]}
              >
                <View style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}>
                  {isLoading ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.confirmButtonText}>이메일로 로그인</Text>}
                </View>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
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
