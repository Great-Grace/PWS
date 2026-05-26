export const TESTER_AUTH_CONFIG_ERROR =
  '테스터 로그인 설정이 비어 있습니다. 관리자에게 문의해주세요.';

export interface TesterAuthConfig {
  password: string;
  allowAutoSignup: boolean;
}

export type DevTesterMode = 'figma-parity' | 'onboarding-qa' | 'simple-login' | null;

const LOCAL_TESTER_SESSION_PREFIX = 'dev-';
const FIGMA_PARITY_TESTER_ID = 'pws_dev';
const ONBOARDING_QA_TESTER_ID = 'pws_onboard';

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

export function resolveOptionalTesterAuthConfig(rawPassword: string | undefined): TesterAuthConfig | null {
  const password = rawPassword?.trim();
  if (!password) return null;

  return {
    password,
    allowAutoSignup: false,
  };
}

export function normalizeTesterId(testerId: string): string {
  return testerId.trim().toLowerCase();
}

export function testerSessionId(testerId: string): string {
  return `${LOCAL_TESTER_SESSION_PREFIX}${normalizeTesterId(testerId)}`;
}

export function isLocalTesterSessionId(userId: string | undefined): boolean {
  return !!userId && userId.startsWith(LOCAL_TESTER_SESSION_PREFIX);
}

export function isFigmaParitySessionId(userId: string | undefined): boolean {
  return userId === testerSessionId(FIGMA_PARITY_TESTER_ID);
}

export function resolveDevTesterMode(testerId: string): DevTesterMode {
  const normalized = normalizeTesterId(testerId);
  if (!normalized) return null;
  if (normalized === FIGMA_PARITY_TESTER_ID) return 'figma-parity';
  if (normalized === ONBOARDING_QA_TESTER_ID) return 'onboarding-qa';
  return 'simple-login';
}
