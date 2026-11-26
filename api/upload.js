// Owner only: gives the admin page a short-lived permission to upload a photo or video straight to Vercel Blob.
// (Videos are too big to pass through a Vercel function, which has a 4.5 MB limit.)
const { handleUpload } = require('@vercel/blob/client');
const { cookieOk } = require('./_auth');

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
const MB = 1024 * 1024;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set in Vercel.' });
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  try {
    const out = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async pathname => {
        if (!cookieOk(req)) throw new Error('Please log in again');
        if (!/^(images|videos|slides)\/[\w-]{1,80}\.(jpg|png|webp|mp4|webm|mov)$/i.test(pathname)) throw new Error('Bad file name');
        const video = /\.(mp4|webm|mov)$/i.test(pathname);
        return {
          allowedContentTypes: TYPES,
          maximumSizeInBytes: video ? 5 * MB : 2 * MB, // keeps the free 1 GB storage and 10 GB/month downloads safe
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 30 // browsers and the CDN keep it a month, so repeat visits cost nothing
        };
      }
    });
    return res.json(out);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
