package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OnboardingTest {
    private val today = LocalDate.of(2026, 5, 5)

    @Test
    fun agreementRulesMatchReactNativeReference() {
        val emptyState = AgreementState()

        assertEquals(AgreementState(terms = true, privacy = true, marketing = true), OnboardingRules.setAllAgreements(true))
        assertEquals(AgreementState(terms = true, privacy = false, marketing = false), OnboardingRules.toggleAgreement(emptyState, AgreementKey.Terms))
        assertTrue(OnboardingRules.areRequiredAgreementsAccepted(AgreementState(terms = true, privacy = true, marketing = false)))
        assertFalse(OnboardingRules.areAllAgreementsAccepted(AgreementState(terms = true, privacy = true, marketing = false)))
    }

    @Test
    fun birthYearNormalizationMatchesAcceptedFormats() {
        assertEquals(1999, OnboardingRules.normalizeBirthYear("1999-02-14", today))
        assertEquals(1999, OnboardingRules.normalizeBirthYear("19990214", today))
        assertEquals(1999, OnboardingRules.normalizeBirthYear("1999", today))
    }

    @Test
    fun birthYearNormalizationRejectsIncompleteInvalidAndFutureValues() {
        assertNull(OnboardingRules.normalizeBirthYear("89", today))
        assertNull(OnboardingRules.normalizeBirthYear("abc1999", today))
        assertNull(OnboardingRules.normalizeBirthYear("1999-02", today))
        assertNull(OnboardingRules.normalizeBirthYear("1999-02-30", today))
        assertNull(OnboardingRules.normalizeBirthYear("2027", today))
        assertNull(OnboardingRules.normalizeBirthYear("2026-05-06", today))
    }

    @Test
    fun profileCanContinueOnlyWhenRequiredFieldsArePresent() {
        val validDraft = ProfileDraft(
            name = "홍길동",
            birthDate = "1999-02-14",
            gender = Gender.Male,
            province = "서울특별시",
            district = "강남구",
        )

        assertTrue(OnboardingRules.canContinueProfile(validDraft, today))
        assertFalse(OnboardingRules.canContinueProfile(validDraft.copy(name = ""), today))
        assertFalse(OnboardingRules.canContinueProfile(validDraft.copy(province = null), today))
    }
}
