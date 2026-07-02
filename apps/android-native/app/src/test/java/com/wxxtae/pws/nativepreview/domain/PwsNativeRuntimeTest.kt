package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
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
    fun runtimePersistsSelectedFeedbackInputInsteadOfDefaultValues() {
        val runtime = PwsNativeRuntime()
        val now = LocalDateTime.of(2026, 5, 5, 19, 0)

        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())
        runtime.dispatchSession(NativeSessionAction.CompleteProfile(now.toLocalDate()))
        val afterSubmit = runtime.submitFeedback(
            FeedbackInputNative(
                feelScore = 7,
                humidFeel = 5,
                windFeel = 3,
                clothing = 3,
                clothingItems = listOf("니트", "코트", "긴바지"),
                activity = 2,
                slot = FeedbackSlot.Evening,
            ),
            now,
        )

        val entry = afterSubmit.feedback.todayFeedback.single()
        assertEquals(FeedbackSlot.Evening, entry.feedbackSlot)
        assertEquals(7, entry.feelScore)
        assertEquals(5, entry.humidFeel)
        assertEquals(3, entry.windFeel)
        assertEquals(3, entry.clothing)
        assertEquals(listOf("니트", "코트", "긴바지"), entry.clothingItems)
        assertEquals(1, afterSubmit.feedback.feedbackCountBySlot[FeedbackSlot.Evening])
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
    fun signOutClearsWeatherStateAndCache() {
        val runtime = PwsNativeRuntime()
        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())
        runtime.refreshWeather(nowMs = 1_000L)

        val signedOut = runtime.dispatchSession(NativeSessionAction.SignOut)

        assertNull(signedOut.weather.data)
        assertNull(signedOut.weather.lastLat)
        assertNull(signedOut.weather.lastLng)
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

    @Test
    fun runtimeRefreshesTodayFeedbackWithoutDuplicateCountFetch() {
        val repository = RecordingRefreshFeedbackRepository()
        val runtime = PwsNativeRuntime(feedbackRepository = repository)

        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())
        runtime.refreshTodayFeedback(now = LocalDateTime.of(2026, 5, 5, 13, 0))

        assertEquals(1, repository.todayStatusCalls)
        assertEquals(0, repository.countCalls)
    }

    @Test
    fun runtimeRefreshesFeedbackOverviewWithRecentHistoryWindow() {
        val repository = RecordingRefreshFeedbackRepository()
        val runtime = PwsNativeRuntime(feedbackRepository = repository)

        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())
        runtime.refreshFeedbackOverview(now = LocalDateTime.of(2026, 5, 24, 13, 0))

        assertEquals(1, repository.todayStatusCalls)
        assertEquals(1, repository.historyCalls)
        assertEquals("2026-04-24", repository.historyStartDate)
        assertEquals("2026-05-24", repository.historyEndDate)
        assertEquals(0, repository.countCalls)
    }

    @Test
    fun deleteAccountCallsSupabaseRpcAndClearsRuntimeState() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        store.save(NativeSupabaseSession(accessToken = "access-token", refreshToken = "refresh-token", userId = "user-1"))
        val transport = RecordingAccountDeletionTransport(NativeSupabaseProfileResponse(204, ""))
        val runtime = PwsNativeRuntime(
            feedbackRepository = InMemoryFeedbackRepository(),
            weatherRepository = CachingWeatherRepository(PreviewWeatherRemoteSource()),
            supabaseSessionStore = store,
            accountDeletionClient = NativeAccountDeletionClient(
                supabaseUrl = "https://project.supabase.co",
                supabaseAnonKey = "anon-key",
                accessTokenProvider = store::getValidAccessToken,
                transport = transport,
            ),
            allowLocalTesterFallback = false,
        )
        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())
        runtime.submitDefaultFeedback(now = LocalDateTime.of(2026, 5, 5, 13, 0))
        runtime.refreshWeather(nowMs = 1_000L)

        val snapshot = runtime.deleteAccount()

        assertNull(snapshot.session.user)
        assertEquals(0, snapshot.feedback.feedbackCount)
        assertNull(snapshot.weather.data)
        assertNull(store.getValidAccessToken())
        assertEquals("POST", transport.request?.method)
        assertEquals("https://project.supabase.co/rest/v1/rpc/delete_own_account", transport.request?.url)
        assertEquals("Bearer access-token", transport.request?.headers?.get("Authorization"))
    }

    @Test
    fun releaseDeleteAccountFailsClosedWhenRpcClientIsMissing() {
        val runtime = PwsNativeRuntime(allowLocalTesterFallback = false)

        val error = runCatching { runtime.deleteAccount() }.exceptionOrNull()

        assertEquals("Supabase account deletion client is required", error?.message)
    }

    @Test
    fun debugDeleteAccountCanClearLocalTesterStateWithoutRpcClient() {
        val runtime = PwsNativeRuntime(allowLocalTesterFallback = true)
        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())

        val snapshot = runtime.deleteAccount()

        assertNull(snapshot.session.user)
    }

    @Test
    fun completeProfileAndSyncUpsertsProfileBeforeReturningCompletedState() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        val authTransport = RecordingAuthTransport(
            NativeSupabaseAuthResponse(
                statusCode = 200,
                body = """
                    {
                      "access_token": "access-token",
                      "refresh_token": "refresh-token",
                      "user": { "id": "user-1", "email": "real@test.pws" }
                    }
                """.trimIndent(),
            ),
        )
        val transport = RecordingProfileTransport(
            NativeSupabaseProfileResponse(
                statusCode = 200,
                body = """
                    [{
                      "id": "user-1",
                      "email": "real@test.pws",
                      "nickname": "릴리즈테스터",
                      "climate_zone": "서울특별시 강남구",
                      "onboarding_done": true,
                      "birth_year": 1994,
                      "gender": "male"
                    }]
                """.trimIndent(),
            ),
        )
        val runtime = PwsNativeRuntime(
            supabaseSessionStore = store,
            passwordAuthBridge = NativePasswordAuthBridge(
                authClient = NativeSupabaseAuthClient(
                    supabaseUrl = "https://project.supabase.co",
                    supabaseAnonKey = "anon-key",
                    transport = authTransport,
                    nowEpochSeconds = { 1_000L },
                ),
                sessionStore = store,
            ),
            profileClient = NativeSupabaseProfileClient(
                supabaseUrl = "https://project.supabase.co",
                supabaseAnonKey = "anon-key",
                accessTokenProvider = store::getValidAccessToken,
                transport = transport,
            ),
            allowLocalTesterFallback = false,
        )
        runtime.signInWithPasswordSession("real@test.pws", "secret")
        runtime.dispatchSession(NativeSessionAction.SetAllAgreements(true))
        runtime.dispatchSession(
            NativeSessionAction.UpdateProfileDraft(
                ProfileDraft(
                    name = "릴리즈테스터",
                    birthDate = "1994",
                    gender = Gender.Male,
                    province = "서울특별시",
                    district = "강남구",
                ),
            ),
        )

        val snapshot = runtime.completeProfileAndSync()

        assertTrue(snapshot.session.isProfileComplete)
        assertEquals("user-1", snapshot.session.user?.id)
        assertEquals("릴리즈테스터", snapshot.session.user?.nickname)
        assertEquals("real@test.pws", snapshot.session.user?.email)
        assertEquals("POST", transport.request?.method)
        assertEquals("https://project.supabase.co/rest/v1/users?on_conflict=id", transport.request?.url)
        assertEquals("Bearer access-token", transport.request?.headers?.get("Authorization"))
        assertTrue(transport.request?.body?.contains("\"onboarding_done\":true") == true)
    }

    @Test
    fun releaseCompleteProfileFailsClosedWhenProfileClientIsMissing() {
        val runtime = PwsNativeRuntime(allowLocalTesterFallback = false)
        runtime.dispatchSession(NativeSessionAction.SignInLocalTester())
        runtime.dispatchSession(NativeSessionAction.SetAllAgreements(true))

        val error = runCatching { runtime.completeProfileAndSync() }.exceptionOrNull()

        assertEquals("Supabase profile sync client is required", error?.message)
    }

    @Test
    fun runtimeRestoresSavedRemoteSessionWithProfile() {
        val store = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        store.save(
            NativeSupabaseSession(
                accessToken = "access-token",
                refreshToken = "refresh-token",
                expiresAtEpochSeconds = Long.MAX_VALUE,
                userId = "user-1",
                userEmail = "real@test.pws",
            ),
        )
        val transport = RecordingProfileTransport(
            NativeSupabaseProfileResponse(
                statusCode = 200,
                body = """
                    [{
                      "id": "user-1",
                      "email": "real@test.pws",
                      "nickname": "릴리즈테스터",
                      "climate_zone": "서울특별시 강남구",
                      "onboarding_done": true,
                      "birth_year": 1994,
                      "gender": "male"
                    }]
                """.trimIndent(),
            ),
        )
        val runtime = PwsNativeRuntime(
            supabaseSessionStore = store,
            profileClient = NativeSupabaseProfileClient(
                supabaseUrl = "https://project.supabase.co",
                supabaseAnonKey = "anon-key",
                accessTokenProvider = store::getValidAccessToken,
                transport = transport,
            ),
            allowLocalTesterFallback = false,
        )

        val snapshot = runtime.restoreSavedRemoteSession(nowEpochSeconds = 1_000L)

        assertTrue(snapshot.session.isProfileComplete)
        assertEquals("user-1", snapshot.session.user?.id)
        assertEquals("릴리즈테스터", snapshot.session.user?.nickname)
        assertEquals("real@test.pws", snapshot.session.user?.email)
        assertEquals("Bearer access-token", transport.request?.headers?.get("Authorization"))
    }

    private class RecordingAccountDeletionTransport(
        private val response: NativeSupabaseProfileResponse,
    ) : NativeSupabaseProfileTransport {
        var request: NativeSupabaseProfileRequest? = null

        override fun send(request: NativeSupabaseProfileRequest): NativeSupabaseProfileResponse {
            this.request = request
            return response
        }
    }

    private class RecordingProfileTransport(
        private val response: NativeSupabaseProfileResponse,
    ) : NativeSupabaseProfileTransport {
        var request: NativeSupabaseProfileRequest? = null

        override fun send(request: NativeSupabaseProfileRequest): NativeSupabaseProfileResponse {
            this.request = request
            return response
        }
    }

    private class RecordingAuthTransport(
        private val response: NativeSupabaseAuthResponse,
    ) : NativeSupabaseAuthTransport {
        var request: NativeSupabaseAuthRequest? = null

        override fun post(request: NativeSupabaseAuthRequest): NativeSupabaseAuthResponse {
            this.request = request
            return response
        }
    }

    private class RecordingRefreshFeedbackRepository : FeedbackRepository {
        var todayStatusCalls = 0
        var historyCalls = 0
        var historyStartDate: String? = null
        var historyEndDate: String? = null
        var countCalls = 0

        override fun fetchTodayStatus(userId: String, now: LocalDateTime): List<FeedbackEntryNative> {
            todayStatusCalls += 1
            return emptyList()
        }

        override fun submitFeedback(
            userId: String,
            input: FeedbackInputNative,
            now: LocalDateTime,
        ): FeedbackEntryNative = throw UnsupportedOperationException("not needed")

        override fun fetchHistory(userId: String, startDate: String, endDate: String): List<FeedbackEntryNative> {
            historyCalls += 1
            historyStartDate = startDate
            historyEndDate = endDate
            return emptyList()
        }

        override fun fetchFeedbackCount(userId: String): Int {
            countCalls += 1
            return 0
        }
    }
}
