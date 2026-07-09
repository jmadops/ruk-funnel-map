import { list, put } from '@vercel/blob';

const KEY = 'funnel-state.json';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: KEY });
      const hit = blobs.find(b => b.pathname === KEY);
      if (!hit) { res.status(200).json({ state: null }); return; }
      const r = await fetch(hit.url, { cache: 'no-store' });
      if (!r.ok) { res.status(200).json({ state: null }); return; }
      const state = await r.json();
      res.status(200).json({ state, updatedAt: hit.uploadedAt });
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body || '{}');
      const state = body && body.state !== undefined ? body.state : body;
      if (!state || !Array.isArray(state.nodes)) {
        res.status(400).json({ error: 'Invalid state: expected { nodes: [...] }' });
        return;
      }
      await put(KEY, JSON.stringify(state), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 0,
      });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
