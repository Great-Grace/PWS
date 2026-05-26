// ============================================================
// ErrorBoundary — 렌더링 크래시 방어 (White Screen of Death 방지)
// ============================================================
import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { logSafeError } from '../utils/safeLog';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 프로덕션에서는 Sentry 등 에러 리포팅 서비스로 전송
    logSafeError('[ErrorBoundary]', __DEV__ ? { error, errorInfo } : error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>오류</Text>
            </View>
            <Text style={styles.title}>앗, 문제가 발생했어요</Text>
            <Text style={styles.message}>
              예상치 못한 오류가 발생했습니다.{'\n'}
              아래 버튼을 눌러 다시 시도해주세요.
            </Text>
            <Pressable
              onPress={this.handleRetry}
              accessibilityRole="button"
              accessibilityLabel="다시 시도하기"
            >
              <View style={styles.retryButton}>
                <Text style={styles.retryText}>다시 시도하기</Text>
              </View>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accentSurface,
    marginBottom: spacing.lg,
  },
  badgeText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  retryText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
});
