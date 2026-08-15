# 🔊 dsh-uisfx

> A dsh plugin that brings [uisfx](https://uisfx.com) semantic UI sound effects to DeepSeek Harness.
> Task start / success / failure and button clicks can each be assigned a sound cue from the settings page, with instant preview.

[![License](https://img.shields.io/badge/license-MIT-blue)](#license)
[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-7c3aed)](https://github.com/topics/dsh-plugin)
[![dsh](https://img.shields.io/badge/dsh-0.1.0--rc.6-2563eb)](https://github.com/deepseek-ai)
[![uisfx](https://img.shields.io/badge/powered%20by-uisfx%200.4.0-f97316)](https://uisfx.com)

---

## What it solves

dsh has almost no audio feedback by default. Did the task finish? Did it fail? Did the button register? You can only tell by watching the screen.

`dsh-uisfx` adds a **semantic sound system**:

- **Task sounds** — start, success, failure, pending attention
- **Button sounds** — different sounds for different button kinds
- **Global sound packs** — 12 uisfx packs, switch the whole personality in one click
- **Per-scenario cues** — every scenario maps to an independent cue, with preview buttons
- **Persistent settings** — stored in `settings.yaml`, survives restarts

---

## Preview

![dsh-uisfx settings page](docs/settings-sound-effects.png)

---

## Quick start

```powershell
dsh plugin --profile web add dsh-uisfx
# restart dsh web
```

Then open **Settings → Sound Effects**.

> Requires dsh `0.1.0-rc.6`. Verified alongside `dsh-better-sidebar` and `@dsh-external/dsh-navbar`.

---

## Features

| Feature | Description |
|---|---|
| 🎚 Global sound pack | 12 uisfx packs (`zen` / `studio` / `scifi` / `soft` ...) |
| 🎯 Scenario mapping | 11 scenarios, each mapped to a cue with sensible defaults |
| ▶ Instant preview | Preview buttons next to every scenario in settings |
| 🔔 Task feedback | Start / success / failure / pending for the current session |
| 🖱 Button feedback | Auto-detects send / delete / toggle / link / primary / normal |
| 💾 Persistence | Host `settings.yaml` namespace `dsh-uisfx` |
| 🔌 Service API | `ctx.uisfx` for third-party plugins |

---

## Default scenario mapping

| Scenario | Cue | When |
|---|---|---|
| `task.start` | `start` | agent starts running |
| `task.success` | `success` | task finishes successfully |
| `task.failure` | `error` | task fails |
| `task.pending` | `notification` | pending interaction appears |
| `click.normal` | `press` | normal button |
| `click.primary` | `select` | primary / accent button |
| `click.toggle` | `toggle-on` | toggle / checkbox |
| `click.send` | `send` | send / submit |
| `click.close` | `close` | close / cancel |
| `click.danger` | `delete` | delete / destructive action |
| `click.link` | `open` | link |

Default sound pack: `zen` — paper, wood and quiet chimes for long working sessions.

---

## Sound packs

| Pack | Character | Good fit |
|---|---|---|
| `minimal` | Dry, precise | Productivity |
| `soft` | Rounded, warm | Mobile, friendly SaaS |
| `glass` | Bright, crystalline | Media, finance |
| `arcade` | Chunky pixels | Games |
| `mechanical` | Switches, relays | Devtools |
| `organic` | Wood, water | Education, kids |
| `dreamy` | Airy, slow | Creative tools |
| `scifi` | Holographic | AI tools |
| `rubber` | Elastic, playful | Casual apps |
| `cinematic` | Deep impacts | Media, games |
| `studio` | Tactile, restrained | AI creative tools |
| `zen` | Paper, wood, chime | Focus, reading (default) |

Preview every pack: https://uisfx.com

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `enabled` | `true` | Master switch |
| `volume` | `0.55` | Volume 0-1 |
| `pack` | `zen` | Global sound pack |
| `taskSounds` | `true` | Task sounds |
| `clickSounds` | `true` | Button sounds |
| `attentionSounds` | `true` | Pending attention sounds |
| `mapping.*` | table above | Per-scenario cue |

All settings are written to Host `settings.yaml`:

```yaml
dsh-uisfx:
  enabled: true
  volume: 0.55
  pack: zen
```

---

## Service API

Other dsh plugins can trigger sounds:

```ts
// play by scenario
ctx.uisfx.play('task.success')
ctx.uisfx.play('click.send')
ctx.uisfx.play('task.start')

// play a raw cue
ctx.uisfx.playCue('achievement')
ctx.uisfx.playCue('reward')

// preview from settings
ctx.uisfx.preview('success')

// read / update settings
ctx.uisfx.getPrefs()
ctx.uisfx.setPack('studio')
ctx.uisfx.setVolume(0.5)
```

There are 78 cues from uisfx:
`hover` / `press` / `select` / `toggle-on` / `send` / `success` / `error` / `complete` / `achievement` / ...

---

## Architecture

- **No audio files** — embeds the uisfx 0.4.0 Web Audio synthesis runtime
- **Lazy player** — created on the first user gesture, respecting autoplay policies
- **Task watcher** — subscribes to `ctx.sessions.binding(current).session` (`running` / `pending` / `lastAgentError`)
- **Click classifier** — global pointerdown classifier maps semantics to scenarios
- **Persistence** — dedicated `/uisfx/api/settings` API backed by Host settings

---

## FAQ

### No sound?

1. Settings → Sound Effects → enable sounds
2. The browser may block autoplay: click anywhere on the page once
3. Check the system volume and the dsh volume slider

### No success / failure sound after a task?

- Only the **current session** plays task sounds
- Make sure `taskSounds` is enabled
- Failure detection uses `lastAgentError` or `turn-error` nodes

---

## Development

```powershell
git clone https://github.com/<your-name>/dsh-uisfx.git
cd dsh-uisfx
pnpm install
pnpm build      # generates lib/client.js / lib/index.js
pnpm check      # syntax checks
```

Use a separate dev profile so restarts never interrupt your daily web:

```powershell
dsh plugin --profile dev add ./dsh-uisfx
dsh --profile dev web --port 3090
```

Browser debug helpers:

```js
window.__dshUISFX()          // uisfx player
window.__dshUISFXDebug()     // current prefs
```

---

## Roadmap

- [x] Task sounds + button sounds + settings UI + persistence
- [x] All 12 packs and 78 cues selectable
- [ ] Background-session completion notifications
- [ ] Hover / drag / split sounds
- [ ] Per-scenario sound pack
- [ ] Custom audio uploads

---

## License

- This plugin: MIT
- Embedded uisfx runtime: MIT, copyright Yuki Capital — see [`NOTICE`](NOTICE) and [`vendor/uisfx-0.4.0.js`](vendor/uisfx-0.4.0.js)

## Related projects

- [uisfx](https://github.com/romainsimon/uisfx) — the open-source sound system this plugin uses
- [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) — a powerful dsh sidebar plugin
- [dsh-navbar](https://github.com/vlln/dsh-navbar) — conversation message navigation dots

---

If you find this plugin useful, give it a ⭐ and add the `dsh-plugin` topic to the repo.
