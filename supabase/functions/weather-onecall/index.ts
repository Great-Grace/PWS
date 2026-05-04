import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const OWM_BASE_URL = "https://api.openweathermap.org/data/3.0/onecall"
const CACHE_TTL_MS = 30 * 60 * 1000

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const openWeatherApiKey = Deno.env.get("OPENWEATHER_API_KEY")

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !openWeatherApiKey) {
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

  const { data: cached } = await adminClient
    .from("weather_cache")
    .select("*")
    .eq("lat", roundedLat)
    .eq("lng", roundedLng)
    .gt("expires_at", new Date().toISOString())
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle<WeatherCacheRow>()

  const cachedWeather = cached ? buildWeatherDataFromCache(cached) : null
  if (cachedWeather) {
    return jsonResponse(cachedWeather)
  }

  const weatherUrl = new URL(OWM_BASE_URL)
  weatherUrl.searchParams.set("lat", String(lat))
  weatherUrl.searchParams.set("lon", String(lng))
  weatherUrl.searchParams.set("exclude", "minutely,alerts")
  weatherUrl.searchParams.set("units", "metric")
  weatherUrl.searchParams.set("lang", "kr")
  weatherUrl.searchParams.set("appid", openWeatherApiKey)

  const response = await fetch(weatherUrl)
  if (!response.ok) {
    return jsonResponse({ error: "weather_provider_error" }, 502)
  }

  const raw = await response.json() as OpenWeatherOneCall
  const fetchedAt = Date.now()
  const weatherData = buildWeatherDataFromOneCall(raw, fetchedAt)

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
