package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WeatherUiStateTest {
    @Test
    fun weatherUiSummaryUsesRepositoryDataAndUserRegion() {
        val repository = CachingWeatherRepository(PreviewWeatherRemoteSource())
        val data = repository.fetchWeather(lat = 37.5665, lng = 126.9780, nowMs = 1_000L)
        val user = NativeUserProfile(
            id = "dev-pws_dev",
            nickname = "지우진",
            province = "서울특별시",
            district = "강남구",
        )

        val summary = WeatherUiStateFactory.from(user, data)

        assertEquals("서울특별시 강남구", summary.region)
        assertEquals(18, summary.temperatureCelsius)
        assertEquals("맑음 · 바람 약간", summary.condition)
        assertEquals("13°C ~ 21°C", summary.dailyRange)
        assertTrue(summary.feelHeadline.contains("지우진님"))
        assertTrue(summary.clothingGuide.isNotBlank())
        assertEquals("", data.daily.single().weatherIcon)
    }

    @Test
    fun weatherUiSummaryFallsBackWhenRepositoryHasNoData() {
        val summary = WeatherUiStateFactory.from(user = null, data = null)

        assertEquals("서울특별시", summary.region)
        assertEquals(18, summary.temperatureCelsius)
        assertEquals("오늘 · 내일 · 3일", summary.dailyRange)
    }
}
