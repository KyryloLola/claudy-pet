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
export type Weather = { kind: WeatherKind; temp: number; isDay: boolean; wind: number; city: string; at: number }

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
  golden: boolean
  lastSeen: number
  trait: Trait
  hue: number
  path: Path | null
  tally: Tally
  /** A chosen body colour (a skin), or null for the stage colours turned by `hue`. */
  skin?: string | null
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
}

/** GLOBAL settings, in the plugin store: what the band shows and how lively the pet is. */
export type PetSettings = { caption: boolean; weather: boolean; plays: boolean }

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
