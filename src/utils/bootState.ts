export function shouldHoldBootScreen(params: {
  isLoading: boolean;
  fontsLoaded: boolean;
  fontError: Error | null;
  bootTimedOut?: boolean;
}): boolean {
  const { isLoading, fontsLoaded, fontError, bootTimedOut = false } = params;
  if (!bootTimedOut && isLoading) return true;
  return !bootTimedOut && !fontsLoaded && !fontError;
}
