#!/usr/bin/env node
/*
 * Generate the crawlable English home page at site/index.html.
 *
 * The Chinese source page lives at site/zh/index.html. English is the default
 * language, so this script renders the source with ?lang=en and makes the
 * result self-canonical for /. Regenerate after changing site/zh/index.html or
 * site/app.js:
 *
 *   PLAYWRIGHT_PATH=/path/to/playwright CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/gen-en-site.cjs
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'site');
const OUT = path.join(ROOT, 'index.html');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
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

  const pageId = 'https://archray.dev/#webpage';
  const faqId = 'https://archray.dev/#faq';
  const breadcrumbId = 'https://archray.dev/#breadcrumb';
  const howtoId = 'https://archray.dev/#howto';

  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://archray.dev/#website',
        url: 'https://archray.dev/',
        name: 'ArchRay',
        description: 'AI-first layered architecture visualiser that turns real repository source into offline 3D/2D single-file HTML maps with file-and-line evidence.',
        inLanguage: ['en', 'zh-CN'],
        publisher: { '@id': 'https://archray.dev/#person' }
      },
      {
        '@type': 'Person',
        '@id': 'https://archray.dev/#person',
        name: 'David Yin',
        url: 'https://davidyin.dev',
        sameAs: ['https://github.com/loofare', 'https://davidyin.dev']
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://archray.dev/#software',
        name: 'ArchRay',
        description: 'AI-first codebase architecture visualiser for Claude Code, Cursor, Antigravity, Pi, and Codex that builds offline single-file 3D/2D HTML architecture maps grounded in verified source paths.',
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Architecture visualization and codebase mapping',
        operatingSystem: 'macOS, Linux, Windows',
        softwareVersion: '0.6.0',
        softwareRequirements: 'Node.js 20+',
        datePublished: '2026-11-17',
        dateModified: '2026-11-20',
        url: 'https://archray.dev/',
        image: 'https://archray.dev/share-en.png',
        screenshot: 'https://archray.dev/share-en.png',
        downloadUrl: 'https://github.com/loofare/ArchRay/releases/latest',
        releaseNotes: 'https://github.com/loofare/ArchRay/releases/tag/v0.6.0',
        codeRepository: 'https://github.com/loofare/ArchRay',
        license: 'https://opensource.org/license/mit',
        sameAs: ['https://github.com/loofare/ArchRay', 'https://archray.dev/'],
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD'
        },
        author: { '@id': 'https://archray.dev/#person' },
        featureList: [
          'L0-L9 layered 3D Spatial Atrium and 2D Bento architecture maps via deterministic ELK layout',
          'Zero-upload offline single-file HTML (.archray/index.html)',
          'Verified source paths and file:line evidence separating measured vs static estimates',
          'Architecture health hotspots and replaceability migration prompts',
          'Native integration for Claude Code, Cursor, Antigravity, Pi, and Codex',
          'Unclipped full-bounds PNG export and offline QR share posters',
          'Self-contained in-project SHA-256 update and clean uninstall'
        ]
      },
      {
        '@type': 'WebPage',
        '@id': pageId,
        url: 'https://archray.dev/',
        name: 'ArchRay — 3D Architecture Maps from Real Source Code',
        description: 'Run /archray in Claude Code, Cursor, Antigravity, Pi or Codex to turn real repository source into a layered, interactive 3D/2D map with file-and-line evidence.',
        inLanguage: 'en',
        datePublished: '2026-11-17',
        dateModified: '2026-11-20',
        isPartOf: { '@id': 'https://archray.dev/#website' },
        about: { '@id': 'https://archray.dev/#software' },
        breadcrumb: { '@id': breadcrumbId },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: 'https://archray.dev/share-en.png',
          width: 1200,
          height: 630
        },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['.hero-lead', '.faq-item summary', '.faq-item p']
        },
        mainEntity: { '@id': faqId }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ArchRay', item: 'https://archray.dev/' }
        ]
      },
      {
        '@type': 'HowTo',
        '@id': howtoId,
        name: 'How to generate an offline 3D architecture map from real source code with ArchRay',
        description: 'Install ArchRay into your repository root, run /archray in your AI coding agent, and open or share the self-contained single-file HTML view.',
        inLanguage: 'en',
        totalTime: 'PT2M',
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Install ArchRay in the target repository root',
            text: 'Run install.sh targeting your AI coding host (claude, cursor, antigravity, pi, codex, or all) to unpack the self-contained CLI and skill into .archray/tool.'
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Run /archray inside a fresh AI coding session',
            text: 'Invoke /archray (or $archray on Codex) so your coding agent reads real source code into .archray/graph.json and triggers ArchRay deterministic validation and build.'
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Explore layers offline and share',
            text: 'Open .archray/index.html directly over file://, filter across L0-L9 layers, inspect health hotspots and replaceability options, or export full-bounds PNGs and offline QR posters.'
          }
        ]
      },
      {
        '@type': 'FAQPage',
        '@id': faqId,
        inLanguage: 'en',
        isPartOf: { '@id': pageId },
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a }
        }))
      }
    ]
  };

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
    const launchOpts = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};
    browser = await chromium.launch(launchOpts);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/zh/?lang=en`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(500);

    const faqItems = await page.$$eval('.faq-item', (items) => items.map((item) => ({
      q: (item.querySelector('summary')?.textContent || '').trim(),
      a: (item.querySelector('p')?.textContent || '').trim()
    })));
    if (faqItems.length !== 10) throw new Error(`expected 10 FAQ items, got ${faqItems.length}`);

    let html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);
    // The font stylesheet starts as media="print" and flips to "all" on load;
    // normalize it so generation does not depend on whether the CDN responded.
    html = html.replace(/(<link[^>]*fonts\.googleapis\.com[^>]*?) media="print"/, '$1 media="all"');
    // Strip the heavy CJK Google Font request on the English page to improve LCP/FCP.
    html = html.replace(/&amp;family=Noto\+Sans\+SC:wght@300;400;500;600/g, '');
    html = html.replace(/&family=Noto\+Sans\+SC:wght@300;400;500;600/g, '');
    // Keep assets root-relative and canonical demo link clean on EN.
    html = html.replace(/(href|src)="\.\/([^"]*)"/g, '$1="/$2"');
    html = html.replaceAll('/demo?locale=zh-CN', '/demo');

    const { match, serialized } = schemaFor(html, faqItems);
    html = html.replace(match[0], `<script type="application/ld+json">\n${serialized}\n  </script>`);
    html = html.replace('<!doctype html>', '<!doctype html>\n<!-- Generated from site/zh/index.html by scripts/gen-en-site.cjs. Do not edit directly. -->');

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
