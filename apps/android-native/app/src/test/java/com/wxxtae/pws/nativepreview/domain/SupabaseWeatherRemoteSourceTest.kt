package com.wxxtae.pws.nativepreview.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SupabaseWeatherRemoteSourceTest {
    @Test
    fun edgeFunctionContractMatchesReactNativeSupabaseInvokeShape() {
        val headers = WeatherEdgeFunctionContract.headers(
            anonKey = " anon-key ",
            accessToken = " access-token ",
        )

        assertEquals(
            "https://project.supabase.co/functions/v1/weather-onecall",
            WeatherEdgeFunctionContract.endpoint("https://project.supabase.co/"),
        )
        assertEquals("{\"lat\":37.566500,\"lng\":126.978000}", WeatherEdgeFunctionContract.body(37.5665, 126.978))
        assertEquals("application/json", headers["Content-Type"])
        assertEquals("application/json", headers["Accept"])
        assertEquals("anon-key", headers["apikey"])
        assertEquals("Bearer access-token", headers["Authorization"])
        assertEquals("pws-native-android", headers["x-client-info"])
    }

    @Test
    fun edgeFunctionRemoteSourceMapsWeatherOnecallJsonToNativeWeatherData() {
        val transport = RecordingWeatherTransport(
            WeatherHttpResponse(
                statusCode = 200,
                body = """
                    {
                      "current": {
                        "temp": 18.4,
                        "feels_like": 17.1,
                        "humidity": 55,
                        "wind_speed": 2.1,
                        "weather_code": 800,
                        "weather_desc": "맑음",
                        "uv_index": 4.2,
                        "precipitation_1h": 0,
                        "tmrt_api": 21.0
                      },
                      "hourly": [{
                        "dt": 1777968000,
                        "temp": 18.4,
                        "feels_like": 17.1,
                        "humidity": 55,
                        "wind_speed": 2.1,
                        "weather_code": 800,
                        "weather_desc": "맑음",
                        "pop": 0.1,
                        "precipitation_1h": 0
                      }],
                      "daily": [{
                        "dt": 1777968000,
                        "temp_min": 13.0,
                        "temp_max": 21.0,
                        "humidity": 58,
                        "wind_speed": 2.4,
                        "weather_code": 800,
                        "weather_desc": "맑음",
                        "weather_icon": null,
                        "pop": 0.1,
                        "uv_index": 4.0
                      }],
                      "fetchedAt": 1777967435000
                    }
                """.trimIndent(),
            ),
        )
        val source = SupabaseEdgeFunctionWeatherRemoteSource(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            accessTokenProvider = { "access-token" },
            transport = transport,
        )

        val data = source.fetchWeather(lat = 37.5665, lng = 126.978, nowMs = 1L)

        assertEquals(18.4, data.current.temp, 0.0001)
        assertEquals(17.1, data.current.feelsLike, 0.0001)
        assertEquals(55, data.current.humidity)
        assertEquals(2.1, data.current.windSpeed, 0.0001)
        assertEquals(800, data.current.weatherCode)
        assertEquals("맑음", data.current.weatherDescription)
        assertEquals(4.2, data.current.uvIndex, 0.0001)
        assertEquals(21.0, data.current.tmrtApi ?: -1.0, 0.0001)
        assertEquals(1, data.hourly.size)
        assertEquals(0.1, data.hourly.single().pop, 0.0001)
        assertEquals(1, data.daily.size)
        assertEquals("", data.daily.single().weatherIcon)
        assertEquals(1777967435000L, data.fetchedAt)
        assertEquals("https://project.supabase.co/functions/v1/weather-onecall", transport.lastRequest?.url)
    }


    @Test
    fun edgeFunctionRemoteSourceUsesPersistedSessionTokenProvider() {
        val sessionStore = NativeSupabaseSessionStore(InMemoryNativeKeyValueStore())
        sessionStore.save(NativeSupabaseSession(accessToken = "persisted-token", expiresAtEpochSeconds = 2_000L))
        val transport = RecordingWeatherTransport(successWeatherResponse())
        val source = SupabaseEdgeFunctionWeatherRemoteSource(
            supabaseUrl = "https://project.supabase.co",
            supabaseAnonKey = "anon-key",
            accessTokenProvider = { sessionStore.getValidAccessToken(nowEpochSeconds = 1_000L) },
            transport = transport,
        )

        source.fetchWeather(lat = 37.5665, lng = 126.978, nowMs = 1L)

        assertEquals("Bearer persisted-token", transport.lastRequest?.headers?.get("Authorization"))
    }

    @Test
    fun fallbackWeatherRemoteSourceKeepsPreviewUsableWhenPrimaryCannotAuthenticateYet() {
        val fallback = PreviewWeatherRemoteSource()
        val source = FallbackWeatherRemoteSource(
            primary = SupabaseEdgeFunctionWeatherRemoteSource(
                supabaseUrl = "https://project.supabase.co",
                supabaseAnonKey = "anon-key",
                accessTokenProvider = { null },
                transport = RecordingWeatherTransport(WeatherHttpResponse(200, "{}")),
            ),
            fallback = fallback,
        )

        val data = source.fetchWeather(lat = 37.5665, lng = 126.978, nowMs = 1_000L)

        assertEquals(18.0, data.current.temp, 0.0001)
        assertTrue(data.daily.isNotEmpty())
    }


    private fun successWeatherResponse(): WeatherHttpResponse = WeatherHttpResponse(
        statusCode = 200,
        body = """
            {
              "current": {
                "temp": 18.4,
                "feels_like": 17.1,
                "humidity": 55,
                "wind_speed": 2.1,
                "weather_code": 800,
                "weather_desc": "맑음",
                "uv_index": 4.2,
                "precipitation_1h": 0,
                "tmrt_api": 21.0
              },
              "hourly": [{
                "dt": 1777968000,
                "temp": 18.4,
                "feels_like": 17.1,
                "humidity": 55,
                "wind_speed": 2.1,
                "weather_code": 800,
                "weather_desc": "맑음",
                "pop": 0.1,
                "precipitation_1h": 0
              }],
              "daily": [{
                "dt": 1777968000,
                "temp_min": 13.0,
                "temp_max": 21.0,
                "humidity": 58,
                "wind_speed": 2.4,
                "weather_code": 800,
                "weather_desc": "맑음",
                "weather_icon": null,
                "pop": 0.1,
                "uv_index": 4.0
              }],
              "fetchedAt": 1777967435000
            }
        """.trimIndent(),
    )

    private class RecordingWeatherTransport(
        private val response: WeatherHttpResponse,
    ) : WeatherHttpTransport {
        var lastRequest: WeatherHttpRequest? = null

        override fun post(request: WeatherHttpRequest): WeatherHttpResponse {
            lastRequest = request
            return response
        }
    }
}
