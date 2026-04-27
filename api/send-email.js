// /api/send-email.js
//
// Compatibility endpoint for Lumber Buddy's existing "Email CEO" actions.
// GHL is preferred for customer-visible communication because messages land
// on the HighLevel contact timeline. Resend remains an optional fallback.
//
// Preferred env vars:
//   GHL_API_KEY          HighLevel private integration token or OAuth access token
//   CEO_GHL_CONTACT_ID   GHL contact ID for the CEO/internal recipient
//   CEO_EMAIL            Destination email for the "to_ceo" preset
//   GHL_SEND_FROM_EMAIL  Optional sender override
//   MESSAGE_PROVIDER     Optional: "ghl" or "resend"; auto-detects if unset
//
// Optional Resend fallback:
//   RESEND_API_KEY
//   FROM_EMAIL

import { isGhlConfigured, sendGhlEmail } from './connectors/ghl.js';

const PRESETS = {
  to_ceo: {
    getTo: () => process.env.CEO_EMAIL,
    getContactId: () => process.env.CEO_GHL_CONTACT_ID,
    defaultFromName: 'Lumber Buddy'
  },
  to_custom: {
    getTo: (body) => body.recipientEmail,
    getContactId: (body) => body.recipientContactId,
    defaultFromName: 'Lumber Buddy'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { preset = 'to_ceo', subject, body } = req.body || {};

  if (!subject || !body) {
    return res.status(400).json({ error: 'subject and body are required' });
  }

  const presetConfig = PRESETS[preset];
  if (!presetConfig) {
    return res.status(400).json({ error: `unknown preset: ${preset}` });
  }

  const to = presetConfig.getTo(req.body || {});
  const contactId = presetConfig.getContactId(req.body || {});
  if (!to) {
    return res.status(500).json({
      error: `destination not configured for preset "${preset}"`,
      detail: preset === 'to_ceo'
        ? 'Set CEO_EMAIL env var in Vercel'
        : 'recipientEmail missing in request body'
    });
  }

  const provider = resolveProvider();
  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  const htmlBody = isHtml ? body : plainTextToHtml(body);
  const textBody = isHtml ? stripHtml(body) : body;

  try {
    if (provider === 'ghl') {
      const data = await sendGhlEmail({
        contactId,
        subject,
        html: htmlBody,
        text: textBody,
        emailTo: to,
        emailFrom: process.env.GHL_SEND_FROM_EMAIL
      });

      return res.status(200).json({
        ok: true,
        provider: 'ghl',
        sentTo: to,
        contactId,
        messageId: data.messageId || data.emailMessageId || null,
        response: data,
        preset
      });
    }

    const resendResult = await sendViaResend({
      fromName: presetConfig.defaultFromName,
      to,
      subject,
      html: htmlBody,
      text: textBody
    });

    return res.status(200).json({
      ok: true,
      provider: 'resend',
      sentTo: to,
      resendId: resendResult.id,
      preset
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      error: err.message,
      provider,
      detail: err.detail || null
    });
  }
}

function resolveProvider() {
  const configured = (process.env.MESSAGE_PROVIDER || '').toLowerCase().trim();
  if (configured === 'ghl' || configured === 'resend') return configured;
  if (isGhlConfigured()) return 'ghl';
  return 'resend';
}

async function sendViaResend({ fromName, to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error('No email provider configured. Set GHL_API_KEY + CEO_GHL_CONTACT_ID, or restore RESEND_API_KEY + FROM_EMAIL.');
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      text
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    const err = new Error('Resend API error');
    err.status = resp.status;
    err.detail = errText;
    throw err;
  }

  return resp.json();
}

function plainTextToHtml(str) {
  return `<pre style="font-family:'DM Sans',Arial,sans-serif;white-space:pre-wrap;margin:0;">${escapeHtml(str)}</pre>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(str) {
  return String(str).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
