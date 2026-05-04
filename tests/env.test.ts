import * as assert from 'node:assert/strict';
import {
  PUBLIC_ENV_ERROR_PREFIX,
  resolveRequiredPublicEnv,
} from '../src/utils/env';

assert.equal(
  resolveRequiredPublicEnv({ EXPO_PUBLIC_SUPABASE_URL: ' https://example.supabase.co ' }, 'EXPO_PUBLIC_SUPABASE_URL'),
  'https://example.supabase.co',
  '공개 env 값은 양끝 공백을 제거한 뒤 사용해야 한다'
);

assert.throws(
  () => resolveRequiredPublicEnv({}, 'EXPO_PUBLIC_SUPABASE_URL'),
  (error) => {
    assert.equal(error instanceof Error, true);
    assert.equal(
      (error as Error).message,
      `${PUBLIC_ENV_ERROR_PREFIX}: EXPO_PUBLIC_SUPABASE_URL`
    );
    return true;
  },
  '필수 공개 env가 없으면 어떤 키가 빠졌는지 명확히 알려야 한다'
);

assert.throws(
  () => resolveRequiredPublicEnv({ EXPO_PUBLIC_SUPABASE_ANON_KEY: '   ' }, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  (error) => {
    assert.equal(error instanceof Error, true);
    assert.equal(
      (error as Error).message,
      `${PUBLIC_ENV_ERROR_PREFIX}: EXPO_PUBLIC_SUPABASE_ANON_KEY`
    );
    return true;
  },
  '공백뿐인 공개 env는 누락으로 처리해야 한다'
);

console.log('env test passed');
