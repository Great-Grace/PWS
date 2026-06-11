interface HomeRefreshDeps {
  fetchWeather: (lat: number, lng: number, force?: boolean) => Promise<void>;
  fetchTodayStatus: () => Promise<void>;
  fetchFeedbackCount: () => Promise<void>;
  fetchTodayPrediction: () => Promise<void>;
}

interface HomeRefreshParams {
  lat: number;
  lng: number;
  force?: boolean;
}

export async function refreshHomeScreenData(
  deps: HomeRefreshDeps,
  params: HomeRefreshParams,
): Promise<void> {
  const { lat, lng, force = false } = params;

  await Promise.all([
    deps.fetchWeather(lat, lng, force),
    deps.fetchTodayStatus(),
    deps.fetchFeedbackCount(),
  ]);

  await deps.fetchTodayPrediction();
}
