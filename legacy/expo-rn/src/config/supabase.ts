import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { resolveRequiredPublicEnv } from '../utils/env';
import {
  chunkKey,
  parseChunkMetadata,
  SECURE_STORE_MAX_CHUNKS,
  splitSecureStoreValue,
} from '../utils/secureStoreChunks';

let cachedClient: SupabaseClient | null = null;

async function clearChunkedValue(key: string) {
  await Promise.all(
    Array.from({ length: SECURE_STORE_MAX_CHUNKS }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, index))
    )
  );
}

// Expo SecureStore adapter for Supabase Auth token persistence
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const value = await SecureStore.getItemAsync(key);
    const metadata = parseChunkMetadata(value);
    if (!metadata) return value;

    const chunks = await Promise.all(
      Array.from({ length: metadata.count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index))
      )
    );
    if (chunks.some((chunk) => chunk == null)) return null;
    return chunks.join('');
  },
  setItem: async (key: string, value: string) => {
    await clearChunkedValue(key);

    const chunks = splitSecureStoreValue(value);
    if (chunks.length <= 1) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk))
    );
    await SecureStore.setItemAsync(key, JSON.stringify({ chunked: true, count: chunks.length }));
  },
  removeItem: async (key: string) => {
    await clearChunkedValue(key);
    await SecureStore.deleteItemAsync(key);
  },
};

export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = resolveRequiredPublicEnv(process.env, 'EXPO_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = resolveRequiredPublicEnv(process.env, 'EXPO_PUBLIC_SUPABASE_ANON_KEY');

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // React Native에서는 URL 기반 세션 감지 비활성화
      lock: processLock,
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  cachedClient ??= createSupabaseClient();
  return cachedClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
