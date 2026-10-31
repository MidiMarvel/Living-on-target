// Group presence + chat.
// Each member has a SECRET id (kept only on their phone, used to authorise requests)
// and a PUBLIC pid (shown to the group, used to refer to people). Answers are never stored here.
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alike characters
const MAX_MEMBERS = 12;
const MAX_MSG = 500;
const MAX_CHAT = 3000;       // messages per group
const POST_GAP_MS = 1200;    // minimum time between one member's messages
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
const validCode = (c) => /^[A-Z0-9]{6}$/.test(c || "");
const validSecret = (c) => /^[A-Z0-9]{12}$/.test(c || "");
const validRoom = (r) => /^[a-z0-9]{1,12}$/.test(r || "");
const rand = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHABET[b % ALPHABET.length]).join("");
const pad = (n, w) => String(n).padStart(w, "0");

export default async (req) => {
  const openStore = async () => {
    const getStore = globalThis.__TEST_GET_STORE || (await import("@netlify/blobs")).getStore;
    return getStore({ name: "groups", consistency: "strong" });
  };
  // Health check: open https://YOUR-SITE/api/group in a browser to see whether storage works.
  if (req.method === "GET") {
    try {
      const st = await openStore();
      await st.setJSON("health/ping", { t: Date.now() });
      const back = await st.get("health/ping", { type: "json" });
      await st.delete("health/ping");
      return json({ ok: !!back, storage: back ? "working" : "write-not-readable" });
    } catch (e) {
      return json({ ok: false, storage: "error", detail: String((e && e.message) || e).slice(0, 200) }, 500);
    }
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  let store;
  try {
    store = await openStore();
  } catch (e) {
    return json({ error: "storage", detail: String((e && e.message) || e).slice(0, 200) }, 500);
  }

  const memberRows = async (code) => {
    const { blobs } = await store.list({ prefix: `${code}/m/` });
    const rows = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" }).catch(() => null)));
    return rows.filter(Boolean);
  };
  const publicMembers = (rows, hostPid) => {
    const now = Date.now();
    return rows
      .map((m) => ({ pid: m.pid, name: m.name, where: m.where || "", ago: Math.max(0, Math.round((now - m.seen) / 1000)), host: m.pid === hostPid, joined: m.joined || 0 }))
      .sort((a, b) => (b.host - a.host) || a.name.localeCompare(b.name));
  };
  const wipe = async (code) => {
    const { blobs } = await store.list({ prefix: `${code}/` });
    await Promise.all(blobs.map((b) => store.delete(b.key)));
  };
  // New messages after `since` (a message key), oldest first.
  const readChat = async (code, since) => {
    const { blobs } = await store.list({ prefix: `${code}/c/` });
    let keys = blobs.map((b) => b.key).sort();
    const total = keys.length;
    keys = since ? keys.filter((k) => k > `${code}/c/${since}`) : keys.slice(-150);
    keys = keys.slice(-200);
    const rows = await Promise.all(keys.map((k) => store.get(k, { type: "json" }).then((v) => v && { k: k.slice(code.length + 3), ...v }).catch(() => null)));
    return { msgs: rows.filter(Boolean), total };
  };

  try {
    const op = body.op;

    if (op === "create") {
      const gname = clean(body.group, 60), me = clean(body.member, 40);
      if (!gname || !me) return json({ error: "missing" }, 400);
      let code = "";
      for (let i = 0; i < 8; i++) {
        const c = rand(6);
        if (!(await store.get(`${c}/meta`))) { code = c; break; }
      }
      if (!code) return json({ error: "busy" }, 503);
      const id = rand(12), pid = rand(6), now = Date.now();
      await store.setJSON(`${code}/meta`, { name: gname, created: now, active: now, hostPid: pid });
      await store.setJSON(`${code}/m/${id}`, { id, pid, name: me, where: "Home", seen: now, joined: now });
      const rows = await memberRows(code);
      return json({ code, id, pid, host: true, group: gname, members: publicMembers(rows, pid) });
    }

    const code = clean(body.code, 6).toUpperCase();
    if (!validCode(code)) return json({ error: "bad_code" }, 400);
    const meta = await store.get(`${code}/meta`, { type: "json" });
    if (!meta) return json({ error: "no_group" }, 404);

    if (op === "join") {
      const me = clean(body.member, 40);
      if (!me) return json({ error: "missing" }, 400);
      const rows = await memberRows(code);
      if (rows.length >= MAX_MEMBERS) return json({ error: "full" }, 409);
      const id = rand(12), pid = rand(6), now = Date.now();
      await store.setJSON(`${code}/m/${id}`, { id, pid, name: me, where: "Home", seen: now, joined: now });
      await store.setJSON(`${code}/meta`, { ...meta, active: now });
      return json({ code, id, pid, host: false, group: meta.name, members: publicMembers(await memberRows(code), meta.hostPid) });
    }

    // Everything below needs a valid secret id that belongs to a current member.
    const id = clean(body.id, 12);
    if (!validSecret(id)) return json({ error: "bad_id" }, 400);
    const key = `${code}/m/${id}`;
    let cur = await store.get(key, { type: "json" });
    if (!cur) return json({ error: "removed" }, 404);
    if (!cur.pid) { cur = { ...cur, pid: rand(6) }; await store.setJSON(key, cur); } // older records
    const isHost = !!meta.hostPid && cur.pid === meta.hostPid;
    const now = Date.now();

    if (op === "beat") {
      await store.setJSON(key, { ...cur, where: clean(body.where, 60), seen: now });
      if (now - (meta.active || 0) > 3600e3) await store.setJSON(`${code}/meta`, { ...meta, active: now });
      const rows = await memberRows(code);
      const since = typeof body.since === "string" && /^[0-9]{13}-[A-Z0-9]{4}$/.test(body.since) ? body.since : "";
      const chat = await readChat(code, since);
      return json({ group: meta.name, host: isHost, pid: cur.pid, members: publicMembers(rows, meta.hostPid), msgs: chat.msgs });
    }

    if (op === "post") {
      const room = clean(body.room, 12), text = clean(body.text, MAX_MSG);
      if (!validRoom(room) || !text) return json({ error: "missing" }, 400);
      if (now - (cur.lastPost || 0) < POST_GAP_MS) return json({ error: "slow" }, 429);
      const chat = await readChat(code, "zzz"); // cheap count only
      if (chat.total >= MAX_CHAT) return json({ error: "chat_full" }, 409);
      const mk = `${pad(now, 13)}-${rand(4)}`;
      await store.setJSON(`${code}/c/${mk}`, { room, pid: cur.pid, name: cur.name, text, ts: now });
      await store.setJSON(key, { ...cur, lastPost: now, seen: now });
      await store.setJSON(`${code}/meta`, { ...meta, active: now });
      return json({ ok: true, k: mk });
    }

    if (op === "delmsg") {
      const k = clean(body.k, 18);
      if (!/^[0-9]{13}-[A-Z0-9]{4}$/.test(k)) return json({ error: "bad_msg" }, 400);
      const mkey = `${code}/c/${k}`;
      const m = await store.get(mkey, { type: "json" });
      if (!m || m.del) return json({ ok: true });
      if (!(isHost || m.pid === cur.pid)) return json({ error: "forbidden" }, 403);
      await store.setJSON(mkey, { ...m, text: "", gone: true });
      // Control record so everyone's phone learns about the deletion on its next refresh.
      await store.setJSON(`${code}/c/${pad(now, 13)}-${rand(4)}`, { del: k, ts: now });
      return json({ ok: true });
    }

    if (op === "kick") {
      if (!isHost) return json({ error: "forbidden" }, 403);
      const pid = clean(body.pid, 6);
      if (!pid || pid === cur.pid) return json({ error: "bad_target" }, 400);
      const rows = await memberRows(code);
      const t = rows.find((m) => m.pid === pid);
      if (t) await store.delete(`${code}/m/${t.id}`);
      return json({ ok: true, members: publicMembers(await memberRows(code), meta.hostPid) });
    }

    if (op === "end") {
      if (!isHost) return json({ error: "forbidden" }, 403);
      await wipe(code);
      return json({ ok: true });
    }

    if (op === "leave") {
      await store.delete(key);
      const rest = await memberRows(code);
      if (!rest.length) await wipe(code);
      else if (isHost) {
        const next = rest.sort((a, b) => (a.joined || 0) - (b.joined || 0))[0];
        await store.setJSON(`${code}/meta`, { ...meta, hostPid: next.pid });
      }
      return json({ ok: true });
    }

    return json({ error: "bad_op" }, 400);
  } catch (e) {
    return json({ error: "server", detail: String((e && e.message) || e).slice(0, 200) }, 500);
  }
};

export const config = { path: "/api/group" };
