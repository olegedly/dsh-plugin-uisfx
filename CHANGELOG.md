# Changelog

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
