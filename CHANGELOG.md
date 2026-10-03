# Changelog

## 0.2.1

- Fix task-lifecycle sounds never firing on dsh 0.2. `ctx.sessions.list` no longer
  carries a `current` field (its snapshot is now
  `{ ids, byId, phase, projectionsBySession }`), so the watcher read `undefined`,
  attached to no session and emitted no `task.start` / `task.success` /
  `task.failure` / `task.pending`. Click sounds were unaffected because they ride a
  document-level `pointerdown` listener.
- Read the current session from `uiSession.current` and the per-session
  `running` / `pendingInteraction` facts from `uiSession.sessionStatus`, which is
  where dsh 0.2 moved them. `task.pending` now tracks a pending user interaction
  (approval, question) rather than the removed snapshot `pending` array.
- Drop the broken retry path: `watchedId` was assigned before the binding check, so
  a single miss permanently disabled the watcher for that session.
- `uiSession` is now a declared client inject (`exports.inject` and
  `dsh.client.inject`).
- Add `test/session-watch.test.mjs` (`pnpm test`), a browser-free harness that
  drives the real client bundle through a running to idle turn and asserts which
  scenarios are played.

## 0.2.0

- Port the Host half to the dsh 0.2 settings model. The old
  `ctx.settings.register(ns, schema)` scope API was removed in dsh 0.2.0-rc.2, so
  the preferences are now the plugin entry's own `Config` schema (all fields
  `.volatile()`), with the automatic config page disabled in favour of this
  plugin's own Sound Effects section.
- Writes go through `ctx.settings.update(entryId, patch)`; the settings
  namespace is the profile entry id (`uisfx`), resolved at runtime.
- Update the `@deepseek-ai/dsh-settings` peer range to `^0.2.0-rc.2` so dsh
  0.2.0-rc.2 no longer skips the bundle as incompatible.
- Client: declare `@deepseek-ai/dsh-api-session-controller` instead of the
  removed `@deepseek-ai/dsh-client-runtime` in `dsh.client.inject`.
- No changes to the uisfx Web Audio runtime or the sound behaviour.

## 0.1.1

- Update README for the npm release: npm badges, fixed-version install command, and published status.
- No runtime code changes.

## 0.1.0

- Published to npm as `dsh-plugin-uisfx@0.1.0`.
- Initial release.
- Embedded uisfx 0.4.0 Web Audio synthesis runtime.
- Task lifecycle sounds for the current dsh session.
- Global pointerdown classification for button sounds.
- Settings page with sound pack, volume, per-scenario cue mapping and preview buttons.
- Host-persisted preferences in `settings.yaml` under the `dsh-plugin-uisfx` namespace.
- `ctx.uisfx` service for third-party dsh plugins.
