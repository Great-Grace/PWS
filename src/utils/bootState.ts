export function shouldHoldBootScreen(params: {
  isLoading: boolean;
  fontsLoaded: boolean;
  fontError: Error | null;
}): boolean {
  const { isLoading, fontsLoaded, fontError } = params;
  if (isLoading) return true;
  return !fontsLoaded && !fontError;
}
