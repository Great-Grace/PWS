package com.wxxtae.pws.nativepreview

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.wxxtae.pws.nativepreview.domain.CachingWeatherRepository
import com.wxxtae.pws.nativepreview.domain.FallbackWeatherRemoteSource
import com.wxxtae.pws.nativepreview.domain.FallbackFeedbackRepository
import com.wxxtae.pws.nativepreview.domain.FeedbackInputNative
import com.wxxtae.pws.nativepreview.domain.NativeSessionAction
import com.wxxtae.pws.nativepreview.domain.NativeSessionReducer
import com.wxxtae.pws.nativepreview.domain.NativeSessionState
import com.wxxtae.pws.nativepreview.domain.NativeAccountDeletionClient
import com.wxxtae.pws.nativepreview.domain.NativePasswordAuthBridge
import com.wxxtae.pws.nativepreview.domain.NativeSupabaseProfileClient
import com.wxxtae.pws.nativepreview.domain.NativeSupabaseSessionStore
import com.wxxtae.pws.nativepreview.domain.NativeTesterAuthBridge
import com.wxxtae.pws.nativepreview.domain.NotificationKey
import com.wxxtae.pws.nativepreview.domain.PersistentFeedbackRepository
import com.wxxtae.pws.nativepreview.domain.PreviewWeatherRemoteSource
import com.wxxtae.pws.nativepreview.domain.PwsNativeRuntime
import com.wxxtae.pws.nativepreview.domain.PwsNativeRuntimeSnapshot
import com.wxxtae.pws.nativepreview.domain.SettingsAction
import com.wxxtae.pws.nativepreview.domain.SupabaseEdgeFunctionWeatherRemoteSource
import com.wxxtae.pws.nativepreview.domain.SupabaseFeedbackRepository
import com.wxxtae.pws.nativepreview.domain.TesterAuth
import com.wxxtae.pws.nativepreview.domain.SettingsDialogReducer
import com.wxxtae.pws.nativepreview.domain.SettingsDialogState
import com.wxxtae.pws.nativepreview.ui.FeedbackScreenNative
import com.wxxtae.pws.nativepreview.ui.HistoryScreenNative
import com.wxxtae.pws.nativepreview.ui.HomeScreenNative
import com.wxxtae.pws.nativepreview.ui.LoginScreenNative
import com.wxxtae.pws.nativepreview.ui.OnboardingScreenNative
import com.wxxtae.pws.nativepreview.ui.PwsBottomTabBar
import com.wxxtae.pws.nativepreview.ui.PwsCard
import com.wxxtae.pws.nativepreview.ui.PwsColor
import com.wxxtae.pws.nativepreview.ui.PwsSpace
import com.wxxtae.pws.nativepreview.ui.PwsText
import com.wxxtae.pws.nativepreview.ui.SettingsScreenNative
import com.wxxtae.pws.nativepreview.ui.WeatherDetailScreenNative

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val runtime = remember {
                val nativeStore = AndroidSharedPreferencesKeyValueStore(this@MainActivity)
                val secureSessionStore = AndroidEncryptedKeyValueStore(this@MainActivity)
                val supabaseSessionStore = NativeSupabaseSessionStore(
                    secureSessionStore,
                    allowPlaintextPersistence = false,
                )
                val edgeWeatherSource = SupabaseEdgeFunctionWeatherRemoteSource.fromBuildConfigOrNull(
                    accessTokenProvider = supabaseSessionStore::getValidAccessToken,
                )
                val profileClient = NativeSupabaseProfileClient.fromBuildConfigOrNull(
                    accessTokenProvider = supabaseSessionStore::getValidAccessToken,
                )
                val localFeedbackRepository = PersistentFeedbackRepository(nativeStore)
                val remoteFeedbackRepository = SupabaseFeedbackRepository.fromBuildConfigOrNull(
                    accessTokenProvider = supabaseSessionStore::getValidAccessToken,
                )
                val allowPreviewFallback = BuildConfig.DEBUG && edgeWeatherSource == null
                val allowLocalFeedbackFallback = BuildConfig.DEBUG && remoteFeedbackRepository == null
                PwsNativeRuntime(
                    feedbackRepository = FallbackFeedbackRepository(
                        primary = remoteFeedbackRepository,
                        fallback = localFeedbackRepository,
                        allowFallback = allowLocalFeedbackFallback,
                    ),
                    weatherRepository = CachingWeatherRepository(
                        FallbackWeatherRemoteSource(
                            primary = edgeWeatherSource,
                            fallback = PreviewWeatherRemoteSource(),
                            allowFallback = allowPreviewFallback,
                        ),
                    ),
                    supabaseSessionStore = supabaseSessionStore,
                    testerAuthBridge = NativeTesterAuthBridge.fromBuildConfigOrNull(supabaseSessionStore),
                    passwordAuthBridge = NativePasswordAuthBridge.fromBuildConfigOrNull(supabaseSessionStore),
                    profileClient = profileClient,
                    accountDeletionClient = NativeAccountDeletionClient.fromBuildConfigOrNull(
                        accessTokenProvider = supabaseSessionStore::getValidAccessToken,
                    ),
                    allowLocalTesterFallback = BuildConfig.DEBUG,
                )
            }
            PwsNativeApp(runtime)
        }
    }
}

@Composable
fun PwsNativeApp(runtime: PwsNativeRuntime) {
    val navController = rememberNavController()
    var appSnapshot by remember { mutableStateOf(runtime.snapshot) }
    var settingsDialog by remember { mutableStateOf<SettingsDialogState?>(null) }
    var loginErrorMessage by remember { mutableStateOf<String?>(null) }
    var onboardingErrorMessage by remember { mutableStateOf<String?>(null) }
    var runtimeErrorMessage by remember { mutableStateOf<String?>(null) }
    val mainHandler = remember { Handler(Looper.getMainLooper()) }
    fun runRuntimeInBackground(
        task: () -> PwsNativeRuntimeSnapshot,
        after: (PwsNativeRuntimeSnapshot) -> Unit = {},
        onError: (Throwable) -> Unit = { runtimeErrorMessage = runtimeOperationErrorMessage },
    ) {
        Thread {
            val result = runCatching(task)
            mainHandler.post {
                result.fold(
                    onSuccess = { nextSnapshot ->
                        appSnapshot = nextSnapshot
                        runtimeErrorMessage = null
                        after(nextSnapshot)
                    },
                    onFailure = onError,
                )
            }
        }.start()
    }
    fun refreshSignedInRuntimeInBackground() {
        val signedInUserId = runtime.snapshot.session.user?.id ?: return
        appSnapshot = appSnapshot.copy(
            feedback = appSnapshot.feedback.copy(isLoading = true),
            weather = appSnapshot.weather.copy(isLoading = true, error = null),
        )
        fun isSameSignedInUser(): Boolean = runtime.snapshot.session.user?.id == signedInUserId
        Thread {
            val weatherResult = runCatching { runtime.refreshWeather() }
            mainHandler.post {
                if (!isSameSignedInUser()) return@post
                weatherResult.fold(
                    onSuccess = { nextSnapshot ->
                        appSnapshot = appSnapshot.copy(weather = nextSnapshot.weather)
                        runtimeErrorMessage = null
                    },
                    onFailure = {
                        appSnapshot = appSnapshot.copy(weather = appSnapshot.weather.copy(isLoading = false, error = it.message))
                        runtimeErrorMessage = it.message ?: runtimeOperationErrorMessage
                    },
                )
            }

            val feedbackResult = runCatching { runtime.refreshFeedbackOverview() }
            mainHandler.post {
                if (!isSameSignedInUser()) return@post
                feedbackResult.fold(
                    onSuccess = { nextSnapshot ->
                        appSnapshot = appSnapshot.copy(session = nextSnapshot.session, feedback = nextSnapshot.feedback)
                    },
                    onFailure = {
                        appSnapshot = appSnapshot.copy(feedback = appSnapshot.feedback.copy(isLoading = false))
                        runtimeErrorMessage = it.message ?: runtimeOperationErrorMessage
                    },
                )
            }
        }.start()
    }
    LaunchedEffect(Unit) {
        runRuntimeInBackground(
            task = { runtime.restoreSavedRemoteSession() },
            after = { nextSnapshot ->
                if (nextSnapshot.session.isSignedIn) {
                    val destination = if (nextSnapshot.session.isProfileComplete) "home" else "onboarding"
                    navController.navigateSingleTop(destination)
                    refreshSignedInRuntimeInBackground()
                }
            },
            onError = { runtimeErrorMessage = it.message ?: runtimeOperationErrorMessage },
        )
    }
    val dispatchSettings: (SettingsAction) -> Unit = { action ->
        settingsDialog = SettingsDialogReducer.reduce(settingsDialog, action)
    }
    val sessionState = appSnapshot.session
    val feedbackState = appSnapshot.feedback
    val weatherState = appSnapshot.weather
    val dispatch: (NativeSessionAction) -> Unit = { action ->
        appSnapshot = runtime.dispatchSession(action)
    }
    val submitFeedbackInBackground: (FeedbackInputNative) -> Unit = { input ->
        runRuntimeInBackground(task = { runtime.submitFeedback(input) })
    }
    val syncNotificationsInBackground: () -> Unit = {
        runRuntimeInBackground({ runtime.syncNotificationProfile() }, {})
    }
    val deleteAccountInBackground: () -> Unit = {
        runRuntimeInBackground({ runtime.deleteAccount() }, { navController.navigateSingleTop("login") })
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PwsColor.Background)
    ) {
        NavHost(navController = navController, startDestination = "login") {
            composable("login") {
                LoginScreenNative(
                    testerId = sessionState.profileDraft.name.ifBlank { "pws_dev" },
                    errorMessage = loginErrorMessage,
                    onTesterSignedIn = {
                        loginErrorMessage = null
                        runRuntimeInBackground(
                            task = { runtime.signInTesterWithRemoteSession() },
                            after = { nextSnapshot ->
                                onboardingErrorMessage = null
                                if (nextSnapshot.session.isSignedIn) {
                                    navController.navigateSingleTop("onboarding")
                                    refreshSignedInRuntimeInBackground()
                                } else {
                                    loginErrorMessage = "테스터 인증을 완료하지 못했습니다. 설정과 계정을 확인해 주세요."
                                }
                            },
                            onError = {
                                loginErrorMessage = "테스터 인증을 완료하지 못했습니다. 설정과 계정을 확인해 주세요."
                            },
                        )
                    },
                    onPasswordSignedIn = { email, password ->
                        loginErrorMessage = null
                        runRuntimeInBackground(
                            task = { runtime.signInWithPasswordSession(email, password) },
                            after = { nextSnapshot ->
                                onboardingErrorMessage = null
                                if (nextSnapshot.session.isSignedIn) {
                                    val destination = if (nextSnapshot.session.isProfileComplete) "home" else "onboarding"
                                    navController.navigateSingleTop(destination)
                                    refreshSignedInRuntimeInBackground()
                                } else {
                                    loginErrorMessage = "로그인을 완료하지 못했습니다. 설정과 계정을 확인해 주세요."
                                }
                            },
                            onError = {
                                loginErrorMessage = it.message ?: "로그인을 완료하지 못했습니다. 설정과 계정을 확인해 주세요."
                            },
                        )
                    },
                )
            }
            composable("onboarding") {
                OnboardingScreenNative(
                    state = sessionState,
                    errorMessage = onboardingErrorMessage,
                    onAcceptAll = { dispatch(NativeSessionAction.SetAllAgreements(true)) },
                    onComplete = {
                        onboardingErrorMessage = null
                        runRuntimeInBackground(
                            task = {
                                runtime.dispatchSession(NativeSessionAction.SetAllAgreements(true))
                                runtime.completeProfileAndSync()
                            },
                            after = {
                                navController.navigateSingleTop("home")
                                refreshSignedInRuntimeInBackground()
                            },
                            onError = {
                                onboardingErrorMessage = it.message ?: "프로필 저장을 완료하지 못했습니다. 다시 시도해 주세요."
                            },
                        )
                    },
                )
            }
            composable("home") {
                MainTabScaffold(navController, "home", sessionState, feedbackState, weatherState, settingsDialog, runtimeErrorMessage, dispatch, dispatchSettings, submitFeedbackInBackground, syncNotificationsInBackground, deleteAccountInBackground)
            }
            composable("feedback") {
                MainTabScaffold(navController, "feedback", sessionState, feedbackState, weatherState, settingsDialog, runtimeErrorMessage, dispatch, dispatchSettings, submitFeedbackInBackground, syncNotificationsInBackground, deleteAccountInBackground)
            }
            composable("history") {
                MainTabScaffold(navController, "history", sessionState, feedbackState, weatherState, settingsDialog, runtimeErrorMessage, dispatch, dispatchSettings, submitFeedbackInBackground, syncNotificationsInBackground, deleteAccountInBackground)
            }
            composable("settings") {
                MainTabScaffold(navController, "settings", sessionState, feedbackState, weatherState, settingsDialog, runtimeErrorMessage, dispatch, dispatchSettings, submitFeedbackInBackground, syncNotificationsInBackground, deleteAccountInBackground)
            }
            composable("weather-detail") {
                WeatherDetailScreenNative(
                    user = sessionState.user,
                    weatherState = weatherState,
                    onBack = { navController.navigateSingleTop("home") },
                )
            }
        }
    }
}

@Composable
private fun MainTabScaffold(
    navController: NavHostController,
    route: String,
    sessionState: NativeSessionState,
    feedbackState: com.wxxtae.pws.nativepreview.domain.FeedbackRepositoryState,
    weatherState: com.wxxtae.pws.nativepreview.domain.WeatherRepositoryState,
    settingsDialog: SettingsDialogState?,
    runtimeErrorMessage: String?,
    dispatch: (NativeSessionAction) -> Unit,
    dispatchSettings: (SettingsAction) -> Unit,
    onSubmitFeedback: (FeedbackInputNative) -> Unit,
    onSyncNotifications: () -> Unit,
    onDeleteAccount: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.weight(1f)) {
            when (route) {
                "home" -> HomeScreenNative(
                    user = sessionState.user,
                    weatherState = weatherState,
                    onWeatherDetail = { navController.navigateSingleTop("weather-detail") },
                    onFeedback = { navController.navigateSingleTop("feedback") },
                )
                "feedback" -> FeedbackScreenNative(
                    user = sessionState.user,
                    feedbackState = feedbackState,
                    onSaveFeedback = onSubmitFeedback,
                )
                "history" -> HistoryScreenNative(user = sessionState.user, feedbackState = feedbackState)
                "settings" -> SettingsScreenNative(
                    user = sessionState.user,
                    dialog = settingsDialog,
                    onToggleNotification = { key ->
                        dispatch(NativeSessionAction.ToggleNotification(key))
                        onSyncNotifications()
                    },
                    onShowTerms = { dispatchSettings(SettingsAction.ShowTerms) },
                    onShowPrivacyPolicy = { dispatchSettings(SettingsAction.ShowPrivacyPolicy) },
                    onRequestLogout = { dispatchSettings(SettingsAction.RequestLogout) },
                    onRequestDeleteAccount = { dispatchSettings(SettingsAction.RequestDeleteAccount) },
                    onDismissDialog = { dispatchSettings(SettingsAction.Dismiss) },
                    onConfirmLogout = {
                        dispatchSettings(SettingsAction.Dismiss)
                        dispatch(NativeSessionAction.SignOut)
                        navController.navigateSingleTop("login")
                    },
                    onConfirmDeleteAccount = {
                        dispatchSettings(SettingsAction.Dismiss)
                        onDeleteAccount()
                    },
                )
            }
        }
        if (runtimeErrorMessage != null) {
            PwsCard(
                modifier = Modifier.padding(horizontal = PwsSpace.Lg, vertical = PwsSpace.Sm),
                background = Color(0xFFFEF2F2),
                border = Color(0xFFFFC9C9),
            ) {
                PwsText(
                    text = runtimeErrorMessage,
                    size = 14.sp,
                    lineHeight = 20.sp,
                    weight = FontWeight.SemiBold,
                    color = PwsColor.Danger,
                )
            }
        }
        PwsBottomTabBar(selected = route, onSelect = navController::navigateSingleTop)
    }
}

private fun NavHostController.navigateSingleTop(route: String) {
    navigate(route) {
        launchSingleTop = true
        restoreState = true
        popUpTo(graph.startDestinationId) { saveState = true }
    }
}

private const val runtimeOperationErrorMessage = "작업을 완료하지 못했습니다. 네트워크와 로그인 상태를 확인해 주세요."
