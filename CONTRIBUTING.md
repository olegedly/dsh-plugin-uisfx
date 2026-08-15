# Contributing to dsh-plugin-uisfx

Thanks for considering a contribution!

## Development environment

```powershell
git clone https://github.com/<owner>/dsh-plugin-uisfx.git
cd dsh-plugin-uisfx
pnpm install
pnpm build
pnpm check
```

Use a separate dsh profile for testing:

```powershell
dsh plugin --profile dev add ./dsh-plugin-uisfx
dsh --profile dev web --port 3090
```

## Structure

- `lib/client.js` — generated browser bundle (client plugin)
- `lib/index.js` — generated host bundle (settings namespace + settings API)
- `scripts/build.mjs` — regenerates both bundles and package.json
- `vendor/uisfx-0.4.0.js` — vendored uisfx runtime

Do not hand-edit `lib/*`; edit `scripts/build.mjs` and regenerate.

## Conventions

- Keep the browser bundle dependency-light and lazy: do not create an `AudioContext` before the first user gesture.
- Never throw from a sound callback.
- Keep the settings schema backward-compatible (defaults only for new fields).
- Preserve uisfx MIT attribution in NOTICE.

## Before submitting

```powershell
pnpm run build
pnpm run check
npm pack --dry-run
git status   # must be clean
```

## Commit messages

Use short imperative messages, e.g. `fix: persist pack change after reload`.
