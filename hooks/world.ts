import type { Holiday, Pet, PetSettings, Season, Weather, WorldScene } from '../types'
import { stageOf } from './pet'

/**
 * The slow modules, all computed from the calendar so nothing needs a timer:
 *  - longing: stages also wait on the pet's age in days, Legend at a year;
 *  - world: a home by the tree and a garden by the bush, grown by the days you worked together;
 *  - seasons: the tree and the garden follow the season, and a small piece marks a holiday.
 * Each piece takes one fixed place and replaces the one before it, so the band never fills up.
 */

const DAY = 86_400_000

/** Days of age each stage waits for under longing: an egg still hatches by work alone. */
export const AGE_DAYS = [0, 0, 7, 30, 90, 365] as const

export const ageDays = (p: Pet, now: number) => Math.max(0, Math.floor((now - p.born) / DAY))

/** The stage shown: by work, and under longing also by age. */
export const stageFor = (p: Pet, now: number, isLonging: boolean) => {
  const byWork = stageOf(p.xp)
  if (!isLonging) return byWork
  const age = ageDays(p, now)
  let byAge = 0
  AGE_DAYS.forEach((d, k) => {
    if (age >= d) byAge = k
  })
  return Math.min(byWork, byAge)
}

/** Days until the next stage opens by age, or null when age is not what holds it back. */
export const daysToNext = (p: Pet, now: number) => {
  const stage = stageFor(p, now, true)
  const next = AGE_DAYS[stage + 1]
  if (next === undefined) return null
  const left = next - ageDays(p, now)
  return left > 0 ? left : null
}

/** A local calendar day, as a key: one more of them is one more day worked together. */
export const dayKey = (now: number) => {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Counts a day the first time a turn finishes on it. */
export const countDay = (p: Pet, now: number): Pet => {
  const key = dayKey(now)
  return p.lastDay === key ? p : { ...p, days: (p.days ?? 0) + 1, lastDay: key }
}

const HOME: [number, WorldScene['home']][] = [[60, 'cottage'], [30, 'frame'], [7, 'bench'], [0, 'none']]
const GARDEN: [number, WorldScene['garden']][] = [[45, 'bed'], [14, 'sprouts'], [0, 'none']]
const pickBy = <T,>(steps: [number, T][], days: number) => steps.find(([from]) => days >= from)![1]

/** Meteorological seasons, turned around south of the equator. */
export const seasonOf = (now: number, lat = 50): Season => {
  const m = new Date(now).getMonth()
  const north: Season = m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'
  if (lat >= 0) return north
  return ({ winter: 'summer', spring: 'autumn', summer: 'winter', autumn: 'spring' } as const)[north]
}

/** Holidays on fixed dates only, and the pet's own birthday from its first year on. */
export const holidayOf = (now: number, born: number): Holiday | null => {
  const d = new Date(now)
  const b = new Date(born)
  const [m, day] = [d.getMonth() + 1, d.getDate()]
  if (now - born > 300 * DAY && m === b.getMonth() + 1 && day === b.getDate()) return 'birthday'
  if ((m === 12 && day === 31) || (m === 1 && day === 1)) return 'newyear'
  if (m === 2 && day === 14) return 'valentine'
  if (m === 4 && day === 22) return 'earth'
  if (m === 10 && day >= 29) return 'halloween'
  if (m === 12 && day >= 24 && day <= 26) return 'xmas'
  return null
}

/** A small thing for one day of the year, whatever the modules say. */
export const isBalloonDay = (now: number) => {
  const d = new Date(now)
  return d.getMonth() === 7 && d.getDate() === 17
}

/** What the band shows of the slow modules today. */
export const worldOf = (p: Pet, w: Weather | null, now: number, s: PetSettings): WorldScene => {
  const days = p.days ?? 0
  return {
    home: s.world ? pickBy(HOME, days) : 'none',
    garden: s.world ? pickBy(GARDEN, days) : 'none',
    season: s.seasons ? seasonOf(now, w?.lat) : null,
    holiday: s.seasons ? holidayOf(now, p.born) : null,
    balloon: isBalloonDay(now),
  }
}
