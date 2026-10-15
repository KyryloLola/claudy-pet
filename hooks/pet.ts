import type { Live, Mood, Path, Pet, Play, Stroll, Tally, Trait, Weather } from '../types'

export const STAGES = [
  { name: 'Egg', xp: 0 },
  { name: 'Baby', xp: 15 },
  { name: 'Kid', xp: 60 },
  { name: 'Teen', xp: 180 },
  { name: 'Adult', xp: 450 },
  { name: 'Legend', xp: 1000 },
] as const

const MINUTE = 60_000
const NAG_EVERY = 120_000
const NAG_FOR = 10_000

const clamp = (v: number) => Math.max(0, Math.min(100, v))

export const stageOf = (xp: number) => {
  let i = 0
  STAGES.forEach((s, k) => {
    if (xp >= s.xp) i = k
  })
  return i
}

export const TRAITS: readonly Trait[] = ['calm', 'energetic', 'curious', 'sleepy']
const NAMES = ['Byte', 'Pixel', 'Mochi', 'Bolt', 'Nori', 'Tofu', 'Echo', 'Fizz', 'Pico', 'Miso'] as const

/** How each temperament plays out: walk pace, nap threshold, how hard work and setbacks land. */
export const TRAIT: Record<Trait, { walkS: number; sleepAfterMin: number; workCost: number; hurt: number; toolXp: number; playEveryS: number; line: string }> = {
  calm: { walkS: 60, sleepAfterMin: 5, workCost: 1.2, hurt: 3, toolXp: 0.5, playEveryS: 300, line: 'takes things easy' },
  energetic: { walkS: 32, sleepAfterMin: 9, workCost: 2, hurt: 6, toolXp: 0.5, playEveryS: 240, line: 'always on the move' },
  curious: { walkS: 45, sleepAfterMin: 6, workCost: 1.5, hurt: 6, toolXp: 0.8, playEveryS: 270, line: 'loves watching tools run' },
  sleepy: { walkS: 75, sleepAfterMin: 3, workCost: 1.5, hurt: 5, toolXp: 0.5, playEveryS: 360, line: 'naps at every chance' },
}

const pick = <T,>(list: readonly T[], r: number) => list[Math.floor(r * list.length) % list.length]!

/** A fresh egg with its own name, temperament and colour; `rand` is injectable for tests. */
export const newPet = (now: number, rand: () => number = Math.random, avoid: readonly string[] = []): Pet => ({
  name: pick(NAMES.filter(n => !avoid.includes(n)).length > 0 ? NAMES.filter(n => !avoid.includes(n)) : NAMES, rand()),
  trait: pick(TRAITS, rand()),
  hue: Math.round(rand() * 360),
  xp: 0,
  food: 70,
  energy: 80,
  joy: 70,
  born: now,
  sessions: 0,
  turns: 0,
  errors: 0,
  golden: false,
  lastSeen: now,
  path: null,
  tally: { shell: 0, edit: 0, explore: 0 },
})

/** A pet saved before temperaments existed keeps its name and colour and gets a temperament now. */
export const withTraits = (pet: Pet, rand: () => number = Math.random): Pet => ({
  ...pet,
  trait: pet.trait ?? pick(TRAITS, rand()),
  hue: pet.hue ?? 0,
  path: pet.path ?? null,
  tally: pet.tally ?? { shell: 0, edit: 0, explore: 0 },
})

/** A fresh session: nothing is going on yet, and the first play waits a couple of minutes. */
export const newLive = (now: number): Live => ({
  startedAt: now,
  activity: 'idle',
  flash: null,
  flashUntil: 0,
  lastActive: now,
  sessionTurns: 0,
  sessionErrors: 0,
  isTyping: false,
  shownAt: now,
  play: null,
  playUntil: 0,
  nextPlayAt: now + 120_000,
})

/** Time passing: food and joy drift down, energy comes back while nothing runs. */
export const decay = (pet: Pet, minutes: number, isBusy: boolean): Pet => {
  const food = clamp(pet.food - 0.3 * minutes)
  const hungerPenalty = food < 25 ? 0.6 * minutes : 0
  return {
    ...pet,
    food,
    energy: clamp(pet.energy + (isBusy ? 0 : 2 * minutes)),
    joy: clamp(pet.joy - 0.4 * minutes - hungerPenalty),
  }
}

/** Coming back after a break: the same drift, gentler, and never below a floor. */
export const welcomeBack = (pet: Pet, now: number): Pet => {
  const minutes = Math.min(8 * 60, Math.max(0, (now - pet.lastSeen) / MINUTE))
  const drifted = decay(pet, minutes / 4, false)
  return {
    ...drifted,
    food: Math.max(50, drifted.food),
    joy: Math.max(50, drifted.joy),
    sessions: pet.sessions + 1,
    lastSeen: now,
  }
}

export const feed = (pet: Pet, amount: number): Pet => ({ ...pet, food: clamp(pet.food + amount), joy: clamp(pet.joy + 3) })

export const work = (pet: Pet): Pet => ({ ...pet, energy: clamp(pet.energy - TRAIT[pet.trait].workCost) })

export const hurt = (pet: Pet): Pet => ({ ...pet, joy: clamp(pet.joy - TRAIT[pet.trait].hurt), errors: pet.errors + 1 })

export const cuddle = (pet: Pet): Pet => ({ ...pet, joy: clamp(pet.joy + 10) })

/** A finished turn: experience from the work done, a little joy. */
export const finishTurn = (pet: Pet, tools: number, outputTokens: number) => {
  const before = stageOf(pet.xp)
  const xp = Math.round((pet.xp + 2 + tools * TRAIT[pet.trait].toolXp + outputTokens / 400) * 10) / 10
  const next: Pet = { ...pet, xp, turns: pet.turns + 1, joy: clamp(pet.joy + 2) }
  return { pet: next, isEvolved: stageOf(xp) > before }
}

/** What the pet shows now: a short flash first, then work, then its needs. */
export const moodOf = (pet: Pet, live: Live, now: number): Mood => {
  if (live.flash !== null && live.flashUntil > now) return live.flash
  if (live.activity === 'thinking') return 'thinking'
  if (now - live.lastActive > TRAIT[pet.trait].sleepAfterMin * MINUTE || pet.energy < 15) return 'sleeping'
  // Needs show only now and then: ten seconds in every two minutes, not all the time.
  const isNagging = now % NAG_EVERY < NAG_FOR
  if (pet.food < 25 && isNagging) return 'hungry'
  if (pet.joy < 25 && isNagging) return 'sad'
  return 'idle'
}

export const MOOD_SHORT: Record<Mood, string> = {
  idle: 'chilling',
  thinking: 'watching Claude think',
  sleeping: 'napping',
  sad: 'needs a pat',
  hungry: 'hungry',
  eating: 'nom nom',
  happy: 'happy',
  party: 'evolved!',
  loved: 'loved ♥',
}

export const FACE: Record<Mood, string> = {
  idle: '(•‿•)',
  thinking: '(•_•)…',
  sleeping: '(－_－) zZ',
  sad: '(╥_╥)',
  hungry: '(°o°)',
  eating: '(•ω•)🍪',
  happy: '(^‿^)',
  party: '\\(^o^)/',
  loved: '(♥‿♥)',
}

/** Which kind of work a tool call is, for the pet's tally and what it carries. */
export const toolKind = (tool: string): keyof Tally | null => {
  if (tool === 'Bash' || tool === 'PowerShell') return 'shell'
  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') return 'edit'
  if (['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'].includes(tool)) return 'explore'
  if (tool.startsWith('mcp__Claude_Browser__') || tool.startsWith('mcp__claude-in-chrome__')) return 'explore'
  return null
}

export const tallyUp = (pet: Pet, kind: keyof Tally): Pet => ({ ...pet, tally: { ...pet.tally, [kind]: pet.tally[kind] + 1 } })

const PATH_OF: Record<keyof Tally, Path> = { shell: 'engineer', edit: 'writer', explore: 'explorer' }

/** At Teen and beyond, a pet with no calling yet takes the one its tally points to. */
export const settlePath = (pet: Pet): { pet: Pet; isNew: boolean } => {
  if (pet.path !== null || stageOf(pet.xp) < 3) return { pet, isNew: false }
  const ranked = (Object.keys(pet.tally) as (keyof Tally)[]).sort((a, b) => pet.tally[b] - pet.tally[a])
  const top = ranked[0]!
  if (pet.tally[top] === 0) return { pet, isNew: false }
  return { pet: { ...pet, path: PATH_OF[top] }, isNew: true }
}

export const PATH_LINE: Record<Path, string> = {
  engineer: 'engineer: grew up on shell commands',
  writer: 'writer: grew up on file edits',
  explorer: 'explorer: grew up reading and searching',
}

/** Something fitting to do right now, from the weather and the hour. */
export const choosePlay = (w: Weather | null, hour: number, rand: () => number = Math.random): Play => {
  const options: Play[] = ['sing']
  if (w !== null) {
    if ((w.kind === 'clear' || w.kind === 'partly') && w.isDay) options.push('butterfly', 'butterfly')
    if (w.kind === 'rain' || w.kind === 'drizzle' || w.kind === 'storm') options.push('puddle', 'puddle')
    if (w.kind === 'snow') options.push('snowball', 'snowball')
    if ((w.kind === 'clear' || w.kind === 'partly') && !w.isDay) options.push('stars', 'stars')
    if (w.kind === 'cloudy' || w.kind === 'fog' || w.wind > 25) options.push('leaf')
  }
  if (hour >= 6 && hour < 11) options.push('stretch')
  if (hour >= 20) options.push('yawn')
  return options[Math.floor(rand() * options.length) % options.length]!
}

/**
 * Where the pet is along the band, kept in session state: it rests at `x` (0 left wall, 1 right wall) and now and then
 * strolls to a new spot. A stroll is only settled into `x` a little after it ends, so a picture the desktop
 * starts late has finished it by then, and the next picture draws the pet exactly where it stopped.
 */

export const SETTLE_MS = 4500
const REST_S: Record<Trait, [number, number]> = { calm: [9, 16], energetic: [3, 7], curious: [5, 10], sleepy: [14, 26] }

export const newStroll = (now: number): Stroll => ({ x: 0.5, from: 0.5, to: 0.5, startedAt: 0, durMs: 0, facing: 1, nextAt: now + 6000, isActive: false })

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

export const strollAt = (s: Stroll, now: number) =>
  !s.isActive || s.durMs === 0 ? s.x : s.from + (s.to - s.from) * easeInOut(Math.max(0, Math.min(1, (now - s.startedAt) / s.durMs)))

const restUntil = (trait: Trait, now: number, rand: () => number) => {
  const [lo, hi] = REST_S[trait]
  return now + (lo + rand() * (hi - lo)) * 1000
}

/** One step of the stroll: stop where it is if the pet must stay, settle a finished stroll, or start a new one when rested. */
export const stepStroll = (s: Stroll, now: number, isStaying: boolean, trait: Trait, rand: () => number = Math.random): Stroll => {
  if (isStaying) {
    if (!s.isActive) return s
    const x = strollAt(s, now)
    return { ...s, x, from: x, to: x, startedAt: 0, durMs: 0, isActive: false, nextAt: restUntil(trait, now, rand) }
  }
  if (s.isActive) {
    if (now < s.startedAt + s.durMs + SETTLE_MS) return s
    // Settling keeps the finished stroll as it was drawn: the picture already shows the pet at `to`, so nothing redraws.
    return { ...s, x: s.to, isActive: false, nextAt: restUntil(trait, now, rand) }
  }
  if (now < s.nextAt) return s
  let to = rand()
  if (Math.abs(to - s.x) < 0.15) to = s.x > 0.5 ? s.x - 0.3 : s.x + 0.3
  to = Math.max(0, Math.min(1, to))
  const durMs = Math.round((Math.abs(to - s.x) / (2 / TRAIT[trait].walkS)) * 1000)
  return { ...s, from: s.x, to, startedAt: now, durMs, facing: to > s.x ? 1 : -1, isActive: true }
}
