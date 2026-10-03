import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vendorFile = path.join(repoRoot, 'vendor', 'uisfx-0.4.0.js')
const pluginDir = repoRoot
fs.mkdirSync(pluginDir + '/lib', { recursive: true })
fs.mkdirSync(pluginDir + '/vendor', { recursive: true })

const uisfx = await import(pathToFileURL(vendorFile))
const CUE_IDS = [...uisfx.cueNames]
const PACK_IDS = [...uisfx.packNames]
const SCENARIO_IDS = [
  'task.start', 'task.success', 'task.failure', 'task.pending',
  'click.normal', 'click.primary', 'click.toggle', 'click.send',
  'click.close', 'click.danger', 'click.link',
]

const json = (value) => JSON.stringify(value, null, 2)

// ---------------- package.json ----------------
const packageJson = {
  name: 'dsh-plugin-uisfx',
  version: '0.2.1',
  description: 'dsh plugin: semantic UI sound effects powered by uisfx — per-scenario cues with a settings UI',
  type: 'module',
  main: 'lib/index.js',
  exports: {
    '.': './lib/index.js',
    './client': './lib/client.js',
    './client/service': './lib/client.js',
    './package.json': './package.json',
  },
  files: ['lib', 'vendor', 'docs', 'cordis.patch.yml', 'README.md', 'README_EN.md', 'LICENSE', 'NOTICE'],
  license: 'MIT',
  repository: { type: 'git', url: 'git+https://github.com/XanthanL/dsh-plugin-uisfx.git' },
  keywords: ['dsh-plugin', 'dsh', 'uisfx', 'web-audio', 'sound-effects', 'ui-sfx'],
  engines: { node: '>=20' },
  scripts: {
    build: 'node scripts/build.mjs',
    check: 'node --check lib/index.js && node --check lib/client.js',
    test: 'node --test test/',
    prepack: 'node scripts/build.mjs',
    prepare: 'node scripts/build.mjs',
  },
  publishConfig: { access: 'public' },
  dsh: {
    bundle: { patch: './cordis.patch.yml' },
    client: {
      inject: [
        '@deepseek-ai/dsh-api-session-controller',
        '@deepseek-ai/dsh-client-locale',
        '@deepseek-ai/dsh-client-ui-session',
        '@deepseek-ai/dsh-client-ui-settings',
      ],
      platform: 'web',
    },
  },
  peerDependencies: {
    '@deepseek-ai/dsh-settings': '^0.2.0-rc.2',
    '@deepseek-ai/schemastery': '^3.0.0',
    'cordis': '^4.0.0-rc.7',
  },
  devDependencies: {
    '@deepseek-ai/dsh-settings': '0.2.0-rc.2',
    '@deepseek-ai/schemastery': '^3.18.0',
  },
}
fs.writeFileSync(pluginDir + '/package.json', json(packageJson) + '\n', 'utf8')

// ---------------- cordis.patch.yml ----------------
fs.writeFileSync(pluginDir + '/cordis.patch.yml', `# dsh-plugin-uisfx bundle patch: mount the plugin into the profile.
- insert:
    - id: uisfx
      name: 'dsh-plugin-uisfx'
`, 'utf8')

// ---------------- Node half ----------------
const nodeHalf = `import z from "@deepseek-ai/schemastery";

/** uisfx pack ids (mirror of uisfx@0.4.0 packNames). */
export const PACK_IDS = ${json(PACK_IDS)};
/** uisfx cue ids (mirror of uisfx@0.4.0 cueNames). */
export const CUE_IDS = ${json(CUE_IDS)};
/** Scenarios the user can remap from the settings UI. */
export const SCENARIO_IDS = ${json(SCENARIO_IDS)};
/** Legacy user-settings identifier kept for API compatibility. On dsh 0.2 the
 * settings namespace is the plugin's profile entry id ("uisfx"), derived at runtime. */
export const UISFX_SETTINGS_NS = "dsh-plugin-uisfx";

const DEFAULT_MAPPING = {
  "task.start": "start",
  "task.success": "success",
  "task.failure": "error",
  "task.pending": "notification",
  "click.normal": "press",
  "click.primary": "select",
  "click.toggle": "toggle-on",
  "click.send": "send",
  "click.close": "close",
  "click.danger": "delete",
  "click.link": "open",
};

/** Durable user preferences; every field is volatile so the Host accepts live edits. */
export const UisfxSettingsSchema = z.object({
  enabled: z.boolean().default(true).volatile(),
  volume: z.number().min(0).max(1).default(0.55).volatile(),
  pack: z.union(PACK_IDS).default("zen").volatile(),
  taskSounds: z.boolean().default(true).volatile(),
  clickSounds: z.boolean().default(true).volatile(),
  attentionSounds: z.boolean().default(true).volatile(),
  mapping: z.object({
    "task.start": z.union(CUE_IDS).default("start"),
    "task.success": z.union(CUE_IDS).default("success"),
    "task.failure": z.union(CUE_IDS).default("error"),
    "task.pending": z.union(CUE_IDS).default("notification"),
    "click.normal": z.union(CUE_IDS).default("press"),
    "click.primary": z.union(CUE_IDS).default("select"),
    "click.toggle": z.union(CUE_IDS).default("toggle-on"),
    "click.send": z.union(CUE_IDS).default("send"),
    "click.close": z.union(CUE_IDS).default("close"),
    "click.danger": z.union(CUE_IDS).default("delete"),
    "click.link": z.union(CUE_IDS).default("open"),
  }).default(DEFAULT_MAPPING).volatile(),
});

/**
 * Cordis Config for the "uisfx" profile entry. Exporting it is what makes the
 * plugin's preferences a Host settings namespace on dsh 0.2.x; the old
 * ctx.settings.register(ns, schema) scope API no longer exists there.
 */
export const Config = UisfxSettingsSchema;

export const UISFX_DEFAULTS = {
  enabled: true,
  volume: 0.55,
  pack: "zen",
  taskSounds: true,
  clickSounds: true,
  attentionSounds: true,
  mapping: DEFAULT_MAPPING,
};

function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
  if (text === "") return {};
  return JSON.parse(text);
}

function isTrustedApiRequest(request, trustedHosts) {
  const host = request.headers.host ?? "";
  if (host === "") return false;
  const hostname = host.split(":")[0];
  if ((request.headers["sec-fetch-site"] ?? "") === "cross-site") return false;
  const origin = request.headers.origin;
  if (origin !== undefined) {
    try { if (new URL(origin).host !== host) return false; } catch { return false; }
  }
  if (hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1") return true;
  return (trustedHosts ?? []).some((entry) => entry === host || entry.split(":")[0] === hostname);
}

export const name = "dsh-plugin-uisfx";
export const inject = ["webServer", "webRuntime"];

/** Project this entry's live Config refs into a plain preferences object. */
function readPreferences(config) {
  return {
    enabled: config.enabled.get(),
    volume: config.volume.get(),
    pack: config.pack.get(),
    taskSounds: config.taskSounds.get(),
    clickSounds: config.clickSounds.get(),
    attentionSounds: config.attentionSounds.get(),
    mapping: { ...DEFAULT_MAPPING, ...config.mapping.get() },
  };
}

/**
 * Host registration: the exported Config supplies this entry's durable settings
 * namespace, and a small trusted JSON API serves the browser half. dsh 0.2
 * auto-generates a settings page from Config; this plugin renders its own page,
 * so that automatic page is disabled.
 */
export function apply(ctx, config) {
  const entryId = ctx.fiber.entry?.options.id;
  let settings = null;
  ctx.inject(["settings"], (child) => {
    settings = child.settings;
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
  const trustedHosts = ctx.webRuntime.trustedHosts;
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/uisfx/api/settings",
    handler: async (req, res) => {
      if (!isTrustedApiRequest(req, trustedHosts)) {
        writeJson(res, 403, { ok: false, error: { code: "forbidden", message: "forbidden" } });
        return;
      }
      if (req.method === "GET") {
        writeJson(res, 200, { ok: true, value: readPreferences(config) });
        return;
      }
      if (req.method === "POST") {
        let patch;
        try {
          const body = await readJson(req);
          if (body !== null && typeof body === "object" && body.patch !== null && typeof body.patch === "object") patch = body.patch;
          else if (body !== null && typeof body === "object" && typeof body.field === "string") patch = { [body.field]: body.value };
        } catch {
          writeJson(res, 400, { ok: false, error: { code: "bad-request", message: "request body is not valid JSON" } });
          return;
        }
        if (patch === undefined) {
          writeJson(res, 400, { ok: false, error: { code: "bad-request", message: "expected { patch } or { field, value }" } });
          return;
        }
        if (settings === null || entryId === undefined) {
          writeJson(res, 503, { ok: false, error: { code: "unavailable", message: "settings not ready" } });
          return;
        }
        try {
          await settings.update(entryId, patch);
          // Config refs settle asynchronously; answer with the merged value the
          // browser just asked for so its optimistic state is not reverted.
          writeJson(res, 200, { ok: true, value: { ...readPreferences(config), ...patch } });
        } catch (error) {
          writeJson(res, 400, { ok: false, error: { code: "invalid", message: error instanceof Error ? error.message : String(error) } });
        }
        return;
      }
      writeJson(res, 405, { ok: false, error: { code: "method-error", message: "method not allowed" } });
    }
  }), "dsh-plugin-uisfx: settings api");
}
`
fs.writeFileSync(pluginDir + '/lib/index.js', nodeHalf, 'utf8')

// ---------------- client bundle ----------------
const VENDOR_HEADER = '// vendored from uisfx@0.4.0 (MIT), https://github.com/romainsimon/uisfx'
// Strip any previously added header so the build is idempotent.
const vendorRaw = fs.readFileSync(vendorFile, 'utf8')
  .split('\n')
  .filter((line) => !line.startsWith(VENDOR_HEADER))
  .join('\n')
  .replace(/\s+$/, '')
const exportIdx = vendorRaw.indexOf('export{')
if (exportIdx < 0) throw new Error('uisfx export marker not found')
const vendorBody = vendorRaw
  .slice(0, exportIdx)
  .replace(/\/\/# sourceMappingURL=.*$/gm, '')
  .replace(/\s*$/, '')

// Keep a complete vendored copy for transparency.
fs.writeFileSync(
  pluginDir + '/vendor/uisfx-0.4.0.js',
  VENDOR_HEADER + '\n' + vendorRaw + '\n',
  'utf8',
)

const clientPrefix = `window.__ModuleLoader__.load({
	id: "dsh-plugin-uisfx",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		let react = require("react");
`

const clientSuffix = `
		//#region uisfx preferences + bridge
		const NS = "dsh-plugin-uisfx";
		const SCENARIO_DEFS = ${json(SCENARIO_IDS.map((id) => ({ id })))};
		const DEFAULT_MAPPING = {
			"task.start": "start",
			"task.success": "success",
			"task.failure": "error",
			"task.pending": "notification",
			"click.normal": "press",
			"click.primary": "select",
			"click.toggle": "toggle-on",
			"click.send": "send",
			"click.close": "close",
			"click.danger": "delete",
			"click.link": "open"
		};

		const zh = {
			"settingsNav": "音效",
			"enabled": "启用音效",
			"volume": "音量",
			"pack": "音色包",
			"taskSounds": "任务音",
			"clickSounds": "按钮音",
			"attentionSounds": "提醒音",
			"preview": "试听",
			"reset": "恢复默认",
			"scenario.task.start": "任务开始",
			"scenario.task.success": "任务成功",
			"scenario.task.failure": "任务失败",
			"scenario.task.pending": "待处理提醒",
			"scenario.click.normal": "普通点击",
			"scenario.click.primary": "主要按钮",
			"scenario.click.toggle": "开关",
			"scenario.click.send": "发送",
			"scenario.click.close": "关闭 / 取消",
			"scenario.click.danger": "删除 / 危险",
			"scenario.click.link": "链接"
		};
		const en = {
			"settingsNav": "Sound Effects",
			"enabled": "Enable sounds",
			"volume": "Volume",
			"pack": "Sound pack",
			"taskSounds": "Task sounds",
			"clickSounds": "Button sounds",
			"attentionSounds": "Attention sounds",
			"preview": "Preview",
			"reset": "Reset defaults",
			"scenario.task.start": "Task start",
			"scenario.task.success": "Task success",
			"scenario.task.failure": "Task failure",
			"scenario.task.pending": "Pending attention",
			"scenario.click.normal": "Normal click",
			"scenario.click.primary": "Primary button",
			"scenario.click.toggle": "Toggle / checkbox",
			"scenario.click.send": "Send",
			"scenario.click.close": "Close / cancel",
			"scenario.click.danger": "Delete / danger",
			"scenario.click.link": "Link"
		};

		function normalizePrefs(raw) {
			const source = raw !== null && typeof raw === "object" ? raw : {};
			const mapping = { ...DEFAULT_MAPPING };
			if (source.mapping !== null && typeof source.mapping === "object") {
				for (const [scenario, cue] of Object.entries(source.mapping)) {
					if (typeof cue === "string" && te.includes(cue) && mapping[scenario] !== undefined) mapping[scenario] = cue;
				}
			}
			return {
				enabled: typeof source.enabled === "boolean" ? source.enabled : true,
				volume: typeof source.volume === "number" ? Math.max(0, Math.min(1, source.volume)) : 0.55,
				pack: typeof source.pack === "string" && W.includes(source.pack) ? source.pack : "zen",
				taskSounds: typeof source.taskSounds === "boolean" ? source.taskSounds : true,
				clickSounds: typeof source.clickSounds === "boolean" ? source.clickSounds : true,
				attentionSounds: typeof source.attentionSounds === "boolean" ? source.attentionSounds : true,
				mapping
			};
		}

		/** Pack display label (uisfx metadata). */
		function packLabel(pack) {
			const found = ee.find((entry) => entry.name === pack);
			return found === undefined ? pack : found.label;
		}
		/** Cue display label (uisfx metadata). */
		function cueLabel(cue) {
			const found = $.find((entry) => entry.name === cue);
			return found === undefined ? cue : found.label;
		}

		/** Settings section component (plain React, no JSX build step). */
		function SettingsSection({ service, t }) {
			const react$1 = react;
			const [prefs, setPrefs] = react$1.useState(() => service.getPrefs());
			react$1.useEffect(() => service.subscribe(setPrefs), [service]);
			const create = react$1.createElement;

			const s = {
				root: { display: "flex", flexDirection: "column", gap: 14, padding: "4px 0" },
				row: { display: "flex", alignItems: "center", gap: 10, minHeight: 30 },
				label: { flex: 1, minWidth: 0, fontSize: 13, color: "var(--dsw-alias-label-primary)" },
				control: { flex: "none" },
				select: { boxSizing: "border-box", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, background: "var(--dsw-specific-input-major)", color: "var(--dsw-alias-label-primary)", padding: "5px 8px", fontSize: 13 },
				button: { boxSizing: "border-box", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, background: "var(--dsw-alias-button-floating-fill)", color: "var(--dsw-alias-label-secondary)", cursor: "pointer", padding: "4px 10px", fontSize: 12 },
				switch: { width: 34, height: 20, cursor: "pointer" },
				section: { fontSize: 12, fontWeight: 500, color: "var(--dsw-alias-label-secondary)", marginTop: 6 },
				hint: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)" }
			};

			const scenarioRows = SCENARIO_DEFS.map((entry) => {
				const scenario = entry.id;
				const cue = prefs.mapping[scenario] ?? DEFAULT_MAPPING[scenario];
				return create("div", { key: scenario, style: s.row },
					create("span", { style: s.label }, t("scenario." + scenario)),
					create("select", {
						style: { ...s.select, ...s.control },
						value: cue,
						onChange: (event) => { service.setScenarioCue(scenario, event.target.value); }
					}, te.map((cueId) => create("option", { key: cueId, value: cueId }, cueLabel(cueId)))),
					create("button", { type: "button", style: s.button, onClick: () => { service.preview(cue); } }, t("preview"))
				);
			});

			const resetButton = () => service.reset();

			return create("div", { style: s.root },
				create("div", { style: s.row },
					create("span", { style: s.label }, t("enabled")),
					create("input", { type: "checkbox", style: s.switch, checked: prefs.enabled, onChange: (event) => { service.setEnabled(event.target.checked); } })
				),
				create("div", { style: s.row },
					create("span", { style: s.label }, t("volume") + " " + Math.round(prefs.volume * 100) + "%"),
					create("input", { type: "range", min: 0, max: 100, step: 1, style: { ...s.control, width: 160 }, value: Math.round(prefs.volume * 100), onChange: (event) => { service.setVolume(Number(event.target.value) / 100); } })
				),
				create("div", { style: s.row },
					create("span", { style: s.label }, t("pack")),
					create("select", { style: { ...s.select, ...s.control }, value: prefs.pack, onChange: (event) => { service.setPack(event.target.value); } },
						W.map((pack) => create("option", { key: pack, value: pack }, packLabel(pack))))
				),
				create("div", { style: s.section }, t("taskSounds")),
				create("div", { style: s.row },
					create("span", { style: s.label }, t("scenario.task.start")),
					create("select", { style: { ...s.select, ...s.control }, value: prefs.mapping["task.start"], onChange: (event) => { service.setScenarioCue("task.start", event.target.value); } },
						te.map((cueId) => create("option", { key: cueId, value: cueId }, cueLabel(cueId)))),
					create("button", { type: "button", style: s.button, onClick: () => { service.preview(prefs.mapping["task.start"]); } }, t("preview"))
				),
				create("div", { style: s.row },
					create("span", { style: s.label }, t("scenario.task.success")),
					create("select", { style: { ...s.select, ...s.control }, value: prefs.mapping["task.success"], onChange: (event) => { service.setScenarioCue("task.success", event.target.value); } },
						te.map((cueId) => create("option", { key: cueId, value: cueId }, cueLabel(cueId)))),
					create("button", { type: "button", style: s.button, onClick: () => { service.preview(prefs.mapping["task.success"]); } }, t("preview"))
				),
				create("div", { style: s.row },
					create("span", { style: s.label }, t("scenario.task.failure")),
					create("select", { style: { ...s.select, ...s.control }, value: prefs.mapping["task.failure"], onChange: (event) => { service.setScenarioCue("task.failure", event.target.value); } },
						te.map((cueId) => create("option", { key: cueId, value: cueId }, cueLabel(cueId)))),
					create("button", { type: "button", style: s.button, onClick: () => { service.preview(prefs.mapping["task.failure"]); } }, t("preview"))
				),
				create("div", { style: s.row },
					create("span", { style: s.label }, t("scenario.task.pending")),
					create("select", { style: { ...s.select, ...s.control }, value: prefs.mapping["task.pending"], onChange: (event) => { service.setScenarioCue("task.pending", event.target.value); } },
						te.map((cueId) => create("option", { key: cueId, value: cueId }, cueLabel(cueId)))),
					create("button", { type: "button", style: s.button, onClick: () => { service.preview(prefs.mapping["task.pending"]); } }, t("preview"))
				),
				create("div", { style: s.section }, t("clickSounds")),
				scenarioRows.filter((row) => row.key.startsWith("click.")),
				create("div", { style: s.row },
					create("span", { style: s.label }, t("attentionSounds")),
					create("input", { type: "checkbox", style: s.switch, checked: prefs.attentionSounds, onChange: (event) => { service.setAttentionSounds(event.target.checked); } })
				),
				create("div", { style: s.row },
					create("span", { style: s.label }, t("taskSounds")),
					create("input", { type: "checkbox", style: s.switch, checked: prefs.taskSounds, onChange: (event) => { service.setTaskSounds(event.target.checked); } })
				),
				create("div", { style: s.row },
					create("span", { style: s.label }, t("clickSounds")),
					create("input", { type: "checkbox", style: s.switch, checked: prefs.clickSounds, onChange: (event) => { service.setClickSounds(event.target.checked); } })
				),
				create("div", { style: s.row },
					create("span", { style: s.hint }, "uisfx 0.4.0 — MIT"),
					create("button", { type: "button", style: s.button, onClick: resetButton }, t("reset"))
				)
			);
		}

		function classifyClick(target) {
			if (!(target instanceof Element)) return null;
			const el = target.closest("button, [role='button'], [role='switch'], [role='checkbox'], a, [aria-pressed]");
			if (el === null || el.disabled === true || el.getAttribute("aria-disabled") === "true") return null;
			const label = ((el.getAttribute("aria-label") ?? "") + " " + (el.getAttribute("title") ?? "")).toLowerCase();
			const cls = typeof el.className === "string" ? el.className : "";
			if (label.includes("关闭") || label.includes("close") || label.includes("取消") || label.includes("cancel")) return "click.close";
			if (label.includes("发送") || label.includes("send") || label.includes("submit") || label.includes("go")) return "click.send";
			if (label.includes("删除") || label.includes("delete") || label.includes("清空") || label.includes("clear") || label.includes("trash") || label.includes("移除")) return "click.danger";
			if (el.getAttribute("role") === "switch" || el.getAttribute("role") === "checkbox" || el.hasAttribute("aria-pressed")) return "click.toggle";
			if (el.tagName === "A" || el.getAttribute("role") === "link") return "click.link";
			if (cls.includes("primary") || cls.includes("accent") || cls.includes("send")) return "click.primary";
			return "click.normal";
		}

		function apply(ctx) {
			let prefs = normalizePrefs(null);
			const listeners = new Set();
			let player = null;
			let disposed = false;

			/** Persist one scalar field through the plugin's own settings API. */
			function persistField(field, value) {
				fetch("/uisfx/api/settings", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ field, value })
				}).then((res) => res.json()).then((data) => {
					if (!disposed && data !== null && typeof data === "object" && data.ok === true && data.value !== undefined) applyPrefs(data.value);
				}).catch(() => {});
			}
			/** Load durable prefs from the Host on startup. */
			function loadRemotePrefs() {
				fetch("/uisfx/api/settings", { cache: "no-store" }).then((res) => res.json()).then((data) => {
					if (!disposed && data !== null && typeof data === "object" && data.ok === true && data.value !== undefined) applyPrefs(data.value);
				}).catch(() => {});
			}

			function publish(next) {
				prefs = next;
				for (const listener of [...listeners]) {
					try { listener(next); } catch {}
				}
			}
			function ensurePlayer() {
				if (player !== null) return player;
				player = ie({
					pack: prefs.pack,
					volume: prefs.volume,
					enabled: prefs.enabled,
					preferences: { key: NS + ":local-mirror" }
				});
				window.__dshUISFX = () => player;
				return player;
			}
			function applyPrefs(raw) {
				const next = normalizePrefs(raw);
				publish(next);
				if (player !== null) {
					try {
						player.setEnabled(next.enabled);
						player.setVolume(next.volume);
						player.setPack(next.pack);
					} catch {}
				}
			}

			const tBound = ctx.locale.bind(NS);
			const t = (key) => {
				try { return tBound(key); } catch { return zh[key] ?? en[key] ?? key; }
			};

			function playCue(cue) {
				if (!prefs.enabled || typeof cue !== "string" || !te.includes(cue)) return null;
				try { return ensurePlayer().play(cue); } catch { return null; }
			}
			function gate(scenario) {
				if (scenario.startsWith("task.")) return prefs.taskSounds;
				if (scenario.startsWith("click.")) return prefs.clickSounds;
				return true;
			}

			const service = {
				getPrefs: () => prefs,
				subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
				play: (scenario) => {
					if (!prefs.enabled || !gate(scenario)) return null;
					const cue = prefs.mapping[scenario];
					return cue === undefined ? null : playCue(cue);
				},
				playCue,
				preview: (cue) => {
					if (prefs.enabled) {
						try { ensurePlayer().play(cue); } catch {}
					}
				},
				setEnabled: (enabled) => {
					const next = { ...prefs, enabled: enabled === true };
					publish(next);
					if (player !== null) try { player.setEnabled(next.enabled); } catch {}
					void persistField("enabled", next.enabled);
				},
				setVolume: (volume) => {
					const value = Math.max(0, Math.min(1, Number(volume) || 0));
					const next = { ...prefs, volume: value };
					publish(next);
					if (player !== null) try { player.setVolume(value); } catch {}
					void persistField("volume", value);
				},
				setPack: (pack) => {
					if (!W.includes(pack)) return;
					const next = { ...prefs, pack };
					publish(next);
					if (player !== null) try { player.setPack(pack); } catch {}
					void persistField("pack", pack);
				},
				setTaskSounds: (enabled) => { publish({ ...prefs, taskSounds: enabled === true }); void persistField("taskSounds", enabled === true); },
				setClickSounds: (enabled) => { publish({ ...prefs, clickSounds: enabled === true }); void persistField("clickSounds", enabled === true); },
				setAttentionSounds: (enabled) => { publish({ ...prefs, attentionSounds: enabled === true }); void persistField("attentionSounds", enabled === true); },
				setScenarioCue: (scenario, cue) => {
					if (!te.includes(cue) || prefs.mapping[scenario] === undefined) return;
					const next = { ...prefs, mapping: { ...prefs.mapping, [scenario]: cue } };
					publish(next);
					void persistField("mapping", next.mapping);
				},
				reset: () => {
					const next = normalizePrefs(null);
					publish(next);
					if (player !== null) try { player.setEnabled(next.enabled); player.setVolume(next.volume); player.setPack(next.pack); } catch {}
					for (const field of ["enabled", "volume", "pack", "taskSounds", "clickSounds", "attentionSounds", "mapping"]) {
						void persistField(field, next[field]);
					}
				}
			};

			window.__dshUISFXDebug = () => {
				return {
					prefs,
					storage: "host-api",
					disposed
				};
			};

			const disposeService = ctx.reflect.provide("uisfx", service);

			// Locale dictionaries.
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-plugin-uisfx: dictionaries");

			// Load Host-persisted preferences through the plugin settings API.
			loadRemotePrefs();

			// Task lifecycle watcher (current session only).
			// dsh 0.2 moved the "current session" out of ctx.sessions.list, whose
			// snapshot now carries only { ids, byId, phase, projectionsBySession },
			// and moved per-session running/pending facts into uiSession:
			//   uiSession.current        -> binding source whose value.key is the session id
			//   uiSession.sessionStatus  -> Map<sessionId, { running, pendingInteraction, completionUnread }>
			let statusOff = null;
			let currentOff = null;
			let watchedId = null;
			let lastRunning = null;
			let lastPending = false;

			function currentSessionId() {
				try {
					const value = ctx.uiSession.current.getSnapshot();
					return value === undefined || value === null ? undefined : value.key;
				} catch { return undefined; }
			}
			function readStatus(id) {
				try {
					const status = ctx.uiSession.sessionStatus.getSnapshot().get(id);
					if (status !== undefined) return status;
				} catch {}
				return { running: false, pendingInteraction: undefined };
			}
			/** A turn is a failure when the session reports an agent error or the transcript shows one. */
			function taskOutcome() {
				try {
					if (document.querySelector("[data-chat-flow-kind='turn-error']") !== null) return true;
				} catch {}
				if (watchedId === null || watchedId === undefined) return false;
				try {
					const binding = ctx.sessions.binding(watchedId);
					if (binding === undefined) return false;
					const snapshot = binding.session.getSnapshot();
					return snapshot !== undefined && snapshot.lastAgentError != null;
				} catch { return false; }
			}
			function onStatusTick() {
				const id = currentSessionId();
				if (id !== watchedId) {
					watchedId = id;
					lastRunning = null;
					lastPending = false;
				}
				if (watchedId === undefined || watchedId === null) return;
				const status = readStatus(watchedId);
				const running = status.running === true;
				const pending = status.pendingInteraction !== undefined && status.pendingInteraction !== null;
				if (lastRunning === null) {
					lastRunning = running;
					lastPending = pending;
					return;
				}
				if (running && !lastRunning) service.play("task.start");
				else if (!running && lastRunning) {
					window.setTimeout(() => {
						service.play(taskOutcome() ? "task.failure" : "task.success");
					}, 50);
				}
				if (pending && !lastPending) service.play("task.pending");
				lastRunning = running;
				lastPending = pending;
			}
			statusOff = ctx.uiSession.sessionStatus.subscribe(onStatusTick);
			currentOff = ctx.uiSession.current.subscribe(onStatusTick);
			onStatusTick();

			// Button click watcher.
			let lastClickAt = 0;
			const onPointerDown = (event) => {
				if (!prefs.enabled || !prefs.clickSounds) return;
				try { const ui = ensurePlayer(); void ui.unlock(); } catch {}
				const scenario = classifyClick(event.target);
				if (scenario === null) return;
				const now = Date.now();
				if (now - lastClickAt < 40) return;
				lastClickAt = now;
				service.play(scenario);
			};
			document.addEventListener("pointerdown", onPointerDown, true);

			// Settings section registration.
			let disposeSettingsSection = null;
			try {
				disposeSettingsSection = ctx.slots.inject("settings.section", () => ctx.slots.register({
					name: "settings.section",
					id: "uisfx",
					order: 110,
					label: () => t("settingsNav"),
					inject: () => ({ service, t })
				}, SettingsSection));
			} catch {}

			return () => {
				disposed = true;
				if (statusOff !== null) try { statusOff(); } catch {}
				if (currentOff !== null) try { currentOff(); } catch {}
				if (typeof disposeSettingsSection === "function") try { disposeSettingsSection(); } catch {}
				document.removeEventListener("pointerdown", onPointerDown, true);
				try { disposeService(); } catch {}
			};
		}

		exports.apply = apply;
		exports.inject = ["slots", "sessions", "uiSession", "locale"];
		return module.exports;
	}
});
`

const vendorBlock = '\t\t//#region vendor/uisfx@0.4.0 (MIT, https://github.com/romainsimon/uisfx)\n'
  + vendorBody.split('\n').map((line) => '\t\t' + line).join('\n')
  + '\n\t\t//#endregion\n'
fs.writeFileSync(pluginDir + '/lib/client.js', clientPrefix + vendorBlock + clientSuffix, 'utf8')

// ---------------- license / notice / readme (write only when missing) ----------------
const boilerplate = {
  NOTICE: `This plugin embeds the uisfx runtime, version 0.4.0.

uisfx: https://github.com/romainsimon/uisfx
License: MIT
Copyright (c) Yuki Capital

The full vendored source is kept in vendor/uisfx-0.4.0.js.
`,
  LICENSE: 'MIT License\n\nCopyright (c) 2026 dsh-plugin-uisfx contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n',
}
for (const [file, content] of Object.entries(boilerplate)) {
  const target = path.join(pluginDir, file)
  if (!fs.existsSync(target)) fs.writeFileSync(target, content, 'utf8')
}
if (!fs.existsSync(path.join(pluginDir, 'README.md'))) {
  fs.writeFileSync(path.join(pluginDir, 'README.md'), '# dsh-plugin-uisfx\n\nSee README.md in the repository root.\n', 'utf8')
}

console.log('plugin files written:')
console.log(fs.readdirSync(pluginDir).join('\n'))
console.log('client bytes', fs.statSync(pluginDir + '/lib/client.js').size)
console.log('node bytes', fs.statSync(pluginDir + '/lib/index.js').size)





