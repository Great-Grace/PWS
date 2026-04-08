
// ============================================================
// Auth Store — Zustand + Supabase email/password (테스트 빌드)
// ============================================================
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { User } from '../types';
import { Session } from '@supabase/supabase-js';
import { computeBMI, computeBMIBucket, computeBMIOffset } from '../utils/formulas';

const TEST_PASSWORD = process.env.EXPO_PUBLIC_TEST_PASSWORD ?? 'pws_tester_2024';

function testerEmail(testerId: string) {
  return `${testerId.trim().toLowerCase()}@test.pws`;
}

// ---- Store ----
interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  testerId: string | null; // 로그인 시 입력한 ID → 닉네임으로 재사용

  initialize: () => Promise<void>;
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
    } catch (error) {
      console.error('Auth init error:', error);
    } finally {
      set({ isLoading: false });
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
  },

  signInWithTesterId: async (testerId: string) => {
    const email = testerEmail(testerId);

    // 기존 테스터면 바로 로그인
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });

    if (!signInError) {
      set({ testerId });
      return;
    }

    // 신규 테스터면 회원가입
    if (signInError.message.includes('Invalid login credentials')) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password: TEST_PASSWORD,
      });
      if (signUpError) throw new Error(signUpError.message);
      set({ testerId });
      return;
    }

    throw new Error(signInError.message);
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ session: null, user: null, isOnboarded: false });
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
      console.error('Fetch profile error:', error);
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
