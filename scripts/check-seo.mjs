#!/usr/bin/env node
/**
 * Comprehensive SEO + GEO integrity check across site/.
 * Run: node scripts/check-seo.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const ORIGIN = 'https://archray.dev';
const failures = [];

function fail(msg) {
  failures.push(msg);
}

function walkHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function urlForFile(filePath) {
  const rel = path.relative(SITE, filePath).replaceAll(path.sep, '/');
  if (rel === 'index.html') return `${ORIGIN}/`;
  if (rel === 'demo.html') return `${ORIGIN}/demo`;
  if (rel.endsWith('/index.html')) return `${ORIGIN}/${rel.slice(0, -'index.html'.length)}`;
  return `${ORIGIN}/${rel}`;
}

function unescapeAttr(s) {
  return s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

function resolveInternalTarget(rawRef) {
  const clean = unescapeAttr(rawRef.split('#')[0].split('?')[0]);
  if (!clean.startsWith('/')) return true;
  if (clean === '/') return existsSync(path.join(SITE, 'index.html'));
  if (clean === '/demo') return existsSync(path.join(SITE, 'demo.html'));
  const rel = clean.slice(1);
  if (clean.endsWith('/')) return existsSync(path.join(SITE, rel, 'index.html'));
  return existsSync(path.join(SITE, rel)) || existsSync(path.join(SITE, `${rel}.html`)) || existsSync(path.join(SITE, rel, 'index.html'));
}

// 1. Check required GEO & technical SEO files
for (const reqFile of ['robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt', 'llms-zh.txt', '_headers', '_redirects', 'manifest.webmanifest', '404.html', 'share.png', 'share-en.png', 'favicon.svg']) {
  if (!existsSync(path.join(SITE, reqFile))) fail(`Missing required site file: site/${reqFile}`);
}

if (existsSync(path.join(SITE, 'en', 'index.html'))) {
  fail('Deprecated site/en/index.html still exists — remove it so /en/ uses HTTP 301 _redirects.');
}

const redirects = existsSync(path.join(SITE, '_redirects')) ? readFileSync(path.join(SITE, '_redirects'), 'utf8') : '';
if (!/\/en\s+\/\s+301/.test(redirects) || !/\/en\/\s+\/\s+301/.test(redirects)) {
  fail('site/_redirects missing 301 rules for /en and /en/.');
}

// 2. Parse sitemap.xml
const sitemapXml = readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
const sitemapUrls = new Set([...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim()));

// 3. Audit every HTML file in site/
const htmlFiles = walkHtml(SITE).sort();
const seenTitles = new Map();
const seenDescs = new Map();
const bilingualPairs = new Map();
const indexableUrls = new Set();

for (const file of htmlFiles) {
  const rel = path.relative(SITE, file).replaceAll(path.sep, '/');
  if (/^(?:baidu_verify_[^/]+\.html|google[0-9a-f]+\.html)$/i.test(rel)) continue;
  const html = readFileSync(file, 'utf8');

  if (rel === '404.html') {
    if (!/<meta\s+name="robots"\s+content="noindex,\s*follow"/i.test(html)) {
      fail('site/404.html must contain <meta name="robots" content="noindex, follow">');
    }
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    if (h1Count !== 1) fail(`site/404.html expected 1 <h1>, got ${h1Count}`);
    continue;
  }

  const expectedUrl = urlForFile(file);
  indexableUrls.add(expectedUrl);

  const langMatch = html.match(/<html\b[^>]*\blang="([^"]+)"/i);
  const lang = langMatch?.[1] || '';

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = unescapeAttr((titleMatch?.[1] || '').trim());
  if (!title) fail(`${rel}: missing <title>`);
  else if (seenTitles.has(title)) fail(`${rel}: duplicate <title> with ${seenTitles.get(title)} ("${title}")`);
  else seenTitles.set(title, rel);

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const desc = unescapeAttr((descMatch?.[1] || '').trim());
  const minDescLen = lang.startsWith('zh') ? 45 : 70;
  if (!desc) fail(`${rel}: missing meta description`);
  else if (desc.length < minDescLen || desc.length > 170) fail(`${rel}: meta description length ${desc.length} outside [${minDescLen}, 170]`);
  else if (seenDescs.has(desc)) fail(`${rel}: duplicate meta description with ${seenDescs.get(desc)}`);
  else seenDescs.set(desc, rel);

  const canMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  if (!canMatch) fail(`${rel}: missing canonical link`);
  else if (canMatch[1] !== expectedUrl) fail(`${rel}: canonical "${canMatch[1]}" !== expected "${expectedUrl}"`);

  // Strip embedded <script> before counting <h1> and checking attributes on large bundled demo.html
  const headAndBodyNoScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const h1Count = (headAndBodyNoScripts.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) fail(`${rel}: expected 1 <h1>, got ${h1Count}`);

  for (const tagCheck of [
    ['meta property="og:title"', /<meta\s+property="og:title"\s+content="[^"]+"/i],
    ['meta property="og:description"', /<meta\s+property="og:description"\s+content="[^"]+"/i],
    ['meta property="og:url"', /<meta\s+property="og:url"\s+content="[^"]+"/i],
    ['meta property="og:image"', /<meta\s+property="og:image"\s+content="https:\/\/archray\.dev\/share(?:-en)?\.png"/i],
    ['meta name="twitter:card"', /<meta\s+name="twitter:card"\s+content="summary_large_image"/i],
    ['meta name="twitter:image"', /<meta\s+name="twitter:image"\s+content="https:\/\/archray\.dev\/share(?:-en)?\.png"/i],
    ['meta name="twitter:image:alt"', /<meta\s+name="twitter:image:alt"\s+content="[^"]+"/i]
  ]) {
    if (!tagCheck[1].test(html)) fail(`${rel}: missing ${tagCheck[0]}`);
  }

  // Validate all JSON-LD blocks
  const jsonLdBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (!jsonLdBlocks.length) fail(`${rel}: missing JSON-LD structured data`);
  for (const [, raw] of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed['@context'] || !Array.isArray(parsed['@graph']) || !parsed['@graph'].length) {
        fail(`${rel}: JSON-LD missing @context or non-empty @graph`);
      }
    } catch (e) {
      fail(`${rel}: invalid JSON-LD (${e.message})`);
    }
  }

  // Collect hreflang alternates for symmetry checks (skipping /demo which is language-agnostic)
  if (expectedUrl !== `${ORIGIN}/demo`) {
    const alts = {};
    for (const m of html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/gi)) {
      alts[m[1]] = m[2];
    }
    if (!alts.en || !alts['zh-CN'] || !alts['x-default']) {
      fail(`${rel}: missing complete hreflang set (en, zh-CN, x-default)`);
    } else {
      bilingualPairs.set(expectedUrl, alts);
    }
  }

  // Check internal links in non-script markup
  for (const m of headAndBodyNoScripts.matchAll(/\b(?:href|src)="(\/[^"]*)"/gi)) {
    const target = m[1];
    if (!resolveInternalTarget(target)) {
      fail(`${rel}: broken internal asset/link "${target}"`);
    }
  }

  if (!sitemapUrls.has(expectedUrl)) {
    fail(`${rel}: canonical URL ${expectedUrl} missing from sitemap.xml`);
  }
}

for (const u of sitemapUrls) {
  if (!indexableUrls.has(u)) {
    fail(`sitemap.xml contains URL with no matching indexable HTML file: ${u}`);
  }
}

for (const [url, alts] of bilingualPairs) {
  const counterUrl = alts.en === url ? alts['zh-CN'] : alts.en;
  const counterAlts = bilingualPairs.get(counterUrl);
  if (!counterAlts) {
    fail(`hreflang target ${counterUrl} referenced by ${url} has no parsed alternates`);
  } else if (counterAlts.en !== alts.en || counterAlts['zh-CN'] !== alts['zh-CN'] || counterAlts['x-default'] !== alts['x-default']) {
    fail(`hreflang mismatch between ${url} and ${counterUrl}`);
  }
}

if (failures.length) {
  console.error(`SEO/GEO check failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`check-seo: OK (${indexableUrls.size} indexable pages + 404.html, ${sitemapUrls.size} sitemap URLs, ${bilingualPairs.size / 2} symmetric bilingual pairs)`);
