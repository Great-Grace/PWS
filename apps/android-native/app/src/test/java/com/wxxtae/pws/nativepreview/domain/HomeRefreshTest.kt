package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class HomeRefreshTest {
    @Test
    fun refreshHomeScreenDataRefreshesPrerequisitesBeforePrediction() {
        val calls = mutableListOf<String>()
        val deps = object : HomeRefreshDeps {
            override fun fetchWeather(lat: Double, lng: Double, force: Boolean) {
                calls += "weather:$lat:$lng:$force"
            }

            override fun fetchTodayStatus() {
                calls += "todayStatus"
            }

            override fun fetchFeedbackCount() {
                calls += "feedbackCount"
            }

            override fun fetchTodayPrediction() {
                calls += "prediction"
            }
        }

        HomeRefreshCoordinator.refreshHomeScreenData(
            deps = deps,
            params = HomeRefreshParams(lat = 37.5665, lng = 126.9780, force = true),
        )

        assertEquals(
            listOf("weather:37.5665:126.978:true", "todayStatus", "feedbackCount", "prediction"),
            calls,
        )
    }
}
