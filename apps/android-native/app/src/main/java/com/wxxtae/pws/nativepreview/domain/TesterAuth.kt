package com.wxxtae.pws.nativepreview.domain

const val TesterAuthConfigError: String = "테스터 로그인 설정이 비어 있습니다. 관리자에게 문의해주세요."

data class TesterAuthConfig(
    val password: String,
    val allowAutoSignup: Boolean = false,
)

enum class DevTesterMode { FigmaParity, OnboardingQa, SimpleLogin }

object TesterAuth {
    const val LocalTesterSessionPrefix = "dev-"
    const val FigmaParityTesterId = "pws_dev"
    const val OnboardingQaTesterId = "pws_onboard"

    fun resolveTesterAuthConfig(rawPassword: String?): TesterAuthConfig {
        val password = rawPassword?.trim().orEmpty()
        if (password.isBlank()) throw IllegalStateException(TesterAuthConfigError)
        return TesterAuthConfig(password = password, allowAutoSignup = false)
    }

    fun resolveOptionalTesterAuthConfig(rawPassword: String?): TesterAuthConfig? {
        val password = rawPassword?.trim().orEmpty()
        if (password.isBlank()) return null
        return TesterAuthConfig(password = password, allowAutoSignup = false)
    }

    fun normalizeTesterId(testerId: String): String = testerId.trim().lowercase()

    fun testerSessionId(testerId: String): String = LocalTesterSessionPrefix + normalizeTesterId(testerId)

    fun testerEmail(testerId: String): String = "${normalizeTesterId(testerId)}@test.pws"

    fun isLocalTesterSessionId(userId: String?): Boolean = userId?.startsWith(LocalTesterSessionPrefix) == true

    fun isFigmaParitySessionId(userId: String?): Boolean = userId == testerSessionId(FigmaParityTesterId)

    fun resolveDevTesterMode(testerId: String): DevTesterMode? {
        val normalized = normalizeTesterId(testerId)
        if (normalized.isBlank()) return null
        if (normalized == FigmaParityTesterId) return DevTesterMode.FigmaParity
        if (normalized == OnboardingQaTesterId) return DevTesterMode.OnboardingQa
        return DevTesterMode.SimpleLogin
    }
}
