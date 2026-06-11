package com.wxxtae.pws.nativepreview.domain

data class HomeRefreshParams(
    val lat: Double,
    val lng: Double,
    val force: Boolean = false,
)

interface HomeRefreshDeps {
    fun fetchWeather(lat: Double, lng: Double, force: Boolean = false)
    fun fetchTodayStatus()
    fun fetchFeedbackCount()
    fun fetchTodayPrediction()
}

object HomeRefreshCoordinator {
    /**
     * Mirrors the RN contract: weather/status/feedback are prerequisites,
     * then prediction runs after those inputs are refreshed.
     */
    fun refreshHomeScreenData(deps: HomeRefreshDeps, params: HomeRefreshParams) {
        deps.fetchWeather(params.lat, params.lng, params.force)
        deps.fetchTodayStatus()
        deps.fetchFeedbackCount()
        deps.fetchTodayPrediction()
    }
}
