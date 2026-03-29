// ============================================================
// Weather Detail Screen — 시간별/주간 예보 상세
// ============================================================
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useWeatherStore } from '../stores/weatherStore';
import { formatTemp, formatHour, formatDay, getWeatherEmoji } from '../utils/formulas';

export default function WeatherDetailScreen() {
  const hourly = useWeatherStore(s => s.data?.hourly ?? []);
  const daily = useWeatherStore(s => s.data?.daily ?? []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hourly Section */}
        <Text style={styles.sectionTitle}>⏰ 시간별 예보 (24시간)</Text>
        <View style={styles.section}>
          {hourly.map((h, i) => (
            <View key={i} style={styles.hourlyRow}>
              <Text style={styles.hourlyTime}>
                {i === 0 ? '지금' : formatHour(h.dt)}
              </Text>
              <Text style={styles.hourlyEmoji}>
                {getWeatherEmoji(h.weather_code)}
              </Text>
              <Text style={styles.hourlyTemp}>{formatTemp(h.temp)}</Text>
              <View style={styles.hourlyMeta}>
                <Text style={styles.metaText}>💧{h.humidity}%</Text>
                <Text style={styles.metaText}>💨{h.wind_speed.toFixed(1)}</Text>
              </View>
              {h.pop > 0.1 && (
                <Text style={styles.popText}>🌧️{Math.round(h.pop * 100)}%</Text>
              )}
            </View>
          ))}
        </View>

        {/* Daily Section */}
        <Text style={styles.sectionTitle}>📅 주간 예보 (7일)</Text>
        <View style={styles.section}>
          {daily.map((d, i) => (
            <View key={i} style={styles.dailyRow}>
              <Text style={styles.dailyDay}>
                {i === 0 ? '오늘' : formatDay(d.dt)}
              </Text>
              <Text style={styles.dailyEmoji}>
                {getWeatherEmoji(d.weather_code)}
              </Text>
              <View style={styles.dailyTempRange}>
                <Text style={styles.dailyTempLow}>{formatTemp(d.temp_min)}</Text>
                <View style={styles.tempBar}>
                  <View
                    style={[
                      styles.tempBarFill,
                      {
                        left: `${Math.max(0, ((d.temp_min + 10) / 50) * 100)}%`,
                        width: `${Math.min(100, ((d.temp_max - d.temp_min) / 50) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dailyTempHigh}>{formatTemp(d.temp_max)}</Text>
              </View>
              {d.pop > 0.1 && (
                <Text style={styles.popText}>🌧️{Math.round(d.pop * 100)}%</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Hourly
  hourlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  hourlyTime: {
    width: 48,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  hourlyEmoji: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  hourlyTemp: {
    width: 44,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  hourlyMeta: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  popText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    width: 48,
    textAlign: 'right',
  },

  // Daily
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  dailyDay: {
    width: 36,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  dailyEmoji: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  dailyTempRange: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dailyTempLow: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    width: 32,
    textAlign: 'right',
  },
  dailyTempHigh: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    width: 32,
  },
  tempBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  tempBarFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
});
