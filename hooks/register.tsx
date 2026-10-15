import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AlbumEntry, BandView, Live, Mood, Pet, PetSettings, Stroll, Weather } from '../types'
import { openSession } from './lifecycle'
import { DEFAULT_SETTINGS, albumLine, parseSwitch, statsText } from './stats'
import { layoutOf } from './layout'
import {
  FACE,
  SETTLE_MS,
  STAGES,
  TRAIT,
  choosePlay,
  cuddle,
  decay,
  feed,
  finishTurn,
  hurt,
  newLive,
  newPet,
  newStroll,
  settlePath,
  stageOf,
  stepStroll,
  tallyUp,
  toolKind,
  work,
} from './pet'
import { BAND_H, SKINS, bandSvg, portraitSvg } from './svg'
import { isSameView, isStaying, sceneOf, viewOf } from './view'
import { kindOf, weatherJoy } from './weather'

/*
 * State lives on three levels:
 *  - global, in $.store: the pet, the album, the place, whether the pet is hidden — shared by every session;
 *  - session, in $.state: what is going on now, where the pet stands — kept across a reload of the mod;
 *  - view, in $.state: what the band shows, rebuilt from the two above and only stored when it changes,
 *    so the band redraws only when something visible changed.
 * A reload of the mod fires session.start again; it is told from a new session by the session state
 * already being there, and then nothing is reset.
 */
const pet = atom({ plugin: 'claudy-pet', key: 'pet' } as const, null as Pet | null)
const hidden = atom({ plugin: 'claudy-pet', key: 'hidden' } as const, false)
const live = atom({ plugin: 'claudy-pet', key: 'live' } as const, null as Live | null)
const stroll = atom({ plugin: 'claudy-pet', key: 'stroll' } as const, null as Stroll | null)
const weather = atom({ plugin: 'claudy-pet', key: 'weather' } as const, null as Weather | null)
const view = atom({ plugin: 'claudy-pet', key: 'view' } as const, null as BandView | null)
const settings = atom({ plugin: 'claudy-pet', key: 'settings' } as const, DEFAULT_SETTINGS as PetSettings)
const pane = atom({ plugin: 'claudy-pet', key: 'pane' } as const, { confirmHatch: false })

const PANE = 'claudy-pet'

const TICK_MS = 5000
const DECAY_MS = 15_000
const DORMANT_DECAY_MS = 60_000
const UNSEEN_MS = 120_000
const QUIET_MS = 600_000
const SAVE_EVERY_MS = 30_000
const PLAY_MS = 8000
const TYPING_QUIET_MS = 4000
const WEATHER_MS = 20 * 60_000
const PLACE_MS = 12 * 3600_000
const GOLDEN_TURNS = 15

type Place = { lat: number; lon: number; city: string; at: number }

let toolsThisTurn = 0
let errorsThisTurn = 0
let lastDecayAt = 0
/** When the band was last asked to draw: a session nobody is looking at goes dormant. */
let lastDrawnAt = 0
let isDormant = false
let typingTimer: { cancel: () => void } | null = null
let lastEditAt = 0
let lastSavedAt = 0
/** One pending wake-up for the next stroll start or settle, so the slow tick need not run every second. */
let wake: { at: number; timer: { cancel: () => void } } | null = null
/** The moment each distinct picture was first drawn: its loops are phased to it, so a redraw of the same picture is the same source. */
let anchor = { key: '', at: 0 }
/** The width last drawn, per surface: kept while it still fits, see layoutOf. */
const lastWidth: Record<string, number> = {}

const setPet = async ($: EngineInterface, fn: (p: Pet) => Pet) => {
  const now = await $.clock.now()
  const current = (await read($, pet)) ?? newPet(now)
  const next = { ...fn(current), lastSeen: now }
  await update($, pet, () => next)
  // The store is a file on disk: write it at most every 30 seconds; session.end writes the last state.
  if (now - lastSavedAt >= SAVE_EVERY_MS) {
    lastSavedAt = now
    await $.store.set('pet', next)
  }
}

const setLive = async ($: EngineInterface, fn: (l: Live) => Live) => {
  const now = await $.clock.now()
  await update($, live, l => fn(l ?? newLive(now)))
}

/** Rebuilds what the band shows; steps the stroll; stores the view only when it differs. */
const refresh = async ($: EngineInterface) => {
  const p = await read($, pet)
  const l = await read($, live)
  if (p === null || l === null) return
  const now = await $.clock.now()
  const w = await read($, weather)
  const before = (await read($, stroll)) ?? newStroll(now)
  const s = await read($, settings)
  const st = stepStroll(before, now, !s.plays || isStaying(sceneOf(p, l, before, w, now)), p.trait)
  if (st !== before) await update($, stroll, () => st)
  const due = st.isActive ? st.startedAt + st.durMs + SETTLE_MS : st.nextAt
  if (due > now && wake?.at !== due) {
    wake?.timer.cancel()
    wake = { at: due, timer: $.clock.after(due - now + 20, () => void refresh($)) }
  }
  const next = viewOf(p, await read($, hidden), l, st, w, now, s)
  if (!isSameView(await read($, view), next)) await update($, view, () => next)
}

const flash = async ($: EngineInterface, mood: Mood, ms: number) => {
  const now = await $.clock.now()
  await setLive($, l => ({ ...l, flash: mood, flashUntil: now + ms }))
  await refresh($)
  $.clock.after(ms + 50, () => void refresh($))
}

const setTyping = async ($: EngineInterface, isTyping: boolean) => {
  const l = await read($, live)
  if (l === null || l.isTyping === isTyping) return
  const now = await $.clock.now()
  await setLive($, x => ({ ...x, isTyping, shownAt: isTyping ? x.shownAt : now }))
  await refresh($)
}

/** Shows the band again once typing has been quiet for a while; waits on while keys keep coming. */
const typingQuiet = async ($: EngineInterface) => {
  const now = await $.clock.now()
  const left = lastEditAt + TYPING_QUIET_MS - now
  if (left > 0) {
    typingTimer = $.clock.after(left, () => void typingQuiet($))
    return
  }
  typingTimer = null
  await setTyping($, false)
}

const setHidden = async ($: EngineInterface, value: boolean) => {
  const now = await $.clock.now()
  await update($, hidden, () => value)
  await $.store.set('hidden', value)
  await setLive($, l => ({ ...l, shownAt: now }))
  await refresh($)
}

/** Once a second: slow needs every 15 s, plays now and then, settling strolls, timed moods. */
/**
 * Every 5 seconds: slow needs, plays now and then, timed moods. A session nobody has looked at for two
 * minutes and that has been quiet for ten goes dormant: it only lets needs drift once a minute and skips
 * everything else until the band is drawn again.
 */
const tick = async ($: EngineInterface) => {
  const p = await read($, pet)
  const l = await read($, live)
  if (p === null || l === null) return
  const now = await $.clock.now()
  isDormant = now - lastDrawnAt > UNSEEN_MS && now - l.lastActive > QUIET_MS && l.activity === 'idle'
  const w = await read($, weather)
  if (lastDecayAt === 0) lastDecayAt = now
  if (now - lastDecayAt >= (isDormant ? DORMANT_DECAY_MS : DECAY_MS)) {
    const minutes = (now - lastDecayAt) / 60_000
    lastDecayAt = now
    const nudge = w === null ? 0 : weatherJoy(w.kind, w.isDay) * minutes
    await setPet($, q => {
      const next = decay(q, minutes, l.activity !== 'idle')
      return { ...next, joy: Math.max(0, Math.min(100, next.joy + nudge)) }
    })
  }
  if (isDormant) return
  if (l.play !== null && l.playUntil <= now) await setLive($, x => ({ ...x, play: null }))
  const scene = sceneOf(p, l, (await read($, stroll)) ?? newStroll(now), w, now)
  if ((await read($, settings)).plays && l.play === null && now >= l.nextPlayAt && scene.mood === 'idle') {
    const play = choosePlay(w, new Date(now).getHours())
    const gap = TRAIT[p.trait].playEveryS * 1000 * (0.7 + Math.random() * 0.6)
    await setLive($, x => ({ ...x, play, playUntil: now + PLAY_MS, nextPlayAt: now + PLAY_MS + gap }))
    $.clock.after(PLAY_MS + 50, () => void tick($))
  }
  await refresh($)
}

const findPlace = async ($: EngineInterface, now: number): Promise<Place | null> => {
  const cached = (await $.store.get('place')) as Place | undefined
  if (cached !== undefined && now - cached.at < PLACE_MS) return cached
  const res = await $.http.fetch('https://ipwho.is/')
  if (!res.ok) return cached ?? null
  const json = JSON.parse(res.text) as { success?: boolean; latitude?: number; longitude?: number; city?: string }
  if (json.success !== true || json.latitude === undefined || json.longitude === undefined) return cached ?? null
  const place = { lat: Math.round(json.latitude * 100) / 100, lon: Math.round(json.longitude * 100) / 100, city: json.city ?? '', at: now }
  await $.store.set('place', place)
  return place
}

const refreshWeather = async ($: EngineInterface) => {
  if (!(await read($, settings)).weather) return
  try {
    const now = await $.clock.now()
    const place = await findPlace($, now)
    if (place === null) return
    const res = await $.http.fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,weather_code,is_day,wind_speed_10m`,
    )
    if (!res.ok) return
    const cur = (JSON.parse(res.text) as { current: { temperature_2m: number; weather_code: number; is_day: number; wind_speed_10m: number } }).current
    const next: Weather = { kind: kindOf(cur.weather_code), temp: Math.round(cur.temperature_2m), isDay: cur.is_day === 1, wind: cur.wind_speed_10m, city: place.city, at: now }
    await update($, weather, () => next)
    await refresh($)
  } catch {
    // offline or blocked: the scene keeps the last weather, or a calm default
  }
}

const COMMANDS = [
  ['pet-show', 'Show the pet above the prompt'],
  ['pet-hide', 'Hide the pet'],
  ['pet-feed', 'Give the pet a snack'],
  ['pet-pat', 'Give the pet a pat'],
  ['pet-hatch', 'Retire the pet to the album and hatch a new egg'],
  ['pet-stats', 'Everything about the pet: stage, needs, calling, album, settings'],
] as const

const SWITCHES = [
  ['pet-caption', 'caption', 'Show the weather and mood caption on the band (on|off)'],
  ['pet-weather', 'weather', 'Use the real weather where you are, or a calm sky (on|off)'],
  ['pet-plays', 'plays', 'Let the pet stroll and play, or keep it calmly in place (on|off)'],
] as const

const setSetting = async ($: EngineInterface, setting: keyof PetSettings, value: boolean) => {
  const next = { ...(await read($, settings)), [setting]: value }
  await update($, settings, () => next)
  await $.store.set('settings', next)
  if (setting === 'weather') {
    if (value) void refreshWeather($)
    else await update($, weather, () => null)
  }
  await refresh($)
}

const setSkin = async ($: EngineInterface, color: string | null) => {
  await setPet($, p => ({ ...p, skin: color }))
  await $.store.set('pet', await read($, pet))
  await refresh($)
}

const openStats = async ($: EngineInterface) => {
  const p = await read($, pet)
  const opened = await $.ui.open({ id: PANE, title: `${p?.name ?? 'Pet'} · stats` }).catch(() => null)
  return opened?.isPlaced === true
}

const renamePet = async ($: EngineInterface, args: string) => {
  const name = args.trim().replace(/\s+/g, ' ').slice(0, 20)
  if (name === '') return 'Give a name: /pet-name Mochi'
  const old = await read($, pet)
  await setPet($, p => ({ ...p, name }))
  await $.store.set('pet', await read($, pet))
  await refresh($)
  return `${old?.name ?? 'The pet'} is now ${name}.`
}

const feedNow = async ($: EngineInterface) => {
  const p = await read($, pet)
  if (p === null) return 'No pet yet.'
  if (p.food >= 90) return `${p.name} is full.`
  await setPet($, q => feed(q, 25))
  await flash($, 'eating', 2500)
  return `${p.name} munches happily.`
}

const patNow = async ($: EngineInterface) => {
  const p = await read($, pet)
  if (p === null) return 'No pet yet.'
  await setPet($, cuddle)
  await flash($, 'loved', 2500)
  return `${p.name} loves it.`
}

const hatch = async ($: EngineInterface) => {
  const now = await $.clock.now()
  const old = await read($, pet)
  const album = ((await $.store.get('album')) as AlbumEntry[] | undefined) ?? []
  if (old !== null) {
    album.push({ name: old.name, trait: old.trait, hue: old.hue, stage: STAGES[stageOf(old.xp)]!.name, path: old.path, turns: old.turns, born: old.born, retired: now })
    await $.store.set('album', album)
  }
  const egg = { ...newPet(now, Math.random, album.map(a => a.name)), sessions: 1 }
  await update($, pet, () => egg)
  await $.store.set('pet', egg)
  await update($, stroll, () => newStroll(now))
  await refresh($)
  $.ui.toast(`A new egg! Meet ${egg.name}, ${egg.trait}.`, { timeoutMs: 6000 })
}

const checkPath = async ($: EngineInterface) => {
  const p = await read($, pet)
  if (p === null) return
  const settled = settlePath(p)
  if (!settled.isNew) return
  await setPet($, () => settled.pet)
  const job = String(settled.pet.path)
  $.ui.toast(`${p.name} became ${job === 'explorer' ? 'an' : 'a'} ${job}!`, { timeoutMs: 6000 })
  await flash($, 'party', 5000)
}

/** The same picture keeps the same anchor; a changed picture, or the band shown again, gets a new one. */
const anchorFor = (key: string, now: number) => {
  if (anchor.key !== key) anchor = { key, at: now }
  return anchor.at
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const now = await $.clock.now()
    const opened = openSession((await $.store.get('pet')) as Pet | undefined, await read($, live), now)
    const isReload = opened.kind === 'reload'
    if (opened.kind === 'new') {
      await update($, pet, () => opened.pet)
      await $.store.set('pet', opened.pet)
      const wasHidden = ((await $.store.get('hidden')) as boolean | undefined) === true
      await update($, hidden, () => wasHidden)
      const saved = ((await $.store.get('settings')) as Partial<PetSettings> | undefined) ?? {}
      await update($, settings, () => ({ ...DEFAULT_SETTINGS, ...saved }))
      await update($, live, () => opened.live)
      await update($, stroll, () => newStroll(now))
    }
    for (const [name, description] of COMMANDS) await $.command.register({ name, description }).catch(() => undefined)
    for (const [name, , description] of SWITCHES) await $.command.register({ name, description, argumentHint: 'on|off' }).catch(() => undefined)
    await $.command.register({ name: 'pet-name', description: 'Rename the pet', argumentHint: '<name>' }).catch(() => undefined)
    $.clock.every(TICK_MS, () => void tick($))
    if (!isReload || (await read($, weather)) === null) void refreshWeather($)
    $.clock.every(WEATHER_MS, () => void refreshWeather($))
    await refresh($)

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    const p = await read($, pet)
    if (p !== null) await $.store.set('pet', p)
    if (e.reason === 'clear') await setLive($, l => ({ ...l, sessionTurns: 0, sessionErrors: 0, activity: 'idle' }))
    return next(e)
  })

  on('command.run', { command: 'pet-hide' }, async $ => {
    await setHidden($, true)
    return { text: 'Pet hidden. /pet-show brings it back.' }
  })

  on('command.run', { command: 'pet-show' }, async $ => {
    await setHidden($, false)
    return { text: 'Pet shown.' }
  })

  on('command.run', { command: 'pet-feed' }, async $ => ({ text: await feedNow($) }))

  on('command.run', { command: 'pet-pat' }, async $ => ({ text: await patNow($) }))

  on('command.run', { command: 'pet-stats' }, async $ => {
    const p = await read($, pet)
    if (p === null) return { text: 'No pet yet.' }
    if (await openStats($)) return { text: `${p.name}'s stats are open in the side pane.` }
    // No surface places panes here (a plain terminal): print the card instead.
    const album = ((await $.store.get('album')) as AlbumEntry[] | undefined) ?? []
    return { text: statsText(p, await read($, live), await read($, weather), album, await read($, settings), await $.clock.now()) }
  })

  on('command.run', { command: 'pet-name' }, async ($, e) => ({ text: await renamePet($, e.args) }))

  for (const [command, setting] of SWITCHES) {
    on('command.run', { command }, async ($, e) => {
      const value = parseSwitch(e.args, (await read($, settings))[setting])
      if (value === null) return { text: `Use /${command} on or /${command} off.` }
      await setSetting($, setting, value)
      return { text: `${setting}: ${value ? 'on' : 'off'}` }
    })
  }

  on('command.run', { command: 'pet-hatch' }, async $ => {
    await hatch($)
    return { text: 'The old pet went to the album; a new egg hatched.' }
  })

  on('prompt.edit', async ($, e, next) => {
    const box = await next(e)
    const isTyping = box.text.trim() !== ''
    lastEditAt = await $.clock.now()
    await setTyping($, isTyping)
    // One timer for the whole burst of typing: it looks at the last keystroke instead of being remade on each.
    if (isTyping && typingTimer === null) typingTimer = $.clock.after(TYPING_QUIET_MS, () => void typingQuiet($))
    return box
  })

  on('prompt.submit', async ($, e, next) => {
    toolsThisTurn = 0
    errorsThisTurn = 0
    typingTimer?.cancel()
    typingTimer = null
    const now = await $.clock.now()
    await setPet($, p => feed(p, 12))
    await setLive($, l => ({ ...l, isTyping: false, shownAt: l.isTyping ? now : l.shownAt, activity: 'thinking', lastActive: now, play: null }))
    await refresh($)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    toolsThisTurn += 1
    const kind = toolKind(String(e.tool))
    await setPet($, p => (kind === null ? work(p) : tallyUp(work(p), kind)))
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError === true) {
      errorsThisTurn += 1
      await setPet($, hurt)
      await setLive($, l => ({ ...l, sessionErrors: l.sessionErrors + 1 }))
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const now = await $.clock.now()
    await setLive($, l => ({ ...l, activity: 'idle', lastActive: now }))
    if (e.reason !== 'answer') {
      await refresh($)
      return done
    }
    const before = (await read($, pet)) ?? newPet(now)
    const result = finishTurn(before, toolsThisTurn, done.usage?.output_tokens ?? 0)
    await setPet($, () => result.pet)
    const l = await read($, live)
    await setLive($, x => ({ ...x, sessionTurns: x.sessionTurns + 1 }))
    await checkPath($)
    if (result.isEvolved) {
      const stageIndex = stageOf(result.pet.xp)
      $.ui.toast(stageIndex === 1 ? `${result.pet.name} hatched!` : `${result.pet.name} evolved into ${STAGES[stageIndex]!.name}!`, { timeoutMs: 6000 })
      await flash($, 'party', 6000)
    } else if (l !== null && !result.pet.golden && l.sessionTurns + 1 >= GOLDEN_TURNS && l.sessionErrors === 0) {
      await setPet($, p => ({ ...p, golden: true }))
      $.ui.toast(`${result.pet.name} turned golden: ${GOLDEN_TURNS} clean turns in a row`, { timeoutMs: 6000 })
      await flash($, 'party', 6000)
    } else if (errorsThisTurn === 0) {
      // A clean turn: Claude gives the pet a pat.
      await setPet($, cuddle)
      await flash($, 'loved', 2500)
    } else {
      await refresh($)
    }
    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    lastDrawnAt = await $.clock.now()
    // Seen again after a dormant spell: catch the scene up right after this draw.
    if (isDormant) {
      isDormant = false
      $.clock.after(0, () => void tick($))
    }
    const v = await read($, view)
    if (e.props.hasSurvey || v === null) return next(e)
    if (v.isTyping && !e.props.isWorking) return next(e)

    const els = $.ui.resolve(e)
    const { Text } = els
    const hasSvg = 'Svg' in els
    if (v.isHidden) return next(e)

    const layout = layoutOf(e.surface, e.props.bodyColumns, hasSvg, lastWidth[e.surface])
    if (layout.kind === 'scene') lastWidth[e.surface] = layout.width
    if (layout.kind === 'text' || !hasSvg) return <Text>{`${FACE[v.scene.mood]} ${v.scene.caption.join(' · ')}`}</Text>

    const now = lastDrawnAt
    const scene = layout.hasCaption ? v.scene : { ...v.scene, caption: [] }
    const key = JSON.stringify([scene, layout.width, v.shownAt])
    return (
      <els.Svg
        source={bandSvg(scene, layout.width, anchorFor(key, now))}
        alt={`${v.name}, ${v.scene.mood}`}
        width={layout.width}
        height={BAND_H}
        isInteractive
      />
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const p = await read($, pet)
    const l = await read($, live)
    if (p === null || l === null) return <Text dimColor>No pet yet.</Text>
    const s = await read($, settings)
    const w = await read($, weather)
    const now = await $.clock.now()
    const isHidden = await read($, hidden)
    const confirmHatch = (await read($, pane)).confirmHatch
    const album = ((await $.store.get('album')) as AlbumEntry[] | undefined) ?? []
    const scene = sceneOf(p, l, (await read($, stroll)) ?? newStroll(now), s.weather ? w : null, now)
    const [title = '', ...info] = statsText(p, l, w, [], s, now).split('\n')
    const toggle = (setting: keyof PetSettings) => (
      <Button key={`set-${setting}`} onPress={() => setSetting($, setting, !s[setting])}>
        {`${setting}: ${s[setting] ? 'on' : 'off'}`}
      </Button>
    )

    return (
      <Box flexDirection="column" gap={1} padding={1}>
        <Box flexDirection="row" gap={2} alignItems="center">
          {'Svg' in els ? (
            <els.Svg source={portraitSvg(scene)} alt={`${p.name}, ${scene.mood}`} width={200} height={167} isInteractive />
          ) : (
            <Text>{FACE[scene.mood]}</Text>
          )}
          <Box flexDirection="column">
            <Text bold>{title}</Text>
            {info.slice(0, 4).map((line, i) => (
              <Text key={`head-${i}`} dimColor>
                {line}
              </Text>
            ))}
          </Box>
        </Box>
        <Box flexDirection="column">
          {info.slice(4).filter(line => line !== '').map((line, i) => (
            <Text key={`info-${i}`}>{line}</Text>
          ))}
        </Box>
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          <Button key="pane-feed" onPress={() => feedNow($)}>
            🍪 Feed
          </Button>
          <Button key="pane-pat" onPress={() => patNow($)}>
            ♥ Pat
          </Button>
          <Button key="pane-hide" onPress={() => setHidden($, !isHidden)}>
            {isHidden ? 'Show on the band' : 'Hide from the band'}
          </Button>
          {confirmHatch ? (
            <Box flexDirection="row" gap={1}>
              <Button key="pane-hatch-yes" variant="primary" onPress={async () => {
                await update($, pane, () => ({ confirmHatch: false }))
                await hatch($)
              }}>
                {`Retire ${p.name}, hatch a new egg`}
              </Button>
              <Button key="pane-hatch-no" onPress={() => update($, pane, () => ({ confirmHatch: false }))}>
                Cancel
              </Button>
            </Box>
          ) : (
            <Button key="pane-hatch" onPress={() => update($, pane, () => ({ confirmHatch: true }))}>
              New egg
            </Button>
          )}
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Skin</Text>
          <Box flexDirection="row" flexWrap="wrap" gap={1}>
            {SKINS.map(k => (
              <Button key={`skin-${k.name}`} onPress={() => setSkin($, k.color)}>
                {(p.skin ?? null) === k.color ? `• ${k.name}` : k.name}
              </Button>
            ))}
          </Box>
        </Box>
        <Box flexDirection="column">
          <Text dimColor>Settings</Text>
          <Box flexDirection="row" flexWrap="wrap" gap={1}>
            {toggle('caption')}
            {toggle('weather')}
            {toggle('plays')}
          </Box>
        </Box>
        {album.length > 0 && (
          <Box flexDirection="column">
            <Text dimColor>Album</Text>
            {album.map(a => (
              <Text key={`album-${a.retired}`} dimColor>
                {albumLine(a)}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    )
  })
}
