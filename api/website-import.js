// /api/website-import.js
//
// Imports one user-authorized public web page for website-preview context.
// The endpoint intentionally avoids crawling, credentials, cookies, and
// private-network targets.

import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';

const USER_AGENT = 'BiomassBuddyWebsiteImporter/1.0 (+https://labsobsidian.co)';
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 1_500_000;
const MAX_CONTEXT_CHARS = 12_000;
const FETCH_TIMEOUT_MS = 12_000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, attestOwnership } = req.body || {};
    if (attestOwnership !== true) {
      return res.status(400).json({
        error: 'Ownership/management attestation is required before importing a website.'
      });
    }

    const requestedUrl = normalizeHttpUrl(url);
    await assertPublicHttpTarget(requestedUrl);

    const verification = await verifyDnsAuthorization(requestedUrl.hostname);
    if (!verification.verified) {
      return res.status(428).json({
        error: 'DNS verification required',
        code: 'dns_verification_required',
        message: 'Add this TXT record at your DNS host, wait for it to propagate, then check again.',
        recordName: verification.recordName,
        recordValue: verification.recordValue,
        checkedRecords: verification.checkedRecords
      });
    }

    const robots = await checkRobots(requestedUrl);
    if (!robots.allowed) {
      return res.status(403).json({
        error: 'The site robots.txt does not allow this page to be imported.',
        code: 'robots_disallowed',
        robotsStatus: robots
      });
    }

    const fetched = await fetchHtmlWithSafeRedirects(requestedUrl);
    const pageRobots = getPageRobots(fetched.html);
    if (pageRobots.noindex || pageRobots.nosnippet || pageRobots.none) {
      return res.status(403).json({
        error: 'The page robots metadata prevents this content from being imported.',
        code: 'page_robots_disallowed',
        robotsStatus: { ...robots, page: pageRobots }
      });
    }

    const imported = extractWebsiteContext(fetched.finalUrl, fetched.html);
    if (looksLoginGated(imported, fetched.html)) {
      return res.status(403).json({
        error: 'This page appears to be login-gated or private, so it was not imported.',
        code: 'login_gated'
      });
    }

    return res.status(200).json({
      ok: true,
      sourceUrl: requestedUrl.toString(),
      finalUrl: fetched.finalUrl.toString(),
      fetchedAt: new Date().toISOString(),
      robotsStatus: { ...robots, page: pageRobots },
      ...imported
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message, code: err.code || 'website_import_failed' });
  }
}

function normalizeHttpUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw httpError(400, 'Enter a valid http or https URL.', 'invalid_url');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw httpError(400, 'Only public http and https URLs can be imported.', 'invalid_protocol');
  }
  if (url.username || url.password) {
    throw httpError(400, 'URLs with embedded credentials cannot be imported.', 'credentials_in_url');
  }
  url.hash = '';
  return url;
}

async function verifyDnsAuthorization(hostname) {
  const secret = process.env.IMPORT_VERIFICATION_SECRET;
  const slug = process.env.CLIENT_SLUG || 'biomass-buddy';
  if (!secret) {
    throw httpError(500, 'IMPORT_VERIFICATION_SECRET is not configured.', 'missing_import_secret');
  }

  const domains = dnsVerificationDomains(hostname);
  const checkedRecords = [];
  for (const domain of domains) {
    const recordName = `_biomass-buddy-import.${domain}`;
    const recordValue = verificationValue({ slug, secret, domain });
    checkedRecords.push(recordName);
    const values = await resolveTxtSafe(recordName);
    if (values.some((value) => normalizeTxtValue(value) === recordValue)) {
      return { verified: true, recordName, recordValue, checkedRecords };
    }
  }

  const domain = domains[0];
  return {
    verified: false,
    recordName: `_biomass-buddy-import.${domain}`,
    recordValue: verificationValue({ slug, secret, domain }),
    checkedRecords
  };
}

function dnsVerificationDomains(hostname) {
  const clean = hostname.toLowerCase().replace(/\.$/, '');
  const parts = clean.split('.').filter(Boolean);
  const domains = [];
  if (parts.length >= 2) domains.push(parts.slice(-2).join('.'));
  if (!domains.includes(clean)) domains.push(clean);
  return domains;
}

function verificationValue({ slug, secret, domain }) {
  const hash = crypto
    .createHash('sha256')
    .update(`${slug}:${secret}:${domain}`)
    .digest('hex')
    .slice(0, 32);
  return `biomass-buddy-import=${slug}-${hash}`;
}

async function resolveTxtSafe(recordName) {
  try {
    const records = await dns.resolveTxt(recordName);
    return records.map((parts) => parts.join(''));
  } catch {
    return [];
  }
}

function normalizeTxtValue(value) {
  return String(value || '').trim().replace(/^"|"$/g, '');
}

async function checkRobots(url) {
  const robotsUrl = new URL('/robots.txt', url.origin);
  try {
    await assertPublicHttpTarget(robotsUrl);
    const response = await fetchWithTimeout(robotsUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain,*/*;q=0.5' },
      redirect: 'manual'
    });
    if (response.status === 404) {
      return { allowed: true, checked: robotsUrl.toString(), reason: 'not_found' };
    }
    if (!response.ok) {
      return { allowed: true, checked: robotsUrl.toString(), reason: `robots_${response.status}` };
    }
    const body = await response.text();
    const parser = robotsParser(robotsUrl.toString(), body);
    return {
      allowed: parser.isAllowed(url.toString(), USER_AGENT) !== false,
      checked: robotsUrl.toString(),
      reason: 'robots_txt'
    };
  } catch (err) {
    return { allowed: true, checked: robotsUrl.toString(), reason: `robots_unavailable:${err.code || err.message}` };
  }
}

async function fetchHtmlWithSafeRedirects(startUrl) {
  let currentUrl = startUrl;
  const verifiedDomains = dnsVerificationDomains(startUrl.hostname);
  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    await assertPublicHttpTarget(currentUrl);
    const robots = await checkRobots(currentUrl);
    if (!robots.allowed) {
      throw httpError(403, 'The site robots.txt does not allow this page to be imported.', 'robots_disallowed');
    }
    const response = await fetchWithTimeout(currentUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1'
      },
      redirect: 'manual'
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw httpError(502, 'The site returned a redirect without a location.', 'bad_redirect');
      currentUrl = normalizeHttpUrl(new URL(location, currentUrl).toString());
      if (!isSameVerifiedSite(currentUrl.hostname, verifiedDomains)) {
        throw httpError(400, 'Redirects must stay on the DNS-verified site.', 'cross_site_redirect');
      }
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw httpError(403, 'This page is not publicly available without authorization.', 'private_content');
    }
    if (!response.ok) {
      throw httpError(502, `The site returned HTTP ${response.status}.`, 'source_fetch_failed');
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('text/html')) {
      throw httpError(415, 'Only HTML pages can be imported.', 'non_html_content');
    }

    return { finalUrl: currentUrl, html: await readBoundedText(response, MAX_HTML_BYTES) };
  }
  throw httpError(508, 'Too many redirects while fetching the site.', 'too_many_redirects');
}

function isSameVerifiedSite(hostname, verifiedDomains) {
  const domains = dnsVerificationDomains(hostname);
  return domains.some((domain) => verifiedDomains.includes(domain));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readBoundedText(response, maxBytes) {
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      throw httpError(413, 'The page is too large to import safely.', 'page_too_large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function extractWebsiteContext(finalUrl, html) {
  const $ = load(html);
  $('script,style,noscript,template,svg').remove();

  const metadata = {
    title: cleanText($('title').first().text() || meta($, 'og:title') || meta($, 'twitter:title')),
    description: cleanText(meta($, 'description') || meta($, 'og:description') || meta($, 'twitter:description')),
    canonicalUrl: absoluteUrl($('link[rel="canonical"]').first().attr('href'), finalUrl) || finalUrl.toString(),
    ogTitle: cleanText(meta($, 'og:title')),
    ogDescription: cleanText(meta($, 'og:description')),
    ogImage: absoluteUrl(meta($, 'og:image'), finalUrl)
  };

  const contentSummaryText = cleanText($('body').text()).slice(0, MAX_CONTEXT_CHARS);
  const images = uniqueByUrl(
    $('img')
      .map((_, el) => ({
        url: absoluteUrl($(el).attr('src') || $(el).attr('data-src'), finalUrl),
        alt: cleanText($(el).attr('alt') || ''),
        width: $(el).attr('width') || null,
        height: $(el).attr('height') || null
      }))
      .get()
      .filter((image) => image.url)
  ).slice(0, 24);

  const embeds = uniqueByUrl(
    $('iframe,video source,video,audio source,audio,embed,object')
      .map((_, el) => ({
        url: absoluteUrl($(el).attr('src') || $(el).attr('data') || $(el).attr('href'), finalUrl),
        type: el.tagName?.toLowerCase() || 'embed',
        title: cleanText($(el).attr('title') || $(el).attr('aria-label') || '')
      }))
      .get()
      .filter((embed) => embed.url)
  ).slice(0, 12);

  return { metadata, contentSummaryText, images, embeds };
}

function meta($, name) {
  return (
    $(`meta[name="${name}"]`).first().attr('content') ||
    $(`meta[property="${name}"]`).first().attr('content') ||
    ''
  );
}

function getPageRobots(html) {
  const $ = load(html);
  const directives = cleanText(
    $('meta[name="robots"],meta[name="googlebot"]')
      .map((_, el) => $(el).attr('content') || '')
      .get()
      .join(',')
  ).toLowerCase();
  return {
    directives,
    noindex: directives.includes('noindex'),
    nosnippet: directives.includes('nosnippet'),
    none: directives.includes('none')
  };
}

function looksLoginGated(imported, html) {
  const $ = load(html);
  if ($('input[type="password"]').length > 0) return true;
  const title = imported.metadata?.title || '';
  const text = `${title} ${imported.contentSummaryText}`.toLowerCase();
  const loginSignals = [
    'sign in',
    'log in',
    'password',
    'forgot password',
    'members only',
    'restricted access',
    'authentication required'
  ];
  const signalCount = loginSignals.filter((signal) => text.includes(signal)).length;
  return signalCount >= 2 && imported.contentSummaryText.length < 2500;
}

function absoluteUrl(value, baseUrl) {
  if (!value) return null;
  try {
    const url = new URL(String(value).trim(), baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniqueByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function assertPublicHttpTarget(url) {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw httpError(400, 'Only public http and https URLs can be imported.', 'invalid_protocol');
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw httpError(400, 'Private, local, or internal hosts cannot be imported.', 'private_host');
  }

  const literalFamily = net.isIP(hostname);
  let addresses;
  try {
    addresses = literalFamily
      ? [{ address: hostname, family: literalFamily }]
      : await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw httpError(400, 'The host could not be resolved publicly.', 'host_not_resolved');
  }

  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw httpError(400, 'Private-network targets cannot be imported.', 'private_network');
  }
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const parts = address.split('.').map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0 ||
      parts[0] >= 224
    );
  }
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:192.168.')
  );
}

function httpError(statusCode, message, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
