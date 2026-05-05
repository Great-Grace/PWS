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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.wxxtae.pws.nativepreview.domain.CachingWeatherRepository
import com.wxxtae.pws.nativepreview.domain.FallbackWeatherRemoteSource
import com.wxxtae.pws.nativepreview.domain.NativeSessionAction
import com.wxxtae.pws.nativepreview.domain.NativeSessionReducer
import com.wxxtae.pws.nativepreview.domain.NativeSessionState
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
import com.wxxtae.pws.nativepreview.domain.TesterAuth
import com.wxxtae.pws.nativepreview.domain.SettingsDialogReducer
import com.wxxtae.pws.nativepreview.domain.SettingsDialogState
import com.wxxtae.pws.nativepreview.ui.FeedbackScreenNative
import com.wxxtae.pws.nativepreview.ui.HistoryScreenNative
import com.wxxtae.pws.nativepreview.ui.HomeScreenNative
import com.wxxtae.pws.nativepreview.ui.LoginScreenNative
import com.wxxtae.pws.nativepreview.ui.OnboardingScreenNative
import com.wxxtae.pws.nativepreview.ui.PwsBottomTabBar
import com.wxxtae.pws.nativepreview.ui.PwsColor
import com.wxxtae.pws.nativepreview.ui.SettingsScreenNative
import com.wxxtae.pws.nativepreview.ui.WeatherDetailScreenNative

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val runtime = remember {
                val nativeStore = AndroidSharedPreferencesKeyValueStore(this@MainActivity)
                val supabaseSessionStore = NativeSupabaseSessionStore(nativeStore)
                val edgeWeatherSource = SupabaseEdgeFunctionWeatherRemoteSource.fromBuildConfigOrNull(
                    accessTokenProvider = supabaseSessionStore::getValidAccessToken,
                )
                val profileClient = NativeSupabaseProfileClient.fromBuildConfigOrNull(
                    accessTokenProvider = supabaseSessionStore::getValidAccessToken,
                )
                PwsNativeRuntime(
                    feedbackRepository = PersistentFeedbackRepository(nativeStore),
                    weatherRepository = CachingWeatherRepository(
                        FallbackWeatherRemoteSource(
                            primary = edgeWeatherSource,
                            fallback = PreviewWeatherRemoteSource(),
                        ),
                    ),
                    supabaseSessionStore = supabaseSessionStore,
                    testerAuthBridge = NativeTesterAuthBridge.fromBuildConfigOrNull(supabaseSessionStore),
                    profileClient = profileClient,
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
    val mainHandler = remember { Handler(Looper.getMainLooper()) }
    val runRuntimeInBackground: (() -> PwsNativeRuntimeSnapshot) -> Unit = { task ->
        Thread {
            val nextSnapshot = task()
            mainHandler.post { appSnapshot = nextSnapshot }
        }.start()
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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PwsColor.Background)
    ) {
        NavHost(navController = navController, startDestination = "login") {
            composable("login") {
                LoginScreenNative(
                    testerId = sessionState.profileDraft.name.ifBlank { "pws_dev" },
                    onSignedIn = {
                        dispatch(NativeSessionAction.SignInLocalTester())
                        appSnapshot = runtime.refreshTodayFeedback()
                        navController.navigateSingleTop("onboarding")
                        runRuntimeInBackground {
                            runtime.signInTesterWithRemoteSession()
                            runtime.refreshWeather()
                        }
                    },
                )
            }
            composable("onboarding") {
                OnboardingScreenNative(
                    state = sessionState,
                    onAcceptAll = { dispatch(NativeSessionAction.SetAllAgreements(true)) },
                    onComplete = {
                        dispatch(NativeSessionAction.SetAllAgreements(true))
                        dispatch(NativeSessionAction.CompleteProfile())
                        navController.navigateSingleTop("home")
                        runRuntimeInBackground {
                            runtime.syncCompletedProfile(
                                email = TesterAuth.testerEmail(TesterAuth.FigmaParityTesterId),
                            )
                        }
                    },
                )
            }
            composable("home") { MainTabScaffold(navController, "home", sessionState, feedbackState, weatherState, settingsDialog, dispatch, dispatchSettings, onSubmitFeedback = { appSnapshot = runtime.submitDefaultFeedback() }, onSyncNotifications = { runRuntimeInBackground { runtime.syncNotificationProfile() } }) }
            composable("feedback") { MainTabScaffold(navController, "feedback", sessionState, feedbackState, weatherState, settingsDialog, dispatch, dispatchSettings, onSubmitFeedback = { appSnapshot = runtime.submitDefaultFeedback() }, onSyncNotifications = { runRuntimeInBackground { runtime.syncNotificationProfile() } }) }
            composable("history") { MainTabScaffold(navController, "history", sessionState, feedbackState, weatherState, settingsDialog, dispatch, dispatchSettings, onSubmitFeedback = { appSnapshot = runtime.submitDefaultFeedback() }, onSyncNotifications = { runRuntimeInBackground { runtime.syncNotificationProfile() } }) }
            composable("settings") { MainTabScaffold(navController, "settings", sessionState, feedbackState, weatherState, settingsDialog, dispatch, dispatchSettings, onSubmitFeedback = { appSnapshot = runtime.submitDefaultFeedback() }, onSyncNotifications = { runRuntimeInBackground { runtime.syncNotificationProfile() } }) }
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
    dispatch: (NativeSessionAction) -> Unit,
    dispatchSettings: (SettingsAction) -> Unit,
    onSubmitFeedback: () -> Unit,
    onSyncNotifications: () -> Unit,
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
