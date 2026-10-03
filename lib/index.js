import z from "@deepseek-ai/schemastery";

/** uisfx pack ids (mirror of uisfx@0.4.0 packNames). */
export const PACK_IDS = [
  "minimal",
  "soft",
  "glass",
  "arcade",
  "mechanical",
  "organic",
  "dreamy",
  "scifi",
  "rubber",
  "cinematic",
  "studio",
  "zen"
];
/** uisfx cue ids (mirror of uisfx@0.4.0 cueNames). */
export const CUE_IDS = [
  "hover",
  "press",
  "release",
  "double-click",
  "focus",
  "long-press",
  "select",
  "deselect",
  "toggle-on",
  "toggle-off",
  "check",
  "uncheck",
  "delete",
  "cancel",
  "undo",
  "redo",
  "copy",
  "paste",
  "open",
  "close",
  "back",
  "forward",
  "expand",
  "collapse",
  "drag-start",
  "drop",
  "snap",
  "swipe",
  "reorder",
  "invalid-drop",
  "send",
  "receive",
  "notification",
  "mention",
  "typing",
  "reaction",
  "success",
  "error",
  "warning",
  "info",
  "blocked",
  "retry",
  "start",
  "stop",
  "progress-step",
  "complete",
  "queued",
  "checkpoint",
  "loading",
  "processing",
  "recording",
  "connecting",
  "scanning",
  "streaming",
  "play",
  "pause",
  "seek",
  "volume-change",
  "skip-next",
  "skip-previous",
  "connect",
  "disconnect",
  "lock",
  "unlock",
  "wake",
  "sleep",
  "reward",
  "level-up",
  "achievement",
  "streak",
  "badge",
  "bonus",
  "add-to-cart",
  "remove-from-cart",
  "checkout",
  "purchase",
  "coupon",
  "refund"
];
/** Scenarios the user can remap from the settings UI. */
export const SCENARIO_IDS = [
  "task.start",
  "task.success",
  "task.failure",
  "task.pending",
  "click.normal",
  "click.primary",
  "click.toggle",
  "click.send",
  "click.close",
  "click.danger",
  "click.link"
];
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
