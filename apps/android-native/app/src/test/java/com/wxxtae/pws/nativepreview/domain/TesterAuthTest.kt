package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TesterAuthTest {
    @Test
    fun testerConfigTrimsAndRejectsBlankPasswords() {
        assertEquals("secret", TesterAuth.resolveTesterAuthConfig(" secret ").password)
        assertFalse(TesterAuth.resolveTesterAuthConfig("secret").allowAutoSignup)
        assertNull(TesterAuth.resolveOptionalTesterAuthConfig("  "))
        try {
            TesterAuth.resolveTesterAuthConfig("  ")
            throw AssertionError("blank required tester password should throw")
        } catch (error: IllegalStateException) {
            assertEquals(TesterAuthConfigError, error.message)
        }
    }

    @Test
    fun testerIdsNormalizeAndCreateLocalSessionIds() {
        assertEquals("abc", TesterAuth.normalizeTesterId("  AbC  "))
        assertEquals("dev-abc", TesterAuth.testerSessionId(" AbC "))
        assertEquals("abc@test.pws", TesterAuth.testerEmail(" AbC "))
        assertTrue(TesterAuth.isLocalTesterSessionId("dev-abc"))
        assertFalse(TesterAuth.isLocalTesterSessionId("real-user"))
    }

    @Test
    fun devTesterModeMatchesReferenceIds() {
        assertNull(TesterAuth.resolveDevTesterMode("  "))
        assertEquals(DevTesterMode.FigmaParity, TesterAuth.resolveDevTesterMode("pws_dev"))
        assertEquals(DevTesterMode.OnboardingQa, TesterAuth.resolveDevTesterMode("pws_onboard"))
        assertEquals(DevTesterMode.SimpleLogin, TesterAuth.resolveDevTesterMode("realtester"))
        assertTrue(TesterAuth.isFigmaParitySessionId("dev-pws_dev"))
    }
}
