package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDate

enum class AgreementKey {
    Terms,
    Privacy,
    Marketing,
}

data class AgreementState(
    val terms: Boolean = false,
    val privacy: Boolean = false,
    val marketing: Boolean = false,
)

enum class Gender {
    Male,
    Female,
    None,
}

data class ProfileDraft(
    val name: String = "",
    val birthDate: String = "",
    val gender: Gender? = null,
    val heightCm: String = "",
    val weightKg: String = "",
    val province: String? = null,
    val district: String? = null,
)

object OnboardingRules {
    private val yearOnlyPattern = Regex("^(\\d{4})$")
    private val compactDatePattern = Regex("^(\\d{4})(\\d{2})(\\d{2})$")
    private val separatedDatePattern = Regex("^(\\d{4})([-/.])(\\d{1,2})\\2(\\d{1,2})$")

    fun setAllAgreements(checked: Boolean): AgreementState = AgreementState(
        terms = checked,
        privacy = checked,
        marketing = checked,
    )

    fun toggleAgreement(state: AgreementState, key: AgreementKey): AgreementState = when (key) {
        AgreementKey.Terms -> state.copy(terms = !state.terms)
        AgreementKey.Privacy -> state.copy(privacy = !state.privacy)
        AgreementKey.Marketing -> state.copy(marketing = !state.marketing)
    }

    fun areRequiredAgreementsAccepted(state: AgreementState): Boolean = state.terms && state.privacy

    fun areAllAgreementsAccepted(state: AgreementState): Boolean = state.terms && state.privacy && state.marketing

    fun normalizeBirthYear(value: String, today: LocalDate = LocalDate.now()): Int? {
        val trimmed = value.trim()
        yearOnlyPattern.matchEntire(trimmed)?.let { match ->
            val year = match.groupValues[1].toInt()
            return year.takeIf { isReasonableBirthYear(it, today) }
        }

        compactDatePattern.matchEntire(trimmed)?.let { match ->
            return normalizeBirthDate(
                year = match.groupValues[1].toInt(),
                month = match.groupValues[2].toInt(),
                day = match.groupValues[3].toInt(),
                today = today,
            )
        }

        separatedDatePattern.matchEntire(trimmed)?.let { match ->
            return normalizeBirthDate(
                year = match.groupValues[1].toInt(),
                month = match.groupValues[3].toInt(),
                day = match.groupValues[4].toInt(),
                today = today,
            )
        }

        return null
    }

    fun canContinueProfile(draft: ProfileDraft, today: LocalDate = LocalDate.now()): Boolean =
        draft.name.trim().isNotEmpty() &&
            normalizeBirthYear(draft.birthDate, today) != null &&
            draft.gender != null &&
            !draft.province.isNullOrBlank() &&
            !draft.district.isNullOrBlank()

    private fun normalizeBirthDate(year: Int, month: Int, day: Int, today: LocalDate): Int? {
        if (!isReasonableBirthYear(year, today)) return null
        val date = runCatching { LocalDate.of(year, month, day) }.getOrNull() ?: return null
        if (date.isAfter(today)) return null
        return year
    }

    private fun isReasonableBirthYear(year: Int, today: LocalDate): Boolean = year in 1900..today.year
}
