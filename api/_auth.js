// Shared owner-login check (cookie) used by the admin and upload routes.
const crypto = require('crypto');

const hmac = () => crypto.createHmac('sha256', String(process.env.ADMIN_PASSWORD)).update('shop-admin-v1').digest('hex');
const same = (a, b) => {
  const h = s => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};
const cookieOk = req => {
  const m = /(?:^|;\s*)shop_session=([a-f0-9]+)/.exec(req.headers.cookie || '');
  return !!m && same(m[1], hmac());
};

module.exports = { hmac, same, cookieOk };
