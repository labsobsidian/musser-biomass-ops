// /api/context.js
//
// Builds the live system prompt Lumber Buddy uses to answer questions.
// One source today (GitHub living docs). Designed so future connectors
// (GHL pipeline, Sage 50 AR, route optimizer, etc.) slot in as siblings.
//
// Env vars required:
//   CLIENT_REPO     e.g. "labsobsidian/musser-biomass-ops"
//   CLIENT_NAME     e.g. "Musser Biomass"
//   CLIENT_SLUG     e.g. "musser-biomass"
//   GITHUB_TOKEN    fine-grained PAT scoped to the repo above,
//                   with contents:read (+ contents:write for /api/commit)

import { Octokit } from '@octokit/rest';

// Living docs Lumber Buddy reads every context build.
// DEMO_CONTEXT.md, PRICING.md, and BRAND_STYLE.md are optional-but-expected;
// missing files are skipped.
const LIVING_DOCS = [
  'PROJECT_STATE.md',
  'ARCHITECTURE.md',
  'CONSTANTS.md',
  'DECISIONS.md',
  'GO_LIVE_CHECKLIST.md',
  'DEMO_CONTEXT.md',
  'PRICING.md',
  'BRAND_STYLE.md'
];

// In-memory cache. 60s TTL per serverless instance. Keeps us far under
// GitHub's 5000 req/hr PAT limit even with many warm instances.
let cache = { kb: null, docsLoaded: [], fetchedAt: 0 };
const CACHE_TTL_MS = 60 * 1000;

// --- SOURCE: GitHub living docs ---
async function fetchGitHubDocs() {
  const repo = process.env.CLIENT_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error('CLIENT_REPO and GITHUB_TOKEN env vars are required');
  }
  const [owner, repoName] = repo.split('/');
  const octokit = new Octokit({ auth: token });

  const results = await Promise.all(
    LIVING_DOCS.map(async (path) => {
      try {
        const { data } = await octokit.repos.getContent({ owner, repo: repoName, path, ref: 'main' });
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return { path, content, ok: true };
      } catch (err) {
        if (err.status === 404) return { path, content: null, ok: false, reason: 'not_found' };
        return { path, content: null, ok: false, reason: err.message };
      }
    })
  );

  const sections = [];
  const loaded = [];
  for (const r of results) {
    if (r.ok) {
      sections.push(`# === DOCUMENT: ${r.path} ===\n\n${r.content.trim()}\n`);
      loaded.push(r.path);
    }
  }
  return { text: sections.join('\n\n'), loaded };
}

// --- Assembler ---
// Future connectors become siblings to fetchGitHubDocs() in this Promise.all.
// Each should return { text: string, loaded: string[] } so buildKB stays uniform.
async function buildKB() {
  const [github] = await Promise.all([
    fetchGitHubDocs()
    // future:
    // fetchGhlPipeline(),
    // fetchSage50ARSnapshot(),
    // fetchRouteOptimizer(),
  ]);
  return {
    kb: github.text,
    docsLoaded: github.loaded
  };
}

async function getContext({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.kb && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { ...cache, fromCache: true };
  }
  const fresh = await buildKB();
  cache = { kb: fresh.kb, docsLoaded: fresh.docsLoaded, fetchedAt: now };
  return { ...cache, fromCache: false };
}

export { getContext };

// HTTP handler — debugging / observability. Hit this URL to confirm what KB
// Lumber Buddy is currently working with.
export default async function handler(req, res) {
  try {
    const force = req.query?.force === '1';
    const ctx = await getContext({ force });
    res.status(200).json({
      client: process.env.CLIENT_NAME || null,
      slug: process.env.CLIENT_SLUG || null,
      repo: process.env.CLIENT_REPO || null,
      docsLoaded: ctx.docsLoaded,
      kbLength: ctx.kb.length,
      fromCache: ctx.fromCache,
      fetchedAt: new Date(ctx.fetchedAt).toISOString()
      // Intentionally NOT returning ctx.kb — it's large and we don't want
      // docs exposed at a public URL. Uncomment for local debugging only.
      // kb: ctx.kb
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
