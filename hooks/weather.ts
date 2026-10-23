import type { Weather, WeatherKind } from '../types'

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

/** How hard it rains or snows, from the same WMO code: 1 light, 2 moderate, 3 heavy. */
export const intensityOf = (code: number): 1 | 2 | 3 => {
  if ([51, 56, 61, 66, 71, 77, 80, 85].includes(code)) return 1
  if ([55, 57, 65, 67, 75, 82, 86, 96, 99].includes(code)) return 3
  return 2
}

const GLOW_MS = 30 * 60_000

/** The half hour either side of sunrise or sunset, when the sky warms. */
export const glowOf = (w: Weather, now: number): 'dawn' | 'dusk' | null => {
  if (w.sunrise !== undefined && Math.abs(now - w.sunrise) < GLOW_MS) return 'dawn'
  if (w.sunset !== undefined && Math.abs(now - w.sunset) < GLOW_MS) return 'dusk'
  return null
}

/** Open-Meteo's local times ("2026-10-23T07:31") and the place's UTC offset, as epoch ms. */
export const localToEpoch = (local: string | undefined, offsetS: number) => (local === undefined ? undefined : Date.parse(`${local}:00Z`) - offsetS * 1000)

/** How the weather lifts the pet's joy per minute: every weather is a good one, sunny days a bit more. */
export const weatherJoy = (kind: WeatherKind, isDay: boolean) => (kind === 'clear' && isDay ? 0.2 : 0.1)
