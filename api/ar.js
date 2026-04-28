// /api/ar.js
//
// Accounts receivable endpoint. Returns Sage 50-shaped placeholder data until
// Musser provides live Sage access.

import { summarizeAR } from '../lib/connectors/sage50.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.status(200).json(summarizeAR());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
