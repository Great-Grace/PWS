package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDateTime

data class PwsNativeRuntimeSnapshot(
    val session: NativeSessionState = NativeSessionState(),
    val feedback: FeedbackRepositoryState = FeedbackRepositoryState(),
    val weather: WeatherRepositoryState = WeatherRepositoryState(),
)

class PwsNativeRuntime(
    private val feedbackRepository: FeedbackRepository = InMemoryFeedbackRepository(),
    private val weatherRepository: CachingWeatherRepository = CachingWeatherRepository(PreviewWeatherRemoteSource()),
    private val supabaseSessionStore: NativeSupabaseSessionStore? = null,
    private val testerAuthBridge: NativeTesterAuthBridge? = null,
    private val profileClient: NativeSupabaseProfileClient? = null,
) {
    var snapshot: PwsNativeRuntimeSnapshot = PwsNativeRuntimeSnapshot()
        private set

    @Synchronized
    fun dispatchSession(action: NativeSessionAction): PwsNativeRuntimeSnapshot {
        snapshot = snapshot.copy(session = NativeSessionReducer.reduce(snapshot.session, action))
        if (action is NativeSessionAction.SignOut) {
            supabaseSessionStore?.clear()
            snapshot = snapshot.copy(feedback = FeedbackRepositoryState())
        }
        return snapshot
    }

    fun currentSupabaseAccessToken(nowEpochSeconds: Long = System.currentTimeMillis() / 1000): String? =
        supabaseSessionStore?.getValidAccessToken(nowEpochSeconds)

    @Synchronized
    fun signInTesterWithRemoteSession(testerId: String = TesterAuth.FigmaParityTesterId): PwsNativeRuntimeSnapshot {
        val remoteResult = testerAuthBridge?.let { bridge -> runCatching { bridge.signInTester(testerId) }.getOrNull() }
        val localSnapshot = dispatchSession(NativeSessionAction.SignInLocalTester(testerId))
        val remoteUserId = remoteResult?.session?.userId ?: return localSnapshot
        val remoteProfile = profileClient?.let { client -> runCatching { client.fetchUserProfile(remoteUserId) }.getOrNull() }
        return if (remoteProfile != null) {
            snapshot = snapshot.copy(session = snapshot.session.copy(user = remoteProfile.toNativeUserProfile()))
            snapshot
        } else {
            localSnapshot
        }
    }

    @Synchronized
    fun syncCompletedProfile(
        email: String,
        lat: Double = 37.5665,
        lng: Double = 126.9780,
    ): PwsNativeRuntimeSnapshot {
        val user = snapshot.session.user ?: return snapshot
        val synced = profileClient?.let { client ->
            runCatching {
                client.upsertOnboarding(
                    NativeUserOnboardingUpsert(
                        id = user.id,
                        email = email,
                        nickname = user.nickname,
                        defaultLat = lat,
                        defaultLng = lng,
                        climateZone = user.regionLabel,
                        birthYear = user.birthYear,
                        gender = user.gender,
                    ),
                )
            }.getOrNull()
        }
        if (synced != null) snapshot = snapshot.copy(session = snapshot.session.copy(user = synced.toNativeUserProfile()))
        return snapshot
    }

    @Synchronized
    fun syncNotificationProfile(): PwsNativeRuntimeSnapshot {
        val user = snapshot.session.user ?: return snapshot
        val synced = profileClient?.let { client ->
            runCatching {
                client.updateProfile(
                    userId = user.id,
                    update = NativeUserProfileUpdate(
                        notifyEnabled = user.notifyEnabled,
                        notifyOutfit = user.notifyOutfit,
                        notifyRain = user.notifyRain,
                    ),
                )
            }.getOrNull()
        }
        if (synced != null) snapshot = snapshot.copy(session = snapshot.session.copy(user = synced.toNativeUserProfile()))
        return snapshot
    }

    @Synchronized
    fun refreshWeather(force: Boolean = false, nowMs: Long = System.currentTimeMillis()): PwsNativeRuntimeSnapshot {
        weatherRepository.fetchWeather(
            lat = 37.5665,
            lng = 126.9780,
            force = force,
            nowMs = nowMs,
        )
        snapshot = snapshot.copy(weather = weatherRepository.state)
        return snapshot
    }

    @Synchronized
    fun refreshTodayFeedback(now: LocalDateTime = LocalDateTime.now()): PwsNativeRuntimeSnapshot {
        val userId = snapshot.session.user?.id ?: return snapshot
        feedbackRepository.fetchTodayStatus(userId, now)
        feedbackRepository.fetchFeedbackCount(userId)
        snapshot = snapshot.copy(feedback = repositoryState())
        return snapshot
    }

    @Synchronized
    fun submitDefaultFeedback(slot: FeedbackSlot = FeedbackSlot.Afternoon, now: LocalDateTime = LocalDateTime.now()): PwsNativeRuntimeSnapshot {
        val userId = snapshot.session.user?.id ?: return snapshot
        feedbackRepository.submitFeedback(
            userId = userId,
            input = FeedbackInputNative(
                feelScore = 4,
                humidFeel = 3,
                windFeel = 1,
                clothing = 2,
                clothingItems = listOf("longsleeve", "cardigan"),
                activity = 2,
                slot = slot,
            ),
            now = now,
        )
        snapshot = snapshot.copy(feedback = repositoryState())
        return snapshot
    }

    private fun repositoryState(): FeedbackRepositoryState = when (feedbackRepository) {
        is InMemoryFeedbackRepository -> feedbackRepository.state
        is PersistentFeedbackRepository -> feedbackRepository.state
        else -> snapshot.feedback
    }
}
