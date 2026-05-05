package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeSessionTest {
    private val today = LocalDate.of(2026, 5, 5)

    @Test
    fun localTesterSignInCreatesNativeSessionUsingTesterRules() {
        val state = NativeSessionReducer.reduce(NativeSessionState(), NativeSessionAction.SignInLocalTester(" pws_dev "))

        assertTrue(state.isSignedIn)
        assertEquals("dev-pws_dev", state.user?.id)
        assertEquals("지우진", state.user?.nickname)
        assertEquals("서울특별시 강남구", state.user?.regionLabel)
        assertTrue(state.isProfileComplete)
    }

    @Test
    fun completeProfileRequiresRequiredAgreementsAndValidDraft() {
        val signedIn = NativeSessionReducer.reduce(NativeSessionState(), NativeSessionAction.SignInLocalTester("pws_onboard"))
        val draft = ProfileDraft(
            name = "홍길동",
            birthDate = "1999-02-14",
            gender = Gender.Male,
            province = "서울특별시",
            district = "강남구",
        )
        val withDraft = NativeSessionReducer.reduce(signedIn, NativeSessionAction.UpdateProfileDraft(draft))

        assertFalse(NativeSessionReducer.reduce(withDraft, NativeSessionAction.CompleteProfile(today)).isProfileComplete)

        val withAgreements = NativeSessionReducer.reduce(withDraft, NativeSessionAction.SetAllAgreements(true))
        val completed = NativeSessionReducer.reduce(withAgreements, NativeSessionAction.CompleteProfile(today))

        assertTrue(completed.isProfileComplete)
        assertEquals(1999, completed.user?.birthYear)
        assertEquals("서울특별시 강남구", completed.user?.regionLabel)
    }

    @Test
    fun notificationAndSignOutMutateNativeStateOnly() {
        val signedIn = NativeSessionReducer.reduce(NativeSessionState(), NativeSessionAction.SignInLocalTester())
        val toggled = NativeSessionReducer.reduce(signedIn, NativeSessionAction.ToggleNotification(NotificationKey.Outfit))

        assertEquals(false, toggled.user?.notifyOutfit)

        val signedOut = NativeSessionReducer.reduce(toggled, NativeSessionAction.SignOut)
        assertFalse(signedOut.isSignedIn)
        assertNull(signedOut.user)
    }
}
