export const PUBLIC_ENV_ERROR_PREFIX = 'Missing required Expo public env';

export function resolveRequiredPublicEnv(
  env: Record<string, string | undefined>,
  key: string
): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${PUBLIC_ENV_ERROR_PREFIX}: ${key}`);
  }
  return value;
}
