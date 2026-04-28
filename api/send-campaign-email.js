import { searchGhlContactsByTag, sendGhlEmail } from '../lib/connectors/ghl.js';

const EMAIL_CAMPAIGNS = {
  demo_link: {
    label: 'Biomass Buddy demo link email',
    tagEnv: 'EXEC_DEMO_TAG',
    defaultTag: 'biomass-demo-board',
    envLink: 'BIOMASS_BUDDY_DEMO_LINK',
    subject: 'Your Biomass Buddy demo link',
    body: "Hi {{firstName}},\n\nHere is the live link to try Biomass Buddy during the demo:\n{{link}}\n\nTake a look when you have a minute and send over any notes.\n\n- Biomass Buddy"
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      campaign = 'demo_link',
      tag,
      subject,
      body,
      dryRun = false,
      limit = 25
    } = req.body || {};
    const config = EMAIL_CAMPAIGNS[campaign] || EMAIL_CAMPAIGNS.demo_link;
    const resolvedTag = tag || process.env[config.tagEnv] || config.defaultTag;
    const linkValue = config.envLink ? process.env[config.envLink] : '';
    const finalSubject = subject || config.subject;
    const finalBody = buildEmailBody(body || config.body, linkValue);
    const lookup = await searchGhlContactsByTag({ tag: resolvedTag, limit });

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        campaign,
        label: config.label,
        tag: resolvedTag,
        source: lookup.source,
        subject: finalSubject,
        body: finalBody,
        contacts: lookup.contacts.map(publicContact)
      });
    }

    const results = [];
    for (const contact of lookup.contacts) {
      try {
        const personalizedBody = personalize(finalBody, contact);
        const response = await sendGhlEmail({
          contactId: contact.id || contact.contactId,
          subject: finalSubject,
          text: personalizedBody,
          emailTo: contact.email
        });
        results.push({
          ok: true,
          contactId: contact.id || contact.contactId,
          name: contact.displayName || contact.name || contact.firstName || 'Contact',
          email: contact.email,
          messageId: response.messageId || response.id || response.conversationId || null,
          response
        });
      } catch (err) {
        results.push({
          ok: false,
          contactId: contact.id || contact.contactId,
          name: contact.displayName || contact.name || contact.firstName || 'Contact',
          email: contact.email,
          error: err.message,
          detail: err.detail || null
        });
      }
    }

    return res.status(200).json({
      ok: results.every((result) => result.ok),
      campaign,
      label: config.label,
      tag: resolvedTag,
      source: lookup.source,
      subject: finalSubject,
      body: finalBody,
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

function buildEmailBody(template, linkValue) {
  return String(template || '')
    .replace(/\{\{\s*link\s*\}\}/gi, linkValue || '[link not configured]')
    .trim();
}

function personalize(message, contact) {
  const firstName = contact.firstName || contact.name?.split(/\s+/)[0] || 'there';
  return String(message)
    .replace(/\{\{\s*firstName\s*\}\}/gi, firstName)
    .replace(/\{\{\s*name\s*\}\}/gi, contact.name || firstName);
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
