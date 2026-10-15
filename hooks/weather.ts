import type { WeatherKind } from '../types'

/** WMO weather codes, as Open-Meteo reports them, folded into what the scene can draw. */
export const kindOf = (code: number): WeatherKind => {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  clear: 'clear',
  partly: 'partly cloudy',
  cloudy: 'cloudy',
  fog: 'fog',
  drizzle: 'drizzle',
  rain: 'rain',
  snow: 'snow',
  storm: 'storm',
}

/** How the weather lifts the pet's joy per minute: every weather is a good one, sunny days a bit more. */
export const weatherJoy = (kind: WeatherKind, isDay: boolean) => (kind === 'clear' && isDay ? 0.2 : 0.1)
