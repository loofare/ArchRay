#!/usr/bin/env node
/*
 * Generate the crawlable English entry point at site/en/index.html.
 *
 * The site keeps one interactive source page, so the English page is rendered
 * from the same source with ?lang=en, then its metadata and JSON-LD are made
 * self-canonical for /en/. Regenerate after changing site/index.html or
 * site/app.js:
 *
 *   PLAYWRIGHT_PATH=/path/to/playwright node scripts/gen-en-site.cjs
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'site');
const OUT = path.join(ROOT, 'en', 'index.html');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let pathname = decodeURIComponent((req.url || '/').split('?')[0]);
        if (pathname.endsWith('/')) pathname += 'index.html';
        const file = path.join(ROOT, pathname);
        if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
          res.writeHead(403); res.end('forbidden'); return;
        }
        fs.readFile(file, (err, data) => {
          if (err) { res.writeHead(404); res.end('not found'); return; }
          res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
          res.end(data);
        });
      } catch {
        res.writeHead(400); res.end('bad request');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function schemaFor(html, faqItems) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('JSON-LD block not found');
  const data = JSON.parse(match[1]);
  const graph = data['@graph'];
  const website = graph.find((entry) => entry['@type'] === 'WebSite');
  const faq = graph.find((entry) => entry['@type'] === 'FAQPage');
  if (!website || !faq) throw new Error('Website or FAQ schema missing');

  const pageId = 'https://archray.dev/en/#webpage';
  const faqId = 'https://archray.dev/en/#faq';
  faq['@id'] = faqId;
  faq.inLanguage = 'en';
  faq.isPartOf = { '@id': pageId };
  faq.mainEntity = faqItems.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a }
  }));

  const webPage = {
    '@type': 'WebPage',
    '@id': pageId,
    url: 'https://archray.dev/en/',
    name: 'ArchRay — 3D Architecture Maps with Source Evidence for AI Coding Agents',
    description: 'ArchRay is an AI-first architecture visualiser: type /archray in Claude Code, Cursor, Antigravity, Pi or Codex, read real repository source, and get a layered, interactive, offline 3D/2D single-file HTML map.',
    inLanguage: 'en',
    isPartOf: { '@id': 'https://archray.dev/#website' },
    about: { '@id': 'https://archray.dev/#software' },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: 'https://archray.dev/og.png',
      width: 1200,
      height: 630
    },
    mainEntity: { '@id': faqId }
  };

  // Keep WebSite/Person/SoftwareApplication first; add the page and keep FAQ last.
  const ordered = graph.filter((entry) => entry !== faq);
  ordered.push(webPage, faq);
  data['@graph'] = ordered;
  return { match, serialized: JSON.stringify(data, null, 2) };
}

(async () => {
  let chromium;
  try {
    ({ chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright'));
  } catch {
    console.error('Playwright is required. Set PLAYWRIGHT_PATH to the module directory.');
    process.exit(1);
  }

  const server = await startServer();
  const port = server.address().port;
  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/?lang=en`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(500);

    const faqItems = await page.$$eval('.faq-item', (items) => items.map((item) => ({
      q: (item.querySelector('summary')?.textContent || '').trim(),
      a: (item.querySelector('p')?.textContent || '').trim()
    })));
    if (faqItems.length !== 6) throw new Error(`expected 6 FAQ items, got ${faqItems.length}`);

    let html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);
    // The source page already uses root-relative assets; keep the generated
    // page independent of /en/ depth if a future edit reintroduces ./ paths.
    html = html.replace(/(href|src)="\.\/([^"]*)"/g, '$1="/$2"');
    html = html.replaceAll('https://archray.dev/?lang=en', 'https://archray.dev/en/');
    html = html.replaceAll('/demo.html?lang=zh-CN', '/demo.html?lang=en');

    const { match, serialized } = schemaFor(html, faqItems);
    html = html.replace(match[0], `<script type="application/ld+json">\n${serialized}\n  </script>`);
    html = html.replace('<!doctype html>', '<!doctype html>\n<!-- Generated from site/index.html by scripts/gen-en-site.cjs. Do not edit directly. -->');

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, html);
    console.log(`wrote ${path.relative(process.cwd(), OUT)} (${Buffer.byteLength(html)} bytes, ${faqItems.length} FAQs)`);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
