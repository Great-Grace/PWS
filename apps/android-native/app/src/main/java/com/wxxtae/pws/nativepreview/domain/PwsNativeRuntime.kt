package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDate
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
    private val passwordAuthBridge: NativePasswordAuthBridge? = null,
    private val profileClient: NativeSupabaseProfileClient? = null,
    private val accountDeletionClient: NativeAccountDeletionClient? = null,
    private val allowLocalTesterFallback: Boolean = true,
) {
    var snapshot: PwsNativeRuntimeSnapshot = PwsNativeRuntimeSnapshot()
        private set

    @Synchronized
    fun dispatchSession(action: NativeSessionAction): PwsNativeRuntimeSnapshot {
        snapshot = snapshot.copy(session = NativeSessionReducer.reduce(snapshot.session, action))
        if (action is NativeSessionAction.SignOut) {
            supabaseSessionStore?.clear()
            weatherRepository.clear()
            snapshot = snapshot.copy(
                feedback = FeedbackRepositoryState(),
                weather = WeatherRepositoryState(),
            )
        }
        return snapshot
    }

    fun currentSupabaseAccessToken(nowEpochSeconds: Long = System.currentTimeMillis() / 1000): String? =
        supabaseSessionStore?.getValidAccessToken(nowEpochSeconds)

    @Synchronized
    fun restoreSavedRemoteSession(nowEpochSeconds: Long = System.currentTimeMillis() / 1000): PwsNativeRuntimeSnapshot {
        val session = supabaseSessionStore?.load()?.takeIf { it.isUsable(nowEpochSeconds) } ?: return snapshot
        val remoteUserId = session.userId?.trim()?.takeIf { it.isNotBlank() } ?: return snapshot
        val userEmail = session.userEmail?.trim()?.takeIf { it.isNotBlank() } ?: "restored@local.invalid"
        return applyRemoteSignIn(
            session = session.copy(userId = remoteUserId, userEmail = userEmail),
            userEmail = userEmail,
            fallbackNickname = userEmail.substringBefore("@").ifBlank { "user" },
        )
    }

    @Synchronized
    fun signInTesterWithRemoteSession(testerId: String = TesterAuth.FigmaParityTesterId): PwsNativeRuntimeSnapshot {
        val bridge = testerAuthBridge
        if (bridge == null) {
            return if (allowLocalTesterFallback) {
                dispatchSession(NativeSessionAction.SignInLocalTester(testerId))
            } else {
                snapshot
            }
        }
        val remoteResult = runCatching { bridge.signInTester(testerId) }.getOrNull()
            ?: return if (allowLocalTesterFallback) {
                dispatchSession(NativeSessionAction.SignInLocalTester(testerId))
            } else {
                snapshot
            }
        return applyRemoteSignIn(
            session = remoteResult.session,
            userEmail = remoteResult.userEmail,
            fallbackNickname = remoteResult.testerId,
        )
    }

    @Synchronized
    fun signInWithPasswordSession(email: String, password: String): PwsNativeRuntimeSnapshot {
        val bridge = passwordAuthBridge ?: return snapshot
        val remoteResult = bridge.signIn(email, password)
        return applyRemoteSignIn(
            session = remoteResult.session,
            userEmail = remoteResult.userEmail,
            fallbackNickname = remoteResult.userEmail.substringBefore("@").ifBlank { "user" },
        )
    }

    @Synchronized
    fun syncCompletedProfile(
        email: String? = null,
        lat: Double = 37.5665,
        lng: Double = 126.9780,
    ): PwsNativeRuntimeSnapshot {
        val user = snapshot.session.user ?: return snapshot
        val client = profileClient
        if (client == null) {
            if (!allowLocalTesterFallback) throw IllegalStateException("Supabase profile sync client is required")
            return snapshot
        }
        val synced = client.upsertOnboarding(
            NativeUserOnboardingUpsert(
                id = user.id,
                email = email?.trim()?.takeIf { it.isNotBlank() } ?: user.email ?: TesterAuth.testerEmail(TesterAuth.FigmaParityTesterId),
                nickname = user.nickname,
                defaultLat = lat,
                defaultLng = lng,
                climateZone = user.regionLabel,
                birthYear = user.birthYear,
                gender = user.gender,
            ),
        ) ?: throw IllegalStateException("프로필 동기화에 실패했습니다")
        snapshot = snapshot.copy(session = snapshot.session.copy(user = synced.toNativeUserProfile()))
        return snapshot
    }

    @Synchronized
    fun completeProfileAndSync(
        email: String? = null,
        lat: Double = 37.5665,
        lng: Double = 126.9780,
    ): PwsNativeRuntimeSnapshot {
        val completedSession = NativeSessionReducer.reduce(snapshot.session, NativeSessionAction.CompleteProfile())
        if (!completedSession.isProfileComplete) {
            throw IllegalStateException("프로필 정보를 완료해 주세요")
        }
        snapshot = snapshot.copy(session = completedSession)
        return syncCompletedProfile(email = email, lat = lat, lng = lng)
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
    fun deleteAccount(): PwsNativeRuntimeSnapshot {
        val client = accountDeletionClient
        if (client == null && !allowLocalTesterFallback) {
            throw IllegalStateException("Supabase account deletion client is required")
        }
        client?.deleteOwnAccount()
        supabaseSessionStore?.clear()
        weatherRepository.clear()
        clearFeedbackRepository()
        snapshot = PwsNativeRuntimeSnapshot()
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
        snapshot = snapshot.copy(feedback = repositoryState())
        return snapshot
    }

    @Synchronized
    fun refreshFeedbackOverview(now: LocalDateTime = LocalDateTime.now()): PwsNativeRuntimeSnapshot {
        val userId = snapshot.session.user?.id ?: return snapshot
        val pwsDate = LocalDate.parse(PwsFormula.getPwsDate(now))
        feedbackRepository.fetchTodayStatus(userId, now)
        feedbackRepository.fetchHistory(
            userId = userId,
            startDate = PwsFormula.formatDate(pwsDate.minusDays(30)),
            endDate = PwsFormula.formatDate(pwsDate),
        )
        snapshot = snapshot.copy(feedback = repositoryState())
        return snapshot
    }

    @Synchronized
    fun submitFeedback(input: FeedbackInputNative, now: LocalDateTime = LocalDateTime.now()): PwsNativeRuntimeSnapshot {
        val userId = snapshot.session.user?.id ?: return snapshot
        feedbackRepository.submitFeedback(
            userId = userId,
            input = input,
            now = now,
        )
        snapshot = snapshot.copy(feedback = repositoryState())
        return snapshot
    }

    @Synchronized
    fun submitDefaultFeedback(slot: FeedbackSlot = FeedbackSlot.Afternoon, now: LocalDateTime = LocalDateTime.now()): PwsNativeRuntimeSnapshot {
        return submitFeedback(
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
    }

    private fun repositoryState(): FeedbackRepositoryState = when (feedbackRepository) {
        is InMemoryFeedbackRepository -> feedbackRepository.state
        is PersistentFeedbackRepository -> feedbackRepository.state
        is SupabaseFeedbackRepository -> feedbackRepository.state
        is FallbackFeedbackRepository -> feedbackRepository.state
        else -> snapshot.feedback
    }

    private fun clearFeedbackRepository() {
        when (feedbackRepository) {
            is InMemoryFeedbackRepository -> feedbackRepository.clear()
            is PersistentFeedbackRepository -> feedbackRepository.clear()
            is FallbackFeedbackRepository -> feedbackRepository.clearLocal()
        }
    }

    private fun applyRemoteSignIn(
        session: NativeSupabaseSession,
        userEmail: String,
        fallbackNickname: String,
    ): PwsNativeRuntimeSnapshot {
        val remoteUserId = session.userId?.trim()?.takeIf { it.isNotBlank() }
            ?: throw IllegalStateException("Supabase user id is required")
        val remoteProfile = profileClient?.fetchUserProfile(remoteUserId)
        val user = remoteProfile?.toNativeUserProfile() ?: NativeUserProfile(
            id = remoteUserId,
            nickname = fallbackNickname.ifBlank { userEmail.substringBefore("@").ifBlank { "user" } },
            email = userEmail,
        )
        snapshot = snapshot.copy(
            session = snapshot.session.copy(
                user = user,
                profileDraft = snapshot.session.profileDraft.copy(
                    name = snapshot.session.profileDraft.name.ifBlank { user.nickname },
                ),
            ),
        )
        return snapshot
    }
}
