export const SECURE_STORE_CHUNK_SIZE = 1800;
export const SECURE_STORE_MAX_CHUNKS = 20;
export const SECURE_STORE_TOO_LARGE_ERROR = 'Supabase auth session is too large for SecureStore';

export type ChunkMetadata = {
  chunked: true;
  count: number;
};

export function chunkKey(key: string, index: number) {
  return `${key}.${index}`;
}

export function parseChunkMetadata(value: string | null): ChunkMetadata | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (
      parsed?.chunked === true &&
      Number.isInteger(parsed.count) &&
      parsed.count > 0 &&
      parsed.count <= SECURE_STORE_MAX_CHUNKS
    ) {
      return parsed as ChunkMetadata;
    }
  } catch {
    return null;
  }
  return null;
}

export function splitSecureStoreValue(value: string): string[] {
  const chunks = value.match(new RegExp(`.{1,${SECURE_STORE_CHUNK_SIZE}}`, 'g')) ?? [];
  if (chunks.length > SECURE_STORE_MAX_CHUNKS) {
    throw new Error(SECURE_STORE_TOO_LARGE_ERROR);
  }
  return chunks;
}
