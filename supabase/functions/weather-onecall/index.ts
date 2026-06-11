import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const OWM_BASE_URL = "https://api.openweathermap.org/data/3.0/onecall"
const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"
const CACHE_TTL_MS = 30 * 60 * 1000
const STALE_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const PROVIDER_TIMEOUT_MS = 3_500

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type WeatherCondition = {
  id?: number
  description?: string
  icon?: string
}

type OneCallCurrent = {
  temp: number
  feels_like: number
  humidity: number
  wind_speed: number
  weather?: WeatherCondition[]
  uvi?: number
  rain?: { "1h"?: number }
  snow?: { "1h"?: number }
}

type OneCallHourly = OneCallCurrent & {
  dt: number
  pop?: number
}

type OneCallDaily = {
  dt: number
  temp: { min: number; max: number }
  humidity: number
  wind_speed: number
  weather?: WeatherCondition[]
  pop?: number
  uvi?: number
}

type OpenWeatherOneCall = {
  current: OneCallCurrent
  hourly?: OneCallHourly[]
  daily?: OneCallDaily[]
}

type OpenMeteoForecast = {
  current?: {
    time?: number | string
    temperature_2m?: number
    relative_humidity_2m?: number
    apparent_temperature?: number
    wind_speed_10m?: number
    weather_code?: number
    uv_index?: number
    precipitation?: number
  }
  hourly?: {
    time?: Array<number | string>
    temperature_2m?: number[]
    relative_humidity_2m?: number[]
    apparent_temperature?: number[]
    wind_speed_10m?: number[]
    weather_code?: number[]
    precipitation_probability?: number[]
    precipitation?: number[]
  }
  daily?: {
    time?: Array<number | string>
    temperature_2m_min?: number[]
    temperature_2m_max?: number[]
    weather_code?: number[]
    precipitation_probability_max?: number[]
    uv_index_max?: number[]
  }
}

type WeatherData = {
  current: {
    temp: number
    feels_like: number
    humidity: number
    wind_speed: number
    weather_code: number
    weather_desc: string
    uv_index: number
    precipitation_1h?: number
    tmrt_api?: number
  }
  hourly: Array<{
    dt: number
    temp: number
    feels_like: number
    humidity: number
    wind_speed: number
    weather_code: number
    weather_desc: string
    pop: number
    precipitation_1h?: number
  }>
  daily: Array<{
    dt: number
    temp_min: number
    temp_max: number
    humidity: number
    wind_speed: number
    weather_code: number
    weather_desc: string
    weather_icon: string
    pop: number
    uv_index: number
  }>
  fetchedAt: number
}

type WeatherCacheRow = {
  expires_at: string
  temp_c: number
  feels_like_c: number
  humidity_pct: number
  wind_mps: number
  weather_code: number
  weather_desc: string
  uv_index: number
  tmrt_api: number | null
  hourly_json: WeatherData["hourly"] | null
  daily_json: WeatherData["daily"] | null
  fetched_at: string
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  })
}

async function fetchWithTimeout(url: URL, timeoutMs = PROVIDER_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function firstCondition(entry: { weather?: WeatherCondition[] }): WeatherCondition {
  return entry.weather?.[0] ?? {}
}

function precipitation1h(entry: { rain?: { "1h"?: number }; snow?: { "1h"?: number } }): number {
  return entry.rain?.["1h"] ?? entry.snow?.["1h"] ?? 0
}

function roundCoord(value: number) {
  return Math.round(value * 100) / 100
}

function isValidCoordinate(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function firstSecretFromJSONEnv(name: string): string | undefined {
  const raw = Deno.env.get(name)
  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const defaultValue = parsed.default
    if (typeof defaultValue === "string" && defaultValue.trim()) return defaultValue
    return Object.values(parsed).find((value): value is string => typeof value === "string" && value.trim().length > 0)
  } catch {
    return undefined
  }
}

function requiredRuntimeConfig() {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL"),
    anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? firstSecretFromJSONEnv("SUPABASE_PUBLISHABLE_KEYS"),
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? firstSecretFromJSONEnv("SUPABASE_SECRET_KEYS"),
    openWeatherApiKey: Deno.env.get("OPENWEATHER_API_KEY"),
  }
}

function buildWeatherDataFromOneCall(raw: OpenWeatherOneCall, fetchedAt = Date.now()): WeatherData {
  const currentCondition = firstCondition(raw.current)

  return {
    current: {
      temp: raw.current.temp,
      feels_like: raw.current.feels_like,
      humidity: raw.current.humidity,
      wind_speed: raw.current.wind_speed,
      weather_code: currentCondition.id ?? 800,
      weather_desc: currentCondition.description ?? "-",
      uv_index: raw.current.uvi ?? 0,
      precipitation_1h: precipitation1h(raw.current),
    },
    hourly: (raw.hourly ?? []).slice(0, 24).map((entry) => {
      const condition = firstCondition(entry)
      return {
        dt: entry.dt,
        temp: entry.temp,
        feels_like: entry.feels_like,
        humidity: entry.humidity,
        wind_speed: entry.wind_speed,
        weather_code: condition.id ?? 800,
        weather_desc: condition.description ?? "-",
        pop: entry.pop ?? 0,
        precipitation_1h: precipitation1h(entry),
      }
    }),
    daily: (raw.daily ?? []).slice(0, 7).map((entry) => {
      const condition = firstCondition(entry)
      return {
        dt: entry.dt,
        temp_min: entry.temp.min,
        temp_max: entry.temp.max,
        humidity: entry.humidity,
        wind_speed: entry.wind_speed,
        weather_code: condition.id ?? 800,
        weather_desc: condition.description ?? "-",
        weather_icon: condition.icon ?? "",
        pop: entry.pop ?? 0,
        uv_index: entry.uvi ?? 0,
      }
    }),
    fetchedAt,
  }
}

function openMeteoDescription(code: number): string {
  if (code === 0) return "맑음"
  if (code === 1) return "대체로 맑음"
  if (code === 2) return "부분적으로 흐림"
  if (code === 3) return "흐림"
  if (code === 45 || code === 48) return "안개"
  if (code >= 51 && code <= 57) return "이슬비"
  if (code >= 61 && code <= 67) return "비"
  if (code >= 71 && code <= 77) return "눈"
  if (code >= 80 && code <= 82) return "소나기"
  if (code >= 85 && code <= 86) return "눈 소나기"
  if (code >= 95 && code <= 99) return "뇌우"
  return "-"
}

function numericAt(values: number[] | undefined, index: number, fallback = 0): number {
  const value = values?.[index]
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function timestampFromOpenMeteoTime(value: number | string | undefined, fallbackSeconds: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return Math.floor(parsed / 1000)
  }
  return fallbackSeconds
}

function buildWeatherDataFromOpenMeteo(raw: OpenMeteoForecast, fetchedAt = Date.now()): WeatherData {
  const nowSeconds = Math.floor(fetchedAt / 1000)
  const current = raw.current ?? {}
  const currentCode = current.weather_code ?? 800
  const hourly = raw.hourly ?? {}
  const daily = raw.daily ?? {}

  return {
    current: {
      temp: current.temperature_2m ?? 0,
      feels_like: current.apparent_temperature ?? current.temperature_2m ?? 0,
      humidity: current.relative_humidity_2m ?? 0,
      wind_speed: current.wind_speed_10m ?? 0,
      weather_code: currentCode,
      weather_desc: openMeteoDescription(currentCode),
      uv_index: current.uv_index ?? 0,
      precipitation_1h: current.precipitation ?? 0,
    },
    hourly: (hourly.time ?? []).slice(0, 24).map((time, index) => {
      const weatherCode = numericAt(hourly.weather_code, index, 800)
      return {
        dt: timestampFromOpenMeteoTime(time, nowSeconds + index * 3600),
        temp: numericAt(hourly.temperature_2m, index),
        feels_like: numericAt(hourly.apparent_temperature, index, numericAt(hourly.temperature_2m, index)),
        humidity: numericAt(hourly.relative_humidity_2m, index),
        wind_speed: numericAt(hourly.wind_speed_10m, index),
        weather_code: weatherCode,
        weather_desc: openMeteoDescription(weatherCode),
        pop: numericAt(hourly.precipitation_probability, index) / 100,
        precipitation_1h: numericAt(hourly.precipitation, index),
      }
    }),
    daily: (daily.time ?? []).slice(0, 7).map((time, index) => {
      const weatherCode = numericAt(daily.weather_code, index, 800)
      return {
        dt: timestampFromOpenMeteoTime(time, nowSeconds + index * 86_400),
        temp_min: numericAt(daily.temperature_2m_min, index),
        temp_max: numericAt(daily.temperature_2m_max, index),
        humidity: current.relative_humidity_2m ?? 0,
        wind_speed: current.wind_speed_10m ?? 0,
        weather_code: weatherCode,
        weather_desc: openMeteoDescription(weatherCode),
        weather_icon: "",
        pop: numericAt(daily.precipitation_probability_max, index) / 100,
        uv_index: numericAt(daily.uv_index_max, index),
      }
    }),
    fetchedAt,
  }
}

async function fetchOpenMeteoWeatherData(lat: number, lng: number, fetchedAt = Date.now()): Promise<WeatherData> {
  const weatherUrl = new URL(OPEN_METEO_BASE_URL)
  weatherUrl.searchParams.set("latitude", String(lat))
  weatherUrl.searchParams.set("longitude", String(lng))
  weatherUrl.searchParams.set("current", [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "wind_speed_10m",
    "weather_code",
    "uv_index",
    "precipitation",
  ].join(","))
  weatherUrl.searchParams.set("hourly", [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "wind_speed_10m",
    "weather_code",
    "precipitation_probability",
    "precipitation",
  ].join(","))
  weatherUrl.searchParams.set("daily", [
    "temperature_2m_min",
    "temperature_2m_max",
    "weather_code",
    "precipitation_probability_max",
    "uv_index_max",
  ].join(","))
  weatherUrl.searchParams.set("forecast_days", "7")
  weatherUrl.searchParams.set("timezone", "auto")
  weatherUrl.searchParams.set("timeformat", "unixtime")
  weatherUrl.searchParams.set("wind_speed_unit", "ms")

  const response = await fetchWithTimeout(weatherUrl)
  if (!response.ok) {
    return Promise.reject(new Error("open_meteo_provider_error"))
  }

  const raw = await response.json() as OpenMeteoForecast
  return buildWeatherDataFromOpenMeteo(raw, fetchedAt)
}

async function fetchWeatherData(lat: number, lng: number, openWeatherApiKey: string | undefined, fetchedAt = Date.now()): Promise<WeatherData> {
  if (!openWeatherApiKey) {
    return fetchOpenMeteoWeatherData(lat, lng, fetchedAt)
  }

  const weatherUrl = new URL(OWM_BASE_URL)
  weatherUrl.searchParams.set("lat", String(lat))
  weatherUrl.searchParams.set("lon", String(lng))
  weatherUrl.searchParams.set("exclude", "minutely,alerts")
  weatherUrl.searchParams.set("units", "metric")
  weatherUrl.searchParams.set("lang", "kr")
  weatherUrl.searchParams.set("appid", openWeatherApiKey)

  const response = await fetchWithTimeout(weatherUrl)
  if (!response.ok) {
    return Promise.reject(new Error("open_weather_provider_error"))
  }

  const raw = await response.json() as OpenWeatherOneCall
  return buildWeatherDataFromOneCall(raw, fetchedAt)
}

function buildWeatherDataFromCache(row: WeatherCacheRow): WeatherData | null {
  if (!row.hourly_json || !row.daily_json) return null

  return {
    current: {
      temp: row.temp_c,
      feels_like: row.feels_like_c,
      humidity: row.humidity_pct,
      wind_speed: row.wind_mps,
      weather_code: row.weather_code,
      weather_desc: row.weather_desc,
      uv_index: row.uv_index,
      tmrt_api: row.tmrt_api ?? undefined,
    },
    hourly: row.hourly_json,
    daily: row.daily_json,
    fetchedAt: new Date(row.fetched_at).getTime(),
  }
}

function parseTimeMs(value: string): number | null {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isFreshCache(row: WeatherCacheRow, nowMs: number): boolean {
  const expiresAt = parseTimeMs(row.expires_at)
  return expiresAt !== null && expiresAt > nowMs
}

function isUsableStaleCache(row: WeatherCacheRow, nowMs: number): boolean {
  const fetchedAt = parseTimeMs(row.fetched_at)
  return fetchedAt !== null && nowMs - fetchedAt <= STALE_CACHE_TTL_MS
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405)
  }

  const {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    openWeatherApiKey,
  } = requiredRuntimeConfig()

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "server_not_configured" }, 500)
  }

  const authorization = req.headers.get("Authorization") ?? ""
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()

  if (userError || !userData.user) {
    return jsonResponse({ error: "unauthorized" }, 401)
  }

  let payload: { lat?: unknown; lng?: unknown }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400)
  }

  const lat = Number(payload.lat)
  const lng = Number(payload.lng)
  if (!isValidCoordinate(lat, lng)) {
    return jsonResponse({ error: "invalid_coordinates" }, 400)
  }

  const roundedLat = roundCoord(lat)
  const roundedLng = roundCoord(lng)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const now = Date.now()
  const { data: cached } = await adminClient
    .from("weather_cache")
    .select("*")
    .eq("lat", roundedLat)
    .eq("lng", roundedLng)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle<WeatherCacheRow>()

  const cachedWeather = cached ? buildWeatherDataFromCache(cached) : null
  if (cached && cachedWeather && isFreshCache(cached, now)) {
    return jsonResponse(cachedWeather)
  }

  const fetchedAt = now
  let weatherData: WeatherData
  try {
    weatherData = await fetchWeatherData(lat, lng, openWeatherApiKey, fetchedAt)
  } catch {
    if (cached && cachedWeather && isUsableStaleCache(cached, fetchedAt)) {
      return jsonResponse(cachedWeather)
    }
    return jsonResponse({ error: "weather_provider_error" }, 502)
  }

  await adminClient
    .from("weather_cache")
    .upsert({
      lat: roundedLat,
      lng: roundedLng,
      fetched_at: new Date(fetchedAt).toISOString(),
      expires_at: new Date(fetchedAt + CACHE_TTL_MS).toISOString(),
      temp_c: weatherData.current.temp,
      feels_like_c: weatherData.current.feels_like,
      humidity_pct: weatherData.current.humidity,
      wind_mps: weatherData.current.wind_speed,
      weather_code: weatherData.current.weather_code,
      weather_desc: weatherData.current.weather_desc,
      uv_index: weatherData.current.uv_index,
      hourly_json: weatherData.hourly,
      daily_json: weatherData.daily,
    }, { onConflict: "lat,lng" })

  return jsonResponse(weatherData)
})
