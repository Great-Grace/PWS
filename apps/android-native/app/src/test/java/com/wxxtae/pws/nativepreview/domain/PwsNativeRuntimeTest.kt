package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PwsNativeRuntimeTest {
    @Test
    fun runtimeConnectsSessionAndFeedbackRepositoryForLocalTesterFlow() {
        val runtime = PwsNativeRuntime()
        val now = LocalDateTime.of(2026, 5, 5, 13, 0)

        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())
        runtime.dispatchSession(NativeSessionAction.SetAllAgreements(true))
        runtime.dispatchSession(NativeSessionAction.CompleteProfile(now.toLocalDate()))
        val afterSubmit = runtime.submitDefaultFeedback(FeedbackSlot.Afternoon, now)

        assertTrue(afterSubmit.session.isSignedIn)
        assertEquals("dev-pws_dev", afterSubmit.session.user?.id)
        assertEquals(1, afterSubmit.feedback.feedbackCount)
        assertEquals(1, afterSubmit.feedback.todayFeedback.size)
        assertEquals(FeedbackSlot.Afternoon, afterSubmit.feedback.todayFeedback.single().feedbackSlot)
        assertEquals(1, afterSubmit.feedback.feedbackCountBySlot[FeedbackSlot.Afternoon])
    }

    @Test
    fun signOutClearsRuntimeFeedbackState() {
        val runtime = PwsNativeRuntime()
        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())
        runtime.submitDefaultFeedback(now = LocalDateTime.of(2026, 5, 5, 13, 0))

        val signedOut = runtime.dispatchSession(NativeSessionAction.SignOut)

        assertEquals(null, signedOut.session.user)
        assertEquals(0, signedOut.feedback.feedbackCount)
        assertEquals(emptyList<FeedbackEntryNative>(), signedOut.feedback.todayFeedback)
    }
    @Test
    fun runtimeRefreshesWeatherRepositorySnapshot() {
        val runtime = PwsNativeRuntime()
        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())

        val refreshed = runtime.refreshWeather(nowMs = 1_000L)

        assertEquals(18.0, refreshed.weather.data?.current?.temp)
        assertEquals("", refreshed.weather.data?.daily?.single()?.weatherIcon)
        assertEquals(37.5665, refreshed.weather.lastLat)
        assertEquals(126.978, refreshed.weather.lastLng)
    }

}
