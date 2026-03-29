// ============================================================
// OfflineBanner — 네트워크 오프라인 감지 배너
// ============================================================
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(() => new Animated.Value(-60));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);

      Animated.spring(slideAnim, {
        toValue: offline ? 0 : -60,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + spacing.sm, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.icon}>📡</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>오프라인 상태</Text>
        <Text style={styles.subtitle}>인터넷 연결을 확인해주세요</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 0, // dynamic via insets
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: 'rgba(240, 242, 255, 0.8)',
  },
});
