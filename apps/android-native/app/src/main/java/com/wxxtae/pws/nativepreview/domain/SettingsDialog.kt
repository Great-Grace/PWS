package com.wxxtae.pws.nativepreview.domain

const val TermsSummary: String =
    "서비스는 지역별 날씨 정보, 개인 체감 기록, 옷차림 추천, 히스토리 및 통계 기능을 제공합니다.\n\n" +
        "회원은 약관과 관련 법령을 준수해야 하며 허위 정보 입력, 타인 정보 도용, 서비스 운영 방해를 해서는 안 됩니다."

const val PrivacySummary: String =
    "회원 식별 정보, 지역 정보, 체감 피드백, 서비스 이용 로그를 수집합니다.\n\n" +
        "수집 정보는 개인화된 날씨·옷차림 추천 제공, 계정 관리, 서비스 품질 개선에 사용되며 회원 탈퇴 또는 목적 달성 시 지체 없이 파기합니다."

data class SettingsDialogState(
    val title: String,
    val message: String,
    val primaryLabel: String = "확인",
    val secondaryLabel: String? = null,
    val destructive: Boolean = false,
    val action: SettingsDialogAction = SettingsDialogAction.DismissOnly,
)

enum class SettingsDialogAction {
    DismissOnly,
    ConfirmLogout,
    ConfirmDeleteAccount,
}

sealed interface SettingsAction {
    data object ShowTerms : SettingsAction
    data object ShowPrivacyPolicy : SettingsAction
    data object RequestLogout : SettingsAction
    data object RequestDeleteAccount : SettingsAction
    data object Dismiss : SettingsAction
}

object SettingsDialogReducer {
    fun reduce(current: SettingsDialogState?, action: SettingsAction): SettingsDialogState? = when (action) {
        SettingsAction.ShowTerms -> SettingsDialogState(
            title = "이용약관",
            message = TermsSummary,
            primaryLabel = "확인",
        )

        SettingsAction.ShowPrivacyPolicy -> SettingsDialogState(
            title = "개인정보 처리방침",
            message = PrivacySummary,
            primaryLabel = "확인",
        )

        SettingsAction.RequestLogout -> SettingsDialogState(
            title = "로그아웃",
            message = "정말 로그아웃하시겠어요?",
            secondaryLabel = "취소",
            primaryLabel = "로그아웃",
            destructive = true,
            action = SettingsDialogAction.ConfirmLogout,
        )

        SettingsAction.RequestDeleteAccount -> SettingsDialogState(
            title = "계정 삭제",
            message = "모든 데이터가 영구적으로 삭제됩니다.\n정말 삭제하시겠어요?\n\n네이티브 마이그레이션 검증 단계에서는 실제 삭제 RPC를 실행하지 않습니다.",
            secondaryLabel = "취소",
            primaryLabel = "확인",
            destructive = true,
            action = SettingsDialogAction.ConfirmDeleteAccount,
        )

        SettingsAction.Dismiss -> null
    }
}
