package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime

class PwsFormulaTest {
    @Test
    fun normalizedTempMatchesTypeScriptBoundsAndMidpoint() {
        assertEquals(1.0, PwsFormula.normalizedTemp(-30.0), 0.0001)
        assertEquals(5.0, PwsFormula.normalizedTemp(50.0), 0.0001)
        assertEquals(1.0 + (20.0 + 10.0) * (4.0 / 45.0), PwsFormula.normalizedTemp(20.0), 0.0001)
    }

    @Test
    fun bmiBucketAndOffsetMatchReferenceRules() {
        assertEquals(BmiBucket.Underweight, PwsFormula.computeBmiBucket(18.4))
        assertEquals(BmiBucket.Normal, PwsFormula.computeBmiBucket(18.5))
        assertEquals(BmiBucket.Overweight, PwsFormula.computeBmiBucket(25.0))
        assertEquals(BmiBucket.Obese, PwsFormula.computeBmiBucket(30.0))
        assertEquals(-0.4, PwsFormula.computeBmiOffset(18.4), 0.0001)
        assertEquals(0.0, PwsFormula.computeBmiOffset(20.0), 0.0001)
        assertEquals(0.3, PwsFormula.computeBmiOffset(27.0), 0.0001)
        assertEquals(0.5, PwsFormula.computeBmiOffset(31.0), 0.0001)
    }

    @Test
    fun pwsDateRollsBeforeFiveAmToPreviousDay() {
        assertEquals("2026-05-04", PwsFormula.getPwsDate(LocalDateTime.of(2026, 5, 5, 4, 59)))
        assertEquals("2026-05-05", PwsFormula.getPwsDate(LocalDateTime.of(2026, 5, 5, 5, 0)))
    }

    @Test
    fun defaultSlotMatchesReferenceBoundaries() {
        assertEquals(FeedbackSlot.Evening, PwsFormula.getDefaultSlot(5))
        assertEquals(FeedbackSlot.Morning, PwsFormula.getDefaultSlot(6))
        assertEquals(FeedbackSlot.Morning, PwsFormula.getDefaultSlot(9))
        assertEquals(FeedbackSlot.Afternoon, PwsFormula.getDefaultSlot(10))
        assertEquals(FeedbackSlot.Afternoon, PwsFormula.getDefaultSlot(17))
        assertEquals(FeedbackSlot.Evening, PwsFormula.getDefaultSlot(18))
    }

    @Test
    fun clothingScaleUsesCloThresholds() {
        assertEquals(2, PwsFormula.computeClothingFromItems(emptyList()))
        assertEquals(1, PwsFormula.computeClothingFromItems(listOf("tshirt")))
        assertEquals(2, PwsFormula.computeClothingFromItems(listOf("tshirt", "pants")))
        assertEquals(3, PwsFormula.computeClothingFromItems(listOf("padding")))
    }

    @Test
    fun weatherFeaturesClampAndEncodeInteractions() {
        val features = PwsFormula.computeWeatherFeatures(
            tempC = 30.0,
            humidity = 80.0,
            windMps = 30.0,
            tmrt = 20.0,
            precipMmh = 20.0,
            hour = 6,
            dayOfYear = 91,
        )
        assertEquals(1.0, features.windNorm, 0.0001)
        assertEquals(1.0, features.tmrtNorm, 0.0001)
        assertEquals(1.0, features.precipNorm, 0.0001)
        assertTrue(features.heatIndexBonus > 0.0)
        assertEquals(0.0, features.windChillPenalty, 0.0001)
        assertEquals(1.0, features.hourSin, 0.0001)
        assertEquals(0.0, features.hourCos, 0.0001)
    }

    @Test
    fun defaultPredictionPriorRespondsToWeatherSeverity() {
        fun predict(temp: Double, humidity: Double, wind: Double, precip: Double = 0.0): Double {
            val features = PwsFormula.featuresToArray(
                PwsFormula.computeWeatherFeatures(
                    tempC = temp,
                    humidity = humidity,
                    windMps = wind,
                    tmrt = 0.0,
                    precipMmh = precip,
                    hour = 13,
                    dayOfYear = 180,
                )
            )
            return PwsFormula.computePerceptronFeel(PwsFormula.initWeights(), features)
        }

        val coldWindy = predict(-5.0, 45.0, 7.0)
        val mild = predict(20.0, 45.0, 2.0)
        val hotHumid = predict(33.0, 85.0, 1.0)
        val hotDry = predict(33.0, 35.0, 1.0)
        val rainyMild = predict(18.0, 55.0, 2.0, precip = 8.0)
        val dryMild = predict(18.0, 55.0, 2.0)

        assertTrue(coldWindy < mild)
        assertTrue(mild < hotHumid)
        assertTrue(hotHumid > hotDry)
        assertTrue(rainyMild < dryMild)
    }

    @Test
    fun utciPolynomialMatchesReferenceExampleAndOrdinalOrder() {
        val utci = PwsFormula.computeUtciCelsius(
            airTempC = 25.0,
            relativeHumidity = 60.0,
            meanRadiantTempC = 30.0,
            windMps = 2.0,
        )

        assertEquals(25.6337, utci, 0.001)
        assertTrue(PwsFormula.computeOrdinalFeelFromUtci(-5.0) < PwsFormula.computeOrdinalFeelFromUtci(20.0))
        assertTrue(PwsFormula.computeOrdinalFeelFromUtci(20.0) < PwsFormula.computeOrdinalFeelFromUtci(35.0))
    }

    @Test
    fun legacyNeutralWeightsUpgradeToWeatherAwarePrior() {
        val legacy = DoubleArray(PwsFormula.WeightDim)
        legacy[PwsFormula.WeightDim - 1] = 4.0

        val resolved = PwsFormula.resolveWeights(legacy)

        assertTrue(resolved.take(PwsFormula.FeatureDim).any { kotlin.math.abs(it) > 1e-6 })
        assertEquals(0.75, resolved[PwsFormula.WeightDim - 1], 0.0001)
    }

    @Test
    fun envBaseStaysOnPredictionScaleWithRealHumidityPercent() {
        val envBase = PwsFormula.computeEnvBase(
            temp = 16.0,
            humidity = 58.0,
            windMps = 1.5,
            tmrtCorrected = null,
            precipMmh = 0.0,
            hour = 18,
            dayOfYear = 139,
        )

        assertTrue(envBase in 1.0..7.0)
    }
}
