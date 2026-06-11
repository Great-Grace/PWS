package com.wxxtae.pws.nativepreview.domain

data class WeatherUiSummary(
    val region: String,
    val temperatureCelsius: Int,
    val condition: String,
    val feelHeadline: String,
    val clothingGuide: String,
    val dailyRange: String,
)

object WeatherUiStateFactory {
    fun from(
        user: NativeUserProfile?,
        data: WeatherDataNative?,
    ): WeatherUiSummary {
        val region = user?.regionLabel?.takeIf { it.isNotBlank() } ?: "서울특별시"
        val current = data?.current
        val daily = data?.daily?.firstOrNull()
        val temp = current?.temp?.toInt() ?: 18
        val condition = current?.weatherDescription?.takeIf { it.isNotBlank() } ?: "맑음 · 바람 약간"
        val outfit = WeatherCopy.getOutfitGuideByTemp(temp.toDouble(), current?.precipitation1h ?: 0.0, current?.windSpeed ?: 0.0, current?.humidity?.toDouble() ?: 0.0)
        val guide = outfit.day.joinToString(" · ")
        val headline = if (user?.nickname.isNullOrBlank()) {
            WeatherCopy.getFeelGuideMessage(3.0, PredictionConfidence.High)
        } else {
            "${user?.nickname}님,\n${WeatherCopy.getFeelGuideMessage(3.0, PredictionConfidence.High)}"
        }

        return WeatherUiSummary(
            region = region,
            temperatureCelsius = temp,
            condition = condition,
            feelHeadline = headline,
            clothingGuide = guide,
            dailyRange = if (daily != null) "${daily.tempMin.toInt()}°C ~ ${daily.tempMax.toInt()}°C" else "오늘 · 내일 · 3일",
        )
    }
}

class PreviewWeatherRemoteSource : WeatherRemoteSource {
    override fun fetchWeather(lat: Double, lng: Double, nowMs: Long): WeatherDataNative = WeatherDataNative(
        current = CurrentWeatherNative(
            temp = 18.0,
            feelsLike = 17.2,
            humidity = 55,
            windSpeed = 2.1,
            weatherCode = 800,
            weatherDescription = "맑음 · 바람 약간",
            uvIndex = 4.0,
            precipitation1h = 0.0,
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
                weatherIcon = null,
                pop = 0.1,
                uvIndex = 4.0,
            ),
        ),
        fetchedAt = nowMs,
    )
}
