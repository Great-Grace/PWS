package com.wxxtae.pws.nativepreview.domain

import java.time.LocalDate

data class NativeUserProfile(
    val id: String,
    val nickname: String,
    val email: String? = null,
    val gender: Gender? = null,
    val birthYear: Int? = null,
    val province: String? = null,
    val district: String? = null,
    val notifyEnabled: Boolean = true,
    val notifyOutfit: Boolean = true,
    val notifyRain: Boolean = false,
) {
    val regionLabel: String
        get() = listOfNotNull(province, district).joinToString(" ").ifBlank { "위치 미설정" }
}

data class NativeSessionState(
    val user: NativeUserProfile? = null,
    val agreements: AgreementState = AgreementState(),
    val profileDraft: ProfileDraft = ProfileDraft(),
) {
    val isSignedIn: Boolean = user != null
    val isProfileComplete: Boolean = user?.nickname?.isNotBlank() == true && user.province?.isNotBlank() == true && user.district?.isNotBlank() == true
}

sealed interface NativeSessionAction {
    data class SignInLocalTester(val testerId: String = TesterAuth.FigmaParityTesterId) : NativeSessionAction
    data class SetAllAgreements(val checked: Boolean) : NativeSessionAction
    data class ToggleAgreement(val key: AgreementKey) : NativeSessionAction
    data class UpdateProfileDraft(val draft: ProfileDraft) : NativeSessionAction
    data class CompleteProfile(val today: LocalDate = LocalDate.now()) : NativeSessionAction
    data class ToggleNotification(val key: NotificationKey) : NativeSessionAction
    data object SignOut : NativeSessionAction
}

enum class NotificationKey {
    Enabled,
    Outfit,
    Rain,
}

object NativeSessionReducer {
    fun reduce(state: NativeSessionState, action: NativeSessionAction): NativeSessionState {
        return when (action) {
        is NativeSessionAction.SignInLocalTester -> {
            val normalizedId = TesterAuth.normalizeTesterId(action.testerId)
            val mode = TesterAuth.resolveDevTesterMode(normalizedId) ?: DevTesterMode.SimpleLogin
            val defaultName = when (mode) {
                DevTesterMode.FigmaParity -> "지우진"
                DevTesterMode.OnboardingQa -> "온보딩QA"
                DevTesterMode.SimpleLogin -> normalizedId
            }
            state.copy(
                user = NativeUserProfile(
                    id = TesterAuth.testerSessionId(normalizedId),
                    nickname = defaultName,
                    email = TesterAuth.testerEmail(normalizedId),
                    gender = if (mode == DevTesterMode.FigmaParity) Gender.Male else null,
                    birthYear = if (mode == DevTesterMode.FigmaParity) 1994 else null,
                    province = if (mode == DevTesterMode.FigmaParity) "서울특별시" else null,
                    district = if (mode == DevTesterMode.FigmaParity) "강남구" else null,
                ),
                profileDraft = if (mode == DevTesterMode.FigmaParity) {
                    ProfileDraft(
                        name = defaultName,
                        birthDate = "1994",
                        gender = Gender.Male,
                        province = "서울특별시",
                        district = "강남구",
                    )
                } else {
                    state.profileDraft.copy(name = defaultName)
                },
            )
        }

        is NativeSessionAction.SetAllAgreements -> state.copy(
            agreements = OnboardingRules.setAllAgreements(action.checked),
        )

        is NativeSessionAction.ToggleAgreement -> state.copy(
            agreements = OnboardingRules.toggleAgreement(state.agreements, action.key),
        )

        is NativeSessionAction.UpdateProfileDraft -> state.copy(profileDraft = action.draft)

        is NativeSessionAction.CompleteProfile -> {
            val user = state.user ?: return state
            if (!OnboardingRules.areRequiredAgreementsAccepted(state.agreements)) return state
            if (!OnboardingRules.canContinueProfile(state.profileDraft, action.today)) return state
            state.copy(
                user = user.copy(
                    nickname = state.profileDraft.name.trim(),
                    gender = state.profileDraft.gender,
                    birthYear = OnboardingRules.normalizeBirthYear(state.profileDraft.birthDate, action.today),
                    province = state.profileDraft.province,
                    district = state.profileDraft.district,
                ),
            )
        }

        is NativeSessionAction.ToggleNotification -> {
            val user = state.user ?: return state
            val nextUser = when (action.key) {
                NotificationKey.Enabled -> user.copy(notifyEnabled = !user.notifyEnabled)
                NotificationKey.Outfit -> user.copy(notifyOutfit = !user.notifyOutfit)
                NotificationKey.Rain -> user.copy(notifyRain = !user.notifyRain)
            }
            state.copy(user = nextUser)
        }

        NativeSessionAction.SignOut -> NativeSessionState()
        }
    }
}
