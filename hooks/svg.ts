import type { BandScene, Mood, Path, Play, Trait, Transition, Weather, WeatherKind, WorldScene } from '../types'

export const BODY = ['#f3e6c8', '#9fd8ff', '#8be0a4', '#ffd27a', '#ff9f80', '#c7a0ff']
const SCALE = [1, 0.72, 0.82, 0.92, 1, 1.06]
/** The pet's own colour: the stage colour turned around the hue wheel by `deg`. */
export const tint = (hex: string, deg: number) => {
  if (deg === 0) return hex
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h = (h * 60 + deg + 360) % 360
  return `hsl(${h.toFixed(0)} ${(sat * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`
}

const CONFETTI = ['#e5484d', '#3e9bff', '#30a46c', '#f2a31b', '#8e4ec6', '#12a594']

const STYLE = `
  .ink { fill: #2b2f36; }
  .stroke { stroke: #2b2f36; stroke-width: 3; stroke-linecap: round; fill: none; }
  .fill-box { transform-box: fill-box; transform-origin: 50% 50%; }
  .bob { transform-box: fill-box; transform-origin: 50% 100%; animation: bob 2.4s ease-in-out infinite; }
  .fast .bob { animation-duration: .55s; }
  .slow .bob { animation-duration: 4.5s; }
  .jump .bob { animation: jump .7s ease-in-out infinite; }
  .t-calm .bob { animation-duration: 3.6s; }
  .t-energetic .bob { animation: hop .9s ease-in-out infinite; }
  .glance { animation: glance 5s ease-in-out infinite; }
  .stretch .bob { animation: stretch 2s ease-in-out infinite; }
  .flutter { animation: flutter 3s ease-in-out infinite; }
  .wing { transform-box: fill-box; transform-origin: 50% 100%; animation: wing .25s ease-in-out infinite; }
  .shoot { animation: shoot 2.6s ease-in infinite; }
  .leaf { animation: leaf 4s ease-in-out infinite; }
  .grow { transform-box: fill-box; transform-origin: 50% 100%; animation: grow 8s linear both; }
  .tip { transform-box: fill-box; transform-origin: 50% 50%; animation: tip 3s ease-in-out infinite; }
  @keyframes stretch { 0%,100% { transform: scale(1,1); } 40%,60% { transform: scale(.92,1.12); } }
  @keyframes flutter { 0% { transform: translate(0,0); } 25% { transform: translate(-30px,-14px); } 50% { transform: translate(-60px,4px); } 75% { transform: translate(-28px,18px); } 100% { transform: translate(0,0); } }
  @keyframes wing { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(.25); } }
  @keyframes shoot { 0%,40% { transform: translate(0,0); opacity: 0; } 45% { opacity: 1; } 75%,100% { transform: translate(-150px,40px); opacity: 0; } }
  @keyframes leaf { 0% { transform: translate(0,-30px) rotate(0); opacity: 0; } 10% { opacity: 1; } 50% { transform: translate(-22px,70px) rotate(120deg); } 90% { opacity: 1; } 100% { transform: translate(6px,150px) rotate(260deg); opacity: 0; } }
  @keyframes grow { from { transform: scale(.3); } to { transform: scale(1.4); } }
  @keyframes tip { 0%,45%,100% { transform: rotate(0); } 50%,95% { transform: rotate(180deg); } }
  @keyframes hop { 0%,100% { transform: translateY(0) scale(1.03,.96); } 45% { transform: translateY(-7px) scale(.98,1.03); } }
  @keyframes glance { 0%,30%,100% { transform: translateX(0); } 40%,55% { transform: translateX(-4px); } 65%,80% { transform: translateX(4px); } }
  .eyes { transform-box: fill-box; transform-origin: 50% 50%; animation: blink 4.2s infinite; }
  .wobble { transform-box: fill-box; transform-origin: 50% 100%; animation: wobble 2.2s ease-in-out infinite; }
  .pulse { animation: pulse 1.2s ease-in-out infinite; }
  .rise { animation: rise 2.4s ease-in infinite; }
  .fall { animation: fall 1.1s linear infinite; }
  .spin { transform-box: fill-box; transform-origin: 50% 50%; animation: spin 2.4s linear infinite; }
  .chomp { transform-box: fill-box; transform-origin: 50% 50%; animation: chomp .35s ease-in-out infinite; }
  .shrink { transform-box: fill-box; transform-origin: 50% 50%; animation: shrink 2.5s linear infinite; }
  .twinkle { transform-box: fill-box; transform-origin: 50% 50%; animation: twinkle 1.6s ease-in-out infinite; }
  .confetti { animation: confetti 2.2s linear infinite; }
  @keyframes bob { 0%,100% { transform: scale(1,1); } 50% { transform: scale(1.04,.95); } }
  @keyframes jump { 0%,100% { transform: translateY(0) scale(1.05,.92); } 50% { transform: translateY(-26px) scale(.96,1.05); } }
  @keyframes blink { 0%,93%,100% { transform: scaleY(1); } 96% { transform: scaleY(.1); } }
  @keyframes wobble { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
  @keyframes pulse { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
  @keyframes rise { 0% { transform: translate(0,0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(14px,-46px); opacity: 0; } }
  @keyframes fall { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(40px); opacity: 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes chomp { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(.3); } }
  @keyframes shrink { 0% { transform: scale(1); } 90% { transform: scale(.2); opacity: 1; } 100% { transform: scale(.2); opacity: 0; } }
  @keyframes twinkle { 0%,100% { transform: scale(.4); opacity: .3; } 50% { transform: scale(1); opacity: 1; } }
  @keyframes confetti { 0% { transform: translateY(-20px) rotate(0); } 100% { transform: translateY(210px) rotate(540deg); } }
  .pupil-move { animation: pupil-move .45s ease-out both; }
  .note-in { animation: note-in .45s ease-out both; }
  .note-out { animation: note-out .45s ease-in both; }
  .pop { transform-box: fill-box; transform-origin: 20% 100%; animation: pop .35s ease-out both; }
  @keyframes note-in { from { transform: translateY(30px); opacity: 0; } }
  @keyframes note-out { to { transform: translateY(30px); opacity: 0; } }
  @keyframes pop { from { transform: scale(.3); opacity: 0; } }
`

/** Where the pupils look, up or down from the middle. */
const LISTENS: readonly Mood[] = ['listening', 'noting']
const lookOf = (mood: Mood) => (mood === 'thinking' ? -4 : mood === 'hungry' ? 2 : LISTENS.includes(mood) ? 5 : 0)
const hasPupils = (mood: Mood) => !['sleeping', 'happy', 'party', 'loved', 'sad'].includes(mood)

const eyes = (mood: Mood, trait: Trait, skin: string, from: Mood | null = null) => {
  if (mood === 'sleeping') {
    return `<path class="stroke" d="M-26 -8 Q-18 -2 -10 -8 M10 -8 Q18 -2 26 -8"/>`
  }
  if (mood === 'happy' || mood === 'party' || mood === 'loved') {
    return `<path class="stroke" d="M-26 -6 Q-18 -16 -10 -6 M10 -6 Q18 -16 26 -6"/>`
  }
  if (mood === 'sad') {
    return `<g class="eyes"><ellipse cx="-18" cy="-6" rx="7" ry="8" fill="#fff"/><ellipse cx="18" cy="-6" rx="7" ry="8" fill="#fff"/>
      <circle class="ink" cx="-18" cy="-3" r="4"/><circle class="ink" cx="18" cy="-3" r="4"/></g>
      <path class="stroke" d="M-28 -14 L-13 -19 M28 -14 L13 -19"/>`
  }
  const look = lookOf(mood)
  // Coming from another pose, the pupils glide from where they were, once.
  const dy = from !== null && hasPupils(from) ? lookOf(from) - look : 0
  const lookX = 0
  const glance = trait === 'curious' && (mood === 'idle' || mood === 'thinking') ? 'glance' : ''
  const lids = trait === 'sleepy'
    ? `<path d="M-27.5 -12 Q-18 -22 -8.5 -12 Q-18 -6.5 -27.5 -12 Z M8.5 -12 Q18 -22 27.5 -12 Q18 -6.5 8.5 -12 Z" fill="${skin}" stroke="#2b2f36" stroke-width="1.6"/>`
    : ''
  return `<g class="eyes"><ellipse cx="-18" cy="-8" rx="9" ry="11" fill="#fff"/><ellipse cx="18" cy="-8" rx="9" ry="11" fill="#fff"/>
    ${dy === 0 ? '' : `<style>@keyframes pupil-move { from { transform: translateY(${dy}px); } }</style><g class="pupil-move">`}<g class="${glance}"><circle class="ink" cx="${-18 + lookX}" cy="${-7 + look}" r="5"/><circle class="ink" cx="${18 + lookX}" cy="${-7 + look}" r="5"/>
    <circle cx="${-16 + lookX}" cy="${-10 + look}" r="1.6" fill="#fff"/><circle cx="${20 + lookX}" cy="${-10 + look}" r="1.6" fill="#fff"/></g>${dy === 0 ? '' : '</g>'}${lids}</g>`
}

const mouth = (mood: Mood) => {
  switch (mood) {
    case 'happy':
    case 'party':
    case 'loved':
      return `<path d="M-12 12 Q0 28 12 12 Z" fill="#7a2f3a"/>`
    case 'sad':
      return `<path class="stroke" d="M-10 22 Q0 13 10 22"/>`
    case 'hungry':
      return `<ellipse cx="0" cy="17" rx="6" ry="7" fill="#7a2f3a"/><path d="M5 22 q2 8 0 12" stroke="#7fc8ff" stroke-width="3" fill="none" stroke-linecap="round" class="pulse"/>`
    case 'eating':
      return `<ellipse class="chomp" cx="0" cy="17" rx="8" ry="6" fill="#7a2f3a"/>`
    case 'thinking':
      return `<path class="stroke" d="M-6 18 L6 16"/>`
    case 'sleeping':
      return `<ellipse cx="0" cy="18" rx="4" ry="3" fill="#7a2f3a"/>`
    default:
      return `<path class="stroke" d="M-10 14 Q0 22 10 14"/>`
  }
}

const accessories = (stage: number) => {
  let out = ''
  if (stage >= 3) {
    out += `<g class="wobble"><path class="stroke" d="M0 -46 Q4 -58 0 -68"/><circle cx="0" cy="-71" r="5" fill="#ff6b8a"/></g>`
  }
  if (stage >= 4) {
    out += `<path d="M-34 -36 L-40 -54 L-24 -42 Z M34 -36 L40 -54 L24 -42 Z" fill="#2b2f36" opacity=".75"/>`
  }
  if (stage >= 5) {
    out += `<path d="M-20 -50 L-20 -66 L-10 -57 L0 -70 L10 -57 L20 -66 L20 -50 Z" fill="#ffc83d" stroke="#b8860b" stroke-width="2"/>`
  }
  return out
}

const PATH_GEAR: Record<Path, string> = {
  engineer: `<path d="M-46 -30 Q0 -44 46 -30" stroke="#5d6773" stroke-width="5" fill="none"/>
    <circle cx="-14" cy="-36" r="9" fill="#9fd8ff" stroke="#2b2f36" stroke-width="3"/><circle cx="14" cy="-36" r="9" fill="#9fd8ff" stroke="#2b2f36" stroke-width="3"/>`,
  writer: `<g transform="translate(40 -36) rotate(35)"><rect x="-3.5" y="-22" width="7" height="34" fill="#ffc83d" stroke="#2b2f36" stroke-width="2"/>
    <path d="M-3.5 12 L0 21 L3.5 12 Z" fill="#f3e6c8" stroke="#2b2f36" stroke-width="2"/><rect x="-3.5" y="-26" width="7" height="5" fill="#ff8fa3" stroke="#2b2f36" stroke-width="2"/></g>`,
  explorer: `<ellipse cx="0" cy="-42" rx="46" ry="8" fill="#c8a165" stroke="#2b2f36" stroke-width="3"/>
    <path d="M-26 -42 Q-24 -66 0 -66 Q24 -66 26 -42 Z" fill="#d9b67a" stroke="#2b2f36" stroke-width="3"/><rect x="-25" y="-50" width="50" height="5" fill="#8a5d31"/>`,
}

/** The gear of the pet's calling, from Teen on. */
const calling = (stage: number, look: Look) => {
  const job = look.path ?? null
  return stage >= 3 && job !== null ? PATH_GEAR[job] : ''
}

/** A notepad and pencil held low on the right, while the pet takes notes on a long draft. */
const NOTEPAD = `<g transform="translate(30 30) rotate(-12)"><rect x="-14" y="-12" width="28" height="30" rx="3" fill="#fffdf5" stroke="#2b2f36" stroke-width="2.5"/><path d="M-8 -3 h16 M-8 4 h16 M-8 11 h10" stroke="#9aa3ad" stroke-width="2"/></g><g transform="translate(52 26) rotate(30)"><rect x="-3" y="-18" width="6" height="26" fill="#ffc83d" stroke="#2b2f36" stroke-width="2"/><path d="M-3 8 L0 15 L3 8 Z" fill="#2b2f36"/></g>`

const notepad = (mood: Mood, from: Mood | null) => {
  if (mood === 'noting') return from === null || from === 'noting' ? NOTEPAD : `<g class="note-in">${NOTEPAD}</g>`
  return from === 'noting' ? `<g class="note-out">${NOTEPAD}</g>` : ''
}

const creature = (stage: number, mood: Mood, golden: boolean, look: Look, from: Mood | null = null) => {
  const skin = look.skin ?? tint(BODY[stage]!, look.hue)
  const fill = golden ? 'url(#gold)' : skin
  return `
    <ellipse cx="-22" cy="46" rx="12" ry="6" fill="${golden ? '#d9a400' : skin}" stroke="#2b2f36" stroke-width="2"/>
    <ellipse cx="22" cy="46" rx="12" ry="6" fill="${golden ? '#d9a400' : skin}" stroke="#2b2f36" stroke-width="2"/>
    <path d="M0 -48 C34 -48 54 -22 54 8 C54 36 32 48 0 48 C-32 48 -54 36 -54 8 C-54 -22 -34 -48 0 -48 Z"
      fill="${fill}" stroke="#2b2f36" stroke-width="3"/>
    <ellipse cx="0" cy="26" rx="28" ry="16" fill="#fff" opacity=".35"/>
    ${accessories(stage)}
    <circle cx="-34" cy="8" r="6" fill="#ff8fa3" opacity=".55"/>
    <circle cx="34" cy="8" r="6" fill="#ff8fa3" opacity=".55"/>
    ${eyes(look.play === 'stars' ? 'thinking' : mood, look.trait, golden ? '#ffd54a' : skin, from)}
    ${look.play === 'yawn' ? '<ellipse class="pulse" cx="0" cy="18" rx="7" ry="9" fill="#7a2f3a"/>' : mouth(mood)}
    ${calling(stage, look)}
    ${notepad(mood, from)}
`
}

const egg = (mood: Mood, xp: number) => {
  const cracks = xp >= 8 ? `<path class="stroke" d="M-30 -6 L-18 2 L-8 -8 L4 2 L14 -6 L28 2" stroke-width="2.5"/>` : ''
  const peek = xp >= 12 && mood !== 'sleeping'
    ? `<g class="eyes"><circle class="ink" cx="-9" cy="14" r="3.5"/><circle class="ink" cx="9" cy="14" r="3.5"/></g>`
    : ''
  return `<g class="wobble">
    <path d="M0 -55 C32 -55 46 -10 46 15 C46 42 25 55 0 55 C-25 55 -46 42 -46 15 C-46 -10 -32 -55 0 -55 Z"
      fill="#f3e6c8" stroke="#2b2f36" stroke-width="3"/>
    <circle cx="-16" cy="-24" r="7" fill="#9fd8ff" opacity=".7"/>
    <circle cx="18" cy="22" r="9" fill="#8be0a4" opacity=".7"/>
    <circle cx="-20" cy="30" r="5" fill="#ff9f80" opacity=".7"/>
    ${cracks}${peek}
  </g>`
}

const overlay = (mood: Mood) => {
  switch (mood) {
    case 'thinking':
      return `<g transform="translate(120 34)">
        <ellipse cx="0" cy="0" rx="34" ry="18" fill="#fff" stroke="#2b2f36" stroke-width="2"/>
        <circle class="ink pulse" cx="-12" cy="0" r="4"/>
        <circle class="ink pulse" cx="0" cy="0" r="4" style="animation-delay:.2s"/>
        <circle class="ink pulse" cx="12" cy="0" r="4" style="animation-delay:.4s"/>
        <circle cx="-18" cy="26" r="5" fill="#fff" stroke="#2b2f36" stroke-width="2"/>
      </g>`
    case 'sleeping':
      return [0, 0.8, 1.6].map((d, i) => `<text class="rise" x="${150 + i * 8}" y="${80 - i * 10}" font-family="system-ui,sans-serif"
        font-weight="700" font-size="${14 + i * 4}" fill="#6b7480" style="animation-delay:${d}s">Z</text>`).join('')
    case 'sad':
      return `<g transform="translate(120 26)">
        <path d="M-34 8 a14 14 0 0 1 10 -22 a18 18 0 0 1 32 -4 a14 14 0 0 1 26 12 a10 10 0 0 1 -4 14 Z" fill="#9aa4b1"/>
        ${[-20, -4, 12].map((x, i) => `<path class="fall" d="M${x} 14 l-2 8" stroke="#3e9bff" stroke-width="3" stroke-linecap="round" style="animation-delay:${i * 0.3}s"/>`).join('')}
      </g>`
    case 'hungry':
      return `<g transform="translate(186 46)">
        <ellipse cx="0" cy="0" rx="26" ry="20" fill="#fff" stroke="#2b2f36" stroke-width="2"/>
        <circle cx="-6" cy="0" r="10" fill="#d9a066"/><circle cx="-9" cy="-3" r="1.8" class="ink"/><circle cx="-3" cy="3" r="1.8" class="ink"/>
        <text x="9" y="7" font-family="system-ui,sans-serif" font-weight="700" font-size="18" class="ink pulse">?</text>
      </g>`
    case 'eating':
      return `<g transform="translate(162 140)"><g class="shrink"><circle cx="0" cy="0" r="12" fill="#d9a066" stroke="#8a5d31" stroke-width="2"/>
        <circle cx="-4" cy="-3" r="2" class="ink"/><circle cx="4" cy="3" r="2" class="ink"/></g></g>
        ${[0, 1, 2].map(i => `<circle class="fall" cx="${150 + i * 7}" cy="150" r="2" fill="#d9a066" style="animation-delay:${i * 0.25}s"/>`).join('')}`
    case 'party':
      return Array.from({ length: 18 }, (_, i) => `<rect class="confetti" x="${(i * 53) % 230 + 5}" y="0" width="6" height="10" rx="1"
        fill="${CONFETTI[i % CONFETTI.length]}" style="animation-delay:${(i % 6) * 0.35}s"/>`).join('')
    case 'loved':
      return [0, 0.6, 1.2].map((d, i) => `<g transform="translate(${92 + i * 28} 96)"><path class="rise" style="animation-delay:${d}s"
        d="M0 4 C-6 -4 -14 2 0 12 C14 2 6 -4 0 4 Z" fill="#ff5c7a" transform="scale(1.4)"/></g>`).join('')
    case 'happy':
      return [[70, 60], [170, 50], [180, 110]].map(([x, y], i) => `<g transform="translate(${x} ${y})"><path class="twinkle" style="animation-delay:${i * 0.4}s"
        d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#ffc83d"/></g>`).join('')
    default:
      return ''
  }
}

const sparkles = () => [[40, 40], [200, 30], [30, 150], [212, 140]].map(([x, y], i) => `<g transform="translate(${x} ${y})"><path class="twinkle" style="animation-delay:${i * 0.4}s"
  d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" fill="#ffd54a"/></g>`).join('')

const DEFS = `<defs>
    <style>${STYLE}</style>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#ffb300"/></linearGradient>
  </defs>`

/** The pet in its own 240×200 box: shadow, body, mood overlay. */
/** Who the pet is beyond its stage, and what it is up to: colour, temperament, calling, play, what it carries. */
export type Look = { hue: number; trait: Trait; path?: Path | null; play?: Play | null; skin?: string | null }

/** Little scenes for each play, in the pet's own 240×200 box. */
const playScene = (play: Play) => {
  switch (play) {
    case 'butterfly':
      return `<g transform="translate(190 70)"><g class="flutter"><g class="wing"><path d="M0 0 C-12 -14 -16 2 0 0 C12 -14 16 2 0 0" fill="#ff8fc4" stroke="#2b2f36" stroke-width="1.5"/></g>
        <rect x="-1" y="-3" width="2" height="8" rx="1" fill="#2b2f36"/></g></g>`
    case 'puddle':
      return `<ellipse cx="120" cy="184" rx="48" ry="7" fill="#6f8fb0" opacity=".6"/>
        ${[-30, -10, 14, 32].map((x, i) => `<circle class="rise" style="animation-duration:.9s;animation-delay:${i * 0.18}s" cx="${120 + x}" cy="178" r="3" fill="#7fb2e0"/>`).join('')}`
    case 'snowball':
      return `<g transform="translate(176 176)"><circle class="grow" cx="0" cy="-8" r="9" fill="#fff" stroke="#9aa4b1" stroke-width="2"/></g>`
    case 'stars':
      return `<g transform="translate(220 14)"><g class="shoot"><path d="M0 0 L26 -7" stroke="#fff6c2" stroke-width="3" stroke-linecap="round"/><circle r="3.5" fill="#fff6c2"/></g></g>`
    case 'leaf':
      return `<g transform="translate(168 10)"><g class="leaf"><path d="M0 0 C10 -8 18 0 0 14 C-18 0 -10 -8 0 0 Z" fill="#e0a43a" stroke="#8a5d31" stroke-width="1.5"/></g></g>`
    case 'sing':
      return ['♪', '♫', '♪'].map((n, i) => `<text class="rise" style="animation-delay:${i * 0.7}s" x="${150 + i * 6}" y="${78 - i * 6}" font-size="${18 + i * 3}" fill="#6b7480" font-family="system-ui,sans-serif">${n}</text>`).join('')
    default:
      return ''
  }
}

const PLAIN: Look = { hue: 0, trait: 'calm' }

/** Where the feet stand in the pet's own box: smaller stages scale toward it, so no stage floats. */
const FEET = 184

const scene = (stage: number, mood: Mood, golden: boolean, xp: number, look: Look = PLAIN, trans: Transition | null = null) => {
  const from = trans === null ? null : trans.from
  const motion = mood === 'sleeping' ? 'slow' : mood === 'party' || look.play === 'puddle' ? 'jump'
    : look.play === 'stretch' ? 'stretch' : `t-${look.trait}`
  const body = stage === 0 ? egg(mood, xp) : creature(stage, mood, golden, look, from)
  return `<ellipse cx="120" cy="182" rx="${46 * SCALE[stage]!}" ry="7" fill="#000" opacity=".12"/>
  <g class="${motion}"><g transform="translate(120 ${stage === 0 ? 124 : FEET - 52 * SCALE[stage]!}) scale(${SCALE[stage]})"><g class="bob">${body}</g></g></g>
  ${golden ? sparkles() : ''}
  ${mood === 'thinking' && from !== null ? `<g class="pop">${overlay(mood)}</g>` : overlay(mood)}
  ${look.play ? playScene(look.play) : ''}`
}

export const BAND_H = 74
const BAND_SCALE = 0.36
const WALL = 32
const FLOOR = 7
/** Where the pet stands or how it strolls, as fractions of the walkable width. */

const SKY_DAY: Record<WeatherKind, [string, string]> = {
  clear: ['#9fd6ff', '#e4f4ff'],
  partly: ['#a9d8f7', '#e6f2fb'],
  cloudy: ['#c2ccd6', '#e4e9ee'],
  fog: ['#d3d8dd', '#eef0f2'],
  drizzle: ['#a7b6c5', '#d6dde4'],
  rain: ['#93a5b8', '#c9d3dd'],
  snow: ['#c9d6e3', '#f1f5f9'],
  storm: ['#5c687a', '#95a0b0'],
}
const SKY_NIGHT: Record<WeatherKind, [string, string]> = {
  clear: ['#111a36', '#2a3966'],
  partly: ['#151d38', '#2d3a62'],
  cloudy: ['#21283a', '#3a4356'],
  fog: ['#2a303d', '#454c5b'],
  drizzle: ['#1d2434', '#343e52'],
  rain: ['#1a2131', '#303a4e'],
  snow: ['#25304a', '#44516c'],
  storm: ['#10141e', '#272f3f'],
}

/** Continuity across redraws: a looping animation resumes at the clock's phase. */
const phaseAt = (nowMs: number, periodS: number, offsetS = 0) => -(((nowMs / 1000) + offsetS) % periodS)

/** A cloud resting in place with a slow sway: a restart of its loop is invisible, so a redraw never makes it jump. */
const cloud = (x: number, y: number, k: number, fill: string, swayS: number, nowMs: number, offsetS: number) =>
  `<g class="hover" style="animation-duration:${swayS}s;animation-delay:${phaseAt(nowMs, swayS, offsetS).toFixed(2)}s">
    <g transform="translate(${x.toFixed(1)} ${y}) scale(${k})" fill="${fill}">
      <circle cx="0" cy="0" r="9"/><circle cx="11" cy="-5" r="11"/><circle cx="24" cy="0" r="9"/><rect x="0" y="0" width="24" height="9"/>
    </g></g>`

type Season = NonNullable<WorldScene['season']>

/** Leaf colours by season, day and night: autumn turns, a snowless winter goes dull. */
const LEAVES: Record<Season | 'none', { day: [string, string]; night: [string, string] }> = {
  none: { day: ['#4f9a52', '#6fb86a'], night: ['#2f5a3a', '#3b6c45'] },
  spring: { day: ['#4f9a52', '#6fb86a'], night: ['#2f5a3a', '#3b6c45'] },
  summer: { day: ['#4f9a52', '#6fb86a'], night: ['#2f5a3a', '#3b6c45'] },
  autumn: { day: ['#d27a2c', '#eda23e'], night: ['#6e4424', '#80552c'] },
  winter: { day: ['#5f7c62', '#738f74'], night: ['#2c4232', '#36503c'] },
}

const tree = (x: number, base: number, night: boolean, snowy: boolean, season: Season | null = null) => {
  const [leaf, leafLight] = LEAVES[season ?? 'none'][night ? 'night' : 'day']
  return `<g transform="translate(${x} ${base}) scale(.62) translate(${-x} ${-base})"><g class="sway" style="transform-origin:${x}px ${base}px">
    <rect x="${x - 3}" y="${base - 26}" width="6" height="26" fill="${night ? '#4a3a2c' : '#7a5636'}"/>
    <circle cx="${x}" cy="${base - 36}" r="17" fill="${leaf}"/>
    <circle cx="${x - 9}" cy="${base - 28}" r="11" fill="${leafLight}"/>
    <circle cx="${x + 10}" cy="${base - 30}" r="10" fill="${leafLight}"/>
    ${snowy ? `<path d="M${x - 16} ${base - 42} q16 -18 32 0 q-16 -6 -32 0 Z" fill="#fff"/>` : ''}
  </g></g>`
}

const bush = (x: number, base: number, night: boolean, snowy: boolean, flowers: boolean, season: Season | null = null) => {
  const leaf = season === 'autumn' || season === 'winter' ? LEAVES[season][night ? 'night' : 'day'][0] : night ? '#2f5a3a' : '#5aa957'
  return `<g transform="translate(${x} ${base}) scale(.7) translate(${-x} ${-base})"><g class="sway" style="transform-origin:${x}px ${base}px">
    <circle cx="${x - 10}" cy="${base - 9}" r="11" fill="${leaf}"/>
    <circle cx="${x + 6}" cy="${base - 13}" r="13" fill="${leaf}"/>
    <circle cx="${x + 18}" cy="${base - 7}" r="9" fill="${leaf}"/>
    ${flowers ? `<circle cx="${x - 6}" cy="${base - 14}" r="2.5" fill="#ff7aa2"/><circle cx="${x + 10}" cy="${base - 20}" r="2.5" fill="#ffd34d"/><circle cx="${x + 18}" cy="${base - 10}" r="2.5" fill="#fff"/>` : ''}
    ${snowy ? `<path d="M${x - 20} ${base - 14} q26 -20 46 -2 q-22 -6 -46 2 Z" fill="#fff"/>` : ''}
  </g></g>`
}

/** Sky, sun or moon, clouds, hills, trees on the walls, the ground: everything behind the pet. */
const backdrop = (width: number, w: Weather, nowMs: number, season: Season | null = null) => {
  const night = !w.isDay
  const [top, bottom] = (night ? SKY_NIGHT : SKY_DAY)[w.kind]
  const snowy = w.kind === 'snow'
  const turned = season === 'autumn' ? (night ? ['#4a4a2c', '#3d3d24'] : ['#b8c26a', '#9dab52']) : season === 'winter' ? (night ? ['#2f4434', '#27392b'] : ['#9db79a', '#86a283']) : null
  const ground = snowy ? (night ? '#b9c4d6' : '#f4f7fb') : turned !== null ? turned[0]! : night ? '#2f5134' : '#7cc56b'
  const groundDark = snowy ? (night ? '#97a3b8' : '#dfe6ee') : turned !== null ? turned[1]! : night ? '#264229' : '#66b058'
  const hill = snowy ? (night ? '#5b6782' : '#dbe3ec') : night ? '#26354a' : '#bfe0b4'
  const isOpen = w.kind === 'clear' || w.kind === 'partly'
  let out = `<rect width="${width}" height="${BAND_H}" fill="url(#sky)"/>`

  if (isOpen && !night) {
    out += `<g transform="translate(${width * 0.62} 13) scale(.7)"><g class="spin" style="animation-duration:30s;animation-delay:${phaseAt(nowMs, 30).toFixed(2)}s">
      ${Array.from({ length: 8 }, (_, i) => `<rect x="-1.5" y="-21" width="3" height="6" rx="1.5" fill="#ffd34d" transform="rotate(${i * 45})"/>`).join('')}
    </g><circle r="12" fill="#ffd34d"/></g>`
  }
  if (night) {
    out += `<g transform="translate(${width * 0.62} 12) scale(.75)"><circle r="10" fill="#f4f1d8"/><circle cx="5" cy="-3" r="9" fill="${top}"/></g>`
    if (isOpen) {
      out += Array.from({ length: Math.min(8, Math.round(width / 80)) }, (_, i) => {
        const x = (i * 97) % (width - 2 * WALL) + WALL
        const y = 4 + ((i * 37) % 22)
        return `<circle class="twinkle" style="animation-delay:${phaseAt(nowMs, 1.6, (i % 5) * 0.37).toFixed(2)}s" cx="${x}" cy="${y}" r="1.3" fill="#fff"/>`
      }).join('')
    }
  }

  const cloudCount = w.kind === 'clear' ? 0 : w.kind === 'partly' ? 2 : 5
  const cloudFill = w.kind === 'storm' ? '#4b5464' : w.kind === 'rain' || w.kind === 'drizzle' ? '#8d99a8' : night ? '#4a5368' : '#ffffff'
  const windy = w.wind > 25
  for (let i = 0; i < cloudCount; i++) {
    const x = WALL + ((i * 0.37 + 0.11) % 1) * (width * 0.55 - WALL)
    out += cloud(x, 8 + (i % 3) * 5, 0.55 + (i % 2) * 0.2, cloudFill, (windy ? 3 : 7) + i, nowMs, i * 1.3)
  }

  out += `<path d="M0 ${BAND_H - FLOOR} Q${width * 0.2} ${BAND_H - 20} ${width * 0.45} ${BAND_H - FLOOR - 4} T${width} ${BAND_H - FLOOR - 2} V${BAND_H} H0 Z" fill="${hill}" opacity=".8"/>`
  out += `<rect y="${BAND_H - FLOOR}" width="${width}" height="${FLOOR}" fill="${ground}"/>`
  out += `<rect y="${BAND_H - FLOOR}" width="${width}" height="2" fill="${groundDark}"/>`
  if (w.kind === 'rain' || w.kind === 'storm') {
    out += [0.3, 0.55, 0.8].map(f => `<ellipse cx="${width * f}" cy="${BAND_H - 4}" rx="16" ry="2.5" fill="#6f8fb0" opacity=".55"/>`).join('')
  }
  if (!snowy) {
    out += Array.from({ length: Math.round(width / 28) }, (_, i) => {
      const x = 8 + i * 28 + (i % 3) * 5
      return `<path d="M${x} ${BAND_H - FLOOR} l-2 -6 M${x} ${BAND_H - FLOOR} l1 -8 M${x} ${BAND_H - FLOOR} l4 -5" stroke="${groundDark}" stroke-width="1.6" stroke-linecap="round"/>`
    }).join('')
  }

  if (season === 'autumn' && !snowy) {
    out += [[60, '#e3913f'], [width * 0.34, '#f2b84b'], [width * 0.58, '#d27a2c'], [width * 0.79, '#f2b84b']]
      .map(([x, c], i) => `<ellipse cx="${Number(x).toFixed(1)}" cy="${BAND_H - FLOOR + 2}" rx="2.6" ry="1.3" fill="${c}" transform="rotate(${i % 2 ? 20 : -15} ${Number(x).toFixed(1)} ${BAND_H - FLOOR + 2})"/>`)
      .join('')
  }
  out += tree(WALL / 2 + 2, BAND_H - FLOOR + 2, night, snowy, season)
  out += bush(width - WALL / 2 - 6, BAND_H - FLOOR + 2, night, snowy, (w.kind === 'clear' && !night) || (season === 'spring' && !night), season)
  return out
}

/*
 * The slow modules: a home by the tree, a garden by the bush, the season on the tree and one small piece for
 * a holiday. All static: they add no animation, and they change at most once a day.
 */
const GROUND = BAND_H - FLOOR
const HOME_X = 46
const HOLIDAY_X = 94

/** Blossom in spring over the tree on the left wall (crown near 18, 46); the other seasons are in the leaf colours. */
const seasonTree = (season: WorldScene['season']) => {
  const ring = (fill: string, n: number) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return `<circle cx="${(18 + Math.cos(a) * 7).toFixed(1)}" cy="${(46 + Math.sin(a) * 5).toFixed(1)}" r="2.1" fill="${fill}"/>`
  }).join('')
  return season === 'spring' ? ring('#ffc2d6', 8) : ''
}

const bench = (x: number) => `<g fill="#8a5d31"><rect x="${x}" y="${GROUND - 9}" width="26" height="3" rx="1"/><rect x="${x}" y="${GROUND - 15}" width="26" height="2.5" rx="1"/><rect x="${x + 3}" y="${GROUND - 6}" width="2.5" height="6"/><rect x="${x + 20}" y="${GROUND - 6}" width="2.5" height="6"/></g>`

const hutFrame = (x: number) => `<g stroke="#8a5d31" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M${x} ${GROUND} V${GROUND - 22} M${x + 34} ${GROUND} V${GROUND - 22} M${x - 3} ${GROUND - 21} L${x + 17} ${GROUND - 36} L${x + 37} ${GROUND - 21}"/><path d="M${x} ${GROUND - 8} H${x + 34} M${x} ${GROUND - 15} H${x + 20}" stroke="#b07d4a"/></g><rect x="${x + 22}" y="${GROUND - 4}" width="12" height="4" fill="#b07d4a"/>`

const cottage = (x: number, isLit: boolean, isSnowy: boolean, hasGarland: boolean) => `<g>
  <rect x="${x}" y="${GROUND - 24}" width="36" height="24" fill="#e9d2a8" stroke="#a7834f" stroke-width="1.2"/>
  <path d="M${x - 4} ${GROUND - 23} L${x + 18} ${GROUND - 40} L${x + 40} ${GROUND - 23} Z" fill="#c4553d"/>
  ${isSnowy ? `<path d="M${x - 4} ${GROUND - 23} L${x + 18} ${GROUND - 40} L${x + 40} ${GROUND - 23} L${x + 34} ${GROUND - 26} L${x + 18} ${GROUND - 37} L${x + 2} ${GROUND - 26} Z" fill="#fff"/>` : ''}
  <rect x="${x + 5}" y="${GROUND - 17}" width="10" height="9" fill="${isLit ? '#ffd86b' : '#9fc7e6'}"/><rect x="${x + 21}" y="${GROUND - 15}" width="9" height="15" fill="#8a5d31"/>
  ${hasGarland ? Array.from({ length: 7 }, (_, i) => `<circle cx="${x - 1 + i * 6.2}" cy="${GROUND - 22 + (i % 2) * 1.5}" r="1.5" fill="${['#ff5b5b', '#ffd34d', '#5bd17a', '#6aa7ff'][i % 4]}"/>`).join('') : ''}
</g>`

const flowers = (x: number, n: number, isFaded: boolean) => Array.from({ length: n }, (_, i) => {
  const fx = x + i * 7 + (i % 2) * 2
  const h = 6 + (i % 3) * 2
  const c = isFaded ? '#c9a46a' : ['#ff7aa2', '#ffd34d', '#ffffff', '#c7a0ff'][i % 4]
  return `<path d="M${fx} ${GROUND} v-${h}" stroke="#4f9a52" stroke-width="1.3"/><circle cx="${fx}" cy="${GROUND - h}" r="2.2" fill="${c}"/>`
}).join('')

const fir = (x: number, hasStar: boolean) => `<path d="M${x} ${GROUND - 22} L${x - 8} ${GROUND - 4} H${x + 8} Z" fill="#2f7a46"/><rect x="${x - 1.5}" y="${GROUND - 4}" width="3" height="4" fill="#7a5636"/>
  ${[[-3, -9], [3, -13], [-1, -16], [4, -6], [-5, -5]].map(([dx, dy], i) => `<circle cx="${x + dx!}" cy="${GROUND + dy!}" r="1.3" fill="${['#ff5b5b', '#ffd34d', '#6aa7ff'][i % 3]}"/>`).join('')}
  ${hasStar ? `<circle cx="${x}" cy="${GROUND - 23}" r="2.2" fill="#ffd34d"/>` : ''}`

const HOLIDAY: Record<NonNullable<WorldScene['holiday']>, (x: number) => string> = {
  newyear: x => fir(x, false),
  xmas: x => fir(x, true),
  valentine: x => `<path d="M${x} ${GROUND - 3} l-6 -6 a3.4 3.4 0 0 1 6 -4 a3.4 3.4 0 0 1 6 4 Z" fill="#ff6b8a"/>`,
  earth: x => `<path d="M${x} ${GROUND} v-9" stroke="#4f9a52" stroke-width="1.6"/><ellipse cx="${x - 3}" cy="${GROUND - 9}" rx="3.5" ry="2" fill="#6fb86a"/><ellipse cx="${x + 3}" cy="${GROUND - 11}" rx="3.5" ry="2" fill="#6fb86a"/>`,
  halloween: x => `<ellipse cx="${x}" cy="${GROUND - 4}" rx="6" ry="4.5" fill="#f07f1f"/><path d="M${x} ${GROUND - 8} v-3" stroke="#4f7a32" stroke-width="1.6"/>`,
  birthday: x => `<rect x="${x - 7}" y="${GROUND - 8}" width="14" height="8" rx="1.5" fill="#f6d7c3"/><rect x="${x - 7}" y="${GROUND - 8}" width="14" height="2.5" fill="#ff9fc2"/><path d="M${x} ${GROUND - 8} v-4" stroke="#6aa7ff" stroke-width="1.4"/><circle cx="${x}" cy="${GROUND - 13}" r="1.3" fill="#ffd34d"/>`,
}

/** A small balloon tied by the tree, one day a year. */
const balloon = () => `<path d="M38 ${GROUND} q3 -14 1 -27" stroke="#9aa3ad" stroke-width=".8" fill="none"/><ellipse cx="39" cy="${GROUND - 31}" rx="4" ry="5" fill="#ff7aa2"/><circle cx="37.8" cy="${GROUND - 33}" r="1" fill="#fff" opacity=".7"/>`

const worldSvg = (o: WorldScene, width: number, w: Weather) => {
  const isWinter = o.season === 'winter' || w.kind === 'snow'
  let out = seasonTree(o.season)
  if (o.home === 'bench') out += bench(HOME_X)
  if (o.home === 'frame') out += hutFrame(HOME_X)
  if (o.home === 'cottage') out += cottage(HOME_X, !w.isDay, isWinter, o.holiday === 'newyear' || o.holiday === 'xmas')
  if (o.garden !== 'none' && !isWinter) out += flowers(width - 118, o.garden === 'bed' ? 5 : 3, o.season === 'autumn')
  if (o.holiday !== null) out += HOLIDAY[o.holiday](HOLIDAY_X)
  if (o.balloon) out += balloon()
  return out
}

/**
 * A number in [0, 1) that looks random but is the same for the same `n` on every draw, so drops scatter
 * without lining up at any band width and the picture's source stays the same between redraws.
 */
export const scatter = (n: number) => {
  let t = (n + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** How many drops or flakes, by how hard it falls: light rain is sparse, heavy rain dense. */
const DENSITY = { 1: 0.55, 2: 1, 3: 1.6 } as const

/** Rain, snow, fog and lightning: everything in front of the pet. */
const foreground = (width: number, w: Weather, nowMs: number) => {
  let out = ''
  // Rain and snow move as whole sheets: one animation each instead of one per drop, so a busy machine
  // repaints far less. Each sheet holds its drops twice, a band's height apart, so the loop is seamless.
  const sheet = (drops: string, periodS: number) =>
    `<g class="sheet" style="animation-duration:${periodS}s;animation-delay:${phaseAt(nowMs, periodS).toFixed(2)}s">${drops}<g transform="translate(0 ${-BAND_H})">${drops}</g></g>`
  if (w.kind === 'rain' || w.kind === 'drizzle' || w.kind === 'storm') {
    const n = Math.round((width / (w.kind === 'drizzle' ? 22 : 11)) * DENSITY[w.intensity ?? 2])
    const len = w.kind === 'drizzle' ? 5 : 9
    const drops = Array.from({ length: n }, (_, i) => {
      const x = Math.round(scatter(i * 2 + 1) * width * 10) / 10
      const y = Math.round(scatter(i * 2 + 2) * BAND_H * 10) / 10
      return `<line x1="${x}" y1="${y}" x2="${(x - 2).toFixed(1)}" y2="${(y + len).toFixed(1)}" stroke="#4f78a8" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`
    }).join('')
    out += sheet(drops, 0.8)
  }
  if (w.kind === 'snow') {
    const flakes = Array.from({ length: Math.round((width / 16) * DENSITY[w.intensity ?? 2]) }, (_, i) => {
      const x = (scatter(i * 2 + 101) * width).toFixed(1)
      const y = (scatter(i * 2 + 102) * BAND_H).toFixed(1)
      return `<circle cx="${x}" cy="${y}" r="${1.5 + (i % 3) * 0.6}" fill="#fff"/>`
    }).join('')
    out += `<g class="hover" style="animation-duration:3s">${sheet(flakes, 6)}</g>`
  }
  if (w.kind === 'fog') {
    out += [10, 28].map((y, i) => `<rect class="hover" style="animation-duration:${8 + i * 3}s;animation-delay:${phaseAt(nowMs, 8 + i * 3).toFixed(2)}s" x="${-20 + i * 40}" y="${y}" width="${width}" height="10" rx="5" fill="#fff" opacity=".45"/>`).join('')
  }
  if (w.kind === 'storm') {
    out += `<rect class="flash" style="animation-delay:${phaseAt(nowMs, 7).toFixed(2)}s" width="${width}" height="${BAND_H}" fill="#fff"/>`
    out += `<path class="flash" style="animation-delay:${phaseAt(nowMs, 7).toFixed(2)}s" d="M${width * 0.6} 0 l-8 18 h7 l-10 20 l18 -24 h-8 l7 -14 Z" fill="#ffe680"/>`
  }
  return out
}

/** Things the pet wears for the weather, in its own 240×200 box. */
const gear = (stage: number, w: Weather) => {
  if (stage === 0) return ''
  const s = SCALE[stage]!
  if (w.kind === 'rain' || w.kind === 'drizzle' || w.kind === 'storm') {
    const top = 132 - 80 * s
    return `<path d="M120 ${top} v${70 * s}" stroke="#2b2f36" stroke-width="4"/>
      <path d="M${120 - 70 * s} ${top + 6} Q120 ${top - 50 * s} ${120 + 70 * s} ${top + 6} Z" fill="#e5484d" stroke="#2b2f36" stroke-width="3"/>`
  }
  if (w.kind === 'clear' && w.isDay && w.temp >= 18) {
    const y = 132 - 8 * s
    return `<g fill="#1d232b"><rect x="${120 - 28 * s}" y="${y - 7 * s}" width="${20 * s}" height="${13 * s}" rx="${4 * s}"/>
      <rect x="${120 + 8 * s}" y="${y - 7 * s}" width="${20 * s}" height="${13 * s}" rx="${4 * s}"/>
      <rect x="${120 - 8 * s}" y="${y - 3 * s}" width="${16 * s}" height="${3 * s}"/></g>`
  }
  if (w.temp <= 0) {
    const y = 132 + 30 * s
    return `<path d="M${120 - 44 * s} ${y} Q120 ${y + 12 * s} ${120 + 44 * s} ${y}" stroke="#3e9bff" stroke-width="${9 * s}" fill="none" stroke-linecap="round"/>`
  }
  return ''
}

const escapeXml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The caption in the top right corner, on a soft pill so it reads over any sky. */
const label = (width: number, lines: readonly string[], isDay: boolean) => {
  if (lines.length === 0) return ''
  const longest = Math.max(...lines.map(l => l.length))
  const w = longest * 5.8 + 14
  const h = lines.length * 13 + 6
  const x = width - w - 6
  return `<g font-family="system-ui,-apple-system,sans-serif" font-size="11">
    <rect x="${x}" y="5" width="${w}" height="${h}" rx="7" fill="${isDay ? '#ffffff' : '#0b1020'}" opacity="${isDay ? 0.72 : 0.5}"/>
    ${lines.map((l, i) => `<text x="${width - 13}" y="${17 + i * 13}" text-anchor="end" fill="${isDay ? '#1d232b' : '#e6eaef'}" ${i === 0 ? 'font-weight="600"' : 'opacity=".85"'}>${escapeXml(l)}</text>`).join('')}
  </g>`
}

const fallbackWeather = (nowMs: number): Weather => {
  const hour = new Date(nowMs).getHours()
  return { kind: 'partly', temp: 15, isDay: hour >= 7 && hour < 20, wind: 5, city: '', at: nowMs }
}

/**
 * The band: sky, ground, trees on the walls and the pet in one picture.
 * Every loop is phased to `anchor`, the moment this exact picture was first drawn, never to the moment
 * of drawing: a surface that redraws the band with nothing changed gets the same source back and keeps
 * the picture running instead of reloading it.
 */
export const bandSvg = (o: BandScene, width: number, anchor: number) => {
  const w = o.weather ?? fallbackWeather(anchor)
  const [top, plainBottom] = (w.isDay ? SKY_DAY : SKY_NIGHT)[w.kind]
  // Around sunrise and sunset the sky warms at the horizon; softer under rain or cloud.
  const isOpen = w.kind === 'clear' || w.kind === 'partly'
  const bottom = w.glow === 'dawn' ? (isOpen ? '#ffcfa3' : '#e3c2ae') : w.glow === 'dusk' ? (isOpen ? '#ff9f7a' : '#d9ab9a') : plainBottom
  const petW = 240 * BAND_SCALE
  const range = Math.max(0, width - 2 * WALL - petW)
  const px = (f: number) => (WALL + f * range).toFixed(1)
  const s = o.stride
  const elapsed = anchor - s.startedAt
  const isStrolling = s.durMs > 0 && elapsed < s.durMs
  const place = isStrolling
    ? `class="stroll" style="animation-duration:${s.durMs}ms;animation-delay:${-Math.round(elapsed)}ms"`
    : `transform="translate(${px(s.to)} 0)"`
  const turn = s.facing === 1 ? '' : `transform="translate(${petW.toFixed(1)} 0) scale(-1 1)"`
  const swayS = w.wind > 25 ? 1.2 : 3.2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${BAND_H}" width="${width}" height="${BAND_H}" overflow="hidden">
  ${DEFS}
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <clipPath id="frame"><rect width="${width}" height="${BAND_H}" rx="10"/></clipPath>
  </defs>
  <style>
    .stroll { animation: stroll 1s ease-in-out both; }
    .hover { animation: hover 7s ease-in-out infinite alternate; }
    .sway { animation: sway ${swayS}s ease-in-out infinite; animation-delay: ${phaseAt(anchor, swayS).toFixed(2)}s; }
    .sheet { animation: sheet 1s linear infinite; }
    .flash { opacity: 0; animation: flash 7s linear infinite; }
    @keyframes stroll { from { transform: translateX(${px(s.from)}px); } to { transform: translateX(${px(s.to)}px); } }
    @keyframes hover { from { transform: translateX(-6px); } to { transform: translateX(6px); } }
    @keyframes sway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
    @keyframes sheet { from { transform: translateY(0); } to { transform: translateY(${BAND_H}px); } }
    @keyframes flash { 0%, 88%, 92%, 95%, 100% { opacity: 0; } 89%, 93% { opacity: .55; } }
  </style>
  <g clip-path="url(#frame)">
    ${backdrop(width, w, anchor, o.world?.season ?? null)}
    ${o.world === null ? '' : worldSvg(o.world, width, w)}
    <g ${place}><g ${turn}>
      <g transform="translate(0 ${BAND_H - 200 * BAND_SCALE - 1}) scale(${BAND_SCALE})">${scene(o.stage, o.mood, o.golden, o.eggXp, o.look, o.trans)}${gear(o.stage, w)}</g>
    </g></g>
    ${foreground(width, w, anchor)}
    ${label(width, o.caption, w.isDay)}
  </g>
</svg>`
}

/** The skins on offer: a body colour each; "natural" keeps the stage colours. */
export const SKINS: readonly { name: string; color: string | null }[] = [
  { name: 'natural', color: null },
  { name: 'sky', color: '#9fd8ff' },
  { name: 'mint', color: '#8be0a4' },
  { name: 'sun', color: '#ffd27a' },
  { name: 'peach', color: '#ff9f80' },
  { name: 'rose', color: '#ff9fc2' },
  { name: 'lilac', color: '#c7a0ff' },
  { name: 'snow', color: '#eef2f7' },
]

/** The pet alone on a soft round backdrop, for the pane: no walking, no weather. */
export const portraitSvg = (o: BandScene) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" width="200" height="167">
  ${DEFS}
  <circle cx="120" cy="112" r="86" fill="#e9eef5"/>
  <ellipse cx="120" cy="186" rx="70" ry="8" fill="#000" opacity=".06"/>
  ${scene(o.stage, o.mood, o.golden, o.eggXp, o.look, o.trans)}
</svg>`
