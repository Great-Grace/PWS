package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class WeatherRepositoryTest {
    @Test
    fun fetchWeatherReusesCacheWhenCoordinatesAndTtlMatch() {
        val remote = RecordingWeatherRemoteSource()
        val repository = CachingWeatherRepository(remote)

        val first = repository.fetchWeather(lat = 37.5665, lng = 126.9780, nowMs = 1_000L)
        val second = repository.fetchWeather(lat = 37.5665, lng = 126.9780, nowMs = 1_000L + WeatherCacheTtlMs - 1)

        assertSame(first, second)
        assertEquals(1, remote.calls.size)
        assertEquals(37.5665, repository.state.lastLat)
        assertEquals(126.9780, repository.state.lastLng)
    }

    @Test
    fun fetchWeatherRefreshesWhenForcedOrExpiredOrCoordinatesChange() {
        val remote = RecordingWeatherRemoteSource()
        val repository = CachingWeatherRepository(remote)

        repository.fetchWeather(lat = 37.0, lng = 126.0, nowMs = 1_000L)
        repository.fetchWeather(lat = 37.0, lng = 126.0, force = true, nowMs = 2_000L)
        repository.fetchWeather(lat = 37.0, lng = 126.0, nowMs = 2_000L + WeatherCacheTtlMs)
        repository.fetchWeather(lat = 35.0, lng = 129.0, nowMs = 2_100L + WeatherCacheTtlMs)

        assertEquals(4, remote.calls.size)
    }

    @Test
    fun fetchWeatherNormalizesMissingDailyWeatherIcons() {
        val repository = CachingWeatherRepository(RecordingWeatherRemoteSource(icon = null))

        repository.fetchWeather(lat = 37.0, lng = 126.0, nowMs = 1_000L)

        assertEquals("", repository.getDaily().single().weatherIcon)
        assertTrue(repository.state.error == null)
    }

    @Test
    fun fallbackWeatherSourceRecordsWarningWhenPreviewDataReplacesRemoteFailure() {
        val fallbackSource = FallbackWeatherRemoteSource(
            primary = FailingWeatherRemoteSource("날씨 인증이 필요합니다"),
            fallback = RecordingWeatherRemoteSource(),
            allowFallback = true,
        )
        val repository = CachingWeatherRepository(fallbackSource)

        repository.fetchWeather(lat = 37.0, lng = 126.0, nowMs = 1_000L)

        assertEquals("원격 날씨 실패로 미리보기 데이터를 표시합니다", repository.state.warning)
    }

    @Test
    fun fallbackWeatherSourceFailsClosedWhenPreviewFallbackIsDisabled() {
        val fallbackSource = FallbackWeatherRemoteSource(
            primary = FailingWeatherRemoteSource("날씨 인증이 필요합니다"),
            fallback = RecordingWeatherRemoteSource(),
            allowFallback = false,
        )
        val repository = CachingWeatherRepository(fallbackSource)

        val error = runCatching {
            repository.fetchWeather(lat = 37.0, lng = 126.0, nowMs = 1_000L)
        }.exceptionOrNull()

        assertEquals("날씨 인증이 필요합니다", error?.message)
        assertEquals("날씨 인증이 필요합니다", repository.state.error)
    }

    private class RecordingWeatherRemoteSource(
        private val icon: String? = "01d",
    ) : WeatherRemoteSource {
        val calls = mutableListOf<Pair<Double, Double>>()

        override fun fetchWeather(lat: Double, lng: Double, nowMs: Long): WeatherDataNative {
            calls += lat to lng
            return WeatherDataNative(
                current = CurrentWeatherNative(
                    temp = 18.0,
                    feelsLike = 17.2,
                    humidity = 55,
                    windSpeed = 2.1,
                    weatherCode = 800,
                    weatherDescription = "맑음",
                    uvIndex = 4.0,
                ),
                hourly = listOf(
                    HourlyForecastNative(
                        dt = nowMs / 1000,
                        temp = 18.0,
                        feelsLike = 17.2,
                        humidity = 55,
                        windSpeed = 2.1,
                        weatherCode = 800,
                        weatherDescription = "맑음",
                        pop = 0.1,
                    ),
                ),
                daily = listOf(
                    DailyForecastNative(
                        dt = nowMs / 1000,
                        tempMin = 13.0,
                        tempMax = 21.0,
                        humidity = 58,
                        windSpeed = 2.4,
                        weatherCode = 800,
                        weatherDescription = "맑음",
                        weatherIcon = icon,
                        pop = 0.1,
                        uvIndex = 4.0,
                    ),
                ),
                fetchedAt = nowMs,
            )
        }
    }

    private class FailingWeatherRemoteSource(
        private val message: String,
    ) : WeatherRemoteSource {
        override fun fetchWeather(lat: Double, lng: Double, nowMs: Long): WeatherDataNative {
            throw IllegalStateException(message)
        }
    }
}
