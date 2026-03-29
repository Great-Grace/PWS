// ============================================================
// Login Screen — 테스터 ID 입력 (Expo Go 테스트용)
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';

const TESTER_ID_REGEX = /^[a-z0-9_]{2,20}$/;

export default function LoginScreen() {
  const { signInWithTesterId } = useAuthStore();
  const [testerId, setTesterId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    const trimmed = testerId.trim().toLowerCase();

    if (!TESTER_ID_REGEX.test(trimmed)) {
      Alert.alert(
        '아이디 오류',
        '영문 소문자, 숫자, 언더스코어(_)만 사용 가능하며\n2~20자로 입력해주세요.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await signInWithTesterId(trimmed);
    } catch (e: any) {
      Alert.alert('로그인 실패', e.message || '다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.emoji}>🌤️</Text>
          <Text style={styles.title}>나만의 날씨</Text>
          <Text style={styles.subtitle}>
            같은 기온도 사람마다 다르게 느끼니까{'\n'}
            당신만의 체감 날씨를 알려드릴게요
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem emoji="🎯" text="체감 피드백을 학습해요" />
          <FeatureItem emoji="👔" text="맞춤 옷차림을 추천해요" />
          <FeatureItem emoji="🔔" text="매일 아침 브리핑을 보내요" />
        </View>

        {/* Tester ID Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>테스터 아이디</Text>
          <TextInput
            style={styles.input}
            value={testerId}
            onChangeText={setTesterId}
            placeholder="영문 소문자·숫자·_ (2~20자)"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleStart}
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleStart}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>시작하기</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.notice}>
          테스트 빌드 전용 · 입력한 아이디가 데이터 키로 사용됩니다
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl + 8,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  inputSection: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  notice: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingBottom: spacing.xl,
  },
});
