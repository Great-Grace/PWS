
// ============================================================
// Auth Store — Zustand + expo-web-browser OAuth
// ============================================================
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { User } from '../types';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { computeBMI, computeBMIBucket, computeBMIOffset } from '../utils/formulas';


// ---- OAuth Helper ----
// React Native에서는 signInWithOAuth가 브라우저를 직접 열지 못함
// expo-web-browser로 인앱 브라우저를 열어 OAuth 수행
async function performOAuth(provider: 'google' | 'kakao') {
  const redirectTo = AuthSession.makeRedirectUri({
    scheme: 'pws'
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('Supabase OAuth Error:', error);
    throw new Error(error.message + '\n\n(Supabase에 만능 Redirect URLs 설정이 완료되었는지 확인하세요. [ psw://* , exp://* 등 ])');
  }
  if (!data.url) throw new Error('OAuth URL을 가져오지 못했습니다');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  
  if (result.type !== 'success' || !result.url) {
    return; // 사용자 취소
  }

  // redirect URL에서 토큰 파싱
  const url = new URL(result.url);
  const params = new URLSearchParams(
    url.hash ? url.hash.substring(1) : url.search.substring(1)
  );

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (access_token && refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionError) throw sessionError;
  } else {
    throw new Error('인증 토큰을 받지 못했습니다');
  }
}

// ---- Store ----
interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;

  initialize: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'kakao') => Promise<void>;
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

    // Store cleanup function for potential future use
    (globalThis as any).__pwsAuthSubscription?.unsubscribe();
    (globalThis as any).__pwsAuthSubscription = subscription;
  },

  signInWithOAuth: async (provider: 'google' | 'kakao') => {
    try {
      await performOAuth(provider);
    } catch (error: any) {
      console.error(`${provider} sign-in error:`, error);
      throw error;
    }
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
        // completeOnboarding의 낙관적 업데이트와의 race condition 방지:
        // 이미 onboarding이 완료된 상태라면 이 오래된 응답으로 덮어쓰지 않는다.
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
      nickname: data.nickname,
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
