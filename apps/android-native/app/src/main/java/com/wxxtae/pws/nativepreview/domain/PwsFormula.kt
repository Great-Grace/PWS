package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.pow
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

private data class UtciTerm(
    val coefficient: Double,
    val taExp: Int,
    val vaExp: Int,
    val dTmrtExp: Int,
    val paExp: Int,
)

object PwsFormula {
    private val dateFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    const val CloThinMax: Double = 0.18
    const val CloNormalMax: Double = 0.40
    const val FeatureDim: Int = 11
    const val WeightDim: Int = 12
    private const val MaxUtciPolynomialExponent: Int = 6
    private const val UtciOrdinalSoftnessC: Double = 2.5

    private val hardyVaporPressureCoefficients = doubleArrayOf(
        -2.8365744e3,
        -6.028076559e3,
        1.954263612e1,
        -2.737830188e-2,
        1.6261698e-5,
        7.0229056e-10,
        -1.8680009e-13,
        2.7150305,
    )

    private val utciOrdinalThresholdsC = doubleArrayOf(-13.0, 0.0, 9.0, 26.0, 32.0, 38.0)

    private val utciTerms: Array<UtciTerm> = arrayOf(
        UtciTerm(6.07562052e-01, 0, 0, 0, 0),
        UtciTerm(-2.27712343e-02, 1, 0, 0, 0),
        UtciTerm(8.06470249e-04, 2, 0, 0, 0),
        UtciTerm(-1.54271372e-04, 3, 0, 0, 0),
        UtciTerm(-3.24651735e-06, 4, 0, 0, 0),
        UtciTerm(7.32602852e-08, 5, 0, 0, 0),
        UtciTerm(1.35959073e-09, 6, 0, 0, 0),
        UtciTerm(-2.25836520e+00, 0, 1, 0, 0),
        UtciTerm(8.80326035e-02, 1, 1, 0, 0),
        UtciTerm(2.16844454e-03, 2, 1, 0, 0),
        UtciTerm(-1.53347087e-05, 3, 1, 0, 0),
        UtciTerm(-5.72983704e-07, 4, 1, 0, 0),
        UtciTerm(-2.55090145e-09, 5, 1, 0, 0),
        UtciTerm(-7.51269505e-01, 0, 2, 0, 0),
        UtciTerm(-4.08350271e-03, 1, 2, 0, 0),
        UtciTerm(-5.21670675e-05, 2, 2, 0, 0),
        UtciTerm(1.94544667e-06, 3, 2, 0, 0),
        UtciTerm(1.14099531e-08, 4, 2, 0, 0),
        UtciTerm(1.58137256e-01, 0, 3, 0, 0),
        UtciTerm(-6.57263143e-05, 1, 3, 0, 0),
        UtciTerm(2.22697524e-07, 2, 3, 0, 0),
        UtciTerm(-4.16117031e-08, 3, 3, 0, 0),
        UtciTerm(-1.27762753e-02, 0, 4, 0, 0),
        UtciTerm(9.66891875e-06, 1, 4, 0, 0),
        UtciTerm(2.52785852e-09, 2, 4, 0, 0),
        UtciTerm(4.56306672e-04, 0, 5, 0, 0),
        UtciTerm(-1.74202546e-07, 1, 5, 0, 0),
        UtciTerm(-5.91491269e-06, 0, 6, 0, 0),
        UtciTerm(3.98374029e-01, 0, 0, 1, 0),
        UtciTerm(1.83945314e-04, 1, 0, 1, 0),
        UtciTerm(-1.73754510e-04, 2, 0, 1, 0),
        UtciTerm(-7.60781159e-07, 3, 0, 1, 0),
        UtciTerm(3.77830287e-08, 4, 0, 1, 0),
        UtciTerm(5.43079673e-10, 5, 0, 1, 0),
        UtciTerm(-2.00518269e-02, 0, 1, 1, 0),
        UtciTerm(8.92859837e-04, 1, 1, 1, 0),
        UtciTerm(3.45433048e-06, 2, 1, 1, 0),
        UtciTerm(-3.77925774e-07, 3, 1, 1, 0),
        UtciTerm(-1.69699377e-09, 4, 1, 1, 0),
        UtciTerm(1.69992415e-04, 0, 2, 1, 0),
        UtciTerm(-4.99204314e-05, 1, 2, 1, 0),
        UtciTerm(2.47417178e-07, 2, 2, 1, 0),
        UtciTerm(1.07596466e-08, 3, 2, 1, 0),
        UtciTerm(8.49242932e-05, 0, 3, 1, 0),
        UtciTerm(1.35191328e-06, 1, 3, 1, 0),
        UtciTerm(-6.21531254e-09, 2, 3, 1, 0),
        UtciTerm(-4.99410301e-06, 0, 4, 1, 0),
        UtciTerm(-1.89489258e-08, 1, 4, 1, 0),
        UtciTerm(8.15300114e-08, 0, 5, 1, 0),
        UtciTerm(7.55043090e-04, 0, 0, 2, 0),
        UtciTerm(-5.65095215e-05, 1, 0, 2, 0),
        UtciTerm(-4.52166564e-07, 2, 0, 2, 0),
        UtciTerm(2.46688878e-08, 3, 0, 2, 0),
        UtciTerm(2.42674348e-10, 4, 0, 2, 0),
        UtciTerm(1.54547250e-04, 0, 1, 2, 0),
        UtciTerm(5.24110970e-06, 1, 1, 2, 0),
        UtciTerm(-8.75874982e-08, 2, 1, 2, 0),
        UtciTerm(-1.50743064e-09, 3, 1, 2, 0),
        UtciTerm(-1.56236307e-05, 0, 2, 2, 0),
        UtciTerm(-1.33895614e-07, 1, 2, 2, 0),
        UtciTerm(2.49709824e-09, 2, 2, 2, 0),
        UtciTerm(6.51711721e-07, 0, 3, 2, 0),
        UtciTerm(1.94960053e-09, 1, 3, 2, 0),
        UtciTerm(-1.00361113e-08, 0, 4, 2, 0),
        UtciTerm(-1.21206673e-05, 0, 0, 3, 0),
        UtciTerm(-2.18203660e-07, 1, 0, 3, 0),
        UtciTerm(7.51269482e-09, 2, 0, 3, 0),
        UtciTerm(9.79063848e-11, 3, 0, 3, 0),
        UtciTerm(1.25006734e-06, 0, 1, 3, 0),
        UtciTerm(-1.81584736e-09, 1, 1, 3, 0),
        UtciTerm(-3.52197671e-10, 2, 1, 3, 0),
        UtciTerm(-3.36514630e-08, 0, 2, 3, 0),
        UtciTerm(1.35908359e-10, 1, 2, 3, 0),
        UtciTerm(4.17032620e-10, 0, 3, 3, 0),
        UtciTerm(-1.30369025e-09, 0, 0, 4, 0),
        UtciTerm(4.13908461e-10, 1, 0, 4, 0),
        UtciTerm(9.22652254e-12, 2, 0, 4, 0),
        UtciTerm(-5.08220384e-09, 0, 1, 4, 0),
        UtciTerm(-2.24730961e-11, 1, 1, 4, 0),
        UtciTerm(1.17139133e-10, 0, 2, 4, 0),
        UtciTerm(6.62154879e-10, 0, 0, 5, 0),
        UtciTerm(4.03863260e-13, 1, 0, 5, 0),
        UtciTerm(1.95087203e-12, 0, 1, 5, 0),
        UtciTerm(-4.73602469e-12, 0, 0, 6, 0),
        UtciTerm(5.12733497e+00, 0, 0, 0, 1),
        UtciTerm(-3.12788561e-01, 1, 0, 0, 1),
        UtciTerm(-1.96701861e-02, 2, 0, 0, 1),
        UtciTerm(9.99690870e-04, 3, 0, 0, 1),
        UtciTerm(9.51738512e-06, 4, 0, 0, 1),
        UtciTerm(-4.66426341e-07, 5, 0, 0, 1),
        UtciTerm(5.48050612e-01, 0, 1, 0, 1),
        UtciTerm(-3.30552823e-03, 1, 1, 0, 1),
        UtciTerm(-1.64119440e-03, 2, 1, 0, 1),
        UtciTerm(-5.16670694e-06, 3, 1, 0, 1),
        UtciTerm(9.52692432e-07, 4, 1, 0, 1),
        UtciTerm(-4.29223622e-02, 0, 2, 0, 1),
        UtciTerm(5.00845667e-03, 1, 2, 0, 1),
        UtciTerm(1.00601257e-06, 2, 2, 0, 1),
        UtciTerm(-1.81748644e-06, 3, 2, 0, 1),
        UtciTerm(-1.25813502e-03, 0, 3, 0, 1),
        UtciTerm(-1.79330391e-04, 1, 3, 0, 1),
        UtciTerm(2.34994441e-06, 2, 3, 0, 1),
        UtciTerm(1.29735808e-04, 0, 4, 0, 1),
        UtciTerm(1.29064870e-06, 1, 4, 0, 1),
        UtciTerm(-2.28558686e-06, 0, 5, 0, 1),
        UtciTerm(-3.69476348e-02, 0, 0, 1, 1),
        UtciTerm(1.62325322e-03, 1, 0, 1, 1),
        UtciTerm(-3.14279680e-05, 2, 0, 1, 1),
        UtciTerm(2.59835559e-06, 3, 0, 1, 1),
        UtciTerm(-4.77136523e-08, 4, 0, 1, 1),
        UtciTerm(8.64203390e-03, 0, 1, 1, 1),
        UtciTerm(-6.87405181e-04, 1, 1, 1, 1),
        UtciTerm(-9.13863872e-06, 2, 1, 1, 1),
        UtciTerm(5.15916806e-07, 3, 1, 1, 1),
        UtciTerm(-3.59217476e-05, 0, 2, 1, 1),
        UtciTerm(3.28696511e-05, 1, 2, 1, 1),
        UtciTerm(-7.10542454e-07, 2, 2, 1, 1),
        UtciTerm(-1.24382300e-05, 0, 3, 1, 1),
        UtciTerm(-7.38584400e-09, 1, 3, 1, 1),
        UtciTerm(2.20609296e-07, 0, 4, 1, 1),
        UtciTerm(-7.32469180e-04, 0, 0, 2, 1),
        UtciTerm(-1.87381964e-05, 1, 0, 2, 1),
        UtciTerm(4.80925239e-06, 2, 0, 2, 1),
        UtciTerm(-8.75492040e-08, 3, 0, 2, 1),
        UtciTerm(2.77862930e-05, 0, 1, 2, 1),
        UtciTerm(-5.06004592e-06, 1, 1, 2, 1),
        UtciTerm(1.14325367e-07, 2, 1, 2, 1),
        UtciTerm(2.53016723e-06, 0, 2, 2, 1),
        UtciTerm(-1.72857035e-08, 1, 2, 2, 1),
        UtciTerm(-3.95079398e-08, 0, 3, 2, 1),
        UtciTerm(-3.59413173e-07, 0, 0, 3, 1),
        UtciTerm(7.04388046e-07, 1, 0, 3, 1),
        UtciTerm(-1.89309167e-08, 2, 0, 3, 1),
        UtciTerm(-4.79768731e-07, 0, 1, 3, 1),
        UtciTerm(7.96079978e-09, 1, 1, 3, 1),
        UtciTerm(1.62897058e-09, 0, 2, 3, 1),
        UtciTerm(3.94367674e-08, 0, 0, 4, 1),
        UtciTerm(-1.18566247e-09, 1, 0, 4, 1),
        UtciTerm(3.34678041e-10, 0, 1, 4, 1),
        UtciTerm(-1.15606447e-10, 0, 0, 5, 1),
        UtciTerm(-2.80626406e+00, 0, 0, 0, 2),
        UtciTerm(5.48712484e-01, 1, 0, 0, 2),
        UtciTerm(-3.99428410e-03, 2, 0, 0, 2),
        UtciTerm(-9.54009191e-04, 3, 0, 0, 2),
        UtciTerm(1.93090978e-05, 4, 0, 0, 2),
        UtciTerm(-3.08806365e-01, 0, 1, 0, 2),
        UtciTerm(1.16952364e-02, 1, 1, 0, 2),
        UtciTerm(4.95271903e-04, 2, 1, 0, 2),
        UtciTerm(-1.90710882e-05, 3, 1, 0, 2),
        UtciTerm(2.10787756e-03, 0, 2, 0, 2),
        UtciTerm(-6.98445738e-04, 1, 2, 0, 2),
        UtciTerm(2.30109073e-05, 2, 2, 0, 2),
        UtciTerm(4.17856590e-04, 0, 3, 0, 2),
        UtciTerm(-1.27043871e-05, 1, 3, 0, 2),
        UtciTerm(-3.04620472e-06, 0, 4, 0, 2),
        UtciTerm(5.14507424e-02, 0, 0, 1, 2),
        UtciTerm(-4.32510997e-03, 1, 0, 1, 2),
        UtciTerm(8.99281156e-05, 2, 0, 1, 2),
        UtciTerm(-7.14663943e-07, 3, 0, 1, 2),
        UtciTerm(-2.66016305e-04, 0, 1, 1, 2),
        UtciTerm(2.63789586e-04, 1, 1, 1, 2),
        UtciTerm(-7.01199003e-06, 2, 1, 1, 2),
        UtciTerm(-1.06823306e-04, 0, 2, 1, 2),
        UtciTerm(3.61341136e-06, 1, 2, 1, 2),
        UtciTerm(2.29748967e-07, 0, 3, 1, 2),
        UtciTerm(3.04788893e-04, 0, 0, 2, 2),
        UtciTerm(-6.42070836e-05, 1, 0, 2, 2),
        UtciTerm(1.16257971e-06, 2, 0, 2, 2),
        UtciTerm(7.68023384e-06, 0, 1, 2, 2),
        UtciTerm(-5.47446896e-07, 1, 1, 2, 2),
        UtciTerm(-3.59937910e-08, 0, 2, 2, 2),
        UtciTerm(-4.36497725e-06, 0, 0, 3, 2),
        UtciTerm(1.68737969e-07, 1, 0, 3, 2),
        UtciTerm(2.67489271e-08, 0, 1, 3, 2),
        UtciTerm(3.23926897e-09, 0, 0, 4, 2),
        UtciTerm(-3.53874123e-02, 0, 0, 0, 3),
        UtciTerm(-2.21201190e-01, 1, 0, 0, 3),
        UtciTerm(1.55126038e-02, 2, 0, 0, 3),
        UtciTerm(-2.63917279e-04, 3, 0, 0, 3),
        UtciTerm(4.53433455e-02, 0, 1, 0, 3),
        UtciTerm(-4.32943862e-03, 1, 1, 0, 3),
        UtciTerm(1.45389826e-04, 2, 1, 0, 3),
        UtciTerm(2.17508610e-04, 0, 2, 0, 3),
        UtciTerm(-6.66724702e-05, 1, 2, 0, 3),
        UtciTerm(3.33217140e-05, 0, 3, 0, 3),
        UtciTerm(-2.26921615e-03, 0, 0, 1, 3),
        UtciTerm(3.80261982e-04, 1, 0, 1, 3),
        UtciTerm(-5.45314314e-09, 2, 0, 1, 3),
        UtciTerm(-7.96355448e-04, 0, 1, 1, 3),
        UtciTerm(2.53458034e-05, 1, 1, 1, 3),
        UtciTerm(-6.31223658e-06, 0, 2, 1, 3),
        UtciTerm(3.02122035e-04, 0, 0, 2, 3),
        UtciTerm(-4.77403547e-06, 1, 0, 2, 3),
        UtciTerm(1.73825715e-06, 0, 1, 2, 3),
        UtciTerm(-4.09087898e-07, 0, 0, 3, 3),
        UtciTerm(6.14155345e-01, 0, 0, 0, 4),
        UtciTerm(-6.16755931e-02, 1, 0, 0, 4),
        UtciTerm(1.33374846e-03, 2, 0, 0, 4),
        UtciTerm(3.55375387e-03, 0, 1, 0, 4),
        UtciTerm(-5.13027851e-04, 1, 1, 0, 4),
        UtciTerm(1.02449757e-04, 0, 2, 0, 4),
        UtciTerm(-1.48526421e-03, 0, 0, 1, 4),
        UtciTerm(-4.11469183e-05, 1, 0, 1, 4),
        UtciTerm(-6.80434415e-06, 0, 1, 1, 4),
        UtciTerm(-9.77675906e-06, 0, 0, 2, 4),
        UtciTerm(8.82773108e-02, 0, 0, 0, 5),
        UtciTerm(-3.01859306e-03, 1, 0, 0, 5),
        UtciTerm(1.04452989e-03, 0, 1, 0, 5),
        UtciTerm(2.47090539e-04, 0, 0, 1, 5),
        UtciTerm(1.48348065e-03, 0, 0, 0, 6),
    )

    val defaultPriorWeights: DoubleArray = doubleArrayOf(
        4.9,
        0.25,
        -0.15,
        0.45,
        1.15,
        -1.6,
        -0.35,
        0.0,
        0.0,
        0.0,
        0.0,
        0.75,
    )

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

    private fun stableSigmoid(value: Double): Double {
        return if (value >= 0) {
            val z = exp(-value)
            1.0 / (1.0 + z)
        } else {
            val z = exp(value)
            z / (1.0 + z)
        }
    }

    private fun precomputePowers(value: Double): DoubleArray {
        val powers = DoubleArray(MaxUtciPolynomialExponent + 1)
        powers[0] = 1.0
        for (index in 1..MaxUtciPolynomialExponent) {
            powers[index] = powers[index - 1] * value
        }
        return powers
    }

    fun computeSaturationVaporPressureHpa(tempC: Double): Double {
        val tk = tempC + 273.15
        var value = hardyVaporPressureCoefficients[7] * ln(tk)
        for (index in 0 until 7) {
            value += hardyVaporPressureCoefficients[index] * tk.pow(index - 2)
        }
        return exp(value) * 0.01
    }

    fun relativeHumidityToVaporPressureHpa(tempC: Double, relativeHumidity: Double): Double {
        return computeSaturationVaporPressureHpa(tempC) * relativeHumidity.coerceIn(0.0, 100.0) / 100.0
    }

    fun computeUtciCelsius(
        airTempC: Double,
        relativeHumidity: Double,
        windMps: Double,
        meanRadiantTempC: Double? = null,
    ): Double {
        val ta = airTempC.coerceIn(-50.0, 50.0)
        val tmrt = (meanRadiantTempC ?: ta).coerceIn(ta - 30.0, ta + 70.0)
        val va = windMps.coerceIn(0.5, 17.0)
        val vaporPressureHpa = relativeHumidityToVaporPressureHpa(ta, relativeHumidity).coerceIn(0.0, 50.0)
        val dTmrt = tmrt - ta
        val pa = vaporPressureHpa / 10.0
        val taPowers = precomputePowers(ta)
        val vaPowers = precomputePowers(va)
        val dTmrtPowers = precomputePowers(dTmrt)
        val paPowers = precomputePowers(pa)

        var utci = ta
        for (term in utciTerms) {
            utci += term.coefficient *
                taPowers[term.taExp] *
                vaPowers[term.vaExp] *
                dTmrtPowers[term.dTmrtExp] *
                paPowers[term.paExp]
        }
        return utci
    }

    fun computeOrdinalFeelFromUtci(utciC: Double, softnessC: Double = UtciOrdinalSoftnessC): Double {
        val softness = max(0.25, softnessC)
        var previousCumulative = 0.0
        var expected = 0.0
        for (index in utciOrdinalThresholdsC.indices) {
            val cumulative = stableSigmoid((utciOrdinalThresholdsC[index] - utciC) / softness)
            val probability = (cumulative - previousCumulative).coerceIn(0.0, 1.0)
            expected += (index + 1) * probability
            previousCumulative = cumulative
        }
        expected += 7.0 * (1.0 - previousCumulative).coerceIn(0.0, 1.0)
        return expected.coerceIn(1.0, 7.0)
    }

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

    fun featuresToArray(features: WeatherFeatures): DoubleArray = doubleArrayOf(
        features.normTemp,
        features.humidityNorm,
        features.windNorm,
        features.tmrtNorm,
        features.heatIndexBonus,
        features.windChillPenalty,
        features.precipNorm,
        features.hourSin,
        features.hourCos,
        features.seasonSin,
        features.seasonCos,
    )

    fun initWeights(): DoubleArray = defaultPriorWeights.copyOf()

    fun resolveWeights(raw: DoubleArray?): DoubleArray {
        if (raw == null || raw.size != WeightDim || raw.any { !it.isFinite() }) return initWeights()
        val isLegacyNeutral = raw.take(FeatureDim).all { kotlin.math.abs(it) <= 1e-6 } &&
            kotlin.math.abs(raw[WeightDim - 1] - 4.0) <= 1e-6
        return if (isLegacyNeutral) initWeights() else raw.copyOf()
    }

    fun computePerceptronFeel(weights: DoubleArray, features: DoubleArray): Double {
        var sum = weights.getOrElse(WeightDim - 1) { defaultPriorWeights.last() }
        for (index in 0 until FeatureDim) {
            sum += weights.getOrElse(index) { 0.0 } * features.getOrElse(index) { 0.0 }
        }
        return sum.coerceIn(1.0, 7.0)
    }

    fun computeEnvBase(
        temp: Double,
        humidity: Double,
        windMps: Double,
        tmrtCorrected: Double? = null,
        precipMmh: Double = 0.0,
        hour: Int = 13,
        dayOfYear: Int = 180,
    ): Double {
        val utci = computeUtciCelsius(
            airTempC = temp,
            relativeHumidity = humidity,
            windMps = windMps,
            meanRadiantTempC = tmrtCorrected ?: temp,
        )
        val precipCooling = (precipMmh / 10.0).coerceIn(0.0, 1.0) * 0.25
        return (computeOrdinalFeelFromUtci(utci) - precipCooling).coerceIn(1.0, 7.0)
    }
}
