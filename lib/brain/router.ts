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

const MODELS: Record<Tier, string> = {
  haiku: process.env.BRAIN_MODEL_HAIKU || "claude-haiku-4-5-20251001",
  sonnet: process.env.BRAIN_MODEL_SONNET || process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  opus: process.env.BRAIN_MODEL_OPUS || "claude-opus-4-6",
};

export type CallResult =
  | { ok: true; text: string }
  | { ok: false; reason: "no-key" | "api-error"; detail?: string };

const cache = new Map<string, string>();
const keyOf = (t: Tier, s: string, u: string, m: number) => `${t}|${m}|${s.length}|${u}`;

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
): Promise<CallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, reason: "no-key" };

  const ck = keyOf(tier, system, user, maxTokens);
  const hit = cache.get(ck);
  if (hit !== undefined) return { ok: true, text: hit };

  const ctrl = new AbortController();
  let timer = setTimeout(() => ctrl.abort(), idleMs);
  const bump = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), idleMs); };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODELS[tier], max_tokens: maxTokens, system, stream: true, messages: [{ role: "user", content: user }] }),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) {
      let detail = `HTTP ${res.status}`;
      try { const e = await res.json() as { error?: { message?: string } }; if (e?.error?.message) detail += `: ${e.error.message}`; } catch {}
      return { ok: false, reason: "api-error", detail };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
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
          const ev = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") out += ev.delta.text ?? "";
          else if (ev.type === "error") return { ok: false, reason: "api-error", detail: ev.error?.message ?? "stream error" };
        } catch { /* skip malformed line */ }
      }
    }
    cache.set(ck, out);
    return { ok: true, text: out };
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "stalled (idle timeout)" : e instanceof Error ? e.message : "unreachable";
    return { ok: false, reason: "api-error", detail: msg };
  } finally {
    clearTimeout(timer);
  }
}

/** Pull the first JSON object out of a model reply (tolerates prose/fences). */
export function extractJson(s: string): unknown {
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no json in reply");
  return JSON.parse(s.slice(a, b + 1));
}
