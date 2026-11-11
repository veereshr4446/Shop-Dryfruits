// Public: gives the website its list of items (from Vercel Blob storage, or products.json before the first save).
const { loadSaved, sweep } = require('./_expiry');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const base = await (await fetch('https://' + host + '/products.json?t=' + Date.now())).json();
    const saved = await sweep(await loadSaved()); // removes items older than 7 days
    res.json({
      shop: Object.assign({}, base.shop, saved && saved.shop ? saved.shop : {}),
      updated: saved ? saved.updated : base.updated,
      items: saved ? saved.items : base.items
    });
  } catch (e) {
    res.status(500).json({ error: 'Could not load products' });
  }
};
