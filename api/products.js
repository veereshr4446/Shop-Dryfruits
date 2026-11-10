// Public: gives the website its list of items (from Vercel Blob storage, or products.json before the first save).
const { head } = require('@vercel/blob');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const base = await (await fetch('https://' + host + '/products.json?t=' + Date.now())).json();
    let saved = null;
    try {
      const h = await head('products.json');
      saved = await (await fetch(h.url + '?t=' + Date.now())).json();
    } catch (e) { /* nothing saved yet */ }
    res.json({
      shop: Object.assign({}, base.shop, saved && saved.shop ? saved.shop : {}),
      updated: saved ? saved.updated : base.updated,
      items: saved ? saved.items : base.items
    });
  } catch (e) {
    res.status(500).json({ error: 'Could not load products' });
  }
};
