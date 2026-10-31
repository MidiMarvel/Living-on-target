// Lists the videos in one Dropbox folder (the "Approved" folder) so the app can play them.
// Netlify environment variables (all secret):
//   DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN   (see README)
//   DROPBOX_APPROVED_PATH   optional, default "/LOT App Video Uploads/Approved"
// Only this one folder is ever read. Nothing a visitor sends changes which folder is read.
const EXT = /\.(mp4|mov|m4v|webm)$/i;
const MAX = 40;
const CACHE_MS = 5 * 60 * 1000;
let tok = { value: "", exp: 0 };
let cache = { at: 0, body: null };

const json = (o, status = 200, extra = {}) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...extra } });

async function accessToken(env) {
  if (tok.value && Date.now() < tok.exp - 60000) return tok.value;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: env("DROPBOX_REFRESH_TOKEN"),
    client_id: env("DROPBOX_APP_KEY"),
    client_secret: env("DROPBOX_APP_SECRET"),
  });
  const r = await fetch("https://api.dropbox.com/oauth2/token", { method: "POST", body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error("token_" + r.status);
  tok = { value: j.access_token, exp: Date.now() + (j.expires_in || 14400) * 1000 };
  return tok.value;
}

let goodRoot = ""; // Dropbox namespace that worked last time (team accounts keep your files in a "home" namespace)

async function api(path, token, body, root) {
  const headers = { authorization: "Bearer " + token };
  if (body) headers["content-type"] = "application/json";
  if (root) headers["dropbox-api-path-root"] = JSON.stringify({ ".tag": "namespace_id", namespace_id: root });
  const r = await fetch("https://api.dropboxapi.com/2/" + path, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(path + "_" + r.status);
    e.detail = (j.error_summary || j.error || "").toString().slice(0, 120);
    throw e;
  }
  return j;
}

function describe(name) {
  let base = name.replace(EXT, "");
  let by = "";
  const m = base.match(/\s*\(([^()]{1,60})\)\s*$/);
  if (m) { by = m[1].trim(); base = base.slice(0, m.index); }
  const title = base.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim() || "Video";
  return { title, by };
}

export default async (req) => {
  const env = (k) => Netlify.env.get(k);
  if (!env("DROPBOX_APP_KEY") || !env("DROPBOX_APP_SECRET") || !env("DROPBOX_REFRESH_TOKEN")) {
    return json({ ok: true, configured: false, videos: [] }, 200, { "cache-control": "no-store" });
  }
  if (cache.body && Date.now() - cache.at < CACHE_MS) {
    return json(cache.body, 200, { "cache-control": "public, max-age=120" });
  }
  try {
    const token = await accessToken(env);
    const path = env("DROPBOX_APPROVED_PATH") || "/LOT App Video Uploads/Approved";
    const listAll = async (root) => {
      let res = await api("files/list_folder", token, { path, limit: 200 }, root);
      let all = res.entries || [];
      while (res.has_more && all.length < 1000) {
        res = await api("files/list_folder/continue", token, { cursor: res.cursor }, root);
        all = all.concat(res.entries || []);
      }
      return all;
    };
    let entries, root = goodRoot;
    try {
      entries = await listAll(root);
    } catch (first) {
      // Not found: on team accounts the folder may live in the member's home namespace. Look it up and retry.
      if (!/not_found/.test(String(first.detail || ""))) throw first;
      let ids = [];
      try {
        const a = await api("users/get_current_account", token, null);
        const ri = a.root_info || {};
        ids = [ri.home_namespace_id, ri.root_namespace_id].filter((x) => x && x !== root);
      } catch (_) { throw first; }
      let ok = false;
      for (const id of ids) {
        try { entries = await listAll(id); root = id; ok = true; break; } catch (_) {}
      }
      if (!ok) throw first;
      goodRoot = root;
    }
    const files = entries
      .filter((e) => e[".tag"] === "file" && EXT.test(e.name))
      .sort((a, b) => String(b.client_modified || "").localeCompare(String(a.client_modified || "")))
      .slice(0, MAX);
    const videos = (
      await Promise.all(
        files.map(async (f) => {
          try {
            const l = await api("files/get_temporary_link", token, { path: f.id }, root);
            const d = describe(f.name);
            return { id: f.id, title: d.title, by: d.by, date: f.client_modified || "", size: f.size || 0, url: l.link };
          } catch (e) { return null; }
        })
      )
    ).filter(Boolean);
    const body = { ok: true, configured: true, videos };
    cache = { at: Date.now(), body };
    return json(body, 200, { "cache-control": "public, max-age=120" });
  } catch (e) {
    tok = { value: "", exp: 0 };
    return json({ ok: false, configured: true, error: "dropbox_error", detail: String(e.detail || e.message || "").slice(0, 120), videos: [] }, 502, { "cache-control": "no-store" });
  }
};

export const config = { path: "/api/approved" };
