import type { BandScene, BandView, Live, Pet, PetSettings, Stroll, Weather } from '../types'
import { MOOD_SHORT, STAGES, moodOf } from './pet'
import { WEATHER_LABEL, glowOf } from './weather'
import { isGoldenOn, stageFor, worldOf } from './world'

/** Moods in which the pet stays where it is instead of strolling. */
export const STAYS = ['sleeping', 'eating', 'party', 'loved', 'listening', 'noting'] as const

/** How long after a pose change the picture still plays the move into it. */
export const TRANS_MS = 1500

const eggTurnsLeft = (xp: number) => Math.max(1, Math.ceil((STAGES[1].xp - xp) / 3))

/** What the band shows right now, from the pet, the session and the weather. Pure: same inputs, same scene. */
export const sceneOf = (p: Pet, l: Live, st: Stroll, w: Weather | null, now: number, isLonging = false): BandScene => {
  const mood = moodOf(p, l, now)
  const stage = stageFor(p, now, isLonging)
  const play = mood === 'idle' && l.play !== null && l.playUntil > now ? l.play : null
  const status = stage === 0 ? `egg, hatches in ~${eggTurnsLeft(p.xp)} turns` : MOOD_SHORT[mood]
  return {
    stage,
    mood,
    golden: isGoldenOn(p, now),
    eggXp: stage === 0 ? (p.xp >= 12 ? 12 : p.xp >= 8 ? 8 : 0) : 0,
    look: { hue: p.hue, trait: p.trait, path: p.path, play, skin: p.skin ?? null },
    weather: w === null ? null : { ...w, at: 0, glow: glowOf(w, now) },
    caption: [
      ...(w === null ? [] : [`${w.temp > 0 ? '+' : ''}${w.temp}° ${WEATHER_LABEL[w.kind]}${w.city === '' ? '' : ` · ${w.city}`}`]),
      `${p.name} · ${p.trait} · ${status}`,
    ],
    stride: { from: st.from, to: st.to, startedAt: st.startedAt, durMs: st.durMs, facing: st.facing },
    world: null,
    trans: l.trans && now - l.trans.at < TRANS_MS ? l.trans : null,
  }
}

const ALL_ON: PetSettings = { caption: true, weather: true, plays: true, longing: false, world: false, seasons: false }

export const viewOf = (p: Pet, hidden: boolean, l: Live, st: Stroll, w: Weather | null, now: number, s: PetSettings = ALL_ON): BandView => {
  const scene = sceneOf(p, l, st, s.weather ? w : null, now, s.longing)
  return {
    isHidden: hidden,
    shownAt: l.shownAt,
    name: p.name,
    scene: {
      ...scene,
      caption: s.caption ? scene.caption : [],
      look: s.plays ? scene.look : { ...scene.look, play: null },
      world: worldOf(p, w, now, s),
    },
  }
}

/** The move into a pose plays once, from the picture it changed in: its fading alone is no reason to redraw. */
const settled = (v: BandView) => JSON.stringify({ ...v, scene: { ...v.scene, trans: null } })
export const isSameView = (a: BandView | null, b: BandView) => a !== null && settled(a) === settled(b)

/** Whether the pet should stay put rather than stroll. */
export const isStaying = (scene: BandScene) => (STAYS as readonly string[]).includes(scene.mood) || scene.look.play !== null
