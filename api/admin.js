// Owner only: login (password), upload photo, save list. Login lasts 1 year on that phone.
const crypto = require('crypto');
const { put, del } = require('@vercel/blob');
const { loadSaved } = require('./_expiry');

const hmac = () => crypto.createHmac('sha256', String(process.env.ADMIN_PASSWORD)).update('shop-admin-v1').digest('hex');
const same = (a, b) => {
  const h = s => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};
const cookieOk = req => {
  const m = /(?:^|;\s*)shop_session=([a-f0-9]+)/.exec(req.headers.cookie || '');
  return !!m && same(m[1], hmac());
};
const isBlobUrl = u => { try { return new URL(u).hostname.endsWith('.public.blob.vercel-storage.com'); } catch (e) { return false; } };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set in Vercel.' });

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }

  if (b.action === 'login') {
    if (!b.password || !same(b.password, process.env.ADMIN_PASSWORD)) {
      await new Promise(r => setTimeout(r, 1000));
      return res.status(401).json({ error: 'Wrong password' });
    }
    res.setHeader('Set-Cookie', 'shop_session=' + hmac() + '; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Strict');
    return res.json({ ok: true });
  }
  if (b.action === 'logout') {
    res.setHeader('Set-Cookie', 'shop_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
    return res.json({ ok: true });
  }
  if (!cookieOk(req)) return res.status(401).json({ error: 'Please log in' });
  if (b.action === 'check') return res.json({ ok: true });

  try {
    if (b.action === 'image') {
      if (!/^[\w-]{1,80}\.jpg$/.test(b.name || '') || typeof b.content !== 'string')
        return res.status(400).json({ error: 'Bad image' });
      const r = await put('images/' + b.name, Buffer.from(b.content, 'base64'), { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false, allowOverwrite: true });
      return res.json({ ok: true, url: r.url });
    }

    if (b.action === 'save') {
      const prev = {};
      const old = await loadSaved();
      if (old && Array.isArray(old.items)) old.items.forEach(o => { prev[o.id] = o; });
      const sig = o => [o.name, o.price, o.unit, (o.images || []).join('|')].join('~');
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map(i => {
        const imgs = (Array.isArray(i.images) ? i.images : (i.image ? [i.image] : [])).filter(isBlobUrl).slice(0, 6);
        const item = {
          id: String(i.id || '').replace(/[^\w-]/g, '').slice(0, 60) || 'i' + Date.now(),
          name: String(i.name || '').slice(0, 80),
          price: Math.max(0, Number(i.price) || 0),
          unit: String(i.unit || 'kg').slice(0, 10),
          image: imgs[0] || '',
          images: imgs
        };
        // New or edited items get a fresh 7 days; untouched items keep their old clock.
        const o = prev[item.id];
        item.ts = o && o.ts && sig(o) === sig(item) ? o.ts : Date.now();
        return item;
      });
      const updated = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
      const sh = b.shop || {};
      const shop = { name: String(sh.name || '').trim().slice(0, 80) || 'Kishmish Shop', tagline: String(sh.tagline || '').trim().slice(0, 120) };
      let wa = String(sh.whatsapp || '').replace(/\D/g, '');
      if (wa.length === 10) wa = '91' + wa;
      if (wa.length >= 11 && wa.length <= 15) shop.whatsapp = wa;
      await put('products.json', JSON.stringify({ updated, shop, items }), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
      const gone = (Array.isArray(b.removed) ? b.removed : []).filter(isBlobUrl);
      if (gone.length) { try { await del(gone); } catch (e) {} }
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
