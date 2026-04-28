import { addLearningItem } from '../../lib/learning/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const item = await addLearningItem({
      ...req.body,
      source: {
        type: 'manual',
        label: 'Manual correction',
        ...(req.body?.source || {})
      }
    });
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
