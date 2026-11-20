#!/usr/bin/env node
/**
 * Generate bilingual Light/Dark architectural SVG diagrams and real live sandbox
 * screenshots for README.md and README.en.md under docs/assets/readme/.
 *
 * Run:
 *   PLAYWRIGHT_PATH=/path/to/playwright CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/gen-readme-assets.cjs
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(ROOT, 'docs', 'assets', 'readme');
const SHOTS = path.join(OUT, 'screenshots');

const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function themeTokens(mode) {
  if (mode === 'dark') {
    return {
      canvas: '#0D1117',
      frameBorder: '#30363D',
      card: '#161B22',
      cardSoft: '#1C2230',
      spineCard: '#171C2E',
      amberTint: '#262012',
      amberBorder: '#D9A73E',
      amberText: '#FBBF24',
      emeraldTint: '#11251E',
      emeraldBorder: '#10B981',
      emeraldText: '#34D399',
      cyanBorder: '#38BDF8',
      cyanTint: '#11202B',
      cyanText: '#7DD3FC',
      indigoBorder: '#818CF8',
      pinkBorder: '#EC4899',
      pinkTint: '#261423',
      pinkText: '#F472B6',
      purpleBorder: '#C084FC',
      purpleTint: '#1F1630',
      purpleText: '#D8B4FE',
      slateBorder: '#64748B',
      inkStrong: '#F3F4F6',
      inkMuted: '#9CA3AF',
      codeBg: '#0B1020',
      arrow: '#E8BA55'
    };
  }
  return {
    canvas: '#F7F5F0',
    frameBorder: '#DFDDD5',
    card: '#FFFFFF',
    cardSoft: '#FAF9F5',
    spineCard: '#F4F5FF',
    amberTint: '#FDF8EB',
    amberBorder: '#D9A73E',
    amberText: '#9A6B12',
    emeraldTint: '#ECFDF5',
    emeraldBorder: '#10B981',
    emeraldText: '#047857',
    cyanBorder: '#0284C7',
    cyanTint: '#F0F9FF',
    cyanText: '#0369A1',
    indigoBorder: '#6366F1',
    pinkBorder: '#DB2777',
    pinkTint: '#FDF2F8',
    pinkText: '#BE185D',
    purpleBorder: '#9333EA',
    purpleTint: '#FAF5FF',
    purpleText: '#7E22CE',
    slateBorder: '#64748B',
    inkStrong: '#12110E',
    inkMuted: '#57534E',
    codeBg: '#F1EFEA',
    arrow: '#C28A20'
  };
}

function buildPipelineSvg(lang, mode) {
  const c = themeTokens(mode);
  const zh = lang === 'zh';

  const steps = zh
    ? [
        { num: '01', title: '真实仓库源码', sub: '源码 · 路由 · 依赖 · 配置', chip: 'git repo / src/**', accent: c.cyanBorder, fill: c.card },
        { num: '02', title: 'AI 宿主读码建模', sub: '输入 /archray 或 $archray', chip: '.archray/graph.json', accent: c.amberBorder, fill: c.amberTint },
        { num: '03', title: 'ELK 确定性排版', sub: 'Schema 校验 · 四象限路由', chip: '167 logos · 0 overlaps', accent: c.indigoBorder, fill: c.card },
        { num: '04', title: '单文件离线交互图', sub: '3D · 2D · 健康度 · 平替', chip: '.archray/index.html', accent: c.emeraldBorder, fill: c.emeraldTint }
      ]
    : [
        { num: '01', title: 'Real Source Repo', sub: 'Files · Routes · Imports · Config', chip: 'git repo / src/**', accent: c.cyanBorder, fill: c.card },
        { num: '02', title: 'AI Coding Agent', sub: 'Run /archray or $archray', chip: '.archray/graph.json', accent: c.amberBorder, fill: c.amberTint },
        { num: '03', title: 'Deterministic ELK', sub: 'TypeBox · 4-Quadrant Engine', chip: '167 logos · 0 overlaps', accent: c.indigoBorder, fill: c.card },
        { num: '04', title: 'Offline Single HTML', sub: '3D · 2D · Health · Replace', chip: '.archray/index.html', accent: c.emeraldBorder, fill: c.emeraldTint }
      ];

  const footerText = zh
    ? '100% 本地构建与双击查看（file://）  ·  0 字节业务源码或图谱上传外部服务器'
    : '100% Local Build & Browser Viewing (file://)  ·  Zero Bytes of Source Code Uploaded to External Servers';

  const boxW = 240;
  const gap = 28;
  const startX = 38;
  const topY = 26;
  const boxH = 148;

  const cards = steps.map((st, idx) => {
    const x = startX + idx * (boxW + gap);
    const arrow = idx < steps.length - 1
      ? `<g>
  <line x1="${x + boxW + 4}" y1="${topY + boxH / 2}" x2="${x + boxW + gap - 6}" y2="${topY + boxH / 2}" stroke="${c.arrow}" stroke-width="2" />
  <polygon points="${x + boxW + gap - 10},${topY + boxH / 2 - 5} ${x + boxW + gap - 2},${topY + boxH / 2} ${x + boxW + gap - 10},${topY + boxH / 2 + 5}" fill="${c.arrow}" />
</g>`
      : '';

    return `<g>
  <rect x="${x}" y="${topY}" width="${boxW}" height="${boxH}" rx="12" fill="${st.fill}" stroke="${st.accent}" stroke-width="1.4" />
  <rect x="${x + 16}" y="${topY + 16}" width="32" height="20" rx="5" fill="${c.codeBg}" stroke="${st.accent}" stroke-opacity="0.5" stroke-width="1" />
  <text x="${x + 32}" y="${topY + 30}" text-anchor="middle" fill="${c.inkStrong}" font-family="${FONT_MONO}" font-size="11" font-weight="700">${st.num}</text>
  <text x="${x + 16}" y="${topY + 62}" fill="${c.inkStrong}" font-family="${FONT_SANS}" font-size="16" font-weight="700">${esc(st.title)}</text>
  <text x="${x + 16}" y="${topY + 86}" fill="${c.inkMuted}" font-family="${FONT_SANS}" font-size="12.5">${esc(st.sub)}</text>
  <rect x="${x + 16}" y="${topY + 106}" width="${boxW - 32}" height="26" rx="6" fill="${c.codeBg}" />
  <text x="${x + 26}" y="${topY + 123}" fill="${c.inkStrong}" font-family="${FONT_MONO}" font-size="11.5" font-weight="600">${esc(st.chip)}</text>
</g>${arrow}`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 242" width="1120" height="242" fill="none">
  <rect x="0.5" y="0.5" width="1119" height="241" rx="16" fill="${c.canvas}" stroke="${c.frameBorder}" />
  ${cards}
  <rect x="38" y="192" width="1044" height="32" rx="8" fill="${c.emeraldTint}" stroke="${c.emeraldBorder}" stroke-opacity="0.65" stroke-width="1" />
  <circle cx="58" cy="208" r="4" fill="${c.emeraldBorder}" />
  <text x="72" y="212.5" fill="${c.emeraldText}" font-family="${FONT_SANS}" font-size="12.5" font-weight="600">${esc(footerText)}</text>
</svg>
`;
}

function buildLayersSvg(lang, mode) {
  const c = themeTokens(mode);
  const zh = lang === 'zh';

  const headerTitle = zh
    ? 'L0–L9 空间四象限拓扑分层规范（点击或 --layers 参数秒级切片）'
    : 'L0–L9 Spatial 4-Quadrant Zoning & CLI Layer Slicing (--layers)';
  const headerSub = zh
    ? '自动分离客户端、中央主塔、异步/AI 侧翼、外部 SaaS 与底层存储'
    : 'Separates ingress, central domain tower, async/AI wings, external orbits & storage plinth';

  const topItems = zh
    ? [
        { id: 'L0 · client', name: '前端与客户端', sub: 'Next.js · Vue · React Native · CLI', x: 38 },
        { id: 'L1 · edge', name: '边缘与接入网络', sub: 'Cloudflare · Nginx · Envoy · CDN', x: 392 },
        { id: 'L2 · gateway', name: '安全与网关层', sub: 'Kong · Auth · Clerk · Rate Limit', x: 746 }
      ]
    : [
        { id: 'L0 · client', name: 'Client & UI Surfaces', sub: 'Next.js · Vue · React Native · CLI', x: 38 },
        { id: 'L1 · edge', name: 'Edge & Ingress Buffer', sub: 'Cloudflare · Nginx · Envoy · CDN', x: 392 },
        { id: 'L2 · gateway', name: 'Auth & API Gateway', sub: 'Kong · Better Auth · Clerk · JWT', x: 746 }
      ];

  const topCards = topItems.map((it) => `<g>
  <rect x="${it.x}" y="62" width="336" height="72" rx="10" fill="${c.cyanTint}" stroke="${c.cyanBorder}" stroke-width="1.3" />
  <text x="${it.x + 16}" y="86" fill="${c.cyanText}" font-family="${FONT_MONO}" font-size="11.5" font-weight="700">${esc(it.id)}</text>
  <text x="${it.x + 16}" y="106" fill="${c.inkStrong}" font-family="${FONT_SANS}" font-size="14.5" font-weight="700">${esc(it.name)}</text>
  <text x="${it.x + 16}" y="124" fill="${c.inkMuted}" font-family="${FONT_SANS}" font-size="11.5">${esc(it.sub)}</text>
</g>`).join('\n');

  const leftTitle1 = zh ? 'L4 · async（异步侧翼 -X）' : 'L4 · async (Left Wing -X)';
  const leftSub1 = zh ? '队列 · 消费者 · WebSocket（BullMQ / Kafka）' : 'Queues · Workers · WebSocket (BullMQ / Kafka)';
  const leftTitle2 = zh ? 'L6 · ai（智能侧翼 -X）' : 'L6 · ai (AI Wing -X)';
  const leftSub2 = zh ? 'LLM 网关 · 向量索引（Claude / Gemini / pgvector）' : 'LLM Gateways · Claude · Qdrant · pgvector';

  const centerTag = zh ? 'L3 · service（中央业务主塔）' : 'L3 · service (Central Domain Spine)';
  const centerTitle = zh ? '核心领域微服务 & REST / GraphQL / gRPC' : 'Core Domain Services & APIs';
  const centerSub1 = zh ? 'NestJS · FastAPI · Spring Boot · Go' : 'NestJS · FastAPI · Spring Boot · Go';
  const centerSub2 = zh ? '密集子模块默认 +N 折叠 · 自动保留 1 跳上下文' : 'Subpackages fold (+N) · 1-hop context kept';

  const rightTitle = zh ? 'L7 · external（右侧轨 +X）' : 'L7 · external (Right Orbit +X)';
  const rightName = zh ? '外部 SaaS 与三方接口' : 'External SaaS & 3rd-Party APIs';
  const rightSub = zh ? 'Stripe · Resend · Twilio · Webhook' : 'Stripe · Resend · Twilio · OAuth SaaS';

  const baseItems = zh
    ? [
        { id: 'L5 · data', name: '数据与持久存储', sub: 'PostgreSQL · Redis · ES · S3（存储圆柱底座）', fill: c.emeraldTint, border: c.emeraldBorder, text: c.emeraldText, x: 38 },
        { id: 'L8 · platform', name: '平台与部署基座', sub: 'Docker · Kubernetes · Terraform · CI/CD', fill: c.card, border: c.slateBorder, text: c.inkMuted, x: 392 },
        { id: 'L9 · observability', name: '可观测性与审计', sub: 'OpenTelemetry · Prometheus · Grafana · Sentry', fill: c.card, border: c.slateBorder, text: c.inkMuted, x: 746 }
      ]
    : [
        { id: 'L5 · data', name: 'Data & Storage Plinth', sub: 'PostgreSQL · Redis · Elasticsearch · S3', fill: c.emeraldTint, border: c.emeraldBorder, text: c.emeraldText, x: 38 },
        { id: 'L8 · platform', name: 'Platform & Infra Ops', sub: 'Docker · Kubernetes · Terraform · CI/CD', fill: c.card, border: c.slateBorder, text: c.inkMuted, x: 392 },
        { id: 'L9 · observability', name: 'Observability & Telemetry', sub: 'OpenTelemetry · Prometheus · Grafana · Sentry', fill: c.card, border: c.slateBorder, text: c.inkMuted, x: 746 }
      ];

  const baseCards = baseItems.map((it) => `<g>
  <rect x="${it.x}" y="294" width="336" height="70" rx="10" fill="${it.fill}" stroke="${it.border}" stroke-width="1.3" />
  <text x="${it.x + 16}" y="317" fill="${it.text}" font-family="${FONT_MONO}" font-size="11.5" font-weight="700">${esc(it.id)}</text>
  <text x="${it.x + 16}" y="337" fill="${c.inkStrong}" font-family="${FONT_SANS}" font-size="14.5" font-weight="700">${esc(it.name)}</text>
  <text x="${it.x + 16}" y="354" fill="${c.inkMuted}" font-family="${FONT_SANS}" font-size="11.5">${esc(it.sub)}</text>
</g>`).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 388" width="1120" height="388" fill="none">
  <rect x="0.5" y="0.5" width="1119" height="387" rx="16" fill="${c.canvas}" stroke="${c.frameBorder}" />
  <text x="38" y="34" fill="${c.inkStrong}" font-family="${FONT_SANS}" font-size="16" font-weight="700">${esc(headerTitle)}</text>
  <text x="1082" y="34" text-anchor="end" fill="${c.inkMuted}" font-family="${FONT_SANS}" font-size="12">${esc(headerSub)}</text>

  ${topCards}

  <!-- Vertical conduits from Entry -> Core & Wings -->
  <line x1="206" y1="134" x2="206" y2="150" stroke="${c.arrow}" stroke-width="1.5" stroke-dasharray="3 3" />
  <line x1="560" y1="134" x2="560" y2="150" stroke="${c.arrow}" stroke-width="1.8" />
  <line x1="914" y1="134" x2="914" y2="150" stroke="${c.pinkBorder}" stroke-width="1.5" stroke-dasharray="4 3" />

  <!-- Left Wing (-X): Async + AI -->
  <rect x="38" y="150" width="336" height="58" rx="10" fill="${c.amberTint}" stroke="${c.amberBorder}" stroke-width="1.3" />
  <text x="54" y="173" fill="${c.amberText}" font-family="${FONT_MONO}" font-size="11.5" font-weight="700">${esc(leftTitle1)}</text>
  <text x="54" y="194" fill="${c.inkStrong}" font-family="${FONT_SANS}" font-size="12.5">${esc(leftSub1)}</text>

  <rect x="38" y="218" width="336" height="58" rx="10" fill="${c.purpleTint}" stroke="${c.purpleBorder}" stroke-width="1.3" />
  <text x="54" y="241" fill="${c.purpleText}" font-family="${FONT_MONO}" font-size="11.5" font-weight="700">${esc(leftTitle2)}</text>
  <text x="54" y="262" fill="${c.inkStrong}" font-family="${FONT_SANS}" font-size="12.5">${esc(leftSub2)}</text>

  <!-- Central Tower Spine: Core Domain Services -->
  <rect x="392" y="150" width="336" height="126" rx="12" fill="${c.spineCard}" stroke="${c.indigoBorder}" stroke-width="1.6" />
  <text x="410" y="176" fill="${c.indigoBorder}" font-family="${FONT_MONO}" font-size="12" font-weight="700">${esc(centerTag)}</text>
  <text x="410" y="203" fill="${c.inkStrong}" font-family="${FONT_SANS}" font-size="15.5" font-weight="700">${esc(centerTitle)}</text>
  <text x="410" y="228" fill="${c.inkMuted}" font-family="${FONT_MONO}" font-size="12">${esc(centerSub1)}</text>
  <text x="410" y="254" fill="${c.inkMuted}" font-family="${FONT_SANS}" font-size="12">${esc(centerSub2)}</text>

  <!-- Horizontal Connectors Left <-> Spine <-> Right -->
  <line x1="374" y1="213" x2="392" y2="213" stroke="${c.arrow}" stroke-width="1.8" />
  <line x1="728" y1="213" x2="746" y2="213" stroke="${c.pinkBorder}" stroke-width="1.8" stroke-dasharray="4 3" />

  <!-- Right Orbit (+X): External SaaS -->
  <rect x="746" y="150" width="336" height="126" rx="12" fill="${c.pinkTint}" stroke="${c.pinkBorder}" stroke-dasharray="6 4" stroke-width="1.4" />
  <text x="764" y="176" fill="${c.pinkText}" font-family="${FONT_MONO}" font-size="12" font-weight="700">${esc(rightTitle)}</text>
  <text x="764" y="204" fill="${c.inkStrong}" font-family="${FONT_SANS}" font-size="15.5" font-weight="700">${esc(rightName)}</text>
  <text x="764" y="232" fill="${c.inkMuted}" font-family="${FONT_SANS}" font-size="12.5">${esc(rightSub)}</text>

  <!-- Conduits Core -> Data & Base -->
  <line x1="206" y1="276" x2="206" y2="294" stroke="${c.emeraldBorder}" stroke-width="1.8" />
  <line x1="560" y1="276" x2="560" y2="294" stroke="${c.slateBorder}" stroke-width="1.5" />
  <line x1="914" y1="276" x2="914" y2="294" stroke="${c.slateBorder}" stroke-width="1.5" stroke-dasharray="3 3" />

  ${baseCards}
</svg>
`;
}

function writeAllSvgs() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });

  for (const lang of ['zh', 'en']) {
    for (const mode of ['light', 'dark']) {
      fs.writeFileSync(path.join(OUT, `pipeline-${lang}-${mode}.svg`), buildPipelineSvg(lang, mode), 'utf8');
      fs.writeFileSync(path.join(OUT, `layers-${lang}-${mode}.svg`), buildLayersSvg(lang, mode), 'utf8');
    }
  }
  console.log('Generated 8 bilingual light/dark architectural SVG diagrams in docs/assets/readme/');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let pathname = decodeURIComponent((req.url || '/').split('?')[0]);
      if (pathname === '/demo') pathname = '/demo.html';
      else if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.join(SITE, pathname);
      if (!file.startsWith(SITE + path.sep) && file !== SITE) {
        res.writeHead(403); res.end('forbidden'); return;
      }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function captureScreenshots() {
  if (process.argv.includes('--svg-only')) return;

  let chromium;
  try {
    ({ chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright'));
  } catch {
    console.error('Playwright is required to capture screenshots. Set PLAYWRIGHT_PATH or run with --svg-only.');
    process.exit(1);
  }

  const server = await startServer();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/demo`;
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

  const shots = [
    { name: 'demo-3d-zh.png', query: '?locale=zh-CN&projection=3d&lens=topology' },
    { name: 'demo-3d-en.png', query: '?locale=en&projection=3d&lens=topology' },
    { name: 'demo-2d-zh.png', query: '?locale=zh-CN&projection=2d&lens=topology' },
    { name: 'demo-2d-en.png', query: '?locale=en&projection=2d&lens=topology' },
    { name: 'demo-health-zh.png', query: '?locale=zh-CN&projection=3d&lens=health' },
    { name: 'demo-health-en.png', query: '?locale=en&projection=3d&lens=health' },
    { name: 'demo-replace-zh.png', query: '?locale=zh-CN&projection=3d&lens=replaceability', clickAuth: true },
    { name: 'demo-replace-en.png', query: '?locale=en&projection=3d&lens=replaceability', clickAuth: true }
  ];

  try {
    for (const s of shots) {
      const ctx = await browser.newContext({
        viewport: { width: 1400, height: 840 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce'
      });
      const page = await ctx.newPage();
      await page.goto(base + s.query, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('[data-node="order"]', { timeout: 15000 });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(900);

      if (s.clickAuth) {
        const authNode = page.locator('[data-node="auth"]');
        if (await authNode.count()) {
          await authNode.first().click();
          await page.waitForTimeout(450);
        }
      }

      // Park cursor in empty corner so transient button tooltips do not overlap the capture
      await page.mouse.move(10, 10);
      await page.waitForTimeout(200);

      await page.screenshot({ path: path.join(SHOTS, s.name) });
      console.log(`Captured docs/assets/readme/screenshots/${s.name}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

(async () => {
  writeAllSvgs();
  await captureScreenshots();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
