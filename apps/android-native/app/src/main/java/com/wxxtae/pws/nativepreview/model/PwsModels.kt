package com.wxxtae.pws.nativepreview.model

import com.wxxtae.pws.nativepreview.domain.NativeUserProfile

data class WeatherSummary(
    val region: String,
    val temperatureCelsius: Int,
    val condition: String,
    val feelHeadline: String,
    val clothingGuide: String,
)

data class FeedbackSlot(
    val label: String,
    val status: String,
)

data class HistoryMetric(
    val label: String,
    val value: String,
)

object PreviewData {
    val weather = WeatherSummary(
        region = "서울특별시",
        temperatureCelsius = 18,
        condition = "맑음 · 바람 약간",
        feelHeadline = "조금 쌀쌀하게\n느껴질 거예요",
        clothingGuide = "얇은 니트나 가디건을 챙기면 좋아요",
    )



    fun weatherFor(user: NativeUserProfile?): WeatherSummary = weather.copy(
        region = user?.regionLabel?.takeIf { it.isNotBlank() } ?: weather.region,
        feelHeadline = if (user?.nickname.isNullOrBlank()) {
            weather.feelHeadline
        } else {
            "${user?.nickname}님,\n조금 쌀쌀하게 느껴질 거예요"
        },
    )

    val feedbackSlots = listOf(
        FeedbackSlot("아침", "아직 기록 전"),
        FeedbackSlot("낮", "빠르게 기록 가능"),
        FeedbackSlot("저녁", "하루 마무리"),
    )

    val historyMetrics = listOf(
        HistoryMetric("최근 기록", "3일 전"),
        HistoryMetric("연속 기록", "4일"),
        HistoryMetric("최장 기록", "9일"),
    )
}
