// ============================================================
// Login Screen — Google / Kakao 소셜 로그인
// ============================================================
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';

export default function LoginScreen() {
  const { signInWithOAuth } = useAuthStore();

  const handleOAuth = async (provider: 'google' | 'kakao') => {
    try {
      await signInWithOAuth(provider);
    } catch (e: any) {
      const label = provider === 'google' ? 'Google' : '카카오';
      Alert.alert('로그인 실패', e.message || `${label} 로그인에 실패했습니다`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
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

      {/* Login Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={() => handleOAuth('google')}
          activeOpacity={0.8}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>Google로 시작하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.kakaoButton]}
          onPress={() => handleOAuth('kakao')}
          activeOpacity={0.8}
        >
          <Text style={styles.kakaoIcon}>💬</Text>
          <Text style={styles.kakaoText}>카카오로 시작하기</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.terms}>
        시작하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주합니다
      </Text>
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
  buttons: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: '#4285F4',
  },
  googleText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: '#333333',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  kakaoIcon: {
    fontSize: 20,
  },
  kakaoText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: '#191919',
  },
  terms: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingBottom: spacing.xl,
  },
});
