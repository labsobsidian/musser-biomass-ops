import { listGhlTags } from '../lib/connectors/ghl.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await listGhlTags({ locationId: req.query?.locationId });
    return res.status(200).json({
      ok: true,
      source: result.source,
      warning: result.warning || null,
      tags: result.tags
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message,
      detail: err.detail || null
    });
  }
}
