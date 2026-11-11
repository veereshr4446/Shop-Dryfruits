// Shared helpers: items not updated for 7 days are removed, and their photos are deleted to free storage.
const { head, put, del } = require('@vercel/blob');

const TTL = 7 * 24 * 60 * 60 * 1000;
const isBlobUrl = u => { try { return new URL(u).hostname.endsWith('.public.blob.vercel-storage.com'); } catch (e) { return false; } };

async function loadSaved() {
  try {
    const h = await head('products.json');
    return await (await fetch(h.url + '?t=' + Date.now())).json();
  } catch (e) { return null; }
}

// Drops expired items from `saved` (in place), saves the list, deletes their photos. Items with no stamp get one now.
async function sweep(saved) {
  if (!saved || !Array.isArray(saved.items)) return saved;
  const now = Date.now();
  let dirty = false;
  const keep = [], gone = [];
  for (const it of saved.items) {
    if (!it.ts) { it.ts = now; dirty = true; }
    if (now - it.ts >= TTL) {
      gone.push(...(Array.isArray(it.images) ? it.images : []), ...(it.image ? [it.image] : []));
      dirty = true;
    } else keep.push(it);
  }
  saved.items = keep;
  if (dirty) {
    try {
      await put('products.json', JSON.stringify(saved), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
      const urls = [...new Set(gone)].filter(isBlobUrl);
      if (urls.length) await del(urls);
    } catch (e) { /* list is still filtered for this visitor; next visit retries */ }
  }
  return saved;
}

module.exports = { TTL, isBlobUrl, loadSaved, sweep };
