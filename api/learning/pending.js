import { loadQueue } from '../../lib/learning/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const queue = await loadQueue();
    return res.status(200).json({
      ...queue,
      pending: queue.items.filter((item) => item.status === 'pending')
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
