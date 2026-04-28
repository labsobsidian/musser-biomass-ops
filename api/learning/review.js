import { reviewLearningItem } from '../../lib/learning/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestedDecision = req.body?.decision;
    const decision = requestedDecision === 'approve'
      ? 'approve'
      : requestedDecision === 'needs_manual_patch'
        ? 'needs_manual_patch'
        : 'reject';

    const result = await reviewLearningItem({
      ...req.body,
      decision
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
