const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

export function isGhlConfigured() {
  return Boolean(process.env.GHL_API_KEY);
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
