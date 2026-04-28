import { addLearningItem } from '../../lib/learning/store.js';

const SOURCE_LABELS = {
  ghl: 'Obsidian Labs CRM conversation',
  voice: 'Voice AI transcript',
  sage50: 'Sage 50 accounting event',
  amazon_sp_api: 'Amazon Selling Partner event',
  spreadsheet: 'Spreadsheet import',
  api: 'External API event'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const sourceType = String(body.source?.type || body.type || 'api').toLowerCase();
    const item = await addLearningItem({
      category: body.category || inferCategory(sourceType, body),
      summary: body.summary || `Review ${SOURCE_LABELS[sourceType] || 'external source'} insight`,
      proposedLesson: body.proposedLesson || body.lesson || body.analysis || body.summary,
      evidence: body.evidence || summarizeEvidence(sourceType, body),
      riskLevel: body.riskLevel,
      targetDoc: body.targetDoc,
      source: {
        type: sourceType,
        label: body.source?.label || SOURCE_LABELS[sourceType] || 'External API event',
        externalId: body.source?.externalId || body.externalId || body.conversationId || body.orderId || body.invoiceId || '',
        url: body.source?.url || body.url || '',
        metadata: body.metadata || body.source?.metadata || {}
      }
    });
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

function inferCategory(sourceType, body) {
  const text = `${body.summary || ''} ${body.analysis || ''} ${body.evidence || ''}`.toLowerCase();
  if (text.includes('price') || text.includes('quote')) return 'pricing';
  if (text.includes('freight') || text.includes('mile')) return 'freight';
  if (sourceType === 'sage50') return 'accounting';
  if (sourceType === 'amazon_sp_api' && (text.includes('listing') || text.includes('claim'))) return 'compliance';
  if (sourceType === 'ghl' || sourceType === 'voice') return 'customer_handling';
  return 'other';
}

function summarizeEvidence(sourceType, body) {
  const parts = [];
  if (body.externalId) parts.push(`External id: ${body.externalId}`);
  if (body.conversationId) parts.push(`Conversation id: ${body.conversationId}`);
  if (body.orderId) parts.push(`Order id: ${body.orderId}`);
  if (body.invoiceId) parts.push(`Invoice id: ${body.invoiceId}`);
  if (body.transcriptExcerpt) parts.push(`Transcript: ${body.transcriptExcerpt}`);
  if (body.messageExcerpt) parts.push(`Message: ${body.messageExcerpt}`);
  if (body.analysis) parts.push(`Analysis: ${body.analysis}`);
  if (!parts.length) parts.push(`Source type: ${sourceType}`);
  return parts.join(' | ');
}
