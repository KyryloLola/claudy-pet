import { expect, mock, test } from 'claude-code/testing'
import type { RenderPropsOf } from 'claude-code'

const BAND = { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 120 } as RenderPropsOf['AbovePrompt']
const START = { cwd: '/tmp', surface: 'desktop', isInteractive: true } as const

/** The engine's own end of session.start, which the kit leaves to the test. */
const engine = (on: (event: 'session.start', hook: (...args: never[]) => unknown) => void) =>
  on('session.start', (() => ({ cwd: '/tmp' })) as never)

test('a new session brings the pet back from the store and counts one session', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  engine(on as never)
  const store = new Map<string, unknown>([['pet', { name: 'Echo', xp: 70, food: 50, energy: 50, joy: 50, born: 0, sessions: 4, turns: 9, errors: 0, golden: false, lastSeen: 1_000_000, trait: 'calm', hue: 30, path: null, tally: { shell: 0, edit: 0, explore: 0 } }]])
  on('store.get' as never, ((_$: unknown, e: { key: string }) => ({ value: store.get(e.key) })) as never)
  on('store.set' as never, ((_$: unknown, e: { key: string; value: unknown }) => {
    store.set(e.key, e.value)
    return { value: undefined }
  }) as never)
  await $.session.start(START as never)
  const sessions = async () => (store.get('pet') as { sessions: number }).sessions
  expect(await sessions()).toBe(5)
})

test('the band is just the scene at the band\'s width, and the same picture twice when nothing changed', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  engine(on as never)
  mock.store(on)
  await $.session.start(START as never)
  const ui = await $.ui.mount({ plugin: 'claudy-pet', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const a = await ui.find({ type: 'Svg' })
  expect(a).toBeDefined()
  expect(a?.props.width).toBe(935)
  expect(await ui.find({ type: 'Button' })).toBeUndefined()
  await ui.unmount()
  await clock.advance(300)
  const again = await $.ui.mount({ plugin: 'claudy-pet', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect((await again.find({ type: 'Svg' }))?.props.source).toBe(a?.props.source)
  await again.unmount()
})

test('VS Code gets the scene at its own width; the terminal gets a line of text', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  engine(on as never)
  mock.store(on)
  await $.session.start(START as never)
  const vs = await $.ui.mount({ plugin: 'claudy-pet', surface: 'vscode', component: 'AbovePrompt', props: { ...BAND, bodyColumns: 43 } })
  expect((await vs.find({ type: 'Svg' }))?.props.width).toBe(669)
  await vs.unmount()
  const term = await $.ui.mount({ plugin: 'claudy-pet', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect(await term.find({ type: 'Svg' })).toBeUndefined()
  expect(await term.find({ type: 'Text' })).toBeDefined()
  await term.unmount()
})

test('a hidden pet takes no room at all, and the choice comes from the global store', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  engine(on as never)
  mock.store(on, { hidden: true })
  on('ui.render', { component: 'AbovePrompt' }, ($e, e) => {
    const { Text } = $e.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start(START as never)
  const ui = await $.ui.mount({ plugin: 'claudy-pet', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  expect(await ui.find({ type: 'Button' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /engine/ })).toBeDefined()
  await ui.unmount()
})

test('the band yields to a survey', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  engine(on as never)
  mock.store(on)
  on('ui.render', { component: 'AbovePrompt' }, ($e, e) => {
    const { Text } = $e.ui.resolve(e)
    return <Text>survey</Text>
  })
  await $.session.start(START as never)
  const ui = await $.ui.mount({ plugin: 'claudy-pet', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /survey/ })).toBeDefined()
  await ui.unmount()
})


test('a session left unseen goes quiet and draws normally again when looked at', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  engine(on as never)
  mock.store(on)
  await $.session.start(START as never)
  await clock.advance(15 * 60_000)
  const ui = await $.ui.mount({ plugin: 'claudy-pet', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await clock.advance(6000)
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.unmount()
})

const run = ($: { command: { run: (e: never) => Promise<{ text?: string }> } }, command: string, args = '') =>
  $.command.run({ command, args, origin: 'user' } as never)

test('commands: stats, rename and settings persist and change the band', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  engine(on as never)
  const store = new Map<string, unknown>()
  on('store.get' as never, ((_$: unknown, e: { key: string }) => ({ value: store.get(e.key) })) as never)
  on('store.set' as never, ((_$: unknown, e: { key: string; value: unknown }) => {
    store.set(e.key, e.value)
    return { value: undefined }
  }) as never)
  await $.session.start(START as never)
  const before = (await run($ as never, 'pet-stats')).text!.split(' · ')[0]!
  expect((await run($ as never, 'pet-name', '  Mochi  ')).text).toBe(`${before} is now Mochi.`)
  expect((await run($ as never, 'pet-stats')).text!.startsWith('Mochi · ')).toBe(true)
  expect((store.get('pet') as { name: string }).name).toBe('Mochi')
  expect((await run($ as never, 'pet-caption', 'off')).text).toBe('caption: off')
  expect((store.get('settings') as { caption: boolean }).caption).toBe(false)
  expect((await run($ as never, 'pet-plays', 'maybe')).text).toBe('Use /pet-plays on or /pet-plays off.')
  const ui = await $.ui.mount({ plugin: 'claudy-pet', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  expect(String((await ui.find({ type: 'Svg' }))?.props.source).includes('font-size="11"')).toBe(false)
  await ui.unmount()
})

const PANE_PROPS = { title: 'stats', isFocused: true, bodyColumns: 60, placement: 'dock' } as RenderPropsOf['Pane']

const memoryStore = (on: (event: never, hook: never) => void) => {
  const store = new Map<string, unknown>()
  on('store.get' as never, ((_$: unknown, e: { key: string }) => ({ value: store.get(e.key) })) as never)
  on('store.set' as never, ((_$: unknown, e: { key: string; value: unknown }) => {
    store.set(e.key, e.value)
    return { value: undefined }
  }) as never)
  return store
}

test('the stats pane shows the pet, its info, actions, skins and settings, and they work', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  engine(on as never)
  const store = memoryStore(on as never)
  await $.session.start(START as never)
  for (const surface of ['desktop', 'vscode', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'claudy-pet', surface, component: 'Pane', requestId: 'claudy-pet', props: PANE_PROPS })
    expect(await ui.find({ key: 'pane-feed' })).toBeDefined()
    expect(await ui.find({ key: 'skin-mint' })).toBeDefined()
    expect(await ui.find({ key: 'set-weather' })).toBeDefined()
    if (surface !== 'terminal') expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ plugin: 'claudy-pet', surface: 'desktop', component: 'Pane', requestId: 'claudy-pet', props: PANE_PROPS })
  await ui.press({ key: 'skin-mint' })
  expect((store.get('pet') as { skin: string }).skin).toBe('#8be0a4')
  expect((await ui.find({ key: 'skin-mint' }))?.text).toBe('• mint')
  await ui.press({ key: 'set-caption' })
  expect((store.get('settings') as { caption: boolean }).caption).toBe(false)
  await ui.press({ key: 'pane-hatch' })
  expect(await ui.find({ key: 'pane-hatch-yes' })).toBeDefined()
  await ui.press({ key: 'pane-hatch-no' })
  expect(await ui.find({ key: 'pane-hatch-yes' })).toBeUndefined()
  await ui.unmount()
})

test('/pet-stats opens the pane, or prints the card where no pane can be placed', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  engine(on as never)
  memoryStore(on as never)
  let placed = true
  on('ui.open' as never, (() => ({ value: placed ? { isPlaced: true } : { isPlaced: false, reason: 'no panes here' } })) as never)
  await $.session.start(START as never)
  expect((await run($ as never, 'pet-stats')).text?.includes('side pane')).toBe(true)
  placed = false
  expect((await run($ as never, 'pet-stats')).text?.includes('food')).toBe(true)
})
