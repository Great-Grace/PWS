package com.wxxtae.pws.nativepreview.domain

import kotlin.math.roundToInt

enum class PredictionConfidence { ColdStart, Low, Medium, High }

data class TimeOutfit(
    val morning: List<String>,
    val day: List<String>,
    val evening: List<String>,
)

object WeatherCopy {
    fun getFeelGuideMessage(feel: Double?, confidence: PredictionConfidence? = null): String {
        if (feel == null || confidence == PredictionConfidence.ColdStart) {
            return "기록이 쌓이면 더 정확한 체감 예측을 보여드릴게요"
        }

        val rounded = feel.coerceIn(1.0, 7.0).roundToIntCompat()
        val suffix = if (confidence == PredictionConfidence.Low) "느껴질 수 있어요" else "느껴질 가능성이 높아요"

        return when {
            rounded <= 2 -> "많이 쌀쌀하게 $suffix"
            rounded == 3 -> "조금 쌀쌀하게 $suffix"
            rounded == 4 -> if (confidence == PredictionConfidence.Low) "대체로 무난하게 느껴질 수 있어요" else "대체로 쾌적하게 느껴질 가능성이 높아요"
            rounded == 5 -> "조금 덥게 $suffix"
            else -> "많이 덥게 $suffix"
        }
    }

    fun getOutfitGuideByTemp(temp: Double, pop: Double = 0.0, windSpeed: Double = 0.0, humidity: Double = 0.0): TimeOutfit {
        val addOns = buildList {
            if (pop >= 0.6) add("방수 자켓")
            if (windSpeed >= 7.0) add("바람막이")
            if (humidity >= 80.0 && temp >= 23.0) add("통풍 좋은 소재")
        }
        return when {
            temp <= 0 -> TimeOutfit(listOf("두꺼운 니트", "롱패딩", "기모 바지") + addOns, listOf("니트", "패딩", "긴바지") + addOns, listOf("두꺼운 니트", "롱패딩", "장갑") + addOns)
            temp <= 5 -> TimeOutfit(listOf("니트", "코트", "기모 바지") + addOns, listOf("긴팔티", "코트", "슬랙스") + addOns, listOf("니트", "코트", "긴바지") + addOns)
            temp <= 10 -> TimeOutfit(listOf("니트", "코트", "슬랙스") + addOns, listOf("긴팔티", "자켓", "긴바지") + addOns, listOf("니트", "가디건", "긴바지") + addOns)
            temp <= 16 -> TimeOutfit(listOf("긴팔티", "자켓", "긴바지") + addOns, listOf("셔츠", "가디건", "슬랙스") + addOns, listOf("긴팔티", "가디건", "긴바지") + addOns)
            temp <= 22 -> TimeOutfit(listOf("긴팔티", "얇은 가디건", "긴바지") + addOns, listOf("얇은 셔츠", "면바지") + addOns, listOf("긴팔티", "가디건", "긴바지") + addOns)
            temp <= 27 -> TimeOutfit(listOf("반팔티", "얇은 가디건", "긴바지") + addOns, listOf("반팔티", "슬랙스") + addOns, listOf("반팔티", "가디건", "긴바지") + addOns)
            else -> TimeOutfit(listOf("반팔티", "얇은 셔츠") + addOns, listOf("통풍 좋은 반팔", "가벼운 하의") + addOns, listOf("반팔티", "얇은 가디건") + addOns)
        }
    }
}

private fun Double.roundToIntCompat(): Int = roundToInt()
