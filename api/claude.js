// /api/claude.js
//
// Provider-normalized streaming brain endpoint for Biomass Buddy.
// Frontend keeps posting { role, messages } and reading Anthropic-shaped
// content_block_delta SSE events. Backend can run OpenAI-first or Anthropic.

import { getContext } from './context.js';

const DEFAULT_OPENAI_MODEL = 'gpt-5.5';
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 16000);

const ROLE_PREAMBLES = {
  ceo: `CURRENT USER: CEO Eric Wood. Focus on revenue, margin by product line, Accounts Receivable risk, pricing decisions, customer concentration, website/marketing actions, and what needs executive approval.`,
  cfo: `CURRENT USER: CFO Becky Chance. Focus on finance, Accounts Receivable, cash risk, Sage 50 readiness, pricing consistency, collections, and concise reporting.`,
  vp_sales: `CURRENT USER: VP Sales Mark Carrico. Focus on quote velocity, dealer follow-up, repeat orders, marketing campaigns, website/AEO content, and customer-facing sales material.`,
  board: `CURRENT USER: Board of Directors. Focus on concise strategic visibility: revenue, risk, opportunities, open decisions, marketing momentum, and high-level operating confidence.`,
  owner: `CURRENT USER: Owner/CEO. Focus on revenue, margin by product line, fleet utilization, customer concentration, inventory turns, accounts receivable risk, pricing decisions, and capital purchases. They approve pricing exceptions and customer-facing financial follow-up.`,
  ops: `CURRENT USER: Operations manager. Focus on this week's loads, delivery routing, yard inventory, production throughput, staff coverage, customer commitments, and keeping work unblocked. Surface payment status only when operationally relevant.`,
  yard: `CURRENT USER: Yard/production lead. Focus on TODAY'S production and loading: what is being produced, what trucks load when, stock levels, and constraints. Do not discuss pricing, P&L, accounts receivable, or customer strategy. Short and practical.`,
  driver: `CURRENT USER: Delivery driver. Focus on TODAY'S ROUTE only: stop order, customer address, load type, contact phone, gate/access notes, and BOL details. Do not discuss pipeline, revenue, accounts receivable, or internal ops. Keep answers short and field-practical.`,
  admin: `CURRENT USER: Admin (Obsidian Labs). Full access. Questions may be about the project/build itself, not just client operations.`
};

const ARTIFACT_INSTRUCTIONS = `---

ARTIFACT MODE (only on explicit creation requests):

You can produce visual artifacts that render in a side panel next to chat. Use artifacts ONLY when the user explicitly asks to build, create, make, draft, mock up, generate, design, export, or preview a deliverable such as:
  - website-preview: a website, landing page, microsite, or one-pager
  - pdf-brief: a branded quote, AR brief, report, contract, or PDF-style document preview
  - slide-deck: a branded slide deck or pitch/storyboard preview
  - email-template: an HTML email template

Before producing any customer-facing artifact, apply BRAND_STYLE.md. If BRAND_STYLE.md conflicts with a user request, flag the conflict in chat instead of silently breaking brand rules.

Artifact format:
1. Write 1-2 short chat sentences introducing the artifact.
2. Output exactly one block:

<artifact id="UNIQUE_ID" type="html" title="SHORT TITLE">
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>...</title>
  <style>...</style>
</head>
<body>
  ... visible content ...
</body>
</html>
</artifact>

3. After </artifact>, write 1-2 follow-up sentences.

Structural rules:
  - The HTML MUST include <body> and </body>.
  - The HTML MUST end with </body></html> followed immediately by </artifact>.
  - No external scripts, CDN imports, or network requests.
  - Use real Musser source content only. Do not invent testimonials, certifications, specs, prices, or customer claims.
  - For website-preview artifacts, use USER-AUTHORIZED WEBSITE SOURCE sections as first-party context when present. Preserve/cite source URLs in planning notes or page copy where appropriate, do not imply the preview is live, and do not invent claims beyond the imported source or living docs.
  - For pdf-brief artifacts, make it print-friendly and executive-readable.
  - For slide-deck artifacts, render slide-like sections in HTML and include an export-ready outline.
  - If a true PPTX/PDF is requested, explain that this preview is ready for export workflow after approval.`;

function buildSystemPrompt({ kb, role, websiteSources = [] }) {
  const clientName = process.env.CLIENT_NAME || 'Musser Biomass';
  const rolePreamble = ROLE_PREAMBLES[role] || ROLE_PREAMBLES.ops;
  const websiteSourceContext = formatWebsiteSources(websiteSources);
  return `You are Biomass Buddy, the Atlas AI operating brain for ${clientName}. Use the living docs below as source of truth for this business.

Be direct, operational, and ready-to-send. Use real names, product names, numbers, and known constraints. If the docs do not support a claim, say what is missing rather than inventing.

Pricing rule: PRICING.md is authoritative for product pricing and freight. Show your work for quotes. If a product, quantity, destination, or custom arrangement is outside PRICING.md, say a human quote is needed.

Brand rule: BRAND_STYLE.md is authoritative for customer-facing voice, visual direction, terminology, and output quality gates.

Accounts receivable rule: Sage 50 is not connected yet. Use only placeholder AR data returned by the app or explicitly labeled demo data until a live Sage connector is configured.

Website rule: GoDaddy controls DNS/domain, but Vercel is the preferred Atlas-managed publishing path for future live website/blog changes. If the user asks to update GoDaddy Website Builder directly, explain that the current implementation imports/publicly verifies website context and drafts publish-ready content, but live GoDaddy Builder edits need a separate supported API or migration.

GHL SMS rule: Biomass Buddy can prepare tag-based SMS campaigns, but live sends must go through the app's confirmation flow. Do not claim a message was sent unless /api/send-sms confirms it.

Marketing rule: Marketing outputs should use Musser Biomass language: Forest Fuel pellets, Forest Fuel briquettes, Alpha Fiber, converted Appalachian hardwood fiber, Rural Retreat, Virginia, and practical dealer/customer value. Do not invent specs, certifications, customer reviews, or performance claims.

${rolePreamble}

${ARTIFACT_INSTRUCTIONS}

${websiteSourceContext}

-----
LIVING DOCS
-----
${kb}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, role, websiteSources } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const ctx = await getContext();
    const system = buildSystemPrompt({ kb: ctx.kb, role, websiteSources });
    const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (provider === 'anthropic') {
      await streamAnthropic({ res, system, messages });
      return;
    }

    try {
      await streamOpenAI({ res, system, messages });
    } catch (err) {
      if (!process.env.ANTHROPIC_API_KEY) throw err;
      writeEvent(res, `Provider fallback: OpenAI failed (${err.message}). Continuing with Anthropic.\n\n`);
      await streamAnthropic({ res, system, messages });
    }
  } catch (err) {
    if (res.headersSent) {
      writeEvent(res, `Brain error: ${err.message}`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    return res.status(500).json({ error: err.message });
  }
}

function formatWebsiteSources(sources) {
  const safeSources = Array.isArray(sources) ? sources.slice(0, 3) : [];
  if (safeSources.length === 0) return '';

  const sections = safeSources.map((source, index) => {
    const metadata = source.metadata || {};
    const images = Array.isArray(source.images) ? source.images.slice(0, 8) : [];
    const embeds = Array.isArray(source.embeds) ? source.embeds.slice(0, 6) : [];
    const imageLines = images.map((image) => `- ${truncate(image.alt || 'Image', 90)}: ${truncate(image.url, 180)}`).join('\n');
    const embedLines = embeds.map((embed) => `- ${truncate(embed.type || 'embed', 40)}: ${truncate(embed.url, 180)}`).join('\n');

    return `#${index + 1}
Source URL: ${truncate(source.sourceUrl || source.finalUrl || metadata.canonicalUrl || 'unknown', 220)}
Canonical/final URL: ${truncate(source.finalUrl || metadata.canonicalUrl || 'unknown', 220)}
Fetched at: ${truncate(source.fetchedAt || 'unknown', 80)}
Title: ${truncate(metadata.title || metadata.ogTitle || 'Untitled', 180)}
Description: ${truncate(metadata.description || metadata.ogDescription || '', 500)}
Visible page content:
${truncate(source.contentSummaryText || '', 5000)}
Images:
${imageLines || '- none imported'}
Embedded media:
${embedLines || '- none imported'}`;
  });

  return `-----
USER-AUTHORIZED WEBSITE SOURCE
-----
The user attested they own or manage these public pages and DNS verification passed before import. Use this only as first-party website design context. Preserve the source URL in reasoning/context, avoid private or login-gated assumptions, and do not invent unsupported claims.

${sections.join('\n\n')}`;
}

function truncate(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

async function streamOpenAI({ res, system, messages }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      instructions: system,
      input: toOpenAIInput(messages),
      max_output_tokens: MAX_TOKENS,
      reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || 'high' },
      stream: true
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI ${response.status}: ${body}`);
  }

  await readSSE(response, (event) => {
    if (event.type === 'response.output_text.delta' && event.delta) {
      writeEvent(res, event.delta);
    }
    if (event.type === 'response.failed') {
      const message = event.response?.error?.message || 'OpenAI response failed';
      throw new Error(message);
    }
  });

  res.write('data: [DONE]\n\n');
  res.end();
}

async function streamAnthropic({ res, system, messages }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      stream: true
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic ${response.status}: ${body}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(decoder.decode(value, { stream: true }));
  }
  res.end();
}

function toOpenAIInput(messages) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: String(message.content || '')
  }));
}

async function readSSE(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';
    for (const frame of frames) {
      const dataLines = frame
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6).trim());
      if (dataLines.length === 0) continue;
      const data = dataLines.join('\n');
      if (!data || data === '[DONE]') continue;
      onEvent(JSON.parse(data));
    }
  }
}

function writeEvent(res, text) {
  res.write(`data: ${JSON.stringify({
    type: 'content_block_delta',
    delta: { type: 'text_delta', text }
  })}\n\n`);
}
