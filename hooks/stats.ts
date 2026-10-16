import type { AlbumEntry, Live, Pet, PetSettings, Weather } from '../types'
import { PATH_LINE, STAGES, TRAIT } from './pet'
import { WEATHER_LABEL } from './weather'
import { daysToNext, stageFor } from './world'

export const DEFAULT_SETTINGS: PetSettings = { caption: true, weather: true, plays: true, longing: true, world: true, seasons: true }

const bar = (v: number) => {
  const full = Math.round(v / 10)
  return '▰'.repeat(full) + '▱'.repeat(10 - full)
}

const age = (born: number, now: number) => {
  const hours = Math.max(0, (now - born) / 3_600_000)
  return hours < 24 ? `${Math.round(hours)} h` : `${Math.round(hours / 24)} d`
}

/** Reads "on", "off" or nothing (which flips the current value) into a boolean. */
export const parseSwitch = (args: string, current: boolean): boolean | null => {
  const word = args.trim().toLowerCase()
  if (word === '') return !current
  if (['on', 'yes', 'true', '1'].includes(word)) return true
  if (['off', 'no', 'false', '0'].includes(word)) return false
  return null
}

/** One retired pet, for the album list. */
export const albumLine = (a: AlbumEntry) => {
  const job = a.path
  const suffix = job === null ? '' : ` · ${job}`
  return `${a.name} · ${a.stage} · ${a.trait}${suffix} · ${a.turns} turns`
}

/** A plain-text card of everything about the pet, for /pet-stats. */
export const statsText = (p: Pet, l: Live | null, w: Weather | null, album: readonly AlbumEntry[], s: PetSettings, now: number) => {
  const stage = stageFor(p, now, s.longing)
  const nextStage = STAGES[stage + 1]
  const wait = s.longing ? daysToNext(p, now) : null
  const xpLine =
    nextStage === undefined ? `${Math.floor(p.xp)} xp · top stage`
    : wait !== null && p.xp >= nextStage.xp ? `${Math.floor(p.xp)} xp · ${nextStage.name} in ${wait} ${wait === 1 ? 'day' : 'days'}`
    : `${Math.floor(p.xp)} / ${nextStage.xp} xp → ${nextStage.name}`
  const { shell: commands, edit: edits, explore: explores } = p.tally
  const calling = p.path === null ? (stage >= 3 ? 'none yet' : 'decided at Teen') : PATH_LINE[p.path]
  const lines = [
    `${p.name} · ${STAGES[stage]!.name}${p.golden ? ' · golden' : ''}`,
    `${xpLine}`,
    `trait: ${p.trait} (${TRAIT[p.trait].line})`,
    `calling: ${calling}`,
    `work seen: commands ${commands} · edits ${edits} · explore ${explores}`,
    '',
    `food   ${bar(p.food)} ${Math.round(p.food)}`,
    `energy ${bar(p.energy)} ${Math.round(p.energy)}`,
    `joy    ${bar(p.joy)} ${Math.round(p.joy)}`,
    '',
    `age ${age(p.born, now)} · ${p.days ?? 0} days together · ${p.sessions} sessions · ${p.turns} turns · ${p.errors} tool errors`,
    ...(l === null ? [] : [`this session: ${l.sessionTurns} turns, ${l.sessionErrors} errors`]),
    `weather: ${!s.weather ? 'off' : w === null ? 'not fetched yet' : `${w.temp > 0 ? '+' : ''}${w.temp}° ${WEATHER_LABEL[w.kind]}${w.city === '' ? '' : `, ${w.city}`}`}`,
    `settings: ${(Object.keys(DEFAULT_SETTINGS) as (keyof PetSettings)[]).map(k => `${k} ${s[k] ? 'on' : 'off'}`).join(' · ')}`,
  ]
  if (album.length > 0) {
    lines.push('', 'album:')
    for (const a of album) lines.push(albumLine(a))
  }
  return lines.join('\n')
}
