export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

export function isDuffelConfigured() {
  return Boolean(process.env.DUFFEL_API_KEY)
}

export function isExpediaConfigured() {
  return Boolean(process.env.EXPEDIA_RAPID_API_KEY)
}

export function isMapsConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY)
}

export function isViatorConfigured() {
  return Boolean(process.env.VIATOR_API_KEY || process.env.GETYOURGUIDE_API_KEY)
}

export function isTavilyConfigured() {
  return Boolean(process.env.TAVILY_API_KEY)
}

export function defaultOrigin() {
  return {
    city: process.env.DEFAULT_ORIGIN_CITY || "Mumbai",
    iata: process.env.DEFAULT_ORIGIN_IATA || "BOM",
    lat: Number(process.env.DEFAULT_ORIGIN_LAT || 19.0896),
    lng: Number(process.env.DEFAULT_ORIGIN_LNG || 72.8656),
  }
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash"
}

export function providerStatus() {
  return {
    gemini: isGeminiConfigured(),
    supabase: isSupabaseConfigured(),
    duffel: isDuffelConfigured(),
    expedia: isExpediaConfigured(),
    maps: isMapsConfigured(),
    activities: isViatorConfigured(),
    tavily: isTavilyConfigured(),
  }
}
