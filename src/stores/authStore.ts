
// ============================================================
// Auth Store — Zustand + Supabase email/password (테스트 빌드)
// ============================================================
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { User } from '../types';
import { Session } from '@supabase/supabase-js';
import { computeBMI, computeBMIBucket, computeBMIOffset } from '../utils/formulas';
import {
  TESTER_AUTH_CONFIG_ERROR,
  isLocalTesterSessionId,
  normalizeTesterId,
  resolveDevTesterMode,
  resolveOptionalTesterAuthConfig,
  testerSessionId,
} from '../utils/testerAuth';
import { logSafeError } from '../utils/safeLog';

function testerEmail(testerId: string) {
  return `${testerId.trim().toLowerCase()}@test.pws`;
}

function createDevSession(testerId: string): Session {
  const sessionId = testerSessionId(testerId);
  return {
    access_token: sessionId,
    refresh_token: sessionId,
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    token_type: 'bearer',
    user: {
      id: sessionId,
      aud: 'authenticated',
      role: 'authenticated',
      email: testerEmail(testerId),
      app_metadata: {},
      user_metadata: {},
      created_at: new Date(0).toISOString(),
    },
  } as Session;
}

function createDevUser(testerId: string): User {
  return {
    id: testerSessionId(testerId),
    email: testerEmail(testerId),
    nickname: testerId,
    default_lat: 37.5665,
    default_lng: 126.978,
    climate_zone: '서울특별시',
    onboarding_done: true,
    birth_year: null,
    gender: null,
    age_bucket: null,
    bmi_bucket: null,
    bmi_offset: 0,
    korea_baseline: 0.3,
    notify_time: '08:00',
    notify_enabled: false,
    notify_outfit: false,
    notify_rain: false,
    expo_push_token: null,
    is_active: true,
    weight_morning: null,
    weight_afternoon: null,
    weight_evening: null,
    weight_updated_at: null,
    wardrobe: {},
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

function createTesterFallbackUser(testerId: string, userId: string, email: string): User {
  return {
    ...createDevUser(testerId),
    id: userId,
    email,
  };
}

// ---- Store ----
interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  testerId: string | null; // 로그인 시 입력한 ID → 닉네임으로 재사용

  initialize: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInWithTesterId: (testerId: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  completeOnboarding: (data: {
    nickname: string;
    lat: number;
    lng: number;
    climate_zone: string;
    height_cm?: number;
    weight_kg?: number;
    birth_year?: number;
    gender?: 'M' | 'F' | 'N';
  }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isOnboarded: false,
  testerId: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      if (session) {
        await get().fetchUserProfile();
      }

      // onAuthStateChange 리스너 등록 (중복 방지)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ session });
        if (session) {
          await get().fetchUserProfile();
        } else {
          set({ user: null, isOnboarded: false });
        }
      });

      (globalThis as any).__pwsAuthSubscription?.unsubscribe();
      (globalThis as any).__pwsAuthSubscription = subscription;
    } catch (error) {
      logSafeError('Auth init error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithEmailPassword: async (rawEmail: string, rawPassword: string) => {
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();
    const testerId = email.endsWith('@test.pws')
      ? email.replace('@test.pws', '')
      : email.split('@')[0] || null;

    if (!email || !password) {
      throw new Error('이메일과 비밀번호를 모두 입력해주세요.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }

    const session = data.session;
    set({
      session,
      user: session && testerId ? createTesterFallbackUser(testerId, session.user.id, email) : null,
      isOnboarded: true,
      testerId,
    });
    void get().fetchUserProfile();
  },

  signInWithTesterId: async (testerId: string) => {
    const normalized = normalizeTesterId(testerId);
    const devTesterMode = resolveDevTesterMode(normalized);

    if (devTesterMode && devTesterMode !== 'simple-login') {
      set({
        session: createDevSession(normalized),
        user: devTesterMode === 'onboarding-qa' ? null : createDevUser(normalized),
        isOnboarded: devTesterMode !== 'onboarding-qa',
        testerId: normalized,
      });
      return;
    }

    const config = resolveOptionalTesterAuthConfig(process.env.EXPO_PUBLIC_TEST_PASSWORD);
    const email = testerEmail(normalized);

    if (config) {
      const { password, allowAutoSignup } = config;

      // 기존 테스터면 DB 계정으로 로그인해서 누적 데이터를 그대로 사용한다.
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError) {
        const session = signInData.session;
        set({
          session,
          user: session ? createTesterFallbackUser(normalized, session.user.id, email) : null,
          isOnboarded: true,
          testerId: normalized,
        });
        void get().fetchUserProfile();
        return;
      }

      // 신규 테스터면 회원가입
      if (allowAutoSignup && signInError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw new Error(signUpError.message);
        const session = signUpData.session;
        set({
          session,
          user: session ? createTesterFallbackUser(normalized, session.user.id, email) : null,
          isOnboarded: true,
          testerId: normalized,
        });
        void get().fetchUserProfile();
        return;
      }

      if (!signInError.message.includes('Invalid login credentials')) {
        throw new Error(signInError.message);
      }
    }

    if (devTesterMode === 'simple-login') {
      set({
        session: createDevSession(normalized),
        user: createDevUser(normalized),
        isOnboarded: true,
        testerId: normalized,
      });
      return;
    }

    throw new Error(TESTER_AUTH_CONFIG_ERROR);
  },

  signOut: async () => {
    const session = get().session;
    if (isLocalTesterSessionId(session?.user.id)) {
      set({ session: null, user: null, isOnboarded: false, testerId: null });
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ session: null, user: null, isOnboarded: false, testerId: null });
  },

  fetchUserProfile: async () => {
    const session = get().session;
    if (!session) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // completeOnboarding의 낙관적 업데이트와의 race condition 방지
        if (!get().isOnboarded) {
          set({ user: null, isOnboarded: false });
        }
        return;
      }
      logSafeError('Fetch profile error:', error);
      return;
    }

    set({
      user: data as User,
      isOnboarded: data.onboarding_done,
    });
  },

  updateProfile: async (updates) => {
    const session = get().session;
    if (!session) return;

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.user.id);

    if (error) throw error;
    await get().fetchUserProfile();
  },

  completeOnboarding: async (data) => {
    const session = get().session;
    if (!session) return;

    const userRecord: Record<string, any> = {
      id: session.user.id,
      email: session.user.email!,
      nickname: (() => {
        if (data.nickname.trim()) return data.nickname.trim();
        if (get().testerId) return get().testerId!;
        // 앱 재시작 시 testerId가 날아간 경우, 이메일에서 역추출
        const email = session.user.email ?? '';
        return email.endsWith('@test.pws') ? email.replace('@test.pws', '') : (data.nickname || '테스터');
      })(),
      default_lat: data.lat,
      default_lng: data.lng,
      climate_zone: data.climate_zone,
      onboarding_done: true,
    };

    if (data.birth_year) userRecord.birth_year = data.birth_year;
    if (data.gender) userRecord.gender = data.gender;

    if (data.height_cm && data.weight_kg) {
      const bmi = computeBMI(data.height_cm, data.weight_kg);
      userRecord.bmi_bucket = computeBMIBucket(bmi);
      userRecord.bmi_offset = computeBMIOffset(bmi);
    }

    // DB 저장 전에 state 반영 → 스피너 없이 즉시 메인으로 이동
    set({ user: userRecord as User, isOnboarded: true });

    if (isLocalTesterSessionId(session.user.id)) {
      return;
    }

    const { error } = await supabase
      .from('users')
      .upsert(userRecord);

    if (error) {
      // 저장 실패 시 롤백
      set({ user: null, isOnboarded: false });
      throw error;
    }
  },
}));
