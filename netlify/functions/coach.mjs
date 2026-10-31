// Coaching proxy: keeps the Anthropic API key on the server.
// Env vars (set in Netlify): ANTHROPIC_API_KEY (required), MODEL, DAILY_LIMIT_PER_PERSON, DAILY_LIMIT_TOTAL
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const key = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "not_configured" }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const msgs = body && body.messages;
  if (!Array.isArray(msgs) || msgs.length < 1 || msgs.length > 14) return json({ error: "bad_messages" }, 400);
  let total = 0;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (!m || typeof m.content !== "string" || !["user", "assistant"].includes(m.role)) return json({ error: "bad_messages" }, 400);
    if (m.role !== (i % 2 === 0 ? "user" : "assistant")) return json({ error: "bad_order" }, 400);
    total += m.content.length;
  }
  if (msgs[msgs.length - 1].role !== "user" || total > 90000) return json({ error: "too_large" }, 400);

  // Daily limits (best effort; skipped if storage is unavailable)
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("coach-limits");
    const day = new Date().toISOString().slice(0, 10);
    const perPerson = parseInt(Netlify.env.get("DAILY_LIMIT_PER_PERSON") || "40", 10);
    const overall = parseInt(Netlify.env.get("DAILY_LIMIT_TOTAL") || "1500", 10);
    const ip = (context && context.ip) || "unknown";
    const kP = `${day}:ip:${ip}`, kT = `${day}:total`;
    const nP = parseInt((await store.get(kP)) || "0", 10);
    const nT = parseInt((await store.get(kT)) || "0", 10);
    if (nP >= perPerson || nT >= overall) return json({ error: "rate_limited" }, 429);
    await store.set(kP, String(nP + 1));
    await store.set(kT, String(nT + 1));
  } catch (e) { /* do not block coaching if limits can't be checked */ }

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Netlify.env.get("MODEL") || "claude-sonnet-5-5",
      max_tokens: 400,
      messages: msgs,
    }),
  });
  if (!r.ok) return json({ error: "upstream", status: r.status }, 502);
  const data = await r.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  return json({ text: text || "I'm here to help. Could you tell me a bit more about your answer?" });
};

export const config = { path: "/api/coach" };
