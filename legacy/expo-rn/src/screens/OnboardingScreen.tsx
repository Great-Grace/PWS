import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius, layout } from '../theme';
import { useAuthStore } from '../stores/authStore';
import { KOREA_REGIONS, resolveDistrictCoords } from '../utils/regions';
import AppDialog, { AppDialogState } from '../components/AppDialog';
import {
  AgreementKey,
  AgreementState,
  areAllAgreementsAccepted,
  areRequiredAgreementsAccepted,
  canContinueProfile,
  normalizeBirthYear,
  ProfileDraft,
  setAllAgreements,
  toggleAgreement,
} from '../utils/onboarding';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Step = 'agreements' | 'terms' | 'privacy' | 'profile';

const TERMS_CONTENT = [
  {
    title: '제1조 (목적)',
    body: '본 약관은 날씨 체감 기록 서비스의 이용과 관련하여 회사와 회원 간 권리·의무 및 책임사항을 정합니다.',
  },
  {
    title: '제2조 (정의)',
    body: '서비스는 지역별 날씨 정보, 개인 체감 기록, 옷차림 추천, 히스토리 및 통계 기능을 제공합니다.',
  },
  {
    title: '제3조 (서비스의 제공)',
    body: '회사는 연중무휴 제공을 원칙으로 하되 점검이나 장애가 있을 때 일시 중단할 수 있습니다.',
  },
  {
    title: '제4조 (회원의 의무)',
    body: '회원은 약관과 관련 법령을 준수해야 하며 허위 정보 입력, 타인 정보 도용, 서비스 운영 방해를 해서는 안 됩니다.',
  },
];

const PRIVACY_CONTENT = [
  {
    title: '1. 수집 항목',
    body: '회원 식별 정보, 지역 정보, 체감 피드백, 서비스 이용 로그를 수집합니다.',
  },
  {
    title: '2. 이용 목적',
    body: '개인화된 날씨·옷차림 추천 제공, 계정 관리, 서비스 품질 개선을 위해 사용합니다.',
  },
  {
    title: '3. 보관 및 파기',
    body: '회원 탈퇴 또는 목적 달성 시 지체 없이 파기하되 법령상 보관 의무가 있는 경우 예외가 있습니다.',
  },
  {
    title: '4. 이용자 권리',
    body: '열람, 정정, 삭제, 처리정지 요청이 가능하며 앱 설정 또는 고객센터를 통해 요청할 수 있습니다.',
  },
];

const PROFILE_DEFAULT: ProfileDraft = {
  name: '',
  birthDate: '',
  gender: null,
  heightCm: '',
  weightKg: '',
  province: null,
  district: null,
};

const AGREEMENT_COPY: Record<AgreementKey, string> = {
  terms: '[필수] 이용약관 동의',
  privacy: '[필수] 개인정보 처리방침 동의',
  marketing: '[선택] 마케팅 정보 수신 동의',
};

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuthStore();

  const [step, setStep] = useState<Step>('agreements');
  const [agreements, setAgreements] = useState<AgreementState>({
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [profile, setProfile] = useState<ProfileDraft>(PROFILE_DEFAULT);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialog, setDialog] = useState<AppDialogState | null>(null);

  const allAccepted = useMemo(() => areAllAgreementsAccepted(agreements), [agreements]);
  const requiredAccepted = useMemo(
    () => areRequiredAgreementsAccepted(agreements),
    [agreements]
  );
  const canSubmitProfile = useMemo(() => canContinueProfile(profile), [profile]);

  const updateProfile = (patch: Partial<ProfileDraft>) => {
    setProfile(prev => ({ ...prev, ...patch }));
  };

  const toggleProvince = (province: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedProvince(current => current === province ? null : province);
  };

  const handleAgreementPress = (key: AgreementKey) => {
    setAgreements(prev => toggleAgreement(prev, key));
  };

  const handleAllAgreementPress = () => {
    setAgreements(setAllAgreements(!allAccepted));
  };

  const handleComplete = async () => {
    if (!canSubmitProfile) {
      setDialog({
        title: '기본 정보를 확인해주세요',
        message: '이름, 생년월일, 성별, 기준 지역을 입력해야 합니다.',
      });
      return;
    }

    const address = `${profile.province} ${profile.district}`;
    setIsSubmitting(true);
    try {
      const coords = resolveDistrictCoords(address);
      await completeOnboarding({
        nickname: profile.name.trim(),
        lat: coords.lat,
        lng: coords.lng,
        climate_zone: address,
        birth_year: normalizeBirthYear(profile.birthDate),
        gender: profile.gender ?? undefined,
        height_cm: profile.heightCm ? Number(profile.heightCm) : undefined,
        weight_kg: profile.weightKg ? Number(profile.weightKg) : undefined,
      });
    } catch (error: any) {
      setDialog({
        title: '프로필 저장 실패',
        message: error.message || '프로필 저장에 실패했습니다.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'terms') {
    return (
      <DocumentViewer
        title="이용약관"
        sections={TERMS_CONTENT}
        onBack={() => setStep('agreements')}
        onConfirm={() => setStep('agreements')}
      />
    );
  }

  if (step === 'privacy') {
    return (
      <DocumentViewer
        title="개인정보 처리방침"
        sections={PRIVACY_CONTENT}
        onBack={() => setStep('agreements')}
        onConfirm={() => setStep('agreements')}
      />
    );
  }

  if (step === 'profile') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.title}>기본 정보 입력</Text>
            <Text style={styles.subtitle}>정확한 옷차림 추천을 위해{'\n'}정보를 입력해주세요</Text>
          </View>

          <FieldShell label="이름">
            <ProfileTextInput
              icon="⌾"
              label="이름"
              value={profile.name}
              onChangeText={(name) => updateProfile({ name })}
              placeholder="이름을 입력하세요"
              accessibilityHint="추천에 사용할 이름을 입력하세요"
            />
          </FieldShell>

          <FieldShell label="생년월일">
            <ProfileTextInput
              icon="□"
              label="생년월일"
              value={profile.birthDate}
              onChangeText={(birthDate) => updateProfile({ birthDate })}
              placeholder="1999-02-14"
              keyboardType="numbers-and-punctuation"
              accessibilityHint="예시 형식처럼 생년월일을 입력하세요"
            />
          </FieldShell>

          <FieldShell label="성별">
            <View style={styles.segmentRow}>
              <GenderButton
                label="남성"
                active={profile.gender === 'M'}
                onPress={() => updateProfile({ gender: 'M' })}
              />
              <GenderButton
                label="여성"
                active={profile.gender === 'F'}
                onPress={() => updateProfile({ gender: 'F' })}
              />
              <GenderButton
                label="기타"
                active={profile.gender === 'N'}
                onPress={() => updateProfile({ gender: 'N' })}
              />
            </View>
          </FieldShell>

          <FieldShell label="키">
            <UnitInput
              label="키"
              value={profile.heightCm}
              onChangeText={(heightCm) => updateProfile({ heightCm })}
              placeholder="170"
              unit="cm"
              accessibilityHint="센티미터 단위로 키를 입력하세요"
            />
          </FieldShell>

          <FieldShell label="몸무게">
            <UnitInput
              label="몸무게"
              value={profile.weightKg}
              onChangeText={(weightKg) => updateProfile({ weightKg })}
              placeholder="70"
              unit="kg"
              accessibilityHint="킬로그램 단위로 몸무게를 입력하세요"
            />
          </FieldShell>

          <FieldShell label="기준 지역">
            <View style={styles.regionGroups}>
              {KOREA_REGIONS.map((region) => {
                const isOpen = selectedProvince === region.province;
                const hasSelectedDistrict = profile.province === region.province && profile.district;

                return (
                  <View key={region.province} style={styles.regionGroup}>
                    <Pressable
                      onPress={() => toggleProvince(region.province)}
                      accessibilityRole="button"
                      accessibilityLabel={`${region.province} ${isOpen ? '닫기' : '열기'}`}
                      accessibilityState={{ expanded: isOpen }}
                      style={[styles.regionHeader, isOpen && styles.regionHeaderOpen]}
                    >
                      <Text style={styles.regionHeaderText}>{region.province}</Text>
                      <View style={styles.regionHeaderMeta}>
                        {hasSelectedDistrict ? (
                          <View style={styles.regionBadge}>
                            <Text style={styles.regionBadgeText}>{profile.district}</Text>
                          </View>
                        ) : null}
                        <RegionDisclosureMark open={isOpen} />
                      </View>
                    </Pressable>

                    {isOpen ? (
                      <View style={styles.districtGrid}>
                        {region.districts.map((district) => {
                          const active =
                            profile.province === region.province &&
                            profile.district === district;

                          return (
                            <Pressable
                              key={district}
                              onPress={() => updateProfile({ province: region.province, district })}
                              accessibilityRole="button"
                              accessibilityLabel={`${region.province} ${district} 선택`}
                              accessibilityState={{ selected: active }}
                              style={[styles.districtChip, active && styles.districtChipActive]}
                            >
                              <Text style={[styles.districtChipText, active && styles.districtChipTextActive]}>
                                {district}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </FieldShell>
        </ScrollView>

        <BottomBarButton
          label={isSubmitting ? '저장 중...' : '완료'}
          disabled={!canSubmitProfile || isSubmitting}
          onPress={handleComplete}
        />
        <AppDialog dialog={dialog} onClose={() => setDialog(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.flex}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>환영합니다!</Text>
          <Text style={styles.subtitle}>서비스 이용을 위해{'\n'}약관에 동의해주세요</Text>
        </View>

        <View style={styles.content}>
          <Pressable
            onPress={handleAllAgreementPress}
            accessibilityRole="checkbox"
            accessibilityLabel="전체 동의"
            accessibilityState={{ checked: allAccepted }}
            style={[styles.allAgreementCard, allAccepted && styles.allAgreementCardActive]}
          >
            <CheckCircle checked={allAccepted} large />
            <Text style={styles.allAgreementText}>전체 동의</Text>
          </Pressable>

          <View style={styles.divider} />

          <AgreementRow
            label={AGREEMENT_COPY.terms}
            checked={agreements.terms}
            onPress={() => handleAgreementPress('terms')}
            onDetail={() => setStep('terms')}
          />
          <AgreementRow
            label={AGREEMENT_COPY.privacy}
            checked={agreements.privacy}
            onPress={() => handleAgreementPress('privacy')}
            onDetail={() => setStep('privacy')}
          />
          <AgreementRow
            label={AGREEMENT_COPY.marketing}
            checked={agreements.marketing}
            onPress={() => handleAgreementPress('marketing')}
          />
        </View>

        <BottomBarButton
          label="다음"
          disabled={!requiredAccepted}
          onPress={() => setStep('profile')}
        />
      </View>
      <AppDialog dialog={dialog} onClose={() => setDialog(null)} />
    </SafeAreaView>
  );
}

function DocumentViewer({
  title,
  sections,
  onBack,
  onConfirm,
}: {
  title: string;
  sections: Array<{ title: string; body: string }>;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.docHeader}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          style={styles.backButton}
        >
          <BackChevronMark />
        </Pressable>
        <Text style={styles.docTitle}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.docScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.docHeroTitle}>{title}</Text>
        <Text style={styles.docEffectiveDate}>시행일: 2026년 4월 1일</Text>

        {sections.map((section) => (
          <View key={section.title} style={styles.docSection}>
            <Text style={styles.docSectionTitle}>{section.title}</Text>
            <Text style={styles.docBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>

      <BottomBarButton label="확인" onPress={onConfirm} />
    </SafeAreaView>
  );
}

function BottomBarButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.footer}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        {disabled ? (
          <View style={[styles.footerButton, styles.footerButtonDisabled]}>
            <Text style={[styles.footerButtonText, styles.footerButtonTextDisabled]}>{label}</Text>
          </View>
        ) : (
          <View style={styles.footerButton}>
            <Text style={styles.footerButtonText}>{label}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function AgreementRow({
  label,
  checked,
  onPress,
  onDetail,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  onDetail?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      style={styles.agreementRow}
    >
      <CheckCircle checked={checked} />
      <Text style={styles.agreementLabel}>{label}</Text>
      {onDetail ? (
        <Pressable
          onPress={onDetail}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${label} 상세 보기`}
          style={styles.detailButton}
        >
          <ForwardChevronMark color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function BackChevronMark() {
  return <View style={styles.backChevronMark} />;
}

function ForwardChevronMark({ color }: { color: string }) {
  return (
    <View
      style={[
        styles.forwardChevronMark,
        {
          borderTopColor: color,
          borderRightColor: color,
        },
      ]}
    />
  );
}

function RegionDisclosureMark({ open }: { open: boolean }) {
  return (
    <View style={styles.regionDisclosureMark}>
      <View style={styles.regionDisclosureLine} />
      {open ? null : <View style={[styles.regionDisclosureLine, styles.regionDisclosureLineVertical]} />}
    </View>
  );
}

function CheckCircle({ checked, large = false }: { checked: boolean; large?: boolean }) {
  return (
    <View
      style={[
        styles.checkCircle,
        large && styles.checkCircleLarge,
        checked && styles.checkCircleChecked,
      ]}
    >
      {checked ? <View style={styles.checkCircleInner} /> : null}
    </View>
  );
}

function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function UnitInput({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  accessibilityHint,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  unit: string;
  accessibilityHint: string;
}) {
  return (
    <View style={styles.unitShell}>
      <Text style={styles.inputIcon}>{unit === 'cm' ? '⌁' : '▱'}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[styles.textInput, styles.unitInput]}
        keyboardType="numeric"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
      <Text style={styles.unitText}>{unit}</Text>
    </View>
  );
}

function ProfileTextInput({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  accessibilityHint,
}: {
  icon: string;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numbers-and-punctuation';
  accessibilityHint: string;
}) {
  return (
    <View style={styles.inputShell}>
      <Text style={styles.inputIcon}>{icon}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[styles.textInput, styles.textInputWithIcon]}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      />
    </View>
  );
}

function GenderButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.segmentButtonPressable}
    >
      {active ? (
        <View style={[styles.segmentButton, styles.segmentButtonActive]}>
          <Text style={[styles.segmentButtonText, styles.segmentButtonTextActive]}>{label}</Text>
        </View>
      ) : (
        <View style={styles.segmentButton}>
          <Text style={styles.segmentButtonText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 48,
    paddingBottom: 140,
    gap: 20,
  },
  headerBlock: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 48,
    gap: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 56,
    gap: 16,
  },
  allAgreementCard: {
    height: 68,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSurface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    gap: 16,
  },
  allAgreementCardActive: {
    backgroundColor: '#F0F9FF',
  },
  allAgreementText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  agreementRow: {
    height: 60,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 12,
  },
  agreementLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  detailButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardChevronMark: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }],
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleLarge: {
    width: 24,
    height: 24,
  },
  checkCircleChecked: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  checkCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  footer: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
    backgroundColor: colors.surface,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 24,
    paddingBottom: 24,
  },
  footerButton: {
    height: 56,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  footerButtonDisabled: {
    backgroundColor: '#E7E5E4',
  },
  footerButtonText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.semibold,
    color: colors.textInverse,
  },
  footerButtonTextDisabled: {
    color: colors.mutedButtonText,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevronMark: {
    width: 11,
    height: 11,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.textPrimary,
    transform: [{ rotate: '45deg' }],
  },
  docTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
  },
  docScroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 24,
    paddingBottom: 140,
  },
  docHeroTitle: {
    fontSize: 30,
    lineHeight: 36,
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
    marginBottom: 12,
  },
  docEffectiveDate: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  docSection: {
    gap: 10,
    marginBottom: 28,
  },
  docSectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  docBody: {
    fontSize: fontSize.md,
    lineHeight: 26,
    color: colors.textSecondary,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.primaryLight,
    fontWeight: fontWeight.semibold,
  },
  textInput: {
    height: 59.5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  inputShell: {
    position: 'relative',
    justifyContent: 'center',
  },
  textInputWithIcon: {
    paddingLeft: 48,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
    width: 20,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 20,
    color: '#A6A09B',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  segmentButtonPressable: {
    flex: 1,
  },
  segmentButton: {
    height: 51.5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    borderColor: '#0A84FF',
    backgroundColor: '#0A84FF',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.primaryLight,
    fontWeight: fontWeight.medium,
  },
  segmentButtonTextActive: {
    color: colors.textInverse,
  },
  unitShell: {
    position: 'relative',
    justifyContent: 'center',
  },
  unitInput: {
    paddingLeft: 48,
    paddingRight: 58,
  },
  unitText: {
    position: 'absolute',
    right: 18,
    fontSize: fontSize.md,
    lineHeight: 24,
    color: '#78716C',
    fontWeight: fontWeight.medium,
  },
  regionGroups: {
    gap: 10,
  },
  regionGroup: {
    gap: 10,
  },
  regionHeader: {
    minHeight: 52,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regionHeaderOpen: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSurface,
  },
  regionHeaderText: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  regionHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  regionBadge: {
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  regionBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  regionDisclosureMark: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionDisclosureLine: {
    position: 'absolute',
    width: 12,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
  },
  regionDisclosureLineVertical: {
    transform: [{ rotate: '90deg' }],
  },
  districtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  districtChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  districtChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  districtChipText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  districtChipTextActive: {
    color: colors.textInverse,
  },
});
