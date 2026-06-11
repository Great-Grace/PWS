package com.wxxtae.pws.nativepreview.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wxxtae.pws.nativepreview.domain.FeedbackRepositoryState
import com.wxxtae.pws.nativepreview.domain.FeedbackInputNative
import com.wxxtae.pws.nativepreview.domain.FeedbackEntryNative
import com.wxxtae.pws.nativepreview.domain.FeedbackSlot
import com.wxxtae.pws.nativepreview.domain.HistorySummaryFactory
import com.wxxtae.pws.nativepreview.domain.NativeSessionState
import com.wxxtae.pws.nativepreview.domain.NativeUserProfile
import com.wxxtae.pws.nativepreview.domain.NotificationKey
import com.wxxtae.pws.nativepreview.domain.PwsFormula
import com.wxxtae.pws.nativepreview.domain.SettingsDialogAction
import com.wxxtae.pws.nativepreview.domain.SettingsDialogState
import com.wxxtae.pws.nativepreview.domain.WeatherRepositoryState
import com.wxxtae.pws.nativepreview.domain.WeatherUiStateFactory
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

private val StrictScrollableScreenPadding = PaddingValues(
    start = PwsSpace.Lg,
    top = PwsSpace.Lg,
    end = PwsSpace.Lg,
    bottom = PwsSpace.Xxl,
)
private val KoreanWeekdayLabels = listOf("일", "월", "화", "수", "목", "금", "토")

@Composable
fun LoginScreenNative(
    testerId: String,
    errorMessage: String? = null,
    onTesterSignedIn: () -> Unit,
    onPasswordSignedIn: (String, String) -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val canPasswordSignIn = email.isNotBlank() && password.isNotBlank()
    PwsScreen(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = PwsSpace.Lg, vertical = PwsSpace.Xxl),
    ) {
        Spacer(Modifier.height(PwsSpace.Xl))
        PwsTitle("PWS")
        PwsBody("날씨와 내 몸의 감각을 함께 기록해\n오늘의 옷차림 판단을 더 정확하게 만들어요.")
        PwsCard {
            PwsCaption("테스터 ID")
            PwsBody(testerId, color = PwsColor.TextPrimary)
            PwsCaption("테스터 인증이 완료되면 온보딩과 홈 상태를 구동합니다.")
            if (errorMessage != null) {
                Spacer(Modifier.height(PwsSpace.Sm))
                PwsCaption(errorMessage, color = PwsColor.Danger)
            }
        }
        PwsPrimaryButton("테스터로 시작", onClick = onTesterSignedIn)
        PwsCard {
            PwsCaption("이메일")
            PwsTextInput(
                value = email,
                placeholder = "email@example.com",
                onValueChange = { email = it },
            )
            Spacer(Modifier.height(PwsSpace.Sm))
            PwsCaption("비밀번호")
            PwsTextInput(
                value = password,
                placeholder = "비밀번호",
                onValueChange = { password = it },
                visualTransformation = PasswordVisualTransformation(),
            )
            Spacer(Modifier.height(PwsSpace.Md))
            PwsPrimaryButton(
                text = "이메일로 로그인",
                enabled = canPasswordSignIn,
                onClick = { onPasswordSignedIn(email.trim(), password) },
            )
        }
    }
}

@Composable
private fun PwsTextInput(
    value: String,
    placeholder: String,
    onValueChange: (String) -> Unit,
    visualTransformation: VisualTransformation = VisualTransformation.None,
) {
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        visualTransformation = visualTransformation,
        textStyle = TextStyle(
            color = PwsColor.TextPrimary,
            fontSize = 16.sp,
            lineHeight = 22.sp,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(PwsRadius.Md))
            .background(PwsColor.SurfaceSecondary)
            .border(BorderStroke(1.dp, PwsColor.Border), RoundedCornerShape(PwsRadius.Md))
            .padding(horizontal = PwsSpace.Md, vertical = 13.dp),
        decorationBox = { innerTextField ->
            if (value.isBlank()) {
                BasicText(
                    text = placeholder,
                    style = TextStyle(
                        color = PwsColor.TextMuted,
                        fontSize = 16.sp,
                        lineHeight = 22.sp,
                    ),
                )
            }
            innerTextField()
        },
    )
}

@Composable
fun OnboardingScreenNative(
    state: NativeSessionState,
    errorMessage: String? = null,
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
        if (errorMessage != null) {
            PwsCaption(errorMessage, color = PwsColor.Danger)
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
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PwsColor.Background)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(bottom = PwsSpace.Xxl),
    ) {
        WeatherSummaryStrict(user, weatherState)

        PwsCard(
            modifier = Modifier
                .padding(horizontal = PwsSpace.Lg)
                .padding(top = PwsSpace.Lg),
            radius = PwsRadius.Lg,
            border = PwsColor.BorderStrong,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(PwsColor.SurfaceSecondary),
                    contentAlignment = Alignment.Center,
                ) {
                    PwsText("옷", size = 13.sp, lineHeight = 18.sp, weight = FontWeight.SemiBold)
                }
                PwsSectionTitle("오늘 옷차림 가이드")
            }
            OutfitGuideRow("아침 (05-18시)", "", "조금 쌀쌀 할 수 있겠어요", PwsColor.Morning)
            OutfitGuideRow("낮 (12-18시)", "", "조금 더울 수 있겠어요", PwsColor.Afternoon)
            OutfitGuideRow("저녁 (18-24시)", "", "많이 쌀쌀 할 수 있겠어요", PwsColor.Evening)
        }

        FeedbackActionCard(onFeedback)

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = PwsSpace.Lg)
                .padding(top = PwsSpace.Lg),
            verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
        ) {
            PwsSectionTitle("오늘은 이런 준비가 좋아요", large = true)
            RecommendationStrict("선크림을 바르는 것이 좋아요", "자외선 지수 8 · 매우 높음", "☼", Color(0xFFFFFBEA), Color(0xFFFFF3C4), Color(0xFFE87500))
            RecommendationStrict("미세먼지 높음 · 마스크 권장", "PM2.5 76㎍/㎥", "≋", Color(0xFFF8FAFC), Color(0xFFF1F5F9), Color(0xFF475569))
            RecommendationStrict("양산 챙기면 좋아요", "자외선 차단에 효과적", "우", Color(0xFFF5F3FF), Color(0xFFEDE9FE), Color(0xFF7C3AED))
            RecommendationStrict("오후 2~4시 환기 추천", "미세먼지 농도가 낮아집니다", "풍", Color(0xFFECFDF5), Color(0xFFD1FAE5), Color(0xFF059669))
        }

        PwsGradientButton(
            text = "다른 지역 날씨",
            modifier = Modifier
                .padding(horizontal = PwsSpace.Lg)
                .padding(top = PwsSpace.Lg),
            onClick = onWeatherDetail,
        )
    }
}

@Composable
fun FeedbackScreenNative(
    user: NativeUserProfile?,
    feedbackState: FeedbackRepositoryState,
    onSaveFeedback: (FeedbackInputNative) -> Unit,
) {
    var selectedSlot by remember { mutableStateOf("낮") }
    var selectedTemperatureFeel by remember { mutableStateOf("적당함") }
    var selectedHumidityFeel by remember { mutableStateOf("쾌적함") }
    var selectedWindFeel by remember { mutableStateOf("약한 바람") }
    var selectedTop by remember { mutableStateOf("반팔티, 반팔 블라우스&셔츠") }
    var selectedOuter by remember { mutableStateOf("가디건") }
    var selectedBottom by remember { mutableStateOf("청바지") }
    var expandedOutfit by remember { mutableStateOf<String?>(null) }

    PwsScreen(modifier = Modifier.fillMaxSize(), contentPadding = StrictScrollableScreenPadding) {
        HeaderBlock("오늘 체감 기록", "날씨가 어떻게 느껴지셨나요?")
        PwsSectionTitle("시간대", large = false)
        Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
            TimeSlotCard("아침", "06-10시", "☼", selected = selectedSlot == "아침", modifier = Modifier.weight(1f)) { selectedSlot = "아침" }
            TimeSlotCard("낮", "10-18시", "☼", selected = selectedSlot == "낮", modifier = Modifier.weight(1f)) { selectedSlot = "낮" }
            TimeSlotCard("저녁", "18-22시", "☾", selected = selectedSlot == "저녁", modifier = Modifier.weight(1f)) { selectedSlot = "저녁" }
        }

        Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
            PwsSectionTitle("오늘 옷차림", large = false)
            OutfitAccordionCard(
                label = "상의",
                value = selectedTop,
                options = listOf("반팔티, 반팔 블라우스&셔츠", "긴팔티", "셔츠", "니트"),
                expanded = expandedOutfit == "상의",
                onToggle = { expandedOutfit = if (expandedOutfit == "상의") null else "상의" },
                onSelect = {
                    selectedTop = it
                    expandedOutfit = null
                },
            )
            OutfitAccordionCard(
                label = "아우터",
                value = selectedOuter,
                options = listOf("없음", "가디건", "자켓", "코트"),
                expanded = expandedOutfit == "아우터",
                onToggle = { expandedOutfit = if (expandedOutfit == "아우터") null else "아우터" },
                onSelect = {
                    selectedOuter = it
                    expandedOutfit = null
                },
            )
            OutfitAccordionCard(
                label = "하의",
                value = selectedBottom,
                options = listOf("반바지", "청바지", "슬랙스", "긴바지"),
                expanded = expandedOutfit == "하의",
                onToggle = { expandedOutfit = if (expandedOutfit == "하의") null else "하의" },
                onSelect = {
                    selectedBottom = it
                    expandedOutfit = null
                },
            )
        }

        FeedbackChipGroup("기온 체감", listOf("매우 추움", "추움", "선선함", "적당함", "따뜻함", "더움", "매우 더움"), selected = selectedTemperatureFeel, onSelect = { selectedTemperatureFeel = it })
        FeedbackChipGroup("습도 체감", listOf("건조함", "쾌적함", "습함", "매우 습함"), selected = selectedHumidityFeel, onSelect = { selectedHumidityFeel = it })
        FeedbackChipGroup("바람 체감", listOf("바람 없음", "약한 바람", "보통 바람", "강한 바람"), selected = selectedWindFeel, onSelect = { selectedWindFeel = it })

        FeedbackSaveCard {
            onSaveFeedback(
                FeedbackInputNative(
                    feelScore = temperatureFeelScore(selectedTemperatureFeel),
                    humidFeel = humidityFeelScore(selectedHumidityFeel),
                    windFeel = windFeelScore(selectedWindFeel),
                    clothing = clothingScore(selectedOuter),
                    clothingItems = outfitItems(selectedTop, selectedOuter, selectedBottom),
                    activity = 2,
                    slot = feedbackSlot(selectedSlot),
                ),
            )
        }
    }
}

@Composable
fun WeatherDetailScreenNative(
    user: NativeUserProfile?,
    weatherState: WeatherRepositoryState,
    onBack: () -> Unit,
) {
    PwsScreen(modifier = Modifier.fillMaxSize(), contentPadding = StrictScrollableScreenPadding) {
        WeatherDetailHeader(onBack)
        InlineProgressSteps()
        Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
            PwsSectionTitle("어디 날씨를 확인할까요?", large = false)
            SearchField("지역명 검색 (예: 강남, 판교, 잠실)")
        }
        PwsSectionTitle("자주 찾는 지역", large = false)
        Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
            RegionTile("강남역", "강남구", modifier = Modifier.weight(1f))
            RegionTile("잠실", "송파구", modifier = Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
            RegionTile("판교", "성남시", modifier = Modifier.weight(1f))
            RegionTile("동탄", "화성시", modifier = Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
            RegionTile("송도", "연수구", modifier = Modifier.weight(1f))
            RegionTile("해운대", "해운대구", modifier = Modifier.weight(1f))
        }
        PwsSectionTitle("시/도 선택", large = false)
        listOf("서울특별시", "경기도", "인천광역시", "부산광역시").forEach { label ->
            RegionListRow(label, null)
        }
        weatherState.warning?.let { PwsCaption(it, color = PwsColor.TextMuted) }
        PwsPrimaryButton("다음", enabled = false, onClick = onBack)
    }
}

@Composable
fun HistoryScreenNative(user: NativeUserProfile?, feedbackState: FeedbackRepositoryState) {
    val summary = HistorySummaryFactory.from(feedbackState)
    val recentEntries = feedbackState.recentEntries
    val activeDates = recentEntries.mapNotNull { it.feedbackLocalDateOrNull() }.toSet()
    PwsScreen(modifier = Modifier.fillMaxSize(), contentPadding = StrictScrollableScreenPadding) {
        HeaderBlock("히스토리", "나의 체감 기록과 분석")
        HistorySummaryStrict(summary.metrics.firstOrNull()?.value ?: "0개", feedbackState.todayFeedback.size, summary.trendMessage)
        TrendChartStrict(recentEntries)
        CalendarStrict(LocalDate.now(), activeDates)
        RecentRecordsStrict(recentEntries)
        OutfitAnalysisStrict(summary.trendMessage, recentEntries)
    }
}

@Composable
private fun HistorySummaryStrict(totalCount: String, todayCount: Int, message: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(PwsRadius.Lg))
            .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFFFF6A2A), Color(0xFFFF0F5F))))
            .padding(PwsSpace.Lg),
        verticalArrangement = Arrangement.spacedBy(PwsSpace.Md),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(PwsRadius.Pill))
                    .background(Color.White.copy(alpha = 0.18f)),
                contentAlignment = Alignment.Center,
            ) {
                PwsText("♨", size = 18.sp, lineHeight = 22.sp, weight = FontWeight.SemiBold, color = Color.White, align = TextAlign.Center)
            }
            Column(horizontalAlignment = Alignment.End) {
                PwsCaption("누적 기록", color = Color.White.copy(alpha = 0.78f))
                PwsText(totalCount, size = 22.sp, lineHeight = 28.sp, weight = FontWeight.Bold, color = Color.White)
            }
        }
        Column {
            PwsCaption("오늘 기록", color = Color.White.copy(alpha = 0.78f))
            PwsText("${todayCount}개", size = 26.sp, lineHeight = 32.sp, weight = FontWeight.Bold, color = Color.White)
        }
        PwsCaption(message, color = Color.White.copy(alpha = 0.86f))
    }
}

@Composable
private fun TrendChartStrict(entries: List<FeedbackEntryNative>) {
    val chartEntries = entries
        .sortedWith(compareBy<FeedbackEntryNative> { it.feedbackDate }.thenBy { it.feedbackSlot.ordinal })
        .takeLast(7)
    val labels = chartEntries.map { it.feedbackDateLabel() }
    val values = chartEntries.map { it.feelScore.coerceIn(1, 7).toFloat() }
    val average = values.takeIf { it.isNotEmpty() }?.average()
    Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
        PwsSectionTitle("주간 쾌적도 추이", large = false)
        PwsCard(radius = PwsRadius.Md) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(126.dp)
                    .clip(RoundedCornerShape(PwsRadius.Sm))
                    .background(PwsColor.SurfaceTertiary),
                contentAlignment = Alignment.Center,
            ) {
                if (values.isEmpty()) {
                    PwsCaption("기록이 쌓이면 그래프가 나타납니다", color = PwsColor.TextMuted)
                } else {
                    WeeklyComfortPlot(labels, values)
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(PwsRadius.Sm))
                    .background(PwsColor.SurfaceSecondary)
                    .padding(PwsSpace.Md),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    PwsCaption("체감 평균")
                    PwsText(
                        average?.let { "${String.format(Locale.KOREAN, "%.1f", it)}/7" } ?: "-",
                        size = 20.sp,
                        lineHeight = 26.sp,
                        weight = FontWeight.Bold,
                        align = TextAlign.Center,
                    )
                }
            }
        }
    }
}

@Composable
private fun WeeklyComfortPlot(labels: List<String>, values: List<Float>) {
    Box(Modifier.fillMaxSize()) {
        Canvas(Modifier.fillMaxSize()) {
            val left = 36.dp.toPx()
            val right = size.width - 14.dp.toPx()
            val top = 16.dp.toPx()
            val bottom = size.height - 32.dp.toPx()
            val width = right - left
            val grid = Color(0xFFE3E0DD)
            val line = Color(0xFF5F5A55)

            listOf(0f, 0.5f, 1f).forEach { ratio ->
                val y = bottom - (bottom - top) * ratio
                drawLine(grid, Offset(left, y), Offset(right, y), strokeWidth = 1.dp.toPx())
            }
            val points = values.mapIndexed { index, value ->
                val x = if (values.lastIndex == 0) left + width / 2f else left + width * (index / (values.lastIndex).toFloat())
                val y = bottom - ((value / 7f) * (bottom - top))
                Offset(x, y)
            }
            points.zipWithNext().forEach { (start, end) ->
                drawLine(line, start, end, strokeWidth = 2.dp.toPx())
            }
            points.forEach { point ->
                drawCircle(Color.White, radius = 4.dp.toPx(), center = point)
                drawCircle(line, radius = 2.6.dp.toPx(), center = point)
            }
        }
        Column(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(start = 12.dp, top = 11.dp),
            verticalArrangement = Arrangement.spacedBy(25.dp),
        ) {
            PwsCaption("7", color = PwsColor.TextTertiary)
            PwsCaption("4", color = PwsColor.TextTertiary)
            PwsCaption("1", color = PwsColor.TextTertiary)
        }
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(start = 36.dp, end = 12.dp, bottom = 7.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            labels.forEach { label ->
                PwsCaption(label, color = PwsColor.TextTertiary)
            }
        }
    }
}

@Composable
private fun CalendarStrict(currentDate: LocalDate, activeDates: Set<LocalDate>) {
    val month = YearMonth.from(currentDate)
    val monthDays = (1..month.lengthOfMonth()).map { month.atDay(it) }
    val activeCount = monthDays.count { it in activeDates }
    Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
        PwsSectionTitle("캘린더", large = false)
        PwsCard(radius = PwsRadius.Md) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                PwsCaption("‹")
                PwsText("${month.year}년 ${month.monthValue}월", size = 14.sp, lineHeight = 20.sp, weight = FontWeight.SemiBold)
                PwsCaption("›")
            }
            CalendarBlockBody(monthDays, activeDates)
            Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(RoundedCornerShape(PwsRadius.Pill))
                        .background(PwsColor.Accent),
                )
                PwsCaption(if (activeCount == 0) "이번 달 기록 없음" else "이번 달 ${activeCount}일 기록됨")
            }
        }
    }
}

@Composable
private fun CalendarBlockBody(monthDays: List<LocalDate>, activeDates: Set<LocalDate>) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
    ) {
        KoreanWeekdayLabels.forEach { label ->
            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                PwsCaption(label, color = PwsColor.TextMuted)
            }
        }
    }
    val leadingEmptyDays = monthDays.firstOrNull()?.dayOfWeek?.value?.rem(7) ?: 0
    val calendarCells = List<LocalDate?>(leadingEmptyDays) { null } + monthDays
    calendarCells.chunked(7).forEach { week ->
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
        ) {
            week.forEach { date ->
                if (date == null) {
                    Spacer(
                        Modifier
                            .weight(1f)
                            .height(30.dp),
                    )
                } else {
                    val active = date in activeDates
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(30.dp)
                            .clip(RoundedCornerShape(PwsRadius.Pill))
                            .background(if (active) PwsColor.Accent else PwsColor.SurfaceTertiary),
                        contentAlignment = Alignment.Center,
                    ) {
                        PwsCaption(date.dayOfMonth.toString(), color = if (active) Color.White else PwsColor.TextTertiary)
                    }
                }
            }
            repeat(7 - week.size) {
                Spacer(
                    Modifier
                        .weight(1f)
                        .height(30.dp),
                )
            }
        }
    }
}

@Composable
private fun RecentRecordsStrict(entries: List<FeedbackEntryNative>) {
    Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
        PwsSectionTitle("최근 기록", large = false)
        if (entries.isEmpty()) {
            PwsCard(contentPadding = PaddingValues(PwsSpace.Md), radius = PwsRadius.Md) {
                PwsText("아직 기록이 없어요", size = 13.sp, lineHeight = 18.sp, weight = FontWeight.SemiBold)
                PwsCaption("체감 기록을 남기면 최근 기록이 여기에 표시됩니다", color = PwsColor.TextSecondary)
            }
        } else {
            entries.take(3).forEach { entry ->
                RecordCard(entry.feedbackDateLabel(long = true), entry.feedbackSlot.label, "체감 ${entry.feelScore}/7", entry.outfitLabel())
            }
        }
    }
}

@Composable
private fun RecordCard(date: String, slot: String, badge: String, outfit: String) {
    PwsCard(contentPadding = PaddingValues(PwsSpace.Md), radius = PwsRadius.Md) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm), verticalAlignment = Alignment.CenterVertically) {
                PwsText(date, size = 13.sp, lineHeight = 18.sp, weight = FontWeight.SemiBold)
                PwsChip(slot, background = PwsColor.SurfaceSecondary)
            }
            PwsChip(badge, selected = true, background = PwsColor.Accent)
        }
        PwsCaption(outfit, color = PwsColor.TextSecondary)
    }
}

@Composable
private fun OutfitAnalysisStrict(message: String, entries: List<FeedbackEntryNative>) {
    val bestEntry = entries.maxByOrNull { it.feelScore }
    val bestOutfit = bestEntry?.outfitLabel(maxLength = 20) ?: "기록 대기 중"
    val bestScore = bestEntry?.let { "${it.feelScore}/7" } ?: "-"
    Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
        PwsSectionTitle("옷차림 분석", large = false)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(PwsRadius.Lg))
                .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF10BFAE), Color(0xFF0996A5))))
                .padding(PwsSpace.Lg),
            verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
        ) {
            PwsCaption("가장 쾌적했던 조합", color = Color.White.copy(alpha = 0.86f))
            PwsText(bestOutfit, size = 18.sp, lineHeight = 24.sp, weight = FontWeight.Bold, color = Color.White)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(PwsSpace.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    PwsText(bestScore, size = 22.sp, lineHeight = 28.sp, weight = FontWeight.Bold, color = Color.White)
                    PwsCaption("쾌적도", color = Color.White.copy(alpha = 0.86f))
                }
                Column {
                    PwsCaption(bestEntry?.feedbackDateLabel(long = true) ?: "최근 기록을 기다리는 중", color = Color.White.copy(alpha = 0.86f))
                    PwsCaption("최고 체감 기록", color = Color.White.copy(alpha = 0.86f))
                }
            }
            PwsCaption(message, color = Color.White.copy(alpha = 0.78f))
        }
    }
}

private fun FeedbackEntryNative.feedbackLocalDateOrNull(): LocalDate? =
    runCatching { LocalDate.parse(feedbackDate) }.getOrNull()

private fun FeedbackEntryNative.feedbackDateLabel(long: Boolean = false): String {
    val date = feedbackLocalDateOrNull()
    if (date == null) return feedbackDate.ifBlank { "-" }
    val pattern = if (long) "M월 d일" else "M/d"
    return date.format(DateTimeFormatter.ofPattern(pattern, Locale.KOREAN))
}

private fun FeedbackEntryNative.outfitLabel(maxLength: Int = 48): String {
    val labels = clothingItems
        ?.map { itemId -> PwsFormula.clothingItems.firstOrNull { it.id == itemId }?.label ?: itemId }
        ?.filter { it.isNotBlank() }
        .orEmpty()
    val label = if (labels.isNotEmpty()) {
        labels.take(3).joinToString(", ")
    } else {
        when (clothing) {
        1 -> "가벼운 옷차림"
        3 -> "따뜻한 옷차림"
        else -> "보통 옷차림"
        }
    }
    return if (label.length <= maxLength) label else "${label.take(maxLength)}..."
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
    onConfirmDeleteAccount: () -> Unit,
) {
    PwsScreen(modifier = Modifier.fillMaxSize(), contentPadding = StrictScrollableScreenPadding) {
        PwsTitle("설정")
        SettingsProfileCard()

        PwsSectionTitle("위치", large = false)
        PwsCard {
            PwsSettingRow("현재 위치", "서울특별시")
        }

        PwsSectionTitle("알림", large = false)
        PwsCard(radius = PwsRadius.Lg) {
            ToggleRow("알림 받기", user?.notifyEnabled != false) { onToggleNotification(NotificationKey.Enabled) }
            ToggleRow("아침 알림", user?.notifyOutfit != false) { onToggleNotification(NotificationKey.Outfit) }
            ToggleRow("저녁 알림", user?.notifyRain == true) { onToggleNotification(NotificationKey.Rain) }
        }

        PwsSectionTitle("추천 설정", large = false)
        Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
            PwsCard(contentPadding = PaddingValues(PwsSpace.Md), radius = PwsRadius.Md) {
                PwsSettingRow("체감 민감도", "보통")
            }
            PwsCard(contentPadding = PaddingValues(PwsSpace.Md), radius = PwsRadius.Md) {
                PwsSettingRow("체질 프로필", "표준")
            }
        }

        PwsSectionTitle("체질 보정", large = false)
        PwsCard(radius = PwsRadius.Lg) {
            SliderRow("추위 민감도", 0.55f)
            SliderRow("더위 민감도", 0.60f)
            SliderRow("습도 민감도", 0.42f)
            PwsCaption("슬라이더를 조정하며 당신의 체질에 맞게 추천을 개인화하세요")
        }

        PwsSectionTitle("앱 정보", large = false)
        Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
            PwsCard(contentPadding = PaddingValues(PwsSpace.Md), radius = PwsRadius.Md) {
                PwsSettingRow("버전", "1.0.0")
            }
            PwsCard(contentPadding = PaddingValues(PwsSpace.Md), radius = PwsRadius.Md) {
                ClickableInfoRow("이용약관", "", onShowTerms)
            }
            PwsCard(contentPadding = PaddingValues(PwsSpace.Md), radius = PwsRadius.Md) {
                ClickableInfoRow("개인정보 처리방침", "", onShowPrivacyPolicy)
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 60.dp)
                .clip(RoundedCornerShape(PwsRadius.Md))
                .background(Color(0xFFFEF2F2))
                .border(BorderStroke(1.dp, Color(0xFFFFC9C9)), RoundedCornerShape(PwsRadius.Md))
                .clickable(onClick = onRequestLogout)
                .padding(horizontal = PwsSpace.Lg, vertical = 15.dp),
            contentAlignment = Alignment.Center,
        ) {
            PwsText("로그아웃", size = 16.sp, lineHeight = 22.sp, weight = FontWeight.SemiBold, color = Color(0xFFE7000B), align = TextAlign.Center)
        }
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
                    SettingsDialogAction.ConfirmDeleteAccount -> onConfirmDeleteAccount()
                    SettingsDialogAction.DismissOnly -> onDismissDialog()
                }
            },
        )
    }
}

@Composable
fun PwsBottomTabBar(selected: String, onSelect: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(PwsColor.Surface)
            .navigationBarsPadding(),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(PwsColor.BorderStrong),
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(72.dp)
                .padding(horizontal = PwsSpace.Md, vertical = 4.dp),
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
                val interactionSource = remember(route) { MutableInteractionSource() }
                val pressed by interactionSource.collectIsPressedAsState()
                Column(
                    modifier = Modifier
                        .sizeIn(minWidth = PwsSpace.TouchTarget, minHeight = 56.dp)
                        .scale(if (pressed) 0.96f else 1f)
                        .clip(RoundedCornerShape(PwsRadius.Md))
                        .semantics {
                            role = Role.Tab
                            this.selected = active
                            contentDescription = label
                        }
                        .clickable(
                            interactionSource = interactionSource,
                            indication = LocalIndication.current,
                        ) { onSelect(route) }
                        .padding(horizontal = PwsSpace.Md, vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box(
                        modifier = Modifier
                            .size(width = 30.dp, height = 4.dp)
                            .clip(RoundedCornerShape(PwsRadius.Pill))
                            .background(if (active) PwsBlueGradient else androidx.compose.ui.graphics.Brush.horizontalGradient(listOf(Color.Transparent, Color.Transparent))),
                    )
                    Spacer(Modifier.height(6.dp))
                    PwsText(
                        text = label,
                        size = 12.sp,
                        lineHeight = 16.sp,
                        weight = FontWeight.SemiBold,
                        color = if (active) PwsColor.Accent else PwsColor.TextMuted,
                        align = TextAlign.Center,
                    )
                }
            }
        }
    }
}

@Composable
private fun HeaderBlock(title: String, subtitle: String) {
    Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Xs)) {
        PwsTitle(title)
        PwsBody(subtitle)
    }
}

@Composable
private fun WeatherSummaryStrict(user: NativeUserProfile?, weatherState: WeatherRepositoryState) {
    val summary = WeatherUiStateFactory.from(user, weatherState.data)
    val current = weatherState.data?.current
    val todayLabel = remember {
        LocalDate.now().format(DateTimeFormatter.ofPattern("M월 d일", Locale.KOREAN))
    }
    val tempLabel = current?.temp?.roundToInt()?.let { "$it°" } ?: "--°"
    val conditionLabel = current?.weatherDescription?.takeIf { it.isNotBlank() } ?: summary.condition
    val feelsLikeLabel = current?.feelsLike?.roundToInt()?.let { "체감 $it°" } ?: "체감 --°"
    val humidityLabel = current?.humidity?.let { "습도 $it%" } ?: "습도 --%"
    val windLabel = current?.windSpeed?.let { speed ->
        "바람 ${String.format(Locale.US, "%.1f", speed)}m/s"
    } ?: "바람 --m/s"

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(PwsColor.Surface)
            .border(BorderStroke(1.dp, PwsColor.Border), RoundedCornerShape(0.dp))
            .padding(horizontal = PwsSpace.Lg, vertical = PwsSpace.Lg),
        verticalArrangement = Arrangement.spacedBy(PwsSpace.Md),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Xs)) {
                PwsCaption("${summary.region} · $todayLabel")
                PwsText("날씨 어시스턴트", size = 18.sp, lineHeight = 28.sp, weight = FontWeight.SemiBold)
            }
            PwsText("☼", size = 38.sp, lineHeight = 44.sp, weight = FontWeight.Normal, color = Color(0xFFFF8A00), align = TextAlign.Center)
        }

        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
            PwsText(tempLabel, size = 56.sp, lineHeight = 60.sp, weight = FontWeight.Bold)
            PwsText(conditionLabel, size = 24.sp, lineHeight = 32.sp, color = PwsColor.TextMuted)
        }

        Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Md)) {
            PwsCaption(feelsLikeLabel, color = PwsColor.TextSecondary)
            PwsCaption(humidityLabel, color = PwsColor.TextSecondary)
            PwsCaption(windLabel, color = PwsColor.TextSecondary)
        }
        if (weatherState.isLoading) {
            PwsCaption("실시간 날씨를 불러오는 중입니다", color = PwsColor.TextTertiary)
        }
        weatherState.error?.let { PwsCaption(it, color = PwsColor.Danger) }
        weatherState.warning?.let { PwsCaption(it, color = PwsColor.TextTertiary) }
    }
}

@Composable
private fun FeedbackActionCard(onFeedback: () -> Unit) {
    Row(
        modifier = Modifier
            .padding(horizontal = PwsSpace.Lg)
            .padding(top = PwsSpace.Lg)
            .fillMaxWidth()
            .heightIn(min = 76.dp)
            .clip(RoundedCornerShape(PwsRadius.Lg))
            .background(PwsColor.Surface)
            .border(BorderStroke(1.dp, PwsColor.BorderStrong), RoundedCornerShape(PwsRadius.Lg))
            .clickable(onClick = onFeedback)
            .padding(horizontal = PwsSpace.Md, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(PwsSpace.Xs)) {
            PwsText("오늘 체감 기록하기", size = 16.sp, lineHeight = 24.sp, weight = FontWeight.SemiBold)
            PwsCaption("날씨가 어떻게 느껴지셨나요?", color = PwsColor.TextSecondary)
        }
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(PwsRadius.Sm))
                .background(PwsColor.SurfaceSecondary),
            contentAlignment = Alignment.Center,
        ) {
            PwsText("→", size = 18.sp, lineHeight = 22.sp, weight = FontWeight.SemiBold, align = TextAlign.Center)
        }
    }
}

@Composable
private fun FeedbackSaveCard(onSaveFeedback: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 76.dp)
            .scale(if (pressed) 0.985f else 1f)
            .shadow(12.dp, RoundedCornerShape(PwsRadius.Lg), clip = false)
            .clip(RoundedCornerShape(PwsRadius.Lg))
            .background(PwsColor.Surface)
            .border(BorderStroke(1.dp, PwsColor.BorderStrong), RoundedCornerShape(PwsRadius.Lg))
            .semantics {
                role = Role.Button
                contentDescription = "기록 저장하기"
            }
            .clickable(
                interactionSource = interactionSource,
                indication = LocalIndication.current,
                onClick = onSaveFeedback,
            )
            .padding(horizontal = PwsSpace.Lg, vertical = PwsSpace.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PwsSpace.Md),
    ) {
        BasicText(
            text = "기록 저장하기",
            modifier = Modifier.weight(1f),
            maxLines = 1,
            softWrap = false,
            style = TextStyle(
                color = PwsColor.TextPrimary,
                fontSize = 16.sp,
                lineHeight = 22.sp,
                fontWeight = FontWeight.SemiBold,
            ),
        )
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(PwsRadius.Sm))
                .background(PwsColor.SurfaceSecondary),
            contentAlignment = Alignment.Center,
        ) {
            PwsText("→", size = 18.sp, lineHeight = 22.sp, weight = FontWeight.SemiBold, align = TextAlign.Center)
        }
    }
}

@Composable
private fun WeatherMetric(text: String) {
    PwsChip(text, background = Color.White.copy(alpha = 0.16f), textColor = Color.White)
}

@Composable
private fun OutfitGuideRow(time: String, hours: String, message: String, color: Color) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(PwsRadius.Md))
            .background(color)
            .padding(horizontal = PwsSpace.Md, vertical = PwsSpace.Md),
        verticalArrangement = Arrangement.spacedBy(PwsSpace.Xs),
    ) {
        PwsText(time, size = 12.sp, lineHeight = 16.sp, weight = FontWeight.SemiBold, color = Color(0xFF0068A8))
        if (hours.isNotBlank()) {
            PwsCaption(hours, color = PwsColor.TextTertiary)
        }
        PwsCaption(message, color = PwsColor.TextPrimary)
    }
}

@Composable
private fun RecommendationCard(title: String, subtitle: String, modifier: Modifier = Modifier) {
    PwsCard(
        modifier = modifier,
        contentPadding = PaddingValues(PwsSpace.Md),
        radius = PwsRadius.Md,
    ) {
        PwsBody(title, color = PwsColor.TextPrimary)
        PwsCaption(subtitle)
    }
}

@Composable
private fun RecommendationStrict(
    title: String,
    detail: String,
    iconText: String,
    background: Color,
    iconBackground: Color,
    accent: Color,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 82.dp)
            .clip(RoundedCornerShape(PwsRadius.Md))
            .background(background)
            .border(BorderStroke(1.dp, background), RoundedCornerShape(PwsRadius.Md))
            .padding(PwsSpace.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PwsSpace.Md),
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(PwsRadius.Sm))
                .background(iconBackground),
            contentAlignment = Alignment.Center,
        ) {
            PwsText(iconText, size = 15.sp, lineHeight = 20.sp, weight = FontWeight.SemiBold, color = accent, align = TextAlign.Center)
        }
        Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Xs)) {
            PwsText(title, size = 16.sp, lineHeight = 22.sp, weight = FontWeight.Medium)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(RoundedCornerShape(PwsRadius.Pill))
                        .background(accent),
                )
                PwsCaption(detail, color = PwsColor.TextSecondary)
            }
        }
    }
}

@Composable
private fun TimeSlotCard(label: String, hours: String, status: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    Column(
        modifier = modifier
            .heightIn(min = 108.dp)
            .scale(if (pressed) 0.975f else 1f)
            .clip(RoundedCornerShape(PwsRadius.Md))
            .background(if (selected) PwsBlueGradient else androidx.compose.ui.graphics.Brush.horizontalGradient(listOf(PwsColor.Surface, PwsColor.Surface)))
            .border(BorderStroke(1.dp, if (selected) Color.Transparent else PwsColor.BorderStrong), RoundedCornerShape(PwsRadius.Md))
            .semantics {
                role = Role.Button
                this.selected = selected
                contentDescription = label
            }
            .clickable(
                interactionSource = interactionSource,
                indication = LocalIndication.current,
                onClick = onClick,
            )
            .padding(PwsSpace.Md),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(PwsSpace.Xs),
    ) {
        PwsText(status, size = 18.sp, lineHeight = 22.sp, weight = FontWeight.SemiBold, color = if (selected) Color.White else PwsColor.TextPrimary, align = TextAlign.Center)
        PwsText(label, size = 16.sp, lineHeight = 22.sp, weight = FontWeight.SemiBold, color = if (selected) Color.White else PwsColor.TextPrimary)
        PwsCaption(hours, color = if (selected) Color.White.copy(alpha = 0.78f) else PwsColor.TextTertiary)
    }
}

@Composable
private fun OutfitAccordionCard(
    label: String,
    value: String,
    options: List<String>,
    expanded: Boolean,
    onToggle: () -> Unit,
    onSelect: (String) -> Unit,
) {
    val headerInteractionSource = remember(label) { MutableInteractionSource() }
    val headerPressed by headerInteractionSource.collectIsPressedAsState()
    PwsCard(contentPadding = PaddingValues(horizontal = PwsSpace.Md, vertical = 14.dp), radius = PwsRadius.Md) {
        PwsSettingRow(
            label = label,
            value = value,
            modifier = Modifier
                .scale(if (headerPressed) 0.985f else 1f)
                .clip(RoundedCornerShape(PwsRadius.Sm))
                .semantics {
                    role = Role.Button
                    contentDescription = "$label $value"
                }
                .clickable(
                    interactionSource = headerInteractionSource,
                    indication = LocalIndication.current,
                    onClick = onToggle,
                ),
        ) {
            PwsCaption(if (expanded) "⌃" else "⌄", color = PwsColor.TextTertiary)
        }
        if (expanded) {
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
                verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
            ) {
                options.forEach { option ->
                    val selected = option == value
                    val interactionSource = remember(label, option) { MutableInteractionSource() }
                    val pressed by interactionSource.collectIsPressedAsState()
                    PwsChip(
                        text = option,
                        selected = selected,
                        modifier = Modifier
                            .scale(if (pressed) 0.96f else 1f)
                            .semantics {
                                role = Role.Button
                                this.selected = selected
                                contentDescription = option
                            }
                            .clickable(
                                interactionSource = interactionSource,
                                indication = LocalIndication.current,
                            ) { onSelect(option) },
                    )
                }
            }
        }
    }
}

private fun feedbackSlot(label: String): FeedbackSlot = when (label) {
    "아침" -> FeedbackSlot.Morning
    "저녁" -> FeedbackSlot.Evening
    else -> FeedbackSlot.Afternoon
}

private fun temperatureFeelScore(label: String): Int = when (label) {
    "매우 추움" -> 1
    "추움" -> 2
    "선선함" -> 3
    "따뜻함" -> 5
    "더움" -> 6
    "매우 더움" -> 7
    else -> 4
}

private fun humidityFeelScore(label: String): Int = when (label) {
    "건조함" -> 1
    "습함" -> 4
    "매우 습함" -> 5
    else -> 3
}

private fun windFeelScore(label: String): Int = when (label) {
    "바람 없음" -> 0
    "보통 바람" -> 2
    "강한 바람" -> 3
    else -> 1
}

private fun clothingScore(outer: String): Int = when (outer) {
    "없음" -> 1
    "코트" -> 3
    else -> 2
}

private fun outfitItems(top: String, outer: String, bottom: String): List<String> =
    listOf(top, outer, bottom).filter { it != "없음" }

@Composable
private fun AccordionRow(label: String, value: String) {
    PwsSettingRow(label, value) {
        PwsCaption("⌄", color = PwsColor.TextTertiary)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FeedbackChipGroup(title: String, chips: List<String>, selected: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
        PwsSectionTitle(title, large = false)
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
            verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
        ) {
            chips.forEach { chip ->
                val interactionSource = remember(chip) { MutableInteractionSource() }
                val pressed by interactionSource.collectIsPressedAsState()
                PwsChip(
                    chip,
                    modifier = Modifier
                        .scale(if (pressed) 0.96f else 1f)
                        .semantics {
                            role = Role.Button
                            this.selected = chip == selected
                            contentDescription = chip
                        }
                        .clickable(
                            interactionSource = interactionSource,
                            indication = LocalIndication.current,
                        ) { onSelect(chip) },
                    selected = chip == selected,
                )
            }
        }
    }
}

@Composable
private fun ProgressSteps() {
    PwsCard(contentPadding = PaddingValues(PwsSpace.Md)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StepDot("1", "지역", true)
            StepLine(true, Modifier.weight(1f))
            StepDot("2", "기간", false)
            StepLine(false, Modifier.weight(1f))
            StepDot("3", "확인", false)
        }
    }
}

@Composable
private fun WeatherDetailHeader(onBack: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(PwsRadius.Pill))
                .clickable(onClick = onBack),
            contentAlignment = Alignment.Center,
        ) {
            PwsText("‹", size = 30.sp, lineHeight = 34.sp, weight = FontWeight.Normal)
        }
        PwsTitle("지역 선택")
    }
}

@Composable
private fun InlineProgressSteps() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm),
    ) {
        StepDot("1", "지역", true)
        PwsCaption("·", color = PwsColor.TextMuted)
        StepDot("2", "기간", false)
        PwsCaption("·", color = PwsColor.TextMuted)
        StepDot("3", "확인", false)
    }
}

@Composable
private fun StepDot(number: String, label: String, active: Boolean) {
    Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Xs), verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(RoundedCornerShape(PwsRadius.Pill))
                .background(if (active) PwsColor.Accent else PwsColor.SurfaceSecondary),
            contentAlignment = Alignment.Center,
        ) {
            PwsText(number, size = 13.sp, lineHeight = 18.sp, weight = FontWeight.SemiBold, color = if (active) Color.White else PwsColor.TextMuted, align = TextAlign.Center)
        }
        PwsCaption(label, color = if (active) PwsColor.Accent else PwsColor.TextMuted)
    }
}

@Composable
private fun StepLine(active: Boolean, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .padding(horizontal = PwsSpace.Sm)
            .height(2.dp)
            .background(if (active) PwsColor.Accent else PwsColor.BorderStrong),
    )
}

@Composable
private fun SearchField(placeholder: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .clip(RoundedCornerShape(PwsRadius.Md))
            .background(PwsColor.Surface)
            .border(BorderStroke(1.dp, PwsColor.BorderStrong), RoundedCornerShape(PwsRadius.Md))
            .padding(horizontal = PwsSpace.Md, vertical = 15.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        PwsCaption(placeholder, color = PwsColor.TextMuted)
    }
}

@Composable
private fun RegionTile(title: String, subtitle: String, modifier: Modifier = Modifier) {
    PwsCard(modifier = modifier, contentPadding = PaddingValues(PwsSpace.Md), radius = PwsRadius.Md) {
        Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Xs), verticalAlignment = Alignment.CenterVertically) {
            PwsCaption("◎", color = PwsColor.TextSecondary)
            PwsBody(title, color = PwsColor.TextPrimary)
        }
        PwsCaption(subtitle)
    }
}

@Composable
private fun RegionListRow(label: String, value: String?) {
    PwsCard(contentPadding = PaddingValues(horizontal = PwsSpace.Md, vertical = 14.dp), radius = PwsRadius.Md) {
        PwsSettingRow(label, value) {
            PwsCaption("›", color = PwsColor.TextTertiary)
        }
    }
}

@Composable
private fun SettingsProfileCard() {
    PwsCard(radius = PwsRadius.Lg, background = PwsColor.SurfaceSecondary, border = PwsColor.BorderStrong) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(PwsSpace.Md)) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(PwsRadius.Pill))
                    .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFFFE9A00), Color(0xFFF54900)))),
                contentAlignment = Alignment.Center,
            ) {
                PwsText("지", size = 20.sp, lineHeight = 28.sp, weight = FontWeight.Bold, color = Color.White, align = TextAlign.Center)
            }
            Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Xs)) {
                PwsText("지우진", size = 16.sp, lineHeight = 24.sp, weight = FontWeight.SemiBold)
                PwsCaption("남성 · BMI 31.1", color = PwsColor.TextSecondary)
            }
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .clip(RoundedCornerShape(PwsRadius.Md))
                .background(PwsColor.Surface)
                .border(BorderStroke(1.dp, PwsColor.BorderStrong), RoundedCornerShape(PwsRadius.Md)),
            contentAlignment = Alignment.Center,
        ) {
            PwsText("프로필 수정", size = 14.sp, lineHeight = 20.sp, weight = FontWeight.SemiBold, align = TextAlign.Center)
        }
    }
}

@Composable
private fun LegacyRegionListRow(label: String, value: String) {
    PwsSettingRow(label, value.ifBlank { null }) {
        PwsCaption("›", color = PwsColor.TextTertiary)
    }
}

@Composable
private fun ToggleRow(label: String, enabled: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clickable(onClick = onClick),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PwsBody(label, color = PwsColor.TextPrimary)
        PwsToggle(enabled)
    }
}

@Composable
private fun SliderRow(label: String, value: Float) {
    Column(verticalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
        PwsSettingRow(label, "${(value * 100).toInt()}%")
        PwsStaticSlider(value)
    }
}

@Composable
private fun ClickableInfoRow(label: String, value: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clickable(onClick = onClick),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PwsBody(label, color = PwsColor.TextPrimary)
        Row(verticalAlignment = Alignment.CenterVertically) {
            PwsCaption(value, color = PwsColor.TextTertiary)
            Spacer(Modifier.width(PwsSpace.Sm))
            PwsCaption("›", color = PwsColor.TextTertiary)
        }
    }
}
