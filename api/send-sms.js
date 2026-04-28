import { searchGhlContactsByTag, sendBulkGhlSms } from '../lib/connectors/ghl.js';

const SMS_OPT_OUT = 'Reply STOP to opt out.';

const CAMPAIGNS = {
  demo_link: {
    label: 'Biomass Buddy demo link',
    tagEnv: 'EXEC_DEMO_TAG',
    defaultTag: 'biomass-demo-board',
    envLink: 'BIOMASS_BUDDY_DEMO_LINK',
    fallbackText: "Hi {{firstName}}, here's your link to check out Biomass Buddy: {{link}}"
  },
  review_request: {
    label: 'Review workflow request',
    tagEnv: 'REVIEW_TEST_TAG',
    defaultTag: 'biomass-demo-board',
    envLink: 'REVIEW_WORKFLOW_LINK',
    fallbackText: "Hi {{firstName}}, here's the review request workflow link for Biomass Buddy: {{link}}"
  },
  reorder_followup: {
    label: 'Reorder follow-up',
    tagEnv: 'REORDER_FOLLOWUP_TAG',
    defaultTag: 'biomass-reorder-followup',
    envLink: null,
    fallbackText: "Hi {{firstName}}, this is Musser Biomass checking in. It has been a little while since your last order, so I wanted to see how the product is treating you and whether you are ready for another load."
  },
  voice_agent: {
    label: 'Voice agent phone number',
    tagEnv: 'EXEC_DEMO_TAG',
    defaultTag: 'biomass-demo-board',
    envLink: 'VOICE_AGENT_PHONE',
    fallbackText: "Hi {{firstName}}, here's the Biomass Buddy voice agent number if you want to try it: {{link}}"
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaign = 'demo_link', tag, message, dryRun = false, limit = 25 } = req.body || {};
    const config = CAMPAIGNS[campaign] || CAMPAIGNS.demo_link;
    const resolvedTag = tag || process.env[config.tagEnv] || config.defaultTag;
    const linkValue = config.envLink ? process.env[config.envLink] : '';
    const finalMessage = buildMessage(message || config.fallbackText, linkValue);
    const lookup = await searchGhlContactsByTag({ tag: resolvedTag, limit });

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        campaign,
        label: config.label,
        tag: resolvedTag,
        source: lookup.source,
        message: finalMessage,
        contacts: lookup.contacts.map(publicContact)
      });
    }

    const results = await sendBulkGhlSms({
      contacts: lookup.contacts,
      message: finalMessage
    });
    return res.status(200).json({
      ok: results.every((result) => result.ok),
      campaign,
      label: config.label,
      tag: resolvedTag,
      source: lookup.source,
      message: finalMessage,
      attempted: results.length,
      sent: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      results
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message,
      detail: err.detail || null
    });
  }
}

function buildMessage(template, linkValue) {
  const message = String(template || '')
    .replace(/\{\{\s*link\s*\}\}/gi, linkValue || '[link not configured]')
    .trim();
  return ensureSmsOptOut(message);
}

function ensureSmsOptOut(message) {
  const text = String(message || '').trim();
  if (!text) return SMS_OPT_OUT;
  if (/(reply\s+stop|stop\s+to\s+opt\s*out|unsubscribe|opt\s*out)/i.test(text)) {
    return text;
  }
  return `${text}\n\n${SMS_OPT_OUT}`;
}

function publicContact(contact) {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    name: contact.name || contact.displayName,
    email: contact.email,
    phone: contact.phone,
    tags: contact.tags
  };
}
