package com.wxxtae.pws.nativepreview.domain

const val WeatherCacheTtlMs: Long = 30 * 60 * 1000L

data class CurrentWeatherNative(
    val temp: Double,
    val feelsLike: Double,
    val humidity: Int,
    val windSpeed: Double,
    val weatherCode: Int,
    val weatherDescription: String,
    val uvIndex: Double,
    val precipitation1h: Double? = null,
    val tmrtApi: Double? = null,
)

data class HourlyForecastNative(
    val dt: Long,
    val temp: Double,
    val feelsLike: Double,
    val humidity: Int,
    val windSpeed: Double,
    val weatherCode: Int,
    val weatherDescription: String,
    val pop: Double,
    val precipitation1h: Double? = null,
)

data class DailyForecastNative(
    val dt: Long,
    val tempMin: Double,
    val tempMax: Double,
    val humidity: Int,
    val windSpeed: Double,
    val weatherCode: Int,
    val weatherDescription: String,
    val weatherIcon: String? = null,
    val pop: Double,
    val uvIndex: Double,
)

data class WeatherDataNative(
    val current: CurrentWeatherNative,
    val hourly: List<HourlyForecastNative>,
    val daily: List<DailyForecastNative>,
    val fetchedAt: Long,
)

data class WeatherRepositoryState(
    val data: WeatherDataNative? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val lastLat: Double? = null,
    val lastLng: Double? = null,
)

interface WeatherRemoteSource {
    fun fetchWeather(lat: Double, lng: Double, nowMs: Long): WeatherDataNative
}

class CachingWeatherRepository(
    private val remoteSource: WeatherRemoteSource,
    private val cacheTtlMs: Long = WeatherCacheTtlMs,
) {
    var state: WeatherRepositoryState = WeatherRepositoryState()
        private set

    fun fetchWeather(lat: Double, lng: Double, force: Boolean = false, nowMs: Long): WeatherDataNative {
        val cached = state.data
        if (
            !force &&
            cached != null &&
            state.lastLat == lat &&
            state.lastLng == lng &&
            nowMs - cached.fetchedAt < cacheTtlMs
        ) {
            return cached
        }

        state = state.copy(isLoading = true, error = null)
        return try {
            val remoteData = remoteSource.fetchWeather(lat, lng, nowMs).normalizeDailyIcons()
            state = WeatherRepositoryState(
                data = remoteData,
                isLoading = false,
                error = null,
                lastLat = lat,
                lastLng = lng,
            )
            remoteData
        } catch (error: Throwable) {
            state = state.copy(
                isLoading = false,
                error = error.message ?: "날씨 정보를 가져오지 못했습니다",
            )
            throw error
        }
    }

    fun getCurrent(): CurrentWeatherNative? = state.data?.current

    fun getHourly(): List<HourlyForecastNative> = state.data?.hourly.orEmpty()

    fun getDaily(): List<DailyForecastNative> = state.data?.daily.orEmpty()

    private fun WeatherDataNative.normalizeDailyIcons(): WeatherDataNative = copy(
        daily = daily.map { entry -> entry.copy(weatherIcon = entry.weatherIcon ?: "") },
    )
}
