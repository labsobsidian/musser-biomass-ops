const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

export function isGhlConfigured() {
  return Boolean(process.env.GHL_API_KEY);
}

export async function searchGhlContactsByTag({ tag, locationId, limit = 25 }) {
  if (!process.env.GHL_API_KEY) {
    throw new Error('GHL_API_KEY env var is required');
  }
  if (!tag) {
    throw new Error('A GHL tag is required.');
  }

  const resolvedLocationId = locationId || process.env.GHL_LOCATION_ID;
  const envContacts = contactsFromEnvTag(tag);
  if (envContacts.length) {
    return {
      source: 'env',
      tag,
      contacts: envContacts.slice(0, limit)
    };
  }

  if (!resolvedLocationId) {
    throw new Error('GHL_LOCATION_ID env var is required for tag lookup unless GHL_TAG_CONTACTS_JSON is configured.');
  }

  const searchPayloads = [
    {
      locationId: resolvedLocationId,
      page: 1,
      pageLimit: Math.min(Number(limit) || 25, 100),
      filters: [{ field: 'tags', operator: 'contains', value: tag }]
    },
    {
      locationId: resolvedLocationId,
      page: 1,
      pageLimit: Math.min(Number(limit) || 25, 100),
      query: tag
    }
  ];

  let lastError = null;
  for (const payload of searchPayloads) {
    try {
      const data = await ghlRequest('/contacts/search', {
        method: 'POST',
        body: payload
      });
      const contacts = normalizeContacts(data).filter((contact) => contactHasTag(contact, tag));
      if (contacts.length) {
        return { source: 'ghl-search', tag, contacts: contacts.slice(0, limit) };
      }
    } catch (err) {
      lastError = err;
    }
  }

  try {
    const params = new URLSearchParams({
      locationId: resolvedLocationId,
      query: tag,
      limit: String(Math.min(Number(limit) || 25, 100))
    });
    const data = await ghlRequest(`/contacts/?${params.toString()}`);
    const contacts = normalizeContacts(data).filter((contact) => contactHasTag(contact, tag));
    return { source: 'ghl-list', tag, contacts: contacts.slice(0, limit) };
  } catch (err) {
    lastError = err;
  }

  if (lastError) throw lastError;
  return { source: 'ghl-search', tag, contacts: [] };
}

export async function sendBulkGhlSms({ contacts, message }) {
  if (!Array.isArray(contacts) || contacts.length === 0) {
    throw new Error('At least one contact is required for SMS.');
  }
  if (!message || !String(message).trim()) {
    throw new Error('SMS message is required.');
  }

  const results = [];
  for (const contact of contacts) {
    try {
      const response = await sendGhlSms({
        contactId: contact.id || contact.contactId,
        message: personalizeMessage(message, contact)
      });
      results.push({
        ok: true,
        contactId: contact.id || contact.contactId,
        name: contact.displayName || contact.name || contact.firstName || 'Contact',
        messageId: response.messageId || response.id || response.conversationId || null,
        response
      });
    } catch (err) {
      results.push({
        ok: false,
        contactId: contact.id || contact.contactId,
        name: contact.displayName || contact.name || contact.firstName || 'Contact',
        error: err.message,
        detail: err.detail || null
      });
    }
  }
  return results;
}

export async function sendGhlEmail({
  contactId,
  subject,
  html,
  text,
  emailTo,
  emailFrom,
  emailCc,
  emailBcc
}) {
  if (!process.env.GHL_API_KEY) {
    throw new Error('GHL_API_KEY env var is required');
  }

  if (!contactId) {
    throw new Error('GHL email requires a contactId. Set CEO_GHL_CONTACT_ID or pass recipientContactId.');
  }

  const payload = {
    type: 'Email',
    contactId,
    subject,
    html: html || plainTextToHtml(text || '')
  };

  if (text) payload.message = text;
  if (emailTo) payload.emailTo = emailTo;
  if (emailFrom) payload.emailFrom = emailFrom;
  if (Array.isArray(emailCc) && emailCc.length) payload.emailCc = emailCc;
  if (Array.isArray(emailBcc) && emailBcc.length) payload.emailBcc = emailBcc;

  return ghlRequest('/conversations/messages', {
    method: 'POST',
    body: payload
  });
}

export async function sendGhlSms({ contactId, message }) {
  if (!process.env.GHL_API_KEY) {
    throw new Error('GHL_API_KEY env var is required');
  }

  if (!contactId) {
    throw new Error('GHL SMS requires a contactId.');
  }

  return ghlRequest('/conversations/messages', {
    method: 'POST',
    body: {
      type: 'SMS',
      contactId,
      message
    }
  });
}

function contactsFromEnvTag(tag) {
  const raw = process.env.GHL_TAG_CONTACTS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const contacts = parsed[tag] || parsed[String(tag).toLowerCase()];
    return Array.isArray(contacts) ? contacts.map(normalizeContact) : [];
  } catch {
    return [];
  }
}

function normalizeContacts(data) {
  const list = data?.contacts || data?.contact || data?.data || data?.items || [];
  const contacts = Array.isArray(list) ? list : [list];
  return contacts.filter(Boolean).map(normalizeContact).filter((contact) => contact.id);
}

function normalizeContact(contact) {
  const firstName = contact.firstName || contact.first_name || '';
  const lastName = contact.lastName || contact.last_name || '';
  const name = contact.name || contact.fullName || [firstName, lastName].filter(Boolean).join(' ');
  return {
    id: contact.id || contact.contactId,
    contactId: contact.id || contact.contactId,
    firstName,
    lastName,
    name,
    displayName: name || contact.email || contact.phone || contact.id || contact.contactId,
    email: contact.email || '',
    phone: contact.phone || '',
    tags: Array.isArray(contact.tags) ? contact.tags : []
  };
}

function contactHasTag(contact, tag) {
  const wanted = String(tag || '').toLowerCase();
  if (!wanted) return true;
  if (!Array.isArray(contact.tags) || contact.tags.length === 0) return true;
  return contact.tags.some((candidate) => String(candidate).toLowerCase() === wanted);
}

function personalizeMessage(message, contact) {
  const firstName = contact.firstName || contact.name?.split(/\s+/)[0] || 'there';
  return String(message)
    .replace(/\{\{\s*firstName\s*\}\}/gi, firstName)
    .replace(/\{\{\s*name\s*\}\}/gi, contact.name || firstName);
}

async function ghlRequest(path, { method = 'GET', body } = {}) {
  const resp = await fetch(`${GHL_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_KEY}`,
      Version: GHL_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const raw = await resp.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }
  }

  if (!resp.ok) {
    const detail = data?.message || data?.error || raw || `HighLevel returned HTTP ${resp.status}`;
    const err = new Error(detail);
    err.status = resp.status;
    err.detail = data || raw;
    throw err;
  }

  return data || {};
}

function plainTextToHtml(text) {
  return `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;margin:0;">${escapeHtml(text)}</pre>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
