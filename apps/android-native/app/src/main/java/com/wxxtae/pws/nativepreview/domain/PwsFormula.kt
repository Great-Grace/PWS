package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

enum class BmiBucket { Underweight, Normal, Overweight, Obese }
enum class FeedbackSlot(val label: String) { Morning("아침"), Afternoon("낮"), Evening("저녁") }

data class ClothingItemDef(val id: String, val label: String, val clo: Double)

data class WeatherFeatures(
    val normTemp: Double,
    val humidityNorm: Double,
    val windNorm: Double,
    val tmrtNorm: Double,
    val heatIndexBonus: Double,
    val windChillPenalty: Double,
    val precipNorm: Double,
    val hourSin: Double,
    val hourCos: Double,
    val seasonSin: Double,
    val seasonCos: Double,
)

object PwsFormula {
    private val dateFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    const val CloThinMax: Double = 0.18
    const val CloNormalMax: Double = 0.40

    val clothingItems: List<ClothingItemDef> = listOf(
        ClothingItemDef("sleeveless", "민소매", 0.04),
        ClothingItemDef("tshirt", "반팔 티셔츠", 0.09),
        ClothingItemDef("longsleeve", "긴팔 티셔츠", 0.12),
        ClothingItemDef("shirt", "셔츠/블라우스", 0.15),
        ClothingItemDef("knit_thin", "얇은 니트", 0.20),
        ClothingItemDef("sweatshirt", "맨투맨", 0.24),
        ClothingItemDef("hoodie", "후드티", 0.28),
        ClothingItemDef("hoodie_zip", "후드집업", 0.28),
        ClothingItemDef("knit_thick", "두꺼운 니트", 0.36),
        ClothingItemDef("fleece", "플리스", 0.36),
        ClothingItemDef("light_jacket", "바람막이", 0.22),
        ClothingItemDef("cardigan", "가디건", 0.25),
        ClothingItemDef("blazer", "블레이저/자켓", 0.35),
        ClothingItemDef("light_padding", "경량 패딩", 0.55),
        ClothingItemDef("padding", "패딩", 0.90),
        ClothingItemDef("heavy_coat", "두꺼운 코트", 1.00),
        ClothingItemDef("shorts", "반바지", 0.06),
        ClothingItemDef("pants", "긴바지", 0.15),
        ClothingItemDef("slacks", "슬랙스", 0.16),
        ClothingItemDef("jeans", "청바지", 0.20),
    )

    fun normalizedTemp(tempC: Double): Double = (1.0 + (tempC + 10.0) * (4.0 / 45.0)).coerceIn(1.0, 5.0)

    fun computeBmi(heightCm: Double, weightKg: Double): Double {
        val heightM = heightCm / 100.0
        return weightKg / (heightM * heightM)
    }

    fun computeBmiBucket(bmi: Double): BmiBucket = when {
        bmi < 18.5 -> BmiBucket.Underweight
        bmi < 25.0 -> BmiBucket.Normal
        bmi < 30.0 -> BmiBucket.Overweight
        else -> BmiBucket.Obese
    }

    fun computeBmiOffset(bmi: Double): Double = when {
        bmi < 18.5 -> -0.4
        bmi < 25.0 -> 0.0
        bmi < 30.0 -> 0.3
        else -> 0.5
    }

    fun formatTemp(temp: Double): String = "${temp.roundToInt()}°"

    fun formatDate(date: LocalDate): String = date.format(dateFormatter)

    fun getPwsDate(dateTime: LocalDateTime): String {
        val pwsDate = if (dateTime.hour < 5) dateTime.toLocalDate().minusDays(1) else dateTime.toLocalDate()
        return formatDate(pwsDate)
    }

    fun getDefaultSlot(hour: Int): FeedbackSlot = when (hour) {
        in 6..9 -> FeedbackSlot.Morning
        in 10..17 -> FeedbackSlot.Afternoon
        else -> FeedbackSlot.Evening
    }

    fun computeTotalClo(itemIds: List<String>): Double = itemIds.sumOf { id -> clothingItems.firstOrNull { it.id == id }?.clo ?: 0.0 }

    fun cloToClothingScale(totalClo: Double): Int = when {
        totalClo < CloThinMax -> 1
        totalClo < CloNormalMax -> 2
        else -> 3
    }

    fun computeClothingFromItems(itemIds: List<String>): Int = if (itemIds.isEmpty()) 2 else cloToClothingScale(computeTotalClo(itemIds))

    fun computeWeatherFeatures(
        tempC: Double,
        humidity: Double,
        windMps: Double,
        tmrt: Double,
        precipMmh: Double = 0.0,
        hour: Int,
        dayOfYear: Int,
    ): WeatherFeatures {
        val normTemp = normalizedTemp(tempC) / 5.0
        val humidityNorm = (humidity / 100.0).coerceIn(0.0, 1.0)
        val windNorm = (windMps / 15.0).coerceIn(0.0, 1.0)
        val tmrtNorm = ((tmrt + 5.0) / 20.0).coerceIn(0.0, 1.0)
        val heatIndexBonus = max(0.0, ((tempC - 27.0) / 8.0) * ((humidity - 40.0) / 60.0))
        val windChillPenalty = max(0.0, ((10.0 - tempC) / 20.0) * windNorm)
        val precipNorm = (precipMmh / 10.0).coerceIn(0.0, 1.0)
        val hourSin = sin(2.0 * PI * hour / 24.0)
        val hourCos = cos(2.0 * PI * hour / 24.0)
        val seasonSin = sin(2.0 * PI * dayOfYear / 365.0)
        val seasonCos = cos(2.0 * PI * dayOfYear / 365.0)

        return WeatherFeatures(
            normTemp = normTemp,
            humidityNorm = humidityNorm,
            windNorm = windNorm,
            tmrtNorm = tmrtNorm,
            heatIndexBonus = heatIndexBonus,
            windChillPenalty = windChillPenalty,
            precipNorm = precipNorm,
            hourSin = hourSin,
            hourCos = hourCos,
            seasonSin = seasonSin,
            seasonCos = seasonCos,
        )
    }
}
