/**
 * Regression test for the task-lifecycle watcher in lib/client.js.
 *
 * dsh 0.2 moved the "current session" out of `ctx.sessions.list` — that snapshot
 * store now carries only `{ ids, byId, phase, projectionsBySession }` — and moved
 * per-session running/pending facts into the `uiSession` service. The watcher used
 * to read `list.current`, which is now always undefined, so the plugin attached to
 * no session and never emitted task.start / task.success / task.failure /
 * task.pending (click sounds were unaffected because they ride a document listener).
 *
 * The plugin's client half is a browser bundle, so it is loaded here by evaluating
 * lib/client.js against a minimal `window.__ModuleLoader__` and driving the fake
 * context through a real running -> idle turn.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const settle = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms))

/** A subscribable snapshot source shaped like the client-side store/binding sources. */
function makeSource(initial) {
  let value = initial
  const listeners = new Set()
  return {
    getSnapshot: () => value,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set(next) {
      value = next
      for (const listener of [...listeners]) listener()
    },
  }
}

/** Evaluate lib/client.js and return its exported plugin module. */
function loadClientBundle() {
  let definition
  globalThis.window = {
    __ModuleLoader__: { load: (def) => { definition = def } },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  }
  globalThis.document = { addEventListener() {}, removeEventListener() {}, querySelector: () => null }
  globalThis.Element = class Element {}
  globalThis.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: false }) })

  // eslint-disable-next-line no-eval
  ;(0, eval)(readFileSync(join(root, 'lib/client.js'), 'utf8'))
  assert.equal(definition?.id, 'dsh-plugin-uisfx', 'client bundle should register itself')

  const react = {
    createElement: () => null,
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
  }
  return definition.factory((name) => {
    if (name === 'react') return react
    throw new Error(`unexpected require(${name})`)
  })
}

/**
 * Mount the plugin against a dsh 0.2 client context and expose controls.
 * @returns watcher controls plus every scenario the plugin asked to play.
 */
function mountPlugin() {
  const mod = loadClientBundle()
  const played = []
  const current = makeSource({ key: 's1' })
  const status = makeSource(new Map())
  const list = makeSource({ ids: [], byId: {}, phase: 'ready', projectionsBySession: {} })

  let service
  let errorNode = false
  globalThis.document.querySelector = () => (errorNode ? {} : null)

  const ctx = {
    reflect: { provide: (name, value) => { if (name === 'uisfx') service = value; return () => {} } },
    locale: { register: () => () => {}, bind: () => (key) => key },
    slots: { inject: () => () => {}, register: () => () => {} },
    sessions: { list, binding: () => undefined },
    uiSession: { current, sessionStatus: status },
    effect: (fn) => { fn(); return () => {} },
  }

  mod.apply(ctx)
  assert.ok(service, 'plugin should provide the ctx.uisfx service')

  // The watcher calls service.play(...) through the same object reference, so
  // replacing the property observes internal triggers without touching audio.
  service.play = (scenario) => { played.push(scenario); return null }

  return {
    played,
    setCurrent: (id) => current.set({ key: id }),
    setRunning: (id, running) => {
      const next = new Map(status.getSnapshot())
      next.set(id, { ...(next.get(id) ?? {}), running, pendingInteraction: next.get(id)?.pendingInteraction })
      status.set(next)
    },
    setPending: (id, pendingInteraction) => {
      const next = new Map(status.getSnapshot())
      next.set(id, { ...(next.get(id) ?? {}), pendingInteraction })
      status.set(next)
    },
    setErrorNode: (value) => { errorNode = value },
    mod,
  }
}

test('plugin injects the uiSession service that owns the current session', () => {
  const { mod } = mountPlugin()
  assert.ok(mod.inject.includes('uiSession'), `inject should include uiSession, got ${JSON.stringify(mod.inject)}`)
})

test('a running turn emits task.start and completion emits task.success', async () => {
  const harness = mountPlugin()

  harness.setRunning('s1', true)
  assert.deepEqual(harness.played, ['task.start'], 'turn start should sound')

  harness.setRunning('s1', false)
  await settle()
  assert.deepEqual(harness.played, ['task.start', 'task.success'], 'turn completion should sound')
})

test('a failed turn emits task.failure', async () => {
  const harness = mountPlugin()

  harness.setRunning('s1', true)
  harness.setErrorNode(true)
  harness.setRunning('s1', false)
  await settle()

  assert.deepEqual(harness.played, ['task.start', 'task.failure'])
})

test('a pending interaction emits task.pending once', () => {
  const harness = mountPlugin()

  harness.setRunning('s1', true)
  harness.setPending('s1', { id: 'approval-1' })
  assert.deepEqual(harness.played, ['task.start', 'task.pending'])

  harness.setPending('s1', { id: 'approval-2' })
  assert.deepEqual(harness.played, ['task.start', 'task.pending'], 'still pending should not re-sound')
})

test('the watcher follows the current session', async () => {
  const harness = mountPlugin()

  harness.setRunning('s1', true)
  harness.setCurrent('s2')
  harness.setRunning('s2', true)
  harness.setRunning('s2', false)
  await settle()

  assert.deepEqual(harness.played, ['task.start', 'task.start', 'task.success'])
})

test('an idle startup does not sound', () => {
  const harness = mountPlugin()
  harness.setRunning('s1', false)
  assert.deepEqual(harness.played, [], 'an already-idle turn is not a completion')
})
