import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { useAuthStore } from '../stores/authStore';
import { KOREA_REGIONS, DISTRICT_COORDS } from '../utils/regions';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuthStore();

  // Location
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  // Optional
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'N' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle Accordion
  const toggleProvince = (province: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedProvince === province) {
      setSelectedProvince(null); 
    } else {
      setSelectedProvince(province);
    }
    // 하위 구역 초기화 (선택이 바뀌었으므로)
    if (selectedProvince !== province) {
      setSelectedDistrict(null);
    }
  };

  const handleComplete = async () => {
    if (!selectedProvince || !selectedDistrict) {
      Alert.alert('위치를 선택해주세요', '날씨를 예측할 지역구가 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const addressString = `${selectedProvince} ${selectedDistrict}`;
      const coords = DISTRICT_COORDS[addressString] ?? { lat: 37.5665, lng: 126.9780 };

      await completeOnboarding({
        nickname: '',
        lat: coords.lat,
        lng: coords.lng,
        climate_zone: addressString,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        birth_year: birthYear ? parseInt(birthYear) : undefined,
        gender: gender || undefined,
      });
    } catch (error: any) {
      Alert.alert('오류', error.message || '프로필 저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.subtitle}>
          정확한 체감 예측을 위한 기본 정보를 입력해주세요
        </Text>

        {/* Location (Accordion) */}
        <View style={styles.section}>
          <Text style={styles.label}>기준 동네 (시/군/구) *</Text>
          <Text style={styles.hint}>주로 활동하시는 지역을 선택해주세요.</Text>
          
          <View style={styles.accordionContainer}>
            {KOREA_REGIONS.map((region) => {
              const isOpen = selectedProvince === region.province;
              const hasSelectionHere = selectedProvince === region.province && selectedDistrict;

              return (
                <View key={region.province} style={styles.accordionGroup}>
                  {/* Province Header */}
                  <TouchableOpacity
                    style={[styles.accordionHeader, isOpen && styles.accordionHeaderOpen]}
                    onPress={() => toggleProvince(region.province)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.accordionHeaderText, isOpen && styles.accordionHeaderTextOpen]}>
                      {region.province}
                    </Text>
                    <View style={styles.accordionRight}>
                      {hasSelectionHere && (
                        <Text style={styles.selectedBadge}>{selectedDistrict}</Text>
                      )}
                      <Text style={[styles.accordionIcon, isOpen && styles.accordionIconOpen]}>
                        ▼
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Districts List (Wheel/Scroll style layout) */}
                  {isOpen && (
                    <View style={styles.districtsGrid}>
                      {region.districts.map((dist) => {
                        const isDistSelected = selectedDistrict === dist;
                        return (
                          <TouchableOpacity
                            key={dist}
                            style={[styles.districtChip, isDistSelected && styles.districtChipActive]}
                            onPress={() => setSelectedDistrict(dist)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.districtText, isDistSelected && styles.districtTextActive]}>
                              {dist}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Demographics */}
        <View style={styles.section}>
          <Text style={styles.label}>체형 정보 (선택)</Text>
          <Text style={styles.hint}>
            입력해주시면 BMI 기반 체감 보정값을 적용합니다.
          </Text>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="키 (cm)"
                placeholderTextColor={colors.textTertiary}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="몸무게 (kg)"
                placeholderTextColor={colors.textTertiary}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleComplete}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.submitText}>시작하기 🚀</Text>
          )}
        </TouchableOpacity>
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
    paddingBottom: spacing.xxl * 2,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },

  // Accordion
  accordionContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  accordionGroup: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  accordionHeaderOpen: {
    backgroundColor: colors.surfaceElevated,
  },
  accordionHeaderText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  accordionHeaderTextOpen: {
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
  },
  accordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedBadge: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  accordionIcon: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  accordionIconOpen: {
    transform: [{ rotate: '180deg' }],
    color: colors.primary,
  },
  districtsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  districtChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  districtChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  districtText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  districtTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
  },

  // Submit
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
});
