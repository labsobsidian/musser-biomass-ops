import { buildWeeklyReview } from '../../lib/learning/store.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const write = req.method === 'POST' || req.query?.write === '1';
    const review = await buildWeeklyReview({ write });
    return res.status(200).json(review);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
