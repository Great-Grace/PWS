import * as assert from 'node:assert/strict';
import {
  SECURE_STORE_CHUNK_SIZE,
  SECURE_STORE_MAX_CHUNKS,
  SECURE_STORE_TOO_LARGE_ERROR,
  chunkKey,
  parseChunkMetadata,
  splitSecureStoreValue,
} from '../src/utils/secureStoreChunks';

assert.equal(
  chunkKey('sb-session', 2),
  'sb-session.2',
  'chunk key는 원본 키와 index를 안정적으로 결합해야 한다'
);

assert.deepEqual(
  parseChunkMetadata(JSON.stringify({ chunked: true, count: 2 })),
  { chunked: true, count: 2 },
  '유효한 chunk metadata는 복구되어야 한다'
);

assert.equal(
  parseChunkMetadata(JSON.stringify({ chunked: true, count: 0 })),
  null,
  'count 0 metadata는 손상된 값으로 처리해야 한다'
);

assert.equal(
  parseChunkMetadata(JSON.stringify({ chunked: true, count: SECURE_STORE_MAX_CHUNKS + 1 })),
  null,
  '최대 chunk 수를 넘는 metadata는 손상된 값으로 처리해야 한다'
);

assert.deepEqual(
  splitSecureStoreValue('abc'),
  ['abc'],
  '작은 값은 단일 chunk로 유지해야 한다'
);

assert.deepEqual(
  splitSecureStoreValue('x'.repeat(SECURE_STORE_CHUNK_SIZE + 1)).map((chunk) => chunk.length),
  [SECURE_STORE_CHUNK_SIZE, 1],
  '큰 값은 SecureStore 안전 크기로 분할해야 한다'
);

assert.throws(
  () => splitSecureStoreValue('x'.repeat(SECURE_STORE_CHUNK_SIZE * SECURE_STORE_MAX_CHUNKS + 1)),
  (error) => {
    assert.equal(error instanceof Error, true);
    assert.equal((error as Error).message, SECURE_STORE_TOO_LARGE_ERROR);
    return true;
  },
  '저장 가능한 최대 chunk 수를 넘으면 명시적으로 차단해야 한다'
);

console.log('secureStoreChunks test passed');
