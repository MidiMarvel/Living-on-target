// Runs once a day. Deletes any group with no activity for 90 days.
const DAYS = 90;

export default async () => {
  const getStore = globalThis.__TEST_GET_STORE || (await import("@netlify/blobs")).getStore;
  const store = getStore({ name: "groups", consistency: "strong" });
  const { blobs } = await store.list();
  const codes = [...new Set(blobs.map((b) => b.key.split("/")[0]))];
  const cutoff = Date.now() - DAYS * 86400e3;
  let removed = 0;
  for (const code of codes) {
    const meta = await store.get(`${code}/meta`, { type: "json" }).catch(() => null);
    const last = meta ? meta.active || meta.created || 0 : 0;
    if (!meta || last < cutoff) {
      const all = blobs.filter((b) => b.key.startsWith(code + "/"));
      await Promise.all(all.map((b) => store.delete(b.key)));
      removed++;
    }
  }
  return new Response(JSON.stringify({ removed }), { headers: { "content-type": "application/json" } });
};

export const config = { schedule: "@daily" };
