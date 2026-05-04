export const TESTER_AUTH_CONFIG_ERROR =
  '테스터 로그인 설정이 비어 있습니다. 관리자에게 문의해주세요.';

export interface TesterAuthConfig {
  password: string;
  allowAutoSignup: boolean;
}

export type DevTesterMode = 'strict-parity' | 'onboarding-qa' | null;

export function resolveTesterAuthConfig(rawPassword: string | undefined): TesterAuthConfig {
  const password = rawPassword?.trim();

  if (!password) {
    throw new Error(TESTER_AUTH_CONFIG_ERROR);
  }

  return {
    password,
    allowAutoSignup: false,
  };
}

export function normalizeTesterId(testerId: string): string {
  return testerId.trim().toLowerCase();
}

export function resolveDevTesterMode(testerId: string): DevTesterMode {
  const normalized = normalizeTesterId(testerId);
  if (normalized === 'pws_dev') return 'strict-parity';
  if (normalized === 'pws_onboard') return 'onboarding-qa';
  return null;
}
