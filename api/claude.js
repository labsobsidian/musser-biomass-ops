// /api/claude.js
//
// Thin streaming proxy in front of Anthropic.
// Fetches live KB via in-process context helper, prepends a role preamble,
// then pipes the SSE stream back to the frontend unchanged.
//
// Frontend sends: { role: 'owner'|'ops'|'yard'|'driver'|'admin', messages: [...] }
// Backend owns: model, max_tokens, system prompt.
//
// CRITICAL: stream:true is forced on every call. Do not refactor back to
// buffered JSON — the frontend reads SSE chunks with content_block_delta events.

import { getContext } from './context.js';

const MODEL = 'claude-sonnet-4-6';
// artifacts (single-file HTML pages with inline CSS) easily exceed 4000 tokens;
// bumping to 16000 leaves headroom for a complete page.
const MAX_TOKENS = 16000;

// Role-specific framing. Backend owns this. Keep it short — the living docs
// do the heavy lifting for actual content; this just tells Claude who it's
// talking to and what they care about.
const ROLE_PREAMBLES = {
  owner: `CURRENT USER: Owner/CEO. Focus on revenue, margin by product line, fleet utilization, customer concentration, inventory turns, pricing decisions. They approve pricing exceptions and capital purchases.`,
  ops: `CURRENT USER: Operations manager. Focus on today's orders, delivery routing, yard inventory, kiln schedules, production throughput, staff coverage. Keep them unblocked.`,
  yard: `CURRENT USER: Yard/production lead. Focus on TODAY'S production and loading — what's being cut, kiln status, which trucks load when, stock levels. Do not discuss pricing, P&L, or customer strategy. Short and practical.`,
  driver: `CURRENT USER: Delivery driver. Focus on TODAY'S ROUTE only — stop order, customer addresses, load type, contact phone, gate/access notes, COD amount if any. Do not discuss pipeline, revenue, or internal ops. Keep answers short and field-practical.`,
  admin: `CURRENT USER: Admin (Obsidian Labs). Full access. Questions may be about the project/build itself, not just client operations.`
};

// Artifact mode: only kicks in on EXPLICIT creation requests. Default behavior
// (Q&A, drafting messages, summarizing data) must stay unchanged so daily ops
// use of Lumber Buddy doesn't surprise users with iframe panels popping open.
const ARTIFACT_INSTRUCTIONS = `---

ARTIFACT MODE (rare — only on explicit creation requests):

You can produce visual artifacts (single-file HTML pages) that render in a side panel next to the chat. Use this capability ONLY when the user explicitly asks you to BUILD, CREATE, MAKE, DRAFT, MOCK UP, GENERATE, or DESIGN a deliverable like:
  - a website, landing page, microsite, or one-pager
  - a branded quote, contract, or PDF-style document mockup
  - an email template they can copy
  - a visual mockup, layout, or interactive prototype

Do NOT produce artifacts for:
  - normal Q&A ("what's our revenue?", "who's in the approval queue?")
  - drafting plain-text messages or emails (use a normal chat reply)
  - showing data the dashboard already shows
  - explaining concepts ("what would a landing page for X look like?" — answer in chat unless they then say "build it")

When you DO produce an artifact, follow this format EXACTLY:

1. First, write 1–2 sentences in chat introducing what you're about to build.
2. Then output a single artifact block on its own. The format is rigid:

<artifact id="UNIQUE_ID" type="html" title="SHORT TITLE">
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>...</title>
  <style>...</style>
</head>
<body>
  ... ALL VISIBLE CONTENT GOES HERE ...
</body>
</html>
</artifact>

3. After the closing </artifact> tag, write 1–2 follow-up sentences in chat.

CRITICAL STRUCTURAL REQUIREMENTS — non-negotiable:
  - The HTML MUST contain a <body> opening tag and a </body> closing tag. Without these, the page renders blank.
  - The HTML MUST end with </body></html> followed immediately by </artifact>.
  - All visible content (headers, hero, sections, footer) MUST be inside <body>...</body>, NOT inside <head> or <style>.

CSS DISCIPLINE (to prevent token exhaustion mid-render):
  - Keep your <style> block under ~150 lines. Use compact CSS.
  - Use system fonts only: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
  - No duplicate or unused styles. Every rule referenced by something in body.

OTHER RULES:
  - id: a short slug like "northeast-stove-landing".
  - type: always "html" for now.
  - title: 2–6 words shown above the panel.
  - No external scripts, no CDN imports, no network requests.
  - Use real content from the project docs (real product names, real PRICING.md numbers, real customer names). No Lorem-ipsum.
  - Inside the artifact block, output ONLY the HTML — no commentary, no markdown fences, no preamble.
  - Output exactly ONE artifact per response.`;

function buildSystemPrompt({ kb, role }) {
  const clientName = process.env.CLIENT_NAME || 'the client';
  const preamble = `You are Lumber Buddy, the AI brain for ${clientName}. You have access to the client's living project docs below — use them as the source of truth for anything about this business. Be direct and operational. Draft messages ready to send. Use real names and numbers. Keep answers tight.

When a customer or teammate asks about pricing, use PRICING.md as the authoritative source. Show your work (line items, volume × unit price, delivery fee, total). If the product or quantity isn't covered in PRICING.md, say so and suggest getting a human quote — do not invent numbers.`;
  const rolePreamble = ROLE_PREAMBLES[role] || ROLE_PREAMBLES.ops;
  return `${preamble}\n\n${rolePreamble}\n\n${ARTIFACT_INSTRUCTIONS}\n\n---\n\n${kb}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }

  const { messages, role } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const ctx = await getContext();
    const system = buildSystemPrompt({ kb: ctx.kb, role });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages,
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json(err);
    }

    // Pipe SSE stream straight through. Frontend parses content_block_delta events.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    if (res.headersSent) {
      try { res.end(); } catch {}
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}
