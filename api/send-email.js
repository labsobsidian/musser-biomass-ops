// /api/send-email.js
//
// Compatibility endpoint for Lumber Buddy's existing "Email CEO" actions.
// GHL is preferred for plain/customer-visible communication because messages
// land on the HighLevel contact timeline. Resend is preferred for polished
// HTML reports, summaries, and other branded internal deliverables.
//
// Preferred env vars:
//   GHL_API_KEY          HighLevel private integration token or OAuth access token
//   CEO_GHL_CONTACT_ID   GHL contact ID for the CEO/internal recipient
//   CEO_EMAIL            Destination email for the "to_ceo" preset
//   GHL_SEND_FROM_EMAIL  Optional sender override
//   MESSAGE_PROVIDER     Optional hard override: "ghl", "resend", or "auto"
//
// Optional Resend fallback:
//   RESEND_API_KEY
//   FROM_EMAIL
//
// The endpoint also accepts optional attachments. For AR briefs, the frontend
// sends contentText and this function renders a simple PDF server-side before
// handing it to Resend.

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

  const { preset = 'to_ceo', subject, body, messageType = 'auto', attachments = [] } = req.body || {};

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

  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  const normalizedAttachments = normalizeAttachments(attachments);
  const provider = resolveProvider({ isHtml, messageType, hasAttachments: normalizedAttachments.length > 0 });
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
      text: textBody,
      attachments: normalizedAttachments
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

function resolveProvider({ isHtml, messageType, hasAttachments }) {
  const configured = (process.env.MESSAGE_PROVIDER || '').toLowerCase().trim();
  if (hasAttachments && isResendConfigured()) return 'resend';
  if (configured === 'ghl' || configured === 'resend') return configured;
  const requestedType = String(messageType || '').toLowerCase();
  if ((requestedType === 'report' || requestedType === 'summary' || requestedType === 'creative' || isHtml) && isResendConfigured()) {
    return 'resend';
  }
  if (isGhlConfigured()) return 'ghl';
  return 'resend';
}

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL);
}

async function sendViaResend({ fromName, to, subject, html, text, attachments = [] }) {
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
      text,
      ...(attachments.length ? { attachments } : {})
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

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const filename = sanitizeFilename(item.filename || `lumber-buddy-report-${index + 1}.pdf`);
      if (item.contentBase64) {
        return { filename, content: String(item.contentBase64) };
      }
      if (item.contentText) {
        return {
          filename: filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`,
          content: createPdfBuffer({
            title: item.title || 'Lumber Buddy Report',
            text: String(item.contentText)
          }).toString('base64')
        };
      }
      return null;
    })
    .filter(Boolean);
}

function sanitizeFilename(filename) {
  return String(filename)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'lumber-buddy-report.pdf';
}

function createPdfBuffer({ title, text }) {
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 48;
  const topY = 742;
  const lineHeight = 14;
  const maxLines = 48;
  const wrappedLines = [
    String(title || 'Lumber Buddy Report'),
    '',
    ...wrapPdfText(String(text || ''), 92)
  ];
  const pages = [];
  for (let i = 0; i < wrappedLines.length; i += maxLines) {
    pages.push(wrappedLines.slice(i, i + maxLines));
  }

  const objects = [null];
  const addObject = (body = '') => {
    objects.push(body);
    return objects.length - 1;
  };

  const catalogId = addObject();
  const pagesId = addObject();
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];

  pages.forEach((lines) => {
    const streamLines = [
      'BT',
      `/F1 10 Tf`,
      `${marginX} ${topY} Td`,
      `${lineHeight} TL`
    ];
    lines.forEach((line, idx) => {
      if (idx === 0) streamLines.push('/F1 16 Tf');
      if (idx === 1) streamLines.push('/F1 10 Tf');
      streamLines.push(`(${pdfEscape(line)}) Tj`);
      streamLines.push('T*');
    });
    streamLines.push('ET');
    const stream = streamLines.join('\n');
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

function wrapPdfText(text, width) {
  const output = [];
  String(text).split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (!line) {
      output.push('');
      return;
    }
    const words = line.split(/\s+/);
    let current = '';
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > width && current) {
        output.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) output.push(current);
  });
  return output;
}

function pdfEscape(str) {
  return String(str)
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '-')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
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
