import type { BandScene, BandView, Live, Pet, PetSettings, Stroll, Weather } from '../types'
import { MOOD_SHORT, STAGES, moodOf, stageOf } from './pet'
import { WEATHER_LABEL } from './weather'

/** Moods in which the pet stays where it is instead of strolling. */
export const STAYS = ['sleeping', 'eating', 'party', 'loved'] as const

const eggTurnsLeft = (xp: number) => Math.max(1, Math.ceil((STAGES[1].xp - xp) / 3))

/** What the band shows right now, from the pet, the session and the weather. Pure: same inputs, same scene. */
export const sceneOf = (p: Pet, l: Live, st: Stroll, w: Weather | null, now: number): BandScene => {
  const mood = moodOf(p, l, now)
  const stage = stageOf(p.xp)
  const play = mood === 'idle' && l.play !== null && l.playUntil > now ? l.play : null
  const status = stage === 0 ? `egg, hatches in ~${eggTurnsLeft(p.xp)} turns` : MOOD_SHORT[mood]
  return {
    stage,
    mood,
    golden: p.golden,
    eggXp: stage === 0 ? (p.xp >= 12 ? 12 : p.xp >= 8 ? 8 : 0) : 0,
    look: { hue: p.hue, trait: p.trait, path: p.path, play, skin: p.skin ?? null },
    weather: w === null ? null : { ...w, at: 0 },
    caption: [
      ...(w === null ? [] : [`${w.temp > 0 ? '+' : ''}${w.temp}° ${WEATHER_LABEL[w.kind]}${w.city === '' ? '' : ` · ${w.city}`}`]),
      `${p.name} · ${p.trait} · ${status}`,
    ],
    stride: { from: st.from, to: st.to, startedAt: st.startedAt, durMs: st.durMs, facing: st.facing },
  }
}

const ALL_ON: PetSettings = { caption: true, weather: true, plays: true }

export const viewOf = (p: Pet, hidden: boolean, l: Live, st: Stroll, w: Weather | null, now: number, s: PetSettings = ALL_ON): BandView => {
  const scene = sceneOf(p, l, st, s.weather ? w : null, now)
  return {
    isHidden: hidden,
    isTyping: l.isTyping,
    shownAt: l.shownAt,
    name: p.name,
    scene: {
      ...scene,
      caption: s.caption ? scene.caption : [],
      look: s.plays ? scene.look : { ...scene.look, play: null },
    },
  }
}

export const isSameView = (a: BandView | null, b: BandView) => a !== null && JSON.stringify(a) === JSON.stringify(b)

/** Whether the pet should stay put rather than stroll. */
export const isStaying = (scene: BandScene) => (STAYS as readonly string[]).includes(scene.mood) || scene.look.play !== null
