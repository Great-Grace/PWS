package com.wxxtae.pws.nativepreview.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wxxtae.pws.nativepreview.domain.FeedbackRepositoryState
import com.wxxtae.pws.nativepreview.domain.HistorySummaryFactory
import com.wxxtae.pws.nativepreview.domain.WeatherRepositoryState
import com.wxxtae.pws.nativepreview.domain.WeatherUiStateFactory
import com.wxxtae.pws.nativepreview.domain.FeedbackSlot
import com.wxxtae.pws.nativepreview.domain.NativeSessionState
import com.wxxtae.pws.nativepreview.domain.NativeUserProfile
import com.wxxtae.pws.nativepreview.domain.SettingsDialogAction
import com.wxxtae.pws.nativepreview.domain.SettingsDialogState
import com.wxxtae.pws.nativepreview.domain.NotificationKey
import com.wxxtae.pws.nativepreview.model.PreviewData

@Composable
fun LoginScreenNative(testerId: String, onSignedIn: () -> Unit) {
    PwsScreen(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = PwsSpace.Lg, vertical = PwsSpace.Xxl),
    ) {
        Spacer(Modifier.height(PwsSpace.Xl))
        PwsTitle("PWS")
        PwsBody("날씨와 내 몸의 감각을 함께 기록해\n오늘의 옷차림 판단을 더 정확하게 만들어요.")
        PwsCard {
            PwsCaption("테스터 ID")
            PwsBody(testerId, color = PwsColor.TextPrimary)
            PwsCaption("네이티브 로컬 세션으로 로그인 후 온보딩과 홈 상태를 구동합니다.")
        }
        PwsPrimaryButton("시작하기", onClick = onSignedIn)
    }
}

@Composable
fun OnboardingScreenNative(
    state: NativeSessionState,
    onAcceptAll: () -> Unit,
    onComplete: () -> Unit,
) {
    PwsScreen(modifier = Modifier.fillMaxSize()) {
        PwsTitle("처음 설정")
        PwsBody("동의, 프로필, 지역 입력 규칙을 Kotlin 네이티브 상태로 검증합니다.")
        PwsCard {
            PwsRow("약관", if (state.agreements.terms) "동의" else "미동의")
            PwsRow("개인정보", if (state.agreements.privacy) "동의" else "미동의")
            PwsRow("마케팅", if (state.agreements.marketing) "동의" else "선택")
            PwsPrimaryButton("전체 동의", onClick = onAcceptAll)
        }
        PwsCard {
            PwsRow("닉네임", state.profileDraft.name.ifBlank { state.user?.nickname ?: "native-preview" })
            PwsRow("생년", state.profileDraft.birthDate.ifBlank { state.user?.birthYear?.toString() ?: "입력 예정" })
            PwsRow("기본 지역", state.user?.regionLabel ?: "서울특별시 강남구")
        }
        PwsPrimaryButton("네이티브 홈으로 계속", onClick = onComplete)
    }
}

@Composable
fun HomeScreenNative(
    user: NativeUserProfile?,
    weatherState: WeatherRepositoryState,
    onWeatherDetail: () -> Unit,
    onFeedback: () -> Unit,
) {
    val weather = WeatherUiStateFactory.from(user, weatherState.data)
    PwsScreen(modifier = Modifier.fillMaxSize()) {
        PwsCaption(weather.region)
        BasicText(
            text = weather.feelHeadline,
            style = TextStyle(
                color = PwsColor.TextPrimary,
                fontSize = 34.sp,
                lineHeight = 40.sp,
                fontWeight = FontWeight.SemiBold,
            ),
        )
        PwsCard {
            PwsCaption("${user?.nickname ?: "게스트"}님의 네이티브 홈")
            Row(verticalAlignment = Alignment.CenterVertically) {
                PwsDot()
                Spacer(Modifier.width(PwsSpace.Sm))
                PwsBody("${weather.temperatureCelsius}°C · ${weather.condition}", color = PwsColor.TextPrimary)
            }
            PwsBody(weather.clothingGuide)
            PwsPrimaryButton("오늘 체감 기록하기", onClick = onFeedback)
        }
        PwsCard {
            PwsRow("상세 날씨", weather.dailyRange)
            PwsPrimaryButton("지역 날씨 자세히 보기", onClick = onWeatherDetail)
        }
    }
}

@Composable
fun FeedbackScreenNative(
    user: NativeUserProfile?,
    feedbackState: FeedbackRepositoryState,
    onSaveFeedback: () -> Unit,
) {
    PwsScreen(modifier = Modifier.fillMaxSize()) {
        PwsTitle("체감 기록")
        PwsBody("${user?.nickname ?: "테스터"}님의 아침, 낮, 저녁 체감과 옷차림을 네이티브 입력 흐름으로 옮깁니다.")
        PwsCard {
            PwsCaption("오늘 저장된 기록")
            PwsRow("전체", "${feedbackState.feedbackCount}개")
            PwsRow("아침", "${feedbackState.feedbackCountBySlot[FeedbackSlot.Morning] ?: 0}개")
            PwsRow("낮", "${feedbackState.feedbackCountBySlot[FeedbackSlot.Afternoon] ?: 0}개")
            PwsRow("저녁", "${feedbackState.feedbackCountBySlot[FeedbackSlot.Evening] ?: 0}개")
        }
        PreviewData.feedbackSlots.forEach { slot ->
            PwsCard {
                PwsRow(slot.label, slot.status)
                Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
                    PwsSecondaryPill("추움")
                    PwsSecondaryPill("딱 좋음")
                    PwsSecondaryPill("더움")
                }
            }
        }
        PwsPrimaryButton("기록 저장", onClick = onSaveFeedback)
    }
}

@Composable
fun WeatherDetailScreenNative(
    user: NativeUserProfile?,
    weatherState: WeatherRepositoryState,
    onBack: () -> Unit,
) {
    val weather = WeatherUiStateFactory.from(user, weatherState.data)
    PwsScreen(modifier = Modifier.fillMaxSize()) {
        PwsTitle("지역 날씨")
        PwsBody("WeatherRepository에서 불러온 네이티브 날씨 상태를 상세 화면에 표시합니다.")
        PwsCard {
            PwsRow("선택 지역", weather.region)
            Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
                PwsSecondaryPill("오늘")
                PwsSecondaryPill("내일")
                PwsSecondaryPill("3일")
            }
        }
        PwsCard {
            PwsRow("예상 기온", "${weather.temperatureCelsius}°C")
            PwsRow("일교차", weather.dailyRange)
            PwsRow("컨디션", weather.condition)
            PwsBody(weather.clothingGuide)
        }
        PwsPrimaryButton("홈으로 돌아가기", onClick = onBack)
    }
}

@Composable
fun HistoryScreenNative(user: NativeUserProfile?, feedbackState: FeedbackRepositoryState) {
    val summary = HistorySummaryFactory.from(feedbackState)
    PwsScreen(modifier = Modifier.fillMaxSize()) {
        PwsTitle("히스토리")
        PwsBody("${user?.nickname ?: "테스터"}님의 기록 조회와 추세 카드를 Android 네이티브 저장소 상태로 표시합니다.")
        PwsCard {
            summary.metrics.forEach { metric -> PwsRow(metric.label, metric.value) }
        }
        PwsCard {
            PwsCaption("이번 주 추세")
            PwsBody(summary.trendMessage)
        }
    }
}

@Composable
fun SettingsScreenNative(
    user: NativeUserProfile?,
    dialog: SettingsDialogState?,
    onToggleNotification: (NotificationKey) -> Unit,
    onShowTerms: () -> Unit,
    onShowPrivacyPolicy: () -> Unit,
    onRequestLogout: () -> Unit,
    onRequestDeleteAccount: () -> Unit,
    onDismissDialog: () -> Unit,
    onConfirmLogout: () -> Unit,
) {
    PwsScreen(modifier = Modifier.fillMaxSize()) {
        PwsTitle("설정")
        PwsCard {
            PwsRow("프로필", user?.nickname ?: "native-preview")
            PwsRow("기본 지역", user?.regionLabel ?: "위치 미설정")
            PwsRow("이용약관", "보기")
            PwsPrimaryButton("이용약관 보기", onClick = onShowTerms)
            PwsRow("개인정보 처리방침", "보기")
            PwsPrimaryButton("개인정보 처리방침 보기", onClick = onShowPrivacyPolicy)
        }
        PwsCard {
            PwsCaption("알림")
            PwsRow("알림 받기", if (user?.notifyEnabled != false) "켜짐" else "꺼짐")
            PwsPrimaryButton("알림 받기 전환", onClick = { onToggleNotification(NotificationKey.Enabled) })
            PwsRow("아침 알림", if (user?.notifyOutfit != false) "켜짐" else "꺼짐")
            PwsPrimaryButton("아침 알림 전환", onClick = { onToggleNotification(NotificationKey.Outfit) })
            PwsRow("저녁 알림", if (user?.notifyRain != false) "켜짐" else "꺼짐")
            PwsPrimaryButton("저녁 알림 전환", onClick = { onToggleNotification(NotificationKey.Rain) })
        }
        PwsCard {
            PwsBody("계정 삭제는 실제 백엔드 계정 삭제 RPC 포팅 전까지 destructive action으로 연결하지 않습니다.")
            PwsPrimaryButton("계정 삭제", onClick = onRequestDeleteAccount)
        }
        PwsPrimaryButton("로그아웃", onClick = onRequestLogout)
    }

    if (dialog != null) {
        PwsDialog(
            title = dialog.title,
            message = dialog.message,
            primaryLabel = dialog.primaryLabel,
            secondaryLabel = dialog.secondaryLabel,
            destructive = dialog.destructive,
            onSecondary = onDismissDialog,
            onPrimary = {
                when (dialog.action) {
                    SettingsDialogAction.ConfirmLogout -> onConfirmLogout()
                    SettingsDialogAction.ConfirmDeleteAccount -> onDismissDialog()
                    SettingsDialogAction.DismissOnly -> onDismissDialog()
                }
            },
        )
    }
}

@Composable
fun PwsBottomTabBar(selected: String, onSelect: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(PwsColor.Surface)
            .navigationBarsPadding()
            .padding(horizontal = PwsSpace.Sm, vertical = PwsSpace.Sm),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        listOf(
            "home" to "홈",
            "feedback" to "기록",
            "history" to "히스토리",
            "settings" to "설정",
        ).forEach { (route, label) ->
            val active = selected == route
            Column(
                modifier = Modifier
                    .clip(RoundedCornerShape(PwsRadius.Lg))
                    .clickable { onSelect(route) }
                    .padding(horizontal = PwsSpace.Md, vertical = PwsSpace.Sm),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                androidx.compose.foundation.layout.Box(
                    modifier = Modifier
                        .size(width = 32.dp, height = 4.dp)
                        .clip(RoundedCornerShape(PwsRadius.Pill))
                        .background(if (active) PwsColor.Accent else PwsColor.Surface)
                )
                Spacer(Modifier.height(PwsSpace.Sm))
                BasicText(
                    text = label,
                    style = TextStyle(
                        color = if (active) PwsColor.Accent else PwsColor.TextTertiary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    ),
                )
            }
        }
    }
}
