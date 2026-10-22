export type Mood = 'idle' | 'thinking' | 'sleeping' | 'sad' | 'hungry' | 'eating' | 'happy' | 'party' | 'loved'

/** A temperament the pet hatches with and keeps for life. */
export type Trait = 'calm' | 'energetic' | 'curious' | 'sleepy'

/** What the pet gets up to on its own while nothing else is going on. */
export type Play = 'butterfly' | 'puddle' | 'snowball' | 'stars' | 'leaf' | 'stretch' | 'yawn' | 'sing'

/** The calling a pet takes at Teen, from the kind of work it watched most. */
export type Path = 'engineer' | 'writer' | 'explorer'

export type Tally = { shell: number; edit: number; explore: number }

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

/** Current weather where the person roughly is, from their IP. */
export type Weather = { kind: WeatherKind; temp: number; isDay: boolean; wind: number; city: string; at: number; lat?: number }

/**
 * GLOBAL, in the plugin store, shared by every session and surface:
 * the pet itself, the album of retired pets, the place, and whether the pet is shown at all.
 */
export type Pet = {
  name: string
  xp: number
  food: number
  energy: number
  joy: number
  born: number
  sessions: number
  turns: number
  errors: number
  /** The day it went golden, as a day key: golden only until that day's midnight. */
  goldenDay?: string
  /** How many days it has been golden. */
  goldenDays?: number
  /** Clean turns in a row, across sessions; a tool error starts it again. */
  streak?: number
  lastSeen: number
  trait: Trait
  hue: number
  path: Path | null
  tally: Tally
  /** A chosen body colour (a skin), or null for the stage colours turned by `hue`. */
  skin?: string | null
  /** The last stage announced, so a stage reached by age alone still gets its moment. */
  stage?: number
  /** Days on which a turn finished, and the last of them: the world grows by these. */
  days?: number
  lastDay?: string
}

export type AlbumEntry = { name: string; trait: Trait; hue: number; stage: string; path: Path | null; turns: number; born: number; retired: number }

/** SESSION, in $.state: survives a reload of the mod, starts empty in a new session. */
export type Live = {
  startedAt: number
  activity: 'idle' | 'thinking'
  flash: Mood | null
  flashUntil: number
  lastActive: number
  sessionTurns: number
  sessionErrors: number
  isTyping: boolean
  shownAt: number
  play: Play | null
  playUntil: number
  nextPlayAt: number
}

/** Where the pet rests along the band (0 left wall, 1 right wall) and its current or last stroll. */
export type Stroll = { x: number; from: number; to: number; startedAt: number; durMs: number; facing: 1 | -1; nextAt: number; isActive: boolean }

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Holiday = 'newyear' | 'valentine' | 'earth' | 'halloween' | 'xmas' | 'birthday'

/** The slow modules on the band: one home by the tree, one garden by the bush, a season, a holiday. */
export type WorldScene = {
  home: 'none' | 'bench' | 'frame' | 'cottage'
  garden: 'none' | 'sprouts' | 'bed'
  season: Season | null
  holiday: Holiday | null
  balloon: boolean
}

/** DERIVED: everything a band picture shows. It changes only when something visible changes. */
export type BandScene = {
  stage: number
  mood: Mood
  golden: boolean
  eggXp: number
  look: { hue: number; trait: Trait; path: Path | null; play: Play | null; skin: string | null }
  weather: Weather | null
  caption: string[]
  stride: { from: number; to: number; startedAt: number; durMs: number; facing: 1 | -1 }
  world: WorldScene | null
}

/** GLOBAL settings, in the plugin store: what the band shows and how lively the pet is. */
export type PetSettings = { caption: boolean; weather: boolean; plays: boolean; longing: boolean; world: boolean; seasons: boolean }

export type BandView = { isHidden: boolean; isTyping: boolean; shownAt: number; name: string; scene: BandScene }

declare module 'claude-code' {
  interface PluginState {
    'claudy-pet': {
      pet: Pet | null
      hidden: boolean
      live: Live | null
      stroll: Stroll | null
      weather: Weather | null
      view: BandView | null
      settings: PetSettings
      pane: { confirmHatch: boolean }
      /** Bumped to redraw the terminal band while it moves. */
      frame: number
    }
  }
}
