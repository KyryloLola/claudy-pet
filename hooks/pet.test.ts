import { expect, test } from 'claude-code/testing'

import type { Live, Pet, Stroll, Weather } from '../types'
import { ASCII_MIN, ASCII_ROWS, asciiBand, asciiPortrait, toHex } from './ascii'
import { layoutOf } from './layout'
import { openSession } from './lifecycle'
import { DEFAULT_SETTINGS, parseSwitch, statsText } from './stats'
import { SETTLE_MS, choosePlay, decay, finishTurn, moodOf, newLive, newPet, newStroll, settlePath, stageOf, stepStroll, strollAt, tallyUp, toolKind, welcomeBack, withTraits } from './pet'
import { bandSvg } from './svg'
import { isSameView, sceneOf, viewOf } from './view'
import { kindOf, weatherJoy } from './weather'
import { countDay, dayKey, daysToNext, holidayOf, isBalloonDay, isGoldenOn, seasonOf, stageFor, worldOf } from './world'

const calm = (over: Partial<Pet> = {}): Pet => ({ ...newPet(0, () => 0), trait: 'calm', hue: 0, ...over })
const rainy: Weather = { kind: 'rain', temp: 9, isDay: true, wind: 5, city: 'Kyiv', at: 123 }

test('stages, turns and evolution', async () => {
  expect(stageOf(0)).toBe(0)
  expect(stageOf(15)).toBe(1)
  expect(stageOf(5000)).toBe(5)
  const done = finishTurn(calm({ xp: 13 }), 2, 0)
  expect(done.pet.xp).toBe(16)
  expect(done.isEvolved).toBe(true)
})

test('needs drift, but a break never starves the pet', async () => {
  expect(decay(calm(), 10, false).food).toBe(67)
  const back = welcomeBack(calm({ food: 5, joy: 5 }), 8 * 3600_000)
  expect([back.food, back.joy, back.sessions]).toEqual([50, 50, 1])
})

test('an old saved pet gains the new fields and keeps the rest', async () => {
  const { trait: _t, hue: _h, path: _p, tally: _y, ...old } = calm({ name: 'Byte' })
  const up = withTraits(old as Pet, () => 0.99)
  expect([up.name, up.hue, up.trait, up.path]).toEqual(['Byte', 0, 'sleepy', null])
})

test('mood: a short flash first, then the turn, then needs', async () => {
  const l = newLive(0)
  expect(moodOf(calm(), { ...l, flash: 'loved', flashUntil: 10 }, 5)).toBe('loved')
  expect(moodOf(calm(), { ...l, activity: 'thinking' }, 5)).toBe('thinking')
  expect(moodOf(calm({ food: 10 }), l, 5)).toBe('hungry')
  expect(moodOf(calm(), l, 6 * 60_000)).toBe('sleeping')
  expect(moodOf(calm(), l, 5)).toBe('idle')
})

test('weather is folded into a few kinds and only ever lifts the mood', async () => {
  expect([kindOf(0), kindOf(63), kindOf(75), kindOf(96)]).toEqual(['clear', 'rain', 'snow', 'storm'])
  for (const k of ['clear', 'rain', 'storm', 'snow'] as const) expect(weatherJoy(k, false) > 0).toBe(true)
})

test('plays follow the weather and the hour', async () => {
  const seen = new Set(Array.from({ length: 40 }, (_, i) => choosePlay(rainy, 14, () => i / 40)))
  expect(seen.has('puddle') && !seen.has('butterfly')).toBe(true)
})

test('work is tallied and a calling is taken at Teen', async () => {
  expect([toolKind('Bash'), toolKind('Edit'), toolKind('mcp__Claude_Browser__navigate'), toolKind('Agent')]).toEqual(['shell', 'edit', 'explore', null])
  const p = tallyUp(tallyUp(calm({ xp: 200 }), 'edit'), 'edit')
  expect(settlePath(p).pet.path).toBe('writer')
  expect(settlePath(calm({ xp: 100 })).isNew).toBe(false)
})

test('a stroll is settled only after it surely ended, and keeps its drawing', async () => {
  let i = 0
  const rand = () => [0.9, 0.5][i++ % 2]!
  const s = stepStroll(newStroll(0), 7000, false, 'calm', rand)
  expect([s.from, s.to, s.facing, s.isActive]).toEqual([0.5, 0.9, 1, true])
  expect(stepStroll(s, s.startedAt + s.durMs + 1000, false, 'calm', rand)).toBe(s)
  const settled = stepStroll(s, s.startedAt + s.durMs + SETTLE_MS, false, 'calm', rand)
  expect([settled.x, settled.isActive, settled.from, settled.to, settled.startedAt]).toEqual([0.9, false, s.from, s.to, s.startedAt])
})

test('staying put mid-stroll stops the pet where it is', async () => {
  const s = stepStroll(newStroll(0), 7000, false, 'energetic', () => 0.95)
  const mid = s.startedAt + s.durMs / 2
  const stopped = stepStroll(s, mid, true, 'energetic')
  expect(stopped.x).toBe(strollAt(s, mid))
  expect(stopped.isActive).toBe(false)
})

const sceneAt = (p: Pet, l: Live, st: Stroll, now: number) => sceneOf(p, l, st, rainy, now)

test('the view changes only when something visible changes', async () => {
  const p = calm({ xp: 70 })
  const l = newLive(0)
  const st = newStroll(0)
  const a = viewOf(p, false, l, st, rainy, 1000)
  expect(isSameView(a, viewOf({ ...p, food: 60, energy: 50, joy: 55 }, false, l, st, { ...rainy, at: 999 }, 2000))).toBe(true)
  expect(isSameView(a, viewOf(p, false, { ...l, flash: 'loved', flashUntil: 9000 }, st, rainy, 2000))).toBe(false)
  expect(isSameView(a, viewOf(p, true, l, st, rainy, 2000))).toBe(false)
})

test('the same scene, width and anchor draw the same picture, character for character', async () => {
  const scene = sceneAt(calm({ xp: 70 }), newLive(0), newStroll(0), 1000)
  expect(bandSvg(scene, 800, 5000)).toBe(bandSvg(scene, 800, 5000))
  expect(bandSvg(scene, 800, 5000) === bandSvg(scene, 800, 6300)).toBe(false)
})

test('a stroll in flight is drawn from where it is at the anchor; a finished one at rest', async () => {
  const scene = sceneAt(calm({ xp: 70 }), newLive(0), { ...newStroll(0), from: 0.2, to: 0.8, startedAt: 1000, durMs: 4000, isActive: true }, 1000)
  expect(bandSvg(scene, 800, 2500).includes('animation-duration:4000ms;animation-delay:-1500ms')).toBe(true)
  expect(bandSvg(scene, 800, 9000).includes('class="stroll"')).toBe(false)
})

test('every stage, mood, weather and play draws clean svg', async () => {
  const kinds = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'storm'] as const
  for (let stage = 0; stage < 6; stage++) {
    for (const mood of ['idle', 'thinking', 'sleeping', 'sad', 'hungry', 'eating', 'happy', 'party', 'loved'] as const) {
      const w: Weather = { ...rainy, kind: kinds[(stage * 3 + mood.length) % kinds.length]!, isDay: stage % 2 === 0 }
      const svg = bandSvg({ ...sceneOf(calm({ xp: [0, 20, 70, 200, 500, 1200][stage]! }), newLive(0), newStroll(0), w, 0), mood, look: { hue: 120, trait: 'curious', path: stage >= 3 ? 'writer' : null, play: 'sing', skin: stage === 2 ? '#ff9fc2' : null } }, 600, 777)
      expect(svg.includes('undefined') || svg.includes('NaN')).toBe(false)
    }
  }
})

test('the picture is exactly as wide as the band on each surface, so nothing scales it', async () => {
  expect(layoutOf('desktop', 120, true)).toEqual({ kind: 'scene', width: 935, hasCaption: true })
  expect(layoutOf('vscode', 43, true)).toEqual({ kind: 'scene', width: 669, hasCaption: true })
  const narrow = layoutOf('desktop', 40, true)
  expect(narrow.kind === 'scene' && !narrow.hasCaption).toBe(true)
  expect(layoutOf('terminal', 120, false).kind).toBe('text')
  expect(layoutOf('desktop', 121, true, 935)).toEqual(layoutOf('desktop', 120, true))
  expect(layoutOf('desktop', 119, true, 935).kind === 'scene' && (layoutOf('desktop', 119, true, 935) as { width: number }).width <= 119 * 7.83).toBe(true)
})

test('a reload of the mod keeps the session as it is; only a new session restores the pet and counts', async () => {
  const saved = calm({ sessions: 4, lastSeen: 0 })
  const fresh = openSession(saved, null, 60_000)
  expect(fresh.kind).toBe('new')
  if (fresh.kind === 'new') expect(fresh.pet.sessions).toBe(5)
  expect(openSession(saved, newLive(1), 90_000)).toEqual({ kind: 'reload' })
  const first = openSession(undefined, null, 0)
  if (first.kind === 'new') expect(first.pet.sessions).toBe(1)
})

test('nothing animated also carries its position in a transform, which the animation would override', async () => {
  const scene = sceneOf(calm({ xp: 300, goldenDay: dayKey(0) }), newLive(0), newStroll(0), rainy, 0)
  for (const mood of ['loved', 'happy', 'party', 'thinking', 'sleeping'] as const) {
    const svg = bandSvg({ ...scene, mood, golden: true }, 700, 1)
    expect(/<[a-z]+ class="(rise|twinkle|fall|pulse|spin|grow|shrink)"[^>]*transform="translate/.test(svg)).toBe(false)
    expect(/<[a-z]+ transform="translate[^>]*class="(rise|twinkle|fall|pulse|spin|grow|shrink)"/.test(svg)).toBe(false)
  }
})

test('a hungry or sad pet only shows it now and then', async () => {
  const l = newLive(0)
  expect(moodOf(calm({ food: 10 }), l, 120_000 + 5_000)).toBe('hungry')
  expect(moodOf(calm({ food: 10 }), l, 120_000 + 60_000)).toBe('idle')
  expect(moodOf(calm({ joy: 10 }), l, 240_000 + 1_000)).toBe('sad')
  expect(moodOf(calm({ joy: 10 }), l, 240_000 + 30_000)).toBe('idle')
})

test('the scene stays light: a handful of animations whatever the weather', async () => {
  for (const kind of ['clear', 'cloudy', 'rain', 'snow', 'storm', 'fog'] as const) {
    for (const isDay of [true, false]) {
      const svg = bandSvg(sceneOf(calm({ xp: 300 }), newLive(0), newStroll(0), { ...rainy, kind, isDay }, 0), 1100, 1)
      const animated = (svg.match(/class="(sway|hover|sheet|twinkle|flash|spin|rise|fall|pulse|stroll)"/g) ?? []).length
      expect(animated <= 16).toBe(true)
    }
  }
})

test('settings switch on, off, or flip with no word, and refuse anything else', async () => {
  expect([parseSwitch('on', false), parseSwitch('OFF', true), parseSwitch('', true), parseSwitch('maybe', true)]).toEqual([true, false, false, null])
})

test('the stats card has the stage, needs, calling, settings and album', async () => {
  const p = calm({ name: 'Echo', xp: 442, path: 'engineer', food: 80 })
  const text = statsText(p, newLive(0), rainy, [{ name: 'Byte', trait: 'sleepy', hue: 0, stage: 'Kid', path: null, turns: 30, born: 0, retired: 1 }], { ...DEFAULT_SETTINGS, longing: false }, 3 * 86_400_000)
  for (const part of ['Echo · Teen', '442 / 450 xp → Adult', 'calling: engineer', 'food   ▰▰▰▰▰▰▰▰▱▱ 80', 'age 3 d', '+9° rain, Kyiv', 'caption on · weather on · plays on', 'Byte · Kid · sleepy']) {
    expect(text.includes(part)).toBe(true)
  }
})

test('settings shape the view: no caption, no weather, no plays', async () => {
  const live = { ...newLive(0), play: 'sing' as const, playUntil: 9_000 }
  const on = viewOf(calm({ xp: 70 }), false, live, newStroll(0), rainy, 1000, DEFAULT_SETTINGS)
  expect(on.scene.caption.length).toBe(2)
  expect(on.scene.look.play).toBe('sing')
  const off = viewOf(calm({ xp: 70 }), false, live, newStroll(0), rainy, 1000, { ...DEFAULT_SETTINGS, caption: false, weather: false, plays: false })
  expect(off.scene.caption).toEqual([])
  expect(off.scene.weather).toBe(null)
  expect(off.scene.look.play).toBe(null)
})

test('the terminal band is four rows, each exactly as wide as asked, at any width and in any weather', async () => {
  const kinds = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'storm'] as const
  for (const kind of kinds) {
    for (const isDay of [true, false]) {
      for (const xp of [0, 70, 1200]) {
        const scene = sceneOf(calm({ xp, name: 'Байт 🐣' }), newLive(0), { ...newStroll(0), from: 0, to: 1, startedAt: 0, durMs: 9000, isActive: true }, { ...rainy, kind, isDay, city: 'Київ' }, 0)
        for (let width = ASCII_MIN; width <= 300; width += 7) {
          for (const now of [0, 4500, 9000]) {
            const rows = asciiBand(scene, width, now)!
            expect(rows.length).toBe(ASCII_ROWS)
            for (const runs of rows) expect([...runs.map(r => r.text).join('')].length).toBe(width)
          }
        }
      }
    }
  }
  expect(asciiBand(sceneAt(calm({ xp: 70 }), newLive(0), newStroll(0), 0), ASCII_MIN - 1, 0)).toBe(null)
})

test('terminal colours are plain hex', async () => {
  expect(toHex('#ff9f80')).toBe('#ff9f80')
  expect(toHex('hsl(0 100% 50%)')).toBe('#ff0000')
  expect(toHex('hsl(120 100% 25%)')).toBe('#008000')
})

test('in a terminal the caption keeps its own zone: no pet pixel, rain or star ever lands in it', async () => {
  for (const kind of ['rain', 'snow', 'clear'] as const) {
    for (const width of [40, 60, 80, 120, 200]) {
      for (const to of [0, 1]) {
        const scene = sceneOf(calm({ xp: 70 }), newLive(0), { ...newStroll(0), from: to, to, startedAt: 0, durMs: 0 }, { ...rainy, kind, isDay: false }, 0)
        const caption = scene.caption.join(' · ')
        const rows = asciiBand(scene, width, 0)!.map(runs => runs.map(r => r.text).join(''))
        const at = rows[1]!.lastIndexOf(caption)
        const tail = rows[1]!.slice(at - 2)
        if (at >= 0) expect(tail).toBe(`  ${caption} `)
      }
    }
  }
  expect(asciiPortrait(sceneOf(calm({ xp: 70 }), newLive(0), newStroll(0), null, 0), 0).length).toBe(ASCII_ROWS)
})

const DAY = 86_400_000
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime()

test('longing: stages also wait on age, Legend at a year', async () => {
  const p = calm({ xp: 5000, born: 0 })
  expect(stageFor(p, 3 * DAY, false)).toBe(5)
  expect(stageFor(p, 3 * DAY, true)).toBe(1)
  expect(stageFor(p, 40 * DAY, true)).toBe(3)
  expect(stageFor(p, 365 * DAY, true)).toBe(5)
  expect(stageFor(calm({ xp: 5, born: 0 }), 400 * DAY, true)).toBe(0)
  expect(daysToNext(p, 3 * DAY)).toBe(4)
})

test('a day together counts once, on its first finished turn', async () => {
  const once = countDay(calm({ days: 2, lastDay: '' }), at(2026, 3, 10))
  expect(once.days).toBe(3)
  expect(countDay(once, at(2026, 3, 10) + 3_600_000).days).toBe(3)
  expect(countDay(once, at(2026, 3, 11)).days).toBe(4)
})

test('seasons turn south of the equator; holidays are fixed dates; the birthday waits a year', async () => {
  expect(seasonOf(at(2026, 4, 10), 50)).toBe('spring')
  expect(seasonOf(at(2026, 4, 10), -33)).toBe('autumn')
  expect(seasonOf(at(2026, 12, 10))).toBe('winter')
  expect(holidayOf(at(2026, 10, 31), 0)).toBe('halloween')
  expect(holidayOf(at(2026, 12, 25), at(2026, 12, 1))).toBe('xmas')
  expect(holidayOf(at(2027, 1, 1), at(2026, 12, 1))).toBe('newyear')
  expect(holidayOf(at(2026, 6, 3), at(2026, 6, 3))).toBe(null)
  expect(holidayOf(at(2027, 6, 3), at(2026, 6, 3))).toBe('birthday')
  expect(isBalloonDay(at(2026, 8, 17))).toBe(true)
  expect(isBalloonDay(at(2026, 8, 18))).toBe(false)
})

test('the world grows by days together and only shows when its module is on', async () => {
  const on = { ...DEFAULT_SETTINGS, world: true, seasons: true }
  expect(worldOf(calm({ days: 0 }), null, at(2026, 7, 1), on)).toEqual({ home: 'none', garden: 'none', season: 'summer', holiday: null, balloon: false })
  expect(worldOf(calm({ days: 8 }), null, at(2026, 7, 1), on).home).toBe('bench')
  expect(worldOf(calm({ days: 61 }), null, at(2026, 7, 1), on)).toEqual({ home: 'cottage', garden: 'bed', season: 'summer', holiday: null, balloon: false })
  expect(worldOf(calm({ days: 61 }), null, at(2026, 7, 1), { ...DEFAULT_SETTINGS, world: false, seasons: false })).toEqual({ home: 'none', garden: 'none', season: null, holiday: null, balloon: false })
})

test('with every module on, the bands stay clean, light and exactly as wide as asked', async () => {
  const s = { ...DEFAULT_SETTINGS, world: true, seasons: true }
  for (const [day, days] of [[at(2026, 10, 31), 61], [at(2026, 12, 25), 35], [at(2026, 8, 17), 9], [at(2026, 4, 22), 15], [at(2027, 1, 1), 70]] as const) {
    for (const kind of ['clear', 'snow', 'rain'] as const) {
      const v = viewOf(calm({ xp: 500, days, born: day - 400 * DAY }), false, newLive(0), newStroll(0), { ...rainy, kind, isDay: kind !== 'snow' }, day, s)
      const svg = bandSvg(v.scene, 800, 1)
      expect(svg.includes('undefined') || svg.includes('NaN')).toBe(false)
      // The world adds no animation of its own: the count is the plain scene's.
      expect((svg.match(/animation/g) ?? []).length).toBe((bandSvg({ ...v.scene, world: null }, 800, 1).match(/animation/g) ?? []).length)
      for (const width of [20, 40, 80, 160]) {
        for (const runs of asciiBand(v.scene, width, 0)!) expect([...runs.map(r => r.text).join('')].length).toBe(width)
      }
    }
  }
})

test('golden lasts the day it is earned, until local midnight', async () => {
  const noon = new Date(2026, 4, 3, 12).getTime()
  const p = calm({ goldenDay: dayKey(noon), goldenDays: 1 })
  expect(isGoldenOn(p, noon)).toBe(true)
  expect(isGoldenOn(p, new Date(2026, 4, 3, 23, 59).getTime())).toBe(true)
  expect(isGoldenOn(p, new Date(2026, 4, 4, 0, 1).getTime())).toBe(false)
  expect(sceneOf(p, newLive(0), newStroll(0), null, noon).golden).toBe(true)
  expect(sceneOf(p, newLive(0), newStroll(0), null, noon + 86_400_000).golden).toBe(false)
  expect(statsText(p, null, null, [], DEFAULT_SETTINGS, noon).includes('golden today')).toBe(true)
  expect(statsText({ ...p, streak: 7 }, null, null, [], DEFAULT_SETTINGS, noon).includes('clean streak: 7 / 25')).toBe(true)
})
