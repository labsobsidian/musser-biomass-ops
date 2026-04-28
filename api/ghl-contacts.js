import { searchGhlContactsByTag } from '../lib/connectors/ghl.js';

const TAG_DEFAULTS = {
  demo_link: process.env.EXEC_DEMO_TAG || 'biomass-demo-board',
  review_request: process.env.EXEC_DEMO_TAG || 'biomass-demo-board',
  reorder_followup: process.env.EXEC_DEMO_TAG || 'biomass-demo-board',
  voice_agent: process.env.EXEC_DEMO_TAG || 'biomass-demo-board'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tag, campaign = 'demo_link', limit = 25 } = req.body || {};
    const resolvedTag = tag || TAG_DEFAULTS[campaign] || TAG_DEFAULTS.demo_link;
    const result = await searchGhlContactsByTag({ tag: resolvedTag, limit });
    return res.status(200).json({
      ok: true,
      tag: resolvedTag,
      source: result.source,
      contacts: result.contacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        name: contact.name || contact.displayName,
        email: contact.email,
        phone: contact.phone,
        tags: contact.tags
      }))
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message,
      detail: err.detail || null
    });
  }
}
