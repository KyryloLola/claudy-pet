import type { BandScene, Mood, WeatherKind, WorldScene } from '../types'
import { BODY, tint } from './svg'

/**
 * The band in a terminal, where there is no Svg: three rows of half blocks, two pixels to a cell, so the pet is
 * a little pixel sprite rather than text. Every row is exactly `width` cells of single-width characters, so it
 * never wraps; cells are merged into runs of one style. The caption keeps a zone of its own on the right that
 * the pet and the rain never enter.
 */
export type Run = { text: string; color?: string; bg?: string }

export const ASCII_ROWS = 3
/** Narrower than this the band falls back to one line of text. */
export const ASCII_MIN = 16
const PX_H = ASCII_ROWS * 2
const SPRITE_W = 10
/** Room kept right of the pet for a heart or a "z". */
const PET_ROOM = SPRITE_W + 4
/** The least room the pet keeps to stroll in; the caption gives way first. */
const WALK_MIN = 12
const DETAIL_FROM = 36

type Px = string | null
type Cell = { ch: string; color?: string } | null

const INK = '#2a2030'
const WHITE = '#ffffff'
const BLUSH = '#ff6f91'
const MOUTH = '#7a2f3a'
const HEART = '#ff6b8a'
const GOLD = '#ffd54a'
const SUN = '#ffd27a'
const CLOUD = '#b8c0c8'
const CLOUD_DARK = '#8f99a3'
const GRASS = '#6fbf73'
const GRASS_DARK = '#4e9a52'
const EGG = '#f3e6c8'
const EGG_SPOT = '#d9c49a'
const RAIN = '#6aa7d8'
const SNOW = '#e8edf3'
const STAR = '#e8d38a'
const DIM = '#7a7a7a'

const hex2 = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')

/** A colour as #rrggbb: tint() turns colours into hsl(), which a terminal may not take. */
export const toHex = (c: string) => {
  const m = /^hsl\((-?[\d.]+) ([\d.]+)% ([\d.]+)%\)$/.exec(c)
  if (m === null) return c
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100]
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return `#${hex2(f(0) * 255)}${hex2(f(8) * 255)}${hex2(f(4) * 255)}`
}

const shade = (hex: string, by: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `#${hex2(((n >> 16) & 255) * by)}${hex2(((n >> 8) & 255) * by)}${hex2((n & 255) * by)}`
}

const EYES: Record<'open' | 'up' | 'shut' | 'smile' | 'brow', [string, string]> = {
  open: ['.BBBBBBBB.', 'BWKBBBBWKB'],
  up: ['.BKBBBBKB.', 'BWWBBBBWWB'],
  shut: ['.BBBBBBBB.', 'BKKBBBBKKB'],
  smile: ['.BKBBBBKB.', 'BKBKBBKBKB'],
  brow: ['.KBBBBBBK.', 'BWKBBBBWKB'],
}

const MOUTHS = { small: 'BRBBKKBBRB', wide: 'BRBMMMMBRB', open: 'BRBBMMBBRB', none: 'BRBBBBBBRB', flat: 'BBBBKKBBBB' }

const EGG_ROWS = ['...EEEE...', '..EEEEEE..', '.EESEEEEE.', '.EEEEESEE.', '.EESEEEEE.', '..EEEEEE..']

/** The sprite for a mood, facing right; `beat` ticks every second for blinking and chewing. */
const creature = (mood: Mood, beat: number) => {
  const isGlad = mood === 'happy' || mood === 'party' || mood === 'loved'
  const eyes =
    mood === 'sleeping' ? EYES.shut
    : isGlad ? EYES.smile
    : mood === 'sad' ? EYES.brow
    : mood === 'thinking' ? EYES.up
    : beat % 6 === 0 ? EYES.shut
    : EYES.open
  const mouth =
    isGlad ? MOUTHS.wide
    : mood === 'eating' ? (beat % 2 === 0 ? MOUTHS.wide : MOUTHS.small)
    : mood === 'hungry' ? MOUTHS.open
    : mood === 'sleeping' ? MOUTHS.none
    : mood === 'sad' ? MOUTHS.flat
    : MOUTHS.small
  return ['..BBBBBB..', eyes[0], eyes[1], mouth, '.BBBBBBBB.', '..D....D..']
}

const eggSprite = (eggXp: number) =>
  eggXp >= 8 ? EGG_ROWS.map((r, i) => (i === 1 ? '..EEKEEE..' : i === 2 ? '.EESKKEEE.' : r)) : EGG_ROWS

/** The pet's own sprite rows and palette, facing right or left. */
const petSprite = (o: BandScene, beat: number, facing: number): { rows: string[]; palette: Record<string, string> } => {
  if (o.stage === 0) return { rows: eggSprite(o.eggXp), palette: { E: EGG, S: EGG_SPOT, K: INK } }
  const body = o.golden ? GOLD : toHex(o.look.skin ?? tint(BODY[o.stage]!, o.look.hue))
  const sprite = creature(o.mood, beat)
  return {
    rows: facing < 0 ? sprite.map(r => [...r].reverse().join('')) : sprite,
    palette: { B: body, D: shade(body, 0.75), W: WHITE, K: INK, R: BLUSH, M: MOUTH },
  }
}

const put = (px: Px[][], rows: string[], x: number, y: number, palette: Record<string, string>) =>
  rows.forEach((row, r) =>
    [...row].forEach((v, c) => {
      const color = palette[v]
      const xx = x + c
      if (color !== undefined && px[y + r] !== undefined && xx >= 0 && xx < px[0]!.length) px[y + r]![xx] = color
    }),
  )

/** Pixels and characters into rows of runs: a cell with pixels is a half block, otherwise its character. */
const toRuns = (px: Px[][], chars: Cell[][], width: number): Run[][] =>
  chars.map((rowChars, r) => {
    const runs: Run[] = []
    for (let c = 0; c < width; c++) {
      const top = px[2 * r]![c] ?? null
      const bottom = px[2 * r + 1]![c] ?? null
      const ch = rowChars[c] ?? null
      const cell: Run =
        top !== null && bottom !== null ? { text: '▀', color: top, bg: bottom }
        : top !== null ? { text: '▀', color: top }
        : bottom !== null ? { text: '▄', color: bottom }
        : ch !== null ? { text: ch.ch, color: ch.color }
        : { text: ' ' }
      const last = runs[runs.length - 1]
      if (last !== undefined && last.color === cell.color && last.bg === cell.bg) last.text += cell.text
      else runs.push(cell)
    }
    return runs
  })

const grid = <T>(rows: number, width: number) => Array.from({ length: rows }, () => Array<T | null>(width).fill(null))

/** The slow modules as small pixel sprites, each sitting on the grass: home, holiday piece, garden, balloon. */
const WORLD_PALETTE: Record<string, string> = {
  R: '#c4553d', W: '#e9d2a8', Y: '#ffd86b', U: '#9fc7e6', T: '#8a5d31', w: '#ffffff', o: '#f07f1f', g: '#4f7a32',
  p: '#ff7aa2', y: '#ffd34d', v: '#c7a0ff', f: '#c9a46a', c: '#5bd17a', F: '#2f7a46', h: '#ff6b8a', k: '#f6d7c3', s: '#9aa3ad',
}
const HOMES: Record<Exclude<WorldScene['home'], 'none'>, (isLit: boolean, isSnowy: boolean) => string[]> = {
  bench: () => ['TTTTTT', 'T....T'],
  frame: () => ['...T....', '..T.T...', '.T...T..', '.T...T..', '.TTTTT..'],
  cottage: (isLit, isSnowy) => [isSnowy ? '...ww...' : '...RR...', isSnowy ? '..wwww..' : '..RRRR..', '.RRRRRR.', `.W${isLit ? 'Y' : 'U'}WWTW.`, '.WWWWTW.'],
}
const HOLIDAYS: Record<NonNullable<WorldScene['holiday']>, string[]> = {
  newyear: ['.F.', 'FyF', 'FFF', '.T.'],
  xmas: ['.y.', '.F.', 'FpF', 'FFF', '.T.'],
  valentine: ['h.h', 'hhh', '.h.'],
  earth: ['c.c', '.c.', '.g.'],
  halloween: ['.g.', 'ooo', 'ooo'],
  birthday: ['.y.', 'kpk', 'kkk'],
}
const SEASON_GRASS: Partial<Record<NonNullable<WorldScene['season']>, [string, string]>> = { autumn: ['#c9b458', '#a8923e'], winter: ['#dfe6ee', '#b9c4d6'] }

const putWorld = (px: Px[][], o: WorldScene, zone: number, isNight: boolean, isSnowing: boolean) => {
  const sit = (rows: string[], x: number) => put(px, rows, x, PX_H - 1 - rows.length, WORLD_PALETTE)
  const isWinter = o.season === 'winter' || isSnowing
  if (o.home !== 'none') sit(HOMES[o.home](isNight, isWinter), 1)
  if (o.holiday !== null) sit(HOLIDAYS[o.holiday], 11)
  if (o.garden !== 'none' && !isWinter && zone - 8 > 16) sit([o.season === 'autumn' ? 'f.f.f' : o.garden === 'bed' ? 'p.y.v' : '..y..', o.garden === 'bed' ? 'c.c.c' : '..c..'], zone - 8)
  if (o.balloon) put(px, ['pp', 'pp', '.s', '.s', '.s'], 8, 0, { p: '#ff7aa2', s: '#9aa3ad' })
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/** Where the pet stands along the band, 0 to 1, at `now`. */
export const strideAt = (s: BandScene['stride'], now: number) =>
  s.durMs === 0 ? s.to : s.from + (s.to - s.from) * ease(Math.max(0, Math.min(1, (now - s.startedAt) / s.durMs)))

export const isStriding = (s: BandScene['stride'], now: number) => s.durMs > 0 && now >= s.startedAt && now < s.startedAt + s.durMs

const CLOUDY: WeatherKind[] = ['partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'storm']
const RAIN_EVERY: Partial<Record<WeatherKind, number>> = { drizzle: 9, rain: 5, storm: 3 }

/** Keeps characters that are one cell wide everywhere: Latin, Greek, Cyrillic and common symbols. */
const narrow = (s: string) => [...s].filter(ch => /[ -~ -ʯͰ-ԯ]/.test(ch)).join('')

/** The caption that fits beside room for the pet to walk: all of it, else its last part, else none. */
const captionFor = (caption: string[], width: number) => {
  if (width < DETAIL_FROM || caption.length === 0) return ''
  const fits = (t: string) => t !== '' && width - t.length - 3 - PET_ROOM >= WALK_MIN
  const full = narrow(caption.join(' · ')).trim()
  const last = narrow(caption[caption.length - 1]!).trim()
  return fits(full) ? full : fits(last) ? last : ''
}

/** The band as rows of runs, or null when the terminal is too narrow for it. */
export const asciiBand = (o: BandScene, width: number, now: number): Run[][] | null => {
  const W = Math.floor(width)
  if (W < ASCII_MIN) return null
  const beat = Math.floor(now / 1000)
  const px = grid<string>(PX_H, W)
  const chars = grid<{ ch: string; color?: string }>(ASCII_ROWS, W)
  const isWide = W >= DETAIL_FROM
  const caption = captionFor(o.caption, W)
  /** Where the caption's zone begins: the pet and the rain keep left of it. */
  const zone = caption === '' ? W : W - caption.length - 3
  const w = o.weather

  // Weather behind everything: sun and clouds in the top row, rain and stars in the top two, left of the caption.
  if (w !== null) {
    if (w.isDay && (w.kind === 'clear' || w.kind === 'partly') && isWide) put(px, ['SS', 'SS'], W - 4, 0, { S: SUN })
    if (CLOUDY.includes(w.kind) && isWide) {
      const drift = Math.floor(now / 2000)
      const span = W + 10
      for (let i = 0; i < (w.kind === 'partly' ? 1 : 2); i++) {
        put(px, ['.cccccc.', 'CCCCCCCC'], ((drift + i * Math.floor(span / 2)) % span) - 10, 0, { c: CLOUD, C: CLOUD_DARK })
      }
    }
    for (let c = 0; c < W; c++) {
      const row = (n: number) => (c >= zone ? 0 : n % 2)
      const every = RAIN_EVERY[w.kind]
      if (every !== undefined && (c * 7 + beat) % every === 0) chars[row(c + beat)]![c] = { ch: '╵', color: RAIN }
      if (w.kind === 'snow' && (c * 5 + beat) % 8 === 0) chars[row(c + (beat >> 1))]![c] = { ch: (c + beat) % 3 === 0 ? '*' : '·', color: SNOW }
      if (w.kind === 'fog' && (c + beat) % 6 === 0) chars[row(c)]![c] = { ch: '~', color: DIM }
      if (!w.isDay && (w.kind === 'clear' || w.kind === 'partly') && (c * 13) % 11 === 0) {
        chars[row(c)]![c] = { ch: (c + beat) % 5 === 0 ? '*' : '·', color: STAR }
      }
    }
  }

  // Grass along the bottom, turned by the season when that module is on.
  const [grass, grassDark] = (o.world?.season ? SEASON_GRASS[o.world.season] : undefined) ?? [GRASS, GRASS_DARK]
  for (let c = 0; c < W; c++) {
    px[PX_H - 1]![c] = c % 3 === 0 ? grassDark : grass
    if ((c * 7) % 5 === 1) px[PX_H - 2]![c] = grass
  }
  if (o.world !== null && isWide) putWorld(px, o.world, zone, w !== null && !w.isDay, w?.kind === 'snow')

  // The pet, where its stroll has it now, never in the caption's zone.
  const x = Math.round(strideAt(o.stride, now) * Math.max(0, Math.min(zone, W) - PET_ROOM))
  const { rows, palette } = petSprite(o, beat, o.stride.facing)
  put(px, rows, x, 0, palette)
  const beside = x + SPRITE_W + 1
  if (o.stage > 0 && (o.mood === 'happy' || o.mood === 'loved' || o.mood === 'party')) put(px, ['H.H', 'HHH', '.H.'], beside, 0, { H: HEART })
  if (o.stage > 0 && o.mood === 'sleeping' && beside < W) chars[0]![beside] = { ch: beat % 2 === 0 ? 'z' : 'Z', color: DIM }
  if (o.stage > 0 && o.mood === 'thinking') {
    for (let k = 0; k <= beat % 3; k++) if (beside - 1 + k < W) chars[0]![beside - 1 + k] = { ch: '.', color: DIM }
  }

  // The caption in its own zone on the middle row, one cell from the edge.
  ;[...caption].forEach((ch, k) => {
    chars[1]![W - caption.length - 1 + k] = { ch, color: DIM }
    px[2]![W - caption.length - 1 + k] = null
    px[3]![W - caption.length - 1 + k] = null
  })

  return toRuns(px, chars, W)
}

/** The pet alone, for the stats pane in a terminal. */
export const asciiPortrait = (o: BandScene, now: number): Run[][] => {
  const W = SPRITE_W + 2
  const px = grid<string>(PX_H, W)
  const { rows, palette } = petSprite(o, Math.floor(now / 1000), 1)
  put(px, rows, 1, 0, palette)
  return toRuns(px, grid<{ ch: string; color?: string }>(ASCII_ROWS, W), W)
}
