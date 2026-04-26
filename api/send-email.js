// /api/send-email.js
//
// Second real functional tool: sends an email to the CEO (or any configured
// recipient). Uses Resend — cleanest Vercel-friendly HTTP API for email.
//
// Env vars required:
//   RESEND_API_KEY   — from resend.com dashboard
//   CEO_EMAIL        — destination for the "to_ceo" preset
//   FROM_EMAIL       — verified sending domain address, e.g. "lumber-buddy@musserbiomass.com"
//                      (Resend requires domain verification before sending)
//
// Request body:
// {
//   "preset": "to_ceo" | "to_custom",
//   "subject": "...",
//   "body": "...",         // plain text or HTML
//   "recipientEmail": "..." // only used when preset = "to_custom"
// }

const PRESETS = {
  to_ceo: {
    getTo: () => process.env.CEO_EMAIL,
    defaultFromName: 'Lumber Buddy'
  },
  to_custom: {
    getTo: (body) => body.recipientEmail,
    defaultFromName: 'Lumber Buddy'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return res.status(500).json({
      error: 'Email not configured',
      detail: 'RESEND_API_KEY and FROM_EMAIL env vars required'
    });
  }

  const { preset = 'to_ceo', subject, body, recipientEmail } = req.body || {};

  if (!subject || !body) {
    return res.status(400).json({ error: 'subject and body are required' });
  }

  const presetConfig = PRESETS[preset];
  if (!presetConfig) {
    return res.status(400).json({ error: `unknown preset: ${preset}` });
  }

  const to = presetConfig.getTo(req.body || {});
  if (!to) {
    return res.status(500).json({
      error: `destination not configured for preset "${preset}"`,
      detail: preset === 'to_ceo'
        ? 'Set CEO_EMAIL env var in Vercel'
        : 'recipientEmail missing in request body'
    });
  }

  try {
    // Detect whether body looks like HTML; if not, wrap plain text with <br>s.
    const isHtml = /<[a-z][\s\S]*>/i.test(body);
    const htmlBody = isHtml ? body : `<pre style="font-family:'DM Sans',Arial,sans-serif;white-space:pre-wrap;margin:0;">${escapeHtml(body)}</pre>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${presetConfig.defaultFromName} <${fromEmail}>`,
        to: [to],
        subject,
        html: htmlBody,
        text: isHtml ? stripHtml(body) : body
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({
        error: 'Resend API error',
        detail: errText
      });
    }

    const data = await resp.json();
    return res.status(200).json({
      ok: true,
      sentTo: to,
      resendId: data.id,
      preset
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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
