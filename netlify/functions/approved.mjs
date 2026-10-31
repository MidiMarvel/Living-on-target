// Lists the videos in one Dropbox folder (the "Approved" folder) so the app can play them.
// Netlify environment variables (all secret):
//   DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN   (see README)
//   DROPBOX_APPROVED_PATH   optional, default "/LOT App Video Uploads/Approved"
//   DROPBOX_DIAG            optional, set to 1 only while troubleshooting (then /api/approved?diag=1 lists top-level folder names)
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

let goodRoot = "", goodPath = ""; // Dropbox namespace that worked last time (team accounts keep your files in a "home" namespace)

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
    const listAt = async (root, p) => {
      let res = await api("files/list_folder", token, { path: p, limit: 200 }, root);
      let all = res.entries || [];
      while (res.has_more && all.length < 1000) {
        res = await api("files/list_folder/continue", token, { cursor: res.cursor }, root);
        all = all.concat(res.entries || []);
      }
      return all;
    };
    const segs = path.split("/").filter(Boolean);
    const leaf = segs.length ? segs[segs.length - 1] : "";
    const parentName = segs.length > 1 ? segs[segs.length - 2] : leaf;
    const findByName = async (r) => {
      const out = [];
      try {
        const sr = await api("files/search_v2", token, { query: parentName, options: { filename_only: true, file_status: "active", max_results: 20 } }, r);
        for (const m of sr.matches || []) {
          const md = (m.metadata && m.metadata.metadata) || {};
          if (md[".tag"] === "folder" && String(md.name || "").toLowerCase() === parentName.toLowerCase() && md.path_display) {
            out.push(segs.length > 1 ? md.path_display + "/" + leaf : md.path_display);
          }
        }
      } catch (_) {}
      return out;
    };
    let entries, root = goodRoot, at = goodPath || path;
    try {
      entries = await listAt(root, at);
    } catch (first) {
      // Not found. On team accounts your folder can live in a "home" space, or inside a top-level folder such as
      // "Brad's Dropbox". Look around for it once, then remember where it was.
      if (!/not_found/.test(String(first.detail || ""))) throw first;
      let roots = [""];
      try {
        const a = await api("users/get_current_account", token, null);
        const ri = a.root_info || {};
        roots = [...new Set(["", ri.home_namespace_id, ri.root_namespace_id].filter((x) => x !== undefined && x !== null))];
      } catch (_) {}
      if (env("DROPBOX_DIAG") === "1" && new URL(req.url).searchParams.get("diag") === "1") {
        const out = {};
        for (const r of roots) {
          try {
            let res = await api("files/list_folder", token, { path: "", limit: 200 }, r);
            let names = res.entries.map((e) => e[".tag"] + ":" + e.name);
            let n = 0;
            while (res.has_more && n++ < 10) { res = await api("files/list_folder/continue", token, { cursor: res.cursor }, r); names = names.concat(res.entries.map((e) => e[".tag"] + ":" + e.name)); }
            out[r || "default"] = { count: names.length, found: await findByName(r), hasBrad: names.filter((x) => /dropbox/i.test(x)) };
          } catch (e) { out[r || "default"] = "error " + (e.detail || e.message); }
        }
        return json({ diag: out }, 200, { "cache-control": "no-store" });
      }
      const tries = [];
      for (const r of roots) tries.push({ r, p: path });
      for (const r of roots) for (const p2 of await findByName(r)) tries.push({ r, p: p2 });
      for (const r of roots) {
        try {
          let res = await api("files/list_folder", token, { path: "", limit: 200 }, r);
          let top = res.entries;
          let n = 0;
          while (res.has_more && n++ < 10) { res = await api("files/list_folder/continue", token, { cursor: res.cursor }, r); top = top.concat(res.entries); }
          for (const f of top.filter((e) => e[".tag"] === "folder")) if (/dropbox/i.test(f.name)) tries.push({ r, p: f.path_display + path });
        } catch (_) {}
      }
      let found = null;
      for (let i = 0; i < tries.length && !found; i += 8) {
        const batch = tries.slice(i, i + 8);
        const out = await Promise.allSettled(batch.map((t) => listAt(t.r, t.p)));
        for (let k = 0; k < out.length; k++) {
          if (out[k].status === "fulfilled") { found = { ...batch[k], entries: out[k].value }; break; }
        }
      }
      if (!found) throw first;
      entries = found.entries; root = found.r; at = found.p;
      goodRoot = root; goodPath = at;
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
