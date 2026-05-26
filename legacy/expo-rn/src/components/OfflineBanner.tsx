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
      <View style={styles.badge}>
        <Text style={styles.badgeText}>오프라인</Text>
      </View>
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
    backgroundColor: '#7F1D1D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 0, // dynamic via insets
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.75)',
  },
});
