package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NativeSupabaseProfileClientTest {
    @Test
    fun contractBuildsFetchUpsertAndUpdateRequests() {
        val headers = NativeSupabaseProfileContract.headers(
            anonKey = " anon-key ",
            accessToken = " access-token ",
            prefer = "return=representation",
        )

        assertEquals(
            "https://project.supabase.co/rest/v1/users?id=eq.user-1&select=*",
            NativeSupabaseProfileContract.fetchUrl("https://project.supabase.co/", "user-1"),
        )
        assertEquals(
            "https://project.supabase.co/rest/v1/users?on_conflict=id",
            NativeSupabaseProfileContract.upsertUrl("https://project.supabase.co/"),
        )
        assertEquals("anon-key", headers["apikey"])
        assertEquals("Bearer access-token", headers["Authorization"])
        assertEquals("return=representation", headers["Prefer"])
    }

    @Test
    fun profileClientFetchesAndMapsUserRecordToNativeProfile() {
        val transport = RecordingProfileTransport(
            NativeSupabaseProfileResponse(
                statusCode = 200,
                body = """
                    [{
                      "id":"user-1",
                      "email":"pws_dev@test.pws",
                      "nickname":"지우진",
                      "default_lat":37.5665,
                      "default_lng":126.978,
                      "climate_zone":"서울특별시 강남구",
                      "onboarding_done":true,
                      "birth_year":1994,
                      "gender":"M",
                      "notify_enabled":false,
                      "notify_outfit":true,
                      "notify_rain":false
                    }]
                """.trimIndent(),
            ),
        )
        val client = NativeSupabaseProfileClient(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            accessTokenProvider = { "access-token" },
            transport = transport,
        )

        val record = client.fetchUserProfile("user-1")
        val profile = record?.toNativeUserProfile()

        assertEquals("GET", transport.lastRequest?.method)
        assertEquals("지우진", record?.nickname)
        assertEquals(37.5665, record?.defaultLat ?: -1.0, 0.0001)
        assertEquals("서울특별시", profile?.province)
        assertEquals("강남구", profile?.district)
        assertEquals(false, profile?.notifyEnabled)
        assertEquals(true, profile?.notifyOutfit)
        assertEquals(false, profile?.notifyRain)
    }

    @Test
    fun profileClientUpsertsOnboardingWithPostgrestMergePreference() {
        val transport = RecordingProfileTransport(
            NativeSupabaseProfileResponse(
                statusCode = 200,
                body = """[{"id":"user-1","email":"pws_dev@test.pws","nickname":"지우진","climate_zone":"서울특별시 강남구","onboarding_done":true,"gender":"M"}]""",
            ),
        )
        val client = NativeSupabaseProfileClient(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            accessTokenProvider = { "access-token" },
            transport = transport,
        )

        client.upsertOnboarding(
            NativeUserOnboardingUpsert(
                id = "user-1",
                email = "pws_dev@test.pws",
                nickname = "지우진",
                defaultLat = 37.5665,
                defaultLng = 126.978,
                climateZone = "서울특별시 강남구",
                birthYear = 1994,
                gender = Gender.Male,
            ),
        )

        assertEquals("POST", transport.lastRequest?.method)
        assertEquals("resolution=merge-duplicates,return=representation", transport.lastRequest?.headers?.get("Prefer"))
        assertEquals(true, transport.lastRequest?.body?.contains("\"onboarding_done\":true"))
        assertEquals(true, transport.lastRequest?.body?.contains("\"gender\":\"M\""))
    }

    @Test
    fun profileClientUpdatesNotificationSettingsWithPatch() {
        val transport = RecordingProfileTransport(
            NativeSupabaseProfileResponse(
                statusCode = 200,
                body = """[{"id":"user-1","email":"pws_dev@test.pws","nickname":"지우진","notify_enabled":false,"notify_outfit":false,"notify_rain":true}]""",
            ),
        )
        val client = NativeSupabaseProfileClient(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            accessTokenProvider = { "access-token" },
            transport = transport,
        )

        val updated = client.updateProfile(
            userId = "user-1",
            update = NativeUserProfileUpdate(notifyEnabled = false, notifyOutfit = false, notifyRain = true),
        )

        assertEquals("PATCH", transport.lastRequest?.method)
        assertEquals("return=representation", transport.lastRequest?.headers?.get("Prefer"))
        assertEquals("지우진", updated?.nickname)
        assertEquals(true, transport.lastRequest?.body?.contains("\"notify_enabled\":false"))
        assertEquals(true, transport.lastRequest?.body?.contains("\"notify_rain\":true"))
    }

    @Test
    fun profileClientReturnsNullForMissingProfile() {
        val client = NativeSupabaseProfileClient(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            accessTokenProvider = { "access-token" },
            transport = RecordingProfileTransport(NativeSupabaseProfileResponse(statusCode = 200, body = "[]")),
        )

        assertNull(client.fetchUserProfile("user-1"))
    }

    private class RecordingProfileTransport(
        private val response: NativeSupabaseProfileResponse,
    ) : NativeSupabaseProfileTransport {
        var lastRequest: NativeSupabaseProfileRequest? = null
        override fun send(request: NativeSupabaseProfileRequest): NativeSupabaseProfileResponse {
            lastRequest = request
            return response
        }
    }
}
