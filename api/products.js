// Public: gives the website its list of items (from Vercel Blob storage, or products.json before the first save).
const { loadSaved, sweep } = require('./_expiry');

module.exports = async (req, res) => {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const base = await (await fetch('https://' + host + '/products.json?t=' + Date.now())).json();
    const saved = await sweep(await loadSaved()); // removes items older than 7 days
    // Cached for 2 minutes at Vercel's edge: protects the free Blob limit (every uncached visit costs one read operation).
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.json({
      shop: Object.assign({}, base.shop, saved && saved.shop ? saved.shop : {}),
      updated: saved ? saved.updated : base.updated,
      slides: saved ? (saved.slides || []) : (base.slides || []),
      items: saved ? saved.items : base.items
    });
  } catch (e) {
    res.status(500).json({ error: 'Could not load products' });
  }
};
