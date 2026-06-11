export type AgreementKey = 'terms' | 'privacy' | 'marketing';

export interface AgreementState {
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
}

export interface ProfileDraft {
  name: string;
  birthDate: string;
  gender: 'M' | 'F' | 'N' | null;
  heightCm: string;
  weightKg: string;
  province: string | null;
  district: string | null;
}

export function setAllAgreements(checked: boolean): AgreementState {
  return {
    terms: checked,
    privacy: checked,
    marketing: checked,
  };
}

export function toggleAgreement(
  state: AgreementState,
  key: AgreementKey,
): AgreementState {
  const next = { ...state, [key]: !state[key] };
  return next;
}

export function areRequiredAgreementsAccepted(state: AgreementState): boolean {
  return state.terms && state.privacy;
}

export function areAllAgreementsAccepted(state: AgreementState): boolean {
  return state.terms && state.privacy && state.marketing;
}

export function normalizeBirthYear(value: string): number | undefined {
  const trimmed = value.trim();
  const yearOnlyMatch = trimmed.match(/^(\d{4})$/);
  const compactDateMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  const separatedDateMatch = trimmed.match(/^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/);

  if (yearOnlyMatch) {
    const year = Number(yearOnlyMatch[1]);
    return isReasonableBirthYear(year) ? year : undefined;
  }

  const dateMatch = compactDateMatch ?? separatedDateMatch;
  if (!dateMatch) return undefined;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[compactDateMatch ? 2 : 3]);
  const day = Number(dateMatch[compactDateMatch ? 3 : 4]);
  if (!isReasonableBirthYear(year)) return undefined;
  if (!isValidPastOrPresentDate(year, month, day)) return undefined;

  return year;
}

function isReasonableBirthYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return Number.isInteger(year) && year >= 1900 && year <= currentYear;
}

function isValidPastOrPresentDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date <= todayStart;
}

export function canContinueProfile(draft: ProfileDraft): boolean {
  return Boolean(
    draft.name.trim() &&
    normalizeBirthYear(draft.birthDate) &&
    draft.gender &&
    draft.province &&
    draft.district
  );
}
