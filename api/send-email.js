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

import { readFileSync } from 'node:fs';
import { isGhlConfigured, sendGhlEmail } from './connectors/ghl.js';

const MUSSER_LOGO_JPG = loadOptionalAsset('../musser-logo-pdf.jpg');
const MUSSER_LOGO_SIZE = { width: 612, height: 360 };

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
      if (item.reportType === 'ar' && item.data) {
        return {
          filename: filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`,
          content: createArPdfBuffer(item.data).toString('base64')
        };
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

function loadOptionalAsset(relativePath) {
  try {
    return readFileSync(new URL(relativePath, import.meta.url));
  } catch {
    return null;
  }
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

function createArPdfBuffer(data) {
  const summary = data.summary || {};
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];
  const aging = Array.isArray(data.aging) ? data.aging : [];
  const priority = Array.isArray(data.collectionPriority) ? data.collectionPriority : [];
  const pages = [];

  const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const asOf = data.asOf || new Date().toISOString().slice(0, 10);

  const p1 = [];
  drawPageBackground(p1);
  drawRect(p1, 0, 682, 612, 110, '#173D2B');
  if (MUSSER_LOGO_JPG) {
    drawRect(p1, 40, 704, 150, 88, '#FFFDF8');
    drawImage(p1, 'Logo', 49, 709, 132, 78);
  } else {
    drawText(p1, 'MUSSER', 48, 740, 28, 'F2', '#FFFDF8');
    drawText(p1, 'BIOMASS & WOOD PRODUCTS', 50, 720, 8, 'F2', '#D8B35A');
  }
  drawText(p1, 'LUMBER BUDDY AR BRIEF', 422, 742, 9, 'F2', '#FFFDF8');
  drawText(p1, `AS OF ${asOf}`, 468, 724, 8, 'F1', '#D8CBB8');
  drawRect(p1, 48, 640, 516, 3, '#D19A2E');
  drawText(p1, 'Accounts Receivable', 48, 608, 30, 'F2', '#17130F');
  drawWrappedText(p1, 'Sage 50-ready operating snapshot for Musser converted hardwood products. Demo/sample data until the live Sage 50 connector is approved and connected.', 50, 580, 76, 10, 'F1', '#5E5447', 14);

  const cardY = 468;
  drawMetricCard(p1, 48, cardY, 116, 72, 'OPEN AR', money(summary.totalOpen), '#17130F');
  drawMetricCard(p1, 178, cardY, 116, 72, 'OVERDUE', money(summary.overdueTotal), '#A9432C');
  drawMetricCard(p1, 308, cardY, 116, 72, 'RISK ACCTS', String(summary.criticalCount || 0), '#17130F');
  drawMetricCard(p1, 438, cardY, 126, 72, 'DSO EST.', `${summary.dsoEstimate || 'n/a'} DAYS`, '#1F6B4A');

  drawRect(p1, 48, 338, 516, 94, '#F7F3EA');
  drawRect(p1, 48, 338, 5, 94, '#D19A2E');
  drawText(p1, 'ATLAS READ - OWNER ATTENTION', 64, 406, 8, 'F2', '#1F6B4A');
  drawWrappedText(p1, data.aiSummary || 'No AR summary available.', 64, 384, 78, 12, 'F2', '#2B241D', 17);

  drawText(p1, 'Aging Summary', 48, 298, 18, 'F2', '#17130F');
  const maxAging = Math.max(...aging.map(bucket => Number(bucket.amount || 0)), 1);
  let barY = 270;
  aging.forEach((bucket) => {
    const amount = Number(bucket.amount || 0);
    const width = Math.max(3, Math.round((amount / maxAging) * 250));
    drawText(p1, bucket.bucket || 'Bucket', 52, barY + 5, 9, 'F2', '#5E5447');
    drawRect(p1, 118, barY, 260, 14, '#E7DDCE');
    drawRect(p1, 118, barY, width, 14, amount > 0 ? '#1F6B4A' : '#D8CBB8');
    drawText(p1, money(amount), 396, barY + 4, 9, 'F2', amount > 0 ? '#17130F' : '#8A7B67');
    barY -= 28;
  });

  drawRect(p1, 48, 48, 516, 78, '#173D2B');
  drawText(p1, 'COLLECTION PRIORITY', 64, 102, 8, 'F2', '#D8B35A');
  drawWrappedText(p1, priority[0] || 'Review overdue accounts before approving additional loads.', 64, 84, 70, 11, 'F2', '#FFFDF8', 15);
  drawText(p1, 'Generated by Lumber Buddy for Musser Biomass', 48, 34, 8, 'F1', '#8A7B67');
  pages.push(p1.join('\n'));

  const p2 = [];
  drawPageBackground(p2);
  drawRect(p2, 0, 724, 612, 68, '#173D2B');
  drawText(p2, 'Open Invoice Detail', 48, 758, 22, 'F2', '#FFFDF8');
  drawText(p2, 'Sage 50 connector placeholder - owner review copy', 48, 738, 9, 'F1', '#D8CBB8');
  drawText(p2, `TOTAL OPEN ${money(summary.totalOpen)}  /  OVERDUE ${money(summary.overdueTotal)}`, 354, 750, 8, 'F2', '#D8B35A');

  drawRect(p2, 48, 682, 516, 24, '#2B241D');
  drawText(p2, 'CUSTOMER', 60, 691, 7, 'F2', '#FFFDF8');
  drawText(p2, 'INVOICE', 218, 691, 7, 'F2', '#FFFDF8');
  drawText(p2, 'DUE', 292, 691, 7, 'F2', '#FFFDF8');
  drawText(p2, 'AMOUNT', 360, 691, 7, 'F2', '#FFFDF8');
  drawText(p2, 'AGING', 448, 691, 7, 'F2', '#FFFDF8');

  let rowY = 642;
  invoices.forEach((invoice, index) => {
    const fill = index % 2 === 0 ? '#FFFDF8' : '#F7F3EA';
    const statusColor = invoice.status === 'Critical' ? '#A9432C' : invoice.status === 'Current' ? '#1F6B4A' : '#B88A35';
    drawRect(p2, 48, rowY - 20, 516, 44, fill);
    drawText(p2, invoice.customer || 'Unknown', 60, rowY + 8, 9, 'F2', '#17130F');
    drawText(p2, truncate(invoice.notes || '', 64), 60, rowY - 7, 7, 'F1', '#6A5E50');
    drawText(p2, invoice.invoiceNumber || '-', 218, rowY + 2, 8, 'F1', '#17130F');
    drawText(p2, invoice.dueDate || '-', 292, rowY + 2, 8, 'F1', '#17130F');
    drawText(p2, money(invoice.amount), 360, rowY + 2, 8, 'F2', '#17130F');
    drawText(p2, invoice.daysOverdue > 0 ? `${invoice.daysOverdue} days` : 'current', 448, rowY + 2, 8, 'F2', statusColor);
    drawText(p2, invoice.status || '-', 508, rowY + 2, 8, 'F2', statusColor);
    rowY -= 48;
  });

  drawText(p2, 'Recommended Follow-ups', 48, 286, 18, 'F2', '#17130F');
  let actionY = 258;
  priority.forEach((item, index) => {
    drawRect(p2, 48, actionY - 20, 516, 34, index === 0 ? '#F7F3EA' : '#FFFDF8');
    drawText(p2, String(index + 1).padStart(2, '0'), 62, actionY - 1, 8, 'F2', '#D19A2E');
    drawWrappedText(p2, item, 94, actionY + 4, 78, 9, 'F1', '#2B241D', 12);
    actionY -= 40;
  });
  drawText(p2, 'Demo data notice: Sage 50 is not connected yet. Do not treat this as live accounting data.', 48, 34, 8, 'F1', '#8A7B67');
  pages.push(p2.join('\n'));

  return createPdfFromStreams(pages);
}

function drawPageBackground(cmds) {
  drawRect(cmds, 0, 0, 612, 792, '#FFFDF8');
  drawRect(cmds, 0, 0, 22, 792, '#F7F3EA');
  drawRect(cmds, 590, 0, 22, 792, '#F7F3EA');
}

function drawMetricCard(cmds, x, y, w, h, label, value, color) {
  drawRect(cmds, x, y, w, h, '#FFFDF8');
  drawStrokeRect(cmds, x, y, w, h, '#D8CBB8', 0.8);
  drawText(cmds, label, x + 12, y + h - 22, 7, 'F2', '#8A7B67');
  drawText(cmds, value, x + 12, y + 22, 17, 'F2', color);
}

function drawWrappedText(cmds, text, x, y, width, size, font, color, lineHeight) {
  const lines = wrapPdfText(String(text || ''), width);
  lines.slice(0, 6).forEach((line, idx) => {
    drawText(cmds, line, x, y - idx * lineHeight, size, font, color);
  });
}

function drawText(cmds, text, x, y, size, font = 'F1', color = '#17130F') {
  cmds.push('BT');
  cmds.push(`${hexToRgb(color).join(' ')} rg`);
  cmds.push(`/${font} ${size} Tf`);
  cmds.push(`${x} ${y} Td`);
  cmds.push(`(${pdfEscape(text)}) Tj`);
  cmds.push('ET');
}

function drawRect(cmds, x, y, w, h, color) {
  cmds.push('q');
  cmds.push(`${hexToRgb(color).join(' ')} rg`);
  cmds.push(`${x} ${y} ${w} ${h} re f`);
  cmds.push('Q');
}

function drawStrokeRect(cmds, x, y, w, h, color, lineWidth = 1) {
  cmds.push('q');
  cmds.push(`${hexToRgb(color).join(' ')} RG`);
  cmds.push(`${lineWidth} w`);
  cmds.push(`${x} ${y} ${w} ${h} re S`);
  cmds.push('Q');
}

function drawImage(cmds, name, x, y, w, h) {
  cmds.push('q');
  cmds.push(`${w} 0 0 ${h} ${x} ${y} cm`);
  cmds.push(`/${name} Do`);
  cmds.push('Q');
}

function createPdfFromStreams(pageStreams) {
  const pageWidth = 612;
  const pageHeight = 792;
  const objects = [null];
  const addObject = (body = '') => {
    objects.push(body);
    return objects.length - 1;
  };

  const catalogId = addObject();
  const pagesId = addObject();
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const logoId = MUSSER_LOGO_JPG
    ? addObject(`<< /Type /XObject /Subtype /Image /Width ${MUSSER_LOGO_SIZE.width} /Height ${MUSSER_LOGO_SIZE.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${MUSSER_LOGO_JPG.length} >>\nstream\n${MUSSER_LOGO_JPG.toString('binary')}\nendstream`)
    : null;
  const xObjectResource = logoId ? `/XObject << /Logo ${logoId} 0 R >> ` : '';
  const pageIds = [];

  pageStreams.forEach((stream) => {
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> ${xObjectResource}>> /Contents ${contentId} 0 R >>`);
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

function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  const int = Number.parseInt(clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean, 16);
  return [
    ((int >> 16) & 255) / 255,
    ((int >> 8) & 255) / 255,
    (int & 255) / 255
  ].map(n => Number(n.toFixed(3)));
}

function truncate(value, max) {
  const str = String(value || '');
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
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
