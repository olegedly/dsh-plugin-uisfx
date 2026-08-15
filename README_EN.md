# dsh-uisfx

A dsh web plugin that adds semantic UI sound effects powered by [uisfx](https://github.com/romainsimon/uisfx), with a settings page for picking cues per scenario.

- Default sound pack: `zen`
- Task sounds: start / success / failure / pending attention
- Button sounds: normal click / primary / toggle / send / close / danger / link
- Settings UI: pack selector, volume, per-scenario cue dropdowns, preview buttons
- Persistence: Host `settings.yaml`, namespace `dsh-uisfx`
- Service: `ctx.uisfx` for other plugins

## Install

```powershell
dsh plugin --profile web add dsh-uisfx
# restart dsh web, then open Settings -> Sound Effects
```

## Default scenario mapping

| Scenario | Cue |
|---|---|
| `task.start` | `start` |
| `task.success` | `success` |
| `task.failure` | `error` |
| `task.pending` | `notification` |
| `click.normal` | `press` |
| `click.primary` | `select` |
| `click.toggle` | `toggle-on` |
| `click.send` | `send` |
| `click.close` | `close` |
| `click.danger` | `delete` |
| `click.link` | `open` |

## Service API

```ts
ctx.uisfx.play('task.success')
ctx.uisfx.play('click.send')
ctx.uisfx.playCue('achievement')
ctx.uisfx.preview('success')
ctx.uisfx.setPack('studio')
ctx.uisfx.setVolume(0.5)
ctx.uisfx.getPrefs()
```

## Development

```powershell
pnpm install
pnpm build
pnpm check
```

Debug helpers in the browser console:

```js
window.__dshUISFX()
window.__dshUISFXDebug()
```

## License

MIT. The embedded uisfx runtime is also MIT; see `NOTICE` and `vendor/uisfx-0.4.0.js`.
