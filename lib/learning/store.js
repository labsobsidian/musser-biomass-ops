import fs from 'node:fs/promises';
import path from 'node:path';
import { Octokit } from '@octokit/rest';

const QUEUE_PATH = 'data/learning/LEARNING_QUEUE.json';
const LOG_PATH = 'LEARNING_LOG.md';
const WEEKLY_PATH = 'START_THE_WEEK.md';
const DEFAULT_QUEUE = { version: 1, client: 'Musser Biomass', items: [] };

const CATEGORY_TARGETS = {
  pricing: 'PRICING.md',
  freight: 'PRICING.md',
  brand: 'BRAND_STYLE.md',
  operations: 'PROJECT_STATE.md',
  customer_handling: 'LEARNING_LOG.md',
  accounting: 'PROJECT_STATE.md',
  compliance: 'PLAYBOOK.md',
  tool_behavior: 'ARCHITECTURE.md',
  product: 'PRICING.md',
  other: 'LEARNING_LOG.md'
};

const HIGH_RISK_CATEGORIES = new Set(['pricing', 'freight', 'accounting', 'compliance', 'product']);

function githubConfig() {
  const repo = process.env.CLIENT_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return null;
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) return null;
  return { owner, repo: repoName, token, branch: process.env.LEARNING_BRANCH || 'main' };
}

function octokit() {
  const cfg = githubConfig();
  return cfg ? new Octokit({ auth: cfg.token }) : null;
}

async function readRepoFile(filePath, fallback = '') {
  const cfg = githubConfig();
  const kit = octokit();
  if (cfg && kit) {
    try {
      const { data } = await kit.repos.getContent({ owner: cfg.owner, repo: cfg.repo, path: filePath, ref: cfg.branch });
      return Buffer.from(data.content || '', 'base64').toString('utf8');
    } catch (err) {
      if (err.status === 404) return fallback;
      throw err;
    }
  }

  try {
    return await fs.readFile(path.join(process.cwd(), filePath), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeRepoFile(filePath, content, message) {
  const cfg = githubConfig();
  const kit = octokit();
  if (cfg && kit) {
    let sha;
    try {
      const { data } = await kit.repos.getContent({ owner: cfg.owner, repo: cfg.repo, path: filePath, ref: cfg.branch });
      sha = data.sha;
    } catch (err) {
      if (err.status !== 404) throw err;
    }
    await kit.repos.createOrUpdateFileContents({
      owner: cfg.owner,
      repo: cfg.repo,
      path: filePath,
      branch: cfg.branch,
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha
    });
    return { provider: 'github', path: filePath };
  }

  const abs = path.join(process.cwd(), filePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
  return { provider: 'local', path: filePath };
}

export async function loadQueue() {
  const raw = await readRepoFile(QUEUE_PATH, JSON.stringify(DEFAULT_QUEUE, null, 2));
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_QUEUE, ...parsed, items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return DEFAULT_QUEUE;
  }
}

export async function saveQueue(queue, message = 'Update Biomass Buddy learning queue') {
  queue.version = queue.version || 1;
  queue.client = queue.client || 'Musser Biomass';
  queue.items = Array.isArray(queue.items) ? queue.items : [];
  return writeRepoFile(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`, message);
}

export function normalizeLearningItem(input = {}) {
  const now = new Date().toISOString();
  const category = normalizeCategory(input.category);
  const riskLevel = input.riskLevel || (HIGH_RISK_CATEGORIES.has(category) ? 'high' : 'medium');
  const targetDoc = input.targetDoc || CATEGORY_TARGETS[category] || 'LEARNING_LOG.md';
  const summary = clean(input.summary);
  const proposedLesson = clean(input.proposedLesson || input.correctedAnswer || input.summary);
  const evidence = clean(input.evidence || buildEvidence(input));

  if (!summary) throw new Error('summary is required');
  if (!proposedLesson) throw new Error('proposedLesson or correctedAnswer is required');
  if (!evidence) throw new Error('evidence is required');

  return {
    id: input.id || createId(summary),
    status: 'pending',
    createdAt: input.createdAt || now,
    updatedAt: now,
    source: normalizeSource(input.source),
    category,
    riskLevel,
    targetDoc,
    summary,
    evidence,
    proposedLesson,
    originalPrompt: clean(input.originalPrompt),
    botAnswer: clean(input.botAnswer),
    correctedAnswer: clean(input.correctedAnswer),
    reason: clean(input.reason),
    kbPatch: {
      targetDoc,
      mode: riskLevel === 'high' ? 'manual' : 'append',
      section: input.section || '',
      content: proposedLesson,
      requiresCodeChange: category === 'pricing' || category === 'freight' || category === 'tool_behavior'
    }
  };
}

export async function addLearningItem(input) {
  const queue = await loadQueue();
  const item = normalizeLearningItem(input);
  queue.items.unshift(item);
  await saveQueue(queue, `Add learning item: ${item.summary.slice(0, 60)}`);
  return item;
}

export async function reviewLearningItem({ itemId, decision, reviewedBy = 'Biomass Buddy admin', decisionReason = '', editedLesson = '', targetDoc = '' }) {
  if (!itemId) throw new Error('itemId is required');
  if (!['approve', 'reject', 'needs_manual_patch'].includes(decision)) throw new Error('decision must be approve, reject, or needs_manual_patch');

  const queue = await loadQueue();
  const item = queue.items.find((entry) => entry.id === itemId);
  if (!item) throw new Error('learning item not found');

  const now = new Date().toISOString();
  item.status = decision === 'approve' ? 'approved' : decision;
  item.updatedAt = now;
  item.reviewedAt = now;
  item.reviewedBy = clean(reviewedBy) || 'Biomass Buddy admin';
  item.decisionReason = clean(decisionReason);
  if (editedLesson) {
    item.proposedLesson = clean(editedLesson);
    if (item.kbPatch) item.kbPatch.content = item.proposedLesson;
  }
  if (targetDoc) {
    item.targetDoc = clean(targetDoc);
    if (item.kbPatch) item.kbPatch.targetDoc = item.targetDoc;
  }

  await saveQueue(queue, `Review learning item: ${item.summary.slice(0, 60)}`);

  let logWrite = null;
  if (item.status === 'approved' || item.status === 'needs_manual_patch') {
    logWrite = await appendLearningLog(item);
  }

  return { item, logWrite };
}

export async function appendLearningLog(item) {
  const existing = await readRepoFile(LOG_PATH, defaultLearningLog());
  const entry = [
    '',
    `## ${new Date().toISOString().slice(0, 10)} - ${item.summary}`,
    '',
    `- Status: ${item.status}`,
    `- Category: ${item.category}`,
    `- Risk: ${item.riskLevel}`,
    `- Target doc: ${item.targetDoc}`,
    `- Source: ${item.source?.label || item.source?.type || 'unknown'}${item.source?.externalId ? ` (${item.source.externalId})` : ''}`,
    `- Evidence: ${item.evidence}`,
    `- Approved lesson: ${item.proposedLesson}`,
    item.decisionReason ? `- Review note: ${item.decisionReason}` : null,
    item.kbPatch?.requiresCodeChange ? '- Follow-up: related code or calculator behavior may need a separate patch.' : null,
    ''
  ].filter(Boolean).join('\n');

  return writeRepoFile(LOG_PATH, `${existing.trimEnd()}\n${entry}`, `Promote learning item: ${item.summary.slice(0, 60)}`);
}

export async function buildWeeklyReview({ write = false } = {}) {
  const queue = await loadQueue();
  const now = new Date().toISOString();
  const grouped = {
    pending: queue.items.filter((item) => item.status === 'pending'),
    approved: queue.items.filter((item) => item.status === 'approved'),
    rejected: queue.items.filter((item) => item.status === 'rejected'),
    manual: queue.items.filter((item) => item.status === 'needs_manual_patch')
  };

  const markdown = [
    '# START_THE_WEEK.md - Biomass Buddy Learning Review',
    `_Generated: ${now}_`,
    '',
    '## Pending Lessons',
    formatItems(grouped.pending),
    '',
    '## Approved Lessons',
    formatItems(grouped.approved),
    '',
    '## Manual Patch Required',
    formatItems(grouped.manual),
    '',
    '## Rejected Lessons',
    formatItems(grouped.rejected)
  ].join('\n');

  const writeResult = write ? await writeRepoFile(WEEKLY_PATH, `${markdown}\n`, 'Generate Biomass Buddy weekly learning review') : null;
  return { generatedAt: now, counts: Object.fromEntries(Object.entries(grouped).map(([key, items]) => [key, items.length])), markdown, writeResult };
}

function formatItems(items) {
  if (!items.length) return '- None';
  return items.map((item) => [
    `- ${item.summary}`,
    `  - Status: ${item.status}; Risk: ${item.riskLevel}; Target: ${item.targetDoc}`,
    `  - Lesson: ${item.proposedLesson}`,
    `  - Evidence: ${item.evidence}`
  ].join('\n')).join('\n');
}

function normalizeCategory(value) {
  const category = clean(value || 'other').toLowerCase().replace(/[\s-]+/g, '_');
  return CATEGORY_TARGETS[category] ? category : 'other';
}

function normalizeSource(source = {}) {
  return {
    type: clean(source.type || 'manual').toLowerCase(),
    label: clean(source.label || 'Manual correction'),
    externalId: clean(source.externalId || ''),
    url: clean(source.url || ''),
    metadata: source.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  };
}

function buildEvidence(input) {
  const parts = [];
  if (input.originalPrompt) parts.push(`Original prompt: ${input.originalPrompt}`);
  if (input.botAnswer) parts.push(`Bot answer: ${input.botAnswer}`);
  if (input.correctedAnswer) parts.push(`Correction: ${input.correctedAnswer}`);
  if (input.reason) parts.push(`Reason: ${input.reason}`);
  return parts.join(' | ');
}

function createId(summary) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const slug = clean(summary).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'lesson';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `learn_${date}_${slug}_${suffix}`;
}

function clean(value) {
  return String(value || '').trim();
}

function defaultLearningLog() {
  return `# LEARNING_LOG.md - Approved Biomass Buddy Lessons
_Human-approved lessons from the Atlas Learning Loop._

---

Pending, rejected, and unreviewed source data are not live knowledge.
`;
}

export { CATEGORY_TARGETS, HIGH_RISK_CATEGORIES };
