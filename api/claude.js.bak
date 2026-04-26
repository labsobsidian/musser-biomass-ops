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
const MAX_TOKENS = 1200;

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

function buildSystemPrompt({ kb, role }) {
  const clientName = process.env.CLIENT_NAME || 'the client';
  const preamble = `You are Lumber Buddy, the AI brain for ${clientName}. You have access to the client's living project docs below — use them as the source of truth for anything about this business. Be direct and operational. Draft messages ready to send. Use real names and numbers. Keep answers tight.

When a customer or teammate asks about pricing, use PRICING.md as the authoritative source. Show your work (line items, volume × unit price, delivery fee, total). If the product or quantity isn't covered in PRICING.md, say so and suggest getting a human quote — do not invent numbers.`;
  const rolePreamble = ROLE_PREAMBLES[role] || ROLE_PREAMBLES.ops;
  return `${preamble}\n\n${rolePreamble}\n\n---\n\n${kb}`;
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
