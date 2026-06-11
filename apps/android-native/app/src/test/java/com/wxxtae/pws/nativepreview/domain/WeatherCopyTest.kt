package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WeatherCopyTest {
    @Test
    fun feelGuideMessageMatchesReferenceCopyBuckets() {
        assertEquals(
            "기록이 쌓이면 더 정확한 체감 예측을 보여드릴게요",
            WeatherCopy.getFeelGuideMessage(null, PredictionConfidence.High),
        )
        assertEquals(
            "조금 쌀쌀하게 느껴질 가능성이 높아요",
            WeatherCopy.getFeelGuideMessage(3.0, PredictionConfidence.High),
        )
        assertEquals(
            "대체로 무난하게 느껴질 수 있어요",
            WeatherCopy.getFeelGuideMessage(4.0, PredictionConfidence.Low),
        )
        assertEquals(
            "많이 덥게 느껴질 가능성이 높아요",
            WeatherCopy.getFeelGuideMessage(6.0, PredictionConfidence.Medium),
        )
    }

    @Test
    fun outfitGuideAddsRainWindAndHumidityLayers() {
        val outfit = WeatherCopy.getOutfitGuideByTemp(temp = 28.0, pop = 0.8, windSpeed = 7.0, humidity = 85.0)
        assertTrue(outfit.day.contains("통풍 좋은 반팔"))
        assertTrue(outfit.day.contains("방수 자켓"))
        assertTrue(outfit.day.contains("바람막이"))
        assertTrue(outfit.day.contains("통풍 좋은 소재"))
    }
}
