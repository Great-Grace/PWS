package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SettingsDialogTest {
    @Test
    fun termsAndPrivacyDialogsMirrorReferenceCopyTitles() {
        val terms = SettingsDialogReducer.reduce(null, SettingsAction.ShowTerms)
        val privacy = SettingsDialogReducer.reduce(null, SettingsAction.ShowPrivacyPolicy)

        assertEquals("이용약관", terms?.title)
        assertTrue(terms?.message?.contains("지역별 날씨 정보") == true)
        assertEquals(SettingsDialogAction.DismissOnly, terms?.action)

        assertEquals("개인정보 처리방침", privacy?.title)
        assertTrue(privacy?.message?.contains("회원 식별 정보") == true)
        assertEquals(SettingsDialogAction.DismissOnly, privacy?.action)
    }

    @Test
    fun logoutAndDeleteDialogsAreExplicitConfirmations() {
        val logout = SettingsDialogReducer.reduce(null, SettingsAction.RequestLogout)
        val delete = SettingsDialogReducer.reduce(null, SettingsAction.RequestDeleteAccount)

        assertEquals("로그아웃", logout?.title)
        assertEquals("취소", logout?.secondaryLabel)
        assertEquals("로그아웃", logout?.primaryLabel)
        assertEquals(SettingsDialogAction.ConfirmLogout, logout?.action)
        assertTrue(logout?.destructive == true)

        assertEquals("계정 삭제", delete?.title)
        assertEquals(SettingsDialogAction.ConfirmDeleteAccount, delete?.action)
        assertTrue(delete?.message?.contains("실제 삭제 RPC를 실행하지 않습니다") == true)
        assertTrue(delete?.destructive == true)
    }

    @Test
    fun dismissClearsDialog() {
        val dialog = SettingsDialogReducer.reduce(null, SettingsAction.ShowTerms)
        assertNull(SettingsDialogReducer.reduce(dialog, SettingsAction.Dismiss))
    }
}
