import "server-only";

/**
 * THE MODEL ROUTER — the cost waterfall (docs/BRAIN-API.md, D11).
 *
 * Cheap-first, Opus only when earned:
 *   Stage 0  beats/emphasis         → TS director (free, not here)
 *   Stage 1  read · cast · palette  → Sonnet
 *   Stage 2  per-beat behaviour     → Haiku
 *   Stage 3  "does it need art?"     → Sonnet (gate)
 *   Stage 4  generate the artwork    → Opus, only when Stage 3 says so
 *
 * One `callClaude` for all stages; the model is chosen per tier. Server-only so
 * the key never reaches the browser. A tiny in-process cache dedupes identical
 * calls during a session (the durable cache is the ArtDirection stored on the
 * story — later).
 */

export type Tier = "haiku" | "sonnet" | "opus";

// Model ids follow the live "claude-<tier>-5-5" scheme (sonnet is confirmed
// working in prod). Any can be overridden per-env without a code change.
const MODELS: Record<Tier, string> = {
  haiku: process.env.BRAIN_MODEL_HAIKU || "claude-haiku-5-5",
  sonnet: process.env.BRAIN_MODEL_SONNET || process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  opus: process.env.BRAIN_MODEL_OPUS || "claude-opus-5-5",
};

export type CallResult =
  | { ok: true; text: string }
  | { ok: false; reason: "no-key" | "api-error"; detail?: string };

const cache = new Map<string, string>();
const keyOf = (t: Tier, s: string, u: string, m: number) => `${t}|${m}|${s.length}|${u}`;

/** Diagnostics from the most recent streamed call — what the API actually did
 *  (stop reason, token usage, whether it emitted reasoning blocks we don't keep,
 *  which delta types arrived). Surfaced to a debug caller to explain empties and
 *  truncations. Overwritten each call. */
export let lastDiag: Record<string, unknown> | null = null;

/**
 * Streamed call. The output arrives token-by-token, so a long generation never
 * trips a single-request timeout; we only abort if the stream goes IDLE for
 * `idleMs` (nothing arriving). Total time is unbounded as long as tokens flow.
 */
export async function callClaude(
  tier: Tier,
  system: string,
  user: string,
  maxTokens = 1024,
  idleMs = 45_000,
  // The 5-5 models reason BY DEFAULT, and that reasoning counts against
  // max_tokens. A demanding prompt made them spend the ENTIRE budget thinking and
  // emit zero HTML (empty) or a truncated fragment. "off" turns thinking off so
  // every token goes to the answer; a number gives a bounded thinking budget
  // (the rest of max_tokens is left for the answer).
  thinking: "off" | number = "off",
): Promise<CallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, reason: "no-key" };

  const ck = keyOf(tier, system, user, maxTokens);
  const hit = cache.get(ck);
  if (hit !== undefined) return { ok: true, text: hit };

  // One streamed attempt. Returns the accumulated text, or an error. A stream
  // that completes with NOTHING in it is reported as ok:true text:"" so the
  // caller (below) can decide to retry — the Anthropic stream very occasionally
  // closes clean but empty, and a single retry recovers it.
  async function attempt(): Promise<CallResult> {
    const ctrl = new AbortController();
    let timer = setTimeout(() => ctrl.abort(), idleMs);
    const bump = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), idleMs); };
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey!, "anthropic-version": "2023-06-01" },
        // Cache the system prompt (it's large and identical across a story's
        // calls — e.g. a gated regeneration reuses it): cuts time-to-first-token
        // and input cost on the repeat. Blocks under the model's min size simply
        // aren't cached, so this is safe for the small prompts too.
        body: JSON.stringify({
          model: MODELS[tier], max_tokens: maxTokens, stream: true,
          thinking: thinking === "off" ? { type: "disabled" } : { type: "enabled", budget_tokens: thinking },
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: user }],
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        let detail = `HTTP ${res.status}`;
        try { const e = await res.json() as { error?: { message?: string } }; if (e?.error?.message) detail += `: ${e.error.message}`; } catch {}
        return { ok: false, reason: "api-error", detail };
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      const t0 = Date.now();
      let buf = "", out = "";
      const deltaTypes: Record<string, number> = {}; const blockTypes: Record<string, number> = {};
      let stop: string | undefined, usageOut: number | undefined;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        bump();
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string; stop_reason?: string }; content_block?: { type?: string }; usage?: { output_tokens?: number }; error?: { message?: string } };
            if (ev.type === "content_block_start" && ev.content_block?.type) blockTypes[ev.content_block.type] = (blockTypes[ev.content_block.type] ?? 0) + 1;
            if (ev.type === "content_block_delta" && ev.delta?.type) { deltaTypes[ev.delta.type] = (deltaTypes[ev.delta.type] ?? 0) + 1; if (ev.delta.type === "text_delta") out += ev.delta.text ?? ""; }
            else if (ev.type === "message_delta") { if (ev.delta?.stop_reason) stop = ev.delta.stop_reason; if (ev.usage?.output_tokens) usageOut = ev.usage.output_tokens; }
            else if (ev.type === "error") { lastDiag = { phase: "error", msg: ev.error?.message, ms: Date.now() - t0, blockTypes, deltaTypes }; return { ok: false, reason: "api-error", detail: ev.error?.message ?? "stream error" }; }
          } catch { /* skip malformed line */ }
        }
      }
      lastDiag = { tier, stop, usageOut, textLen: out.length, ms: Date.now() - t0, blockTypes, deltaTypes };
      return { ok: true, text: out };
    } catch (e) {
      const msg = e instanceof Error && e.name === "AbortError" ? "stalled (idle timeout)" : e instanceof Error ? e.message : "unreachable";
      return { ok: false, reason: "api-error", detail: msg };
    } finally {
      clearTimeout(timer);
    }
  }

  // Up to two attempts, but we retry ONLY a FAST failure/empty — a quick hiccup
  // that a second try recovers. We never retry a SLOW one: a long attempt that
  // ends empty or stalls is the model's real behaviour for this input, and
  // retrying would just stack another long wait (a bespoke page is ~100s, so two
  // attempts = ~200s). In that case we stop and let the caller fall back.
  let last: CallResult = { ok: false, reason: "api-error", detail: "no attempt" };
  for (let i = 0; i < 2; i++) {
    const started = Date.now();
    last = await attempt();
    if (last.ok && last.text.trim() !== "") { cache.set(ck, last.text); return last; }
    if (!last.ok && /HTTP 4\d\d/.test(last.detail ?? "")) return last; // client error — won't change
    if (Date.now() - started > 20_000) break;                          // slow — don't stack a retry
    // else: a FAST empty success or FAST transient error → one quick retry.
  }
  // Still empty/failed. An empty-but-"ok" result is really a failure for our
  // callers, so surface it as one with a clear reason.
  if (last.ok) return { ok: false, reason: "api-error", detail: "empty response (model returned no text)" };
  return last;
}

/** Pull the first JSON object out of a model reply (tolerates prose/fences). */
export function extractJson(s: string): unknown {
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no json in reply");
  return JSON.parse(s.slice(a, b + 1));
}
