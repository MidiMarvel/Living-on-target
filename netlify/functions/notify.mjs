// Emails the facilitator when a reader submits answers or sends a message.
// Uses Resend (free plan). Netlify env vars:
//   RESEND_API_KEY (required, secret)
//   NOTIFY_TO   (optional, default brad@steelecreek.org)
//   NOTIFY_FROM (optional, default "Living On Target <onboarding@resend.dev>")
// The recipient is fixed on the server, so this cannot be used to email anyone else.
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const cut = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, n);
const oneLine = (v, n) => cut(v, n).replace(/[\r\n]+/g, " ").trim();
const isEmail = (s) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);

export default async (req, context) => {
  const key = Netlify.env.get("RESEND_API_KEY");
  if (req.method === "GET") return json({ ok: true, emailConfigured: !!key });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!key) return json({ error: "not_configured" }, 500);

  let b;
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  if (!b || typeof b !== "object") return json({ error: "bad_json" }, 400);
  if (b.website) return json({ ok: true }); // honeypot

  const kind = b.kind === "answers" ? "answers" : b.kind === "facilitator" ? "facilitator" : "";
  if (!kind) return json({ error: "bad_kind" }, 400);
  const name = oneLine(b.name, 80);
  if (!name) return json({ error: "missing" }, 400);
  const contact = oneLine(b.contact, 120);
  const group = oneLine(b.group, 100) || "Individual";
  const LN = { es: "Spanish", fr: "French", af: "Afrikaans", am: "Amharic" };
  const language = LN[b.lang] || "English";

  let subject, text;
  if (kind === "answers") {
    const section = oneLine(b.section, 160);
    const answers = cut(b.answers, 20000);
    if (!answers.trim()) return json({ error: "missing" }, 400);
    subject = `Living On Target answers: ${name}, ${oneLine(b.sectionLabel, 40) || section}`;
    text = `From: ${name}${contact ? " (" + contact + ")" : ""}\nGroup: ${group}\nApp language: ${language}\nSection: ${section}\n\n${answers}\n\n--- Coach chats ---\n${cut(b.chats, 30000) || "(none)"}\n`;
  } else {
    const message = cut(b.message, 2000);
    if (!message.trim()) return json({ error: "missing" }, 400);
    subject = `Living On Target message from ${name}`;
    text = `From: ${name}${contact ? " (" + contact + ")" : " (no contact given)"}\nGroup: ${group}\nApp language: ${language}\nWhere in the app: ${oneLine(b.where, 80) || "unknown"}\n\n${message}\n`;
  }

  try { // best-effort daily limits so the form cannot be used to flood the inbox
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("notify-limits");
    const day = new Date().toISOString().slice(0, 10);
    const ip = (context && context.ip) || "unknown";
    const kP = `${day}:ip:${ip}`, kT = `${day}:total`;
    const nP = parseInt((await store.get(kP)) || "0", 10), nT = parseInt((await store.get(kT)) || "0", 10);
    if (nP >= 30 || nT >= 400) return json({ error: "rate_limited" }, 429);
    await store.set(kP, String(nP + 1));
    await store.set(kT, String(nT + 1));
  } catch (e) { /* do not block if limits cannot be checked */ }

  const payload = {
    from: Netlify.env.get("NOTIFY_FROM") || "Living On Target <onboarding@resend.dev>",
    to: [Netlify.env.get("NOTIFY_TO") || "brad@steelecreek.org"],
    subject: subject.slice(0, 200),
    text,
  };
  const replyTo = isEmail(contact) ? contact : isEmail(oneLine(b.email, 120)) ? oneLine(b.email, 120) : "";
  if (replyTo) payload.reply_to = replyTo;

  let r;
  try {
    r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) { return json({ error: "upstream" }, 502); }
  if (!r.ok) {
    let detail = "";
    try { detail = cut((await r.json()).message, 200); } catch (e) { /* ignore */ }
    return json({ error: "upstream", status: r.status, detail }, 502);
  }
  return json({ ok: true });
};

export const config = { path: "/api/notify" };
