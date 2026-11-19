/**
 * Optional browser acceptance for the built single-file viewer.
 *
 * Requires Playwright (not a project dependency):
 *   npm i -D playwright && npx playwright install chromium
 *   # or point at an existing install / an already installed browser:
 *   PLAYWRIGHT_PATH=/path/to/playwright CHROME_PATH="/path/to/Chrome" \
 *     node scripts/browser-check.cjs
 *
 * Builds examples/freshmart.graph.json into .archray/browser-check/, runs the
 * desktop, invalid-view, narrow-screen and offline checks, and writes screenshots.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    if (process.env.PLAYWRIGHT_PATH) return require(process.env.PLAYWRIGHT_PATH);
    throw new Error('Playwright is not installed. Install it or set PLAYWRIGHT_PATH.');
  }
}

const { chromium } = loadPlaywright();
// Reuse an already installed browser instead of downloading Playwright's own.
const launchOptions = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '.archray', 'browser-check');
const shots = path.join(outDir, 'shots');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(shots, { recursive: true });

const built = spawnSync(process.execPath, ['cli/bin/archray.mjs', 'build', 'examples/freshmart.graph.json', '--output', path.join(outDir, 'index.html'), '--force', '--no-open'], { cwd: root, encoding: 'utf8' });
assert.equal(built.status, 0, built.stderr);
const FILE = `file://${path.join(outDir, 'index.html')}`;

(async () => {
  const browser = await chromium.launch(launchOptions);
  const errors = [];
  const external = [];

  const open = async (viewport, query = '', init, file = FILE, contextOptions = {}) => {
    const page = await browser.newPage({ viewport, locale: 'en-US', ...contextOptions });
    page.on('pageerror', (e) => { errors.push(`${query} ${e.message}`); console.error('PAGEERROR', query, e.message); });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${query} console: ${m.text()}`); });
    page.on('request', (r) => {
      const url = r.url();
      if (!url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('blob:')) external.push(url);
    });
    if (init) await page.addInitScript(init);
    await page.goto(file + query);
    await page.waitForSelector('#archray-scene', { timeout: 15000 });
    await page.waitForTimeout(900);
    return page;
  };
  const box = (page, sel) => page.locator(sel).boundingBox();

  /* ------------------------------------------------------------ desktop */
  let page = await open({ width: 1440, height: 900 });
  const canvas0 = await box(page, '.ar-canvas');
  assert.ok(canvas0.width > 1200 && canvas0.height > 500, `desktop canvas ${JSON.stringify(canvas0)}`);
  assert.equal(await page.locator('[data-node]').count() > 0, true, '3D scene draws content');
  assert.equal(await page.locator('.ar-shell').getAttribute('data-projection'), '3d', 'default projection is 3D space');

  // Switch to 2D Bento view for SVG zoom/rotate/minimap/motion checks.
  await page.click('.ar-mode-dock button:has-text("2D")');
  await page.waitForTimeout(450);
  assert.equal(await page.locator('.ar-shell').getAttribute('data-projection'), '2d', 'switches cleanly to 2D map');

  // Metric help dot tooltip & dismissible/restorable insights panel
  await page.locator('.ar-help-dot').first().click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.ar-metric-tip').count(), 1, 'help dot opens metric explanation card');
  await page.keyboard.press('Escape');
  await page.click('.ar-lens:has-text("Health")');
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.ar-insight').count(), 1, 'health overview opens');
  await page.click('.ar-insight-close');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.ar-insight').count(), 0, 'health overview can be dismissed');
  assert.equal(await page.locator('.ar-insight-restore').count(), 1, 'restore pill allows reopening');
  await page.click('.ar-insight-restore');
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.ar-insight').count(), 1, 'health overview reopens cleanly');
  await page.click('.ar-lens:has-text("Topology")');
  await page.waitForTimeout(150);

  const zoom0 = Number(await page.locator('.ar-shell').getAttribute('data-zoom'));
  const wheelAt = await box(page, '#archray-scene');
  await page.mouse.move(wheelAt.x + wheelAt.width * 0.55, wheelAt.y + wheelAt.height * 0.45);
  await page.mouse.wheel(0, -320);
  await page.waitForTimeout(350);
  assert.ok(Number(await page.locator('.ar-shell').getAttribute('data-zoom')) > zoom0, 'wheel zoom changes the camera');
  const rotate0 = Number(await page.locator('.ar-shell').getAttribute('data-rotate'));
  await page.mouse.move(wheelAt.x + wheelAt.width * 0.5, wheelAt.y + wheelAt.height * 0.5);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(wheelAt.x + wheelAt.width * 0.62, wheelAt.y + wheelAt.height * 0.5, { steps: 6 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(250);
  assert.ok(Math.abs(Number(await page.locator('.ar-shell').getAttribute('data-rotate')) - rotate0) > 1, 'right-drag rotates the scene');
  const camera0 = await page.locator('.ar-shell').getAttribute('data-camera');
  const mm = await box(page, '.ar-minimap svg');
  await page.mouse.click(mm.x + mm.width * 0.18, mm.y + mm.height * 0.18);
  await page.waitForTimeout(250);
  assert.notEqual(await page.locator('.ar-shell').getAttribute('data-camera'), camera0, 'minimap click moves the camera');
  await page.click('button:has-text("Fit")');
  await page.waitForTimeout(250);

  // Styles, brand icons, and motion levels via VisionOS display popover
  await page.click('.ar-more-trigger');
  await page.click('.ar-popover button:has-text("Blueprint")');
  await page.waitForTimeout(350);
  assert.equal(await page.$eval('.ar-shell', (el) => getComputedStyle(el).backgroundColor), 'rgb(8, 26, 51)', 'blueprint style applies');
  await page.screenshot({ path: path.join(shots, 'style-blueprint.png') });
  await page.click('.ar-popover button:has-text("Light glass")');
  await page.waitForTimeout(350);
  assert.equal(await page.$eval('.ar-shell', (el) => getComputedStyle(el).backgroundColor), 'rgb(238, 243, 251)', 'glass style applies');
  await page.screenshot({ path: path.join(shots, 'style-glass.png') });
  await page.click('.ar-popover button:has-text("Tech dark")');
  await page.waitForTimeout(300);
  assert.ok((await page.locator('[data-brand="postgresql"]').count()) >= 1, 'PostgreSQL brand icon renders');
  assert.ok((await page.locator('[data-brand]').count()) >= 5, 'known tech gets brand marks');

  assert.equal(await page.locator('.ar-shell').getAttribute('data-motion'), 'full', 'motion defaults to full');
  assert.ok((await page.locator('.ar-particle').count()) > 0, 'full motion draws particles');
  assert.ok((await page.locator('.ar-current').count()) > 0, 'full motion draws ambient current');
  await page.click('.ar-popover button:has-text("Calm")');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.ar-particle').count(), 0, 'calm motion drops particles');
  assert.ok((await page.locator('.ar-current').count()) > 0, 'calm motion keeps slow current');
  await page.click('.ar-popover button:has-text("Off")');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.ar-current').count(), 0, 'off removes ambient motion');
  await page.click('.ar-popover button:has-text("Full motion")');
  await page.waitForTimeout(250);

  // Recording guidance & PNG export
  await page.click('.ar-popover button:has-text("Record")');
  assert.match(await page.locator('[role=dialog]').innerText(), /⌘⇧5/, 'recording guide shows system shortcut');
  await page.click('button:has-text("Close")');
  assert.equal(await page.locator('[role=dialog]').count(), 0, 'recording guide closes');

  const pngPage = await open({ width: 1200, height: 800 }, '?locale=en&projection=2d');
  await pngPage.click('.ar-more-trigger');
  const [currentPng] = await Promise.all([pngPage.waitForEvent('download'), pngPage.click('.ar-popover button:has-text("PNG"):not(:has-text("Full"))')]);
  await currentPng.saveAs(path.join(shots, 'camera.png'));
  await pngPage.click('.ar-more-trigger');
  const [fullPng] = await Promise.all([pngPage.waitForEvent('download'), pngPage.click('.ar-popover button:has-text("Full PNG")')]);
  const fullPath = path.join(shots, 'full-graph.png');
  await fullPng.saveAs(fullPath);
  const pngHeader = (file) => {
    const buf = fs.readFileSync(file);
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), size: buf.length };
  };
  const camera = pngHeader(path.join(shots, 'camera.png'));
  const full = pngHeader(fullPath);
  assert.ok(full.width > 1000 && full.height > 700, `full PNG covers the graph: ${JSON.stringify(full)}`);
  assert.ok(full.width !== camera.width || full.height !== camera.height, 'full PNG differs from the camera export');
  assert.ok(full.size > 20000, 'full PNG has content');
  await pngPage.close();

  // Reduced motion clamp
  const reduced = await open({ width: 1000, height: 700 }, '?motion=full&projection=2d', undefined, FILE, { reducedMotion: 'reduce' });
  assert.equal(await reduced.locator('.ar-shell').getAttribute('data-motion'), 'calm', 'reduced motion clamps a full view');
  assert.equal(await reduced.locator('.ar-particle').count(), 0, 'reduced motion has no particles');
  await reduced.click('.ar-more-trigger');
  await reduced.click('.ar-popover button:has-text("Off")');
  await reduced.waitForTimeout(250);
  assert.equal(await reduced.locator('.ar-shell').getAttribute('data-motion'), 'off', 'off is not upgraded to calm');
  await reduced.click('.ar-popover button:has-text("Full motion")');
  await reduced.waitForTimeout(350);
  assert.equal(await reduced.locator('.ar-shell').getAttribute('data-motion'), 'full', 'explicit user choice can override');
  assert.ok((await reduced.locator('.ar-particle').count()) > 0, 'override restores particles');
  await reduced.close();

  // Real click on a node body + Spotlight command search
  const firstNode = page.locator('[data-node]').first();
  await firstNode.click();
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.ar-inspector').count(), 1, 'real click on a node opens the inspector');
  await page.locator('.ar-inspector button:has-text("×")').click();

  await page.click('.ar-find-trigger');
  await page.click('.ar-cmd-item:has-text("Order Service")');
  await page.waitForTimeout(350);
  const inspector = await box(page, '.ar-inspector');
  assert.ok(inspector && inspector.x > 700 && inspector.width <= 380, `inspector on the right: ${JSON.stringify(inspector)}`);
  const canvasSel = await box(page, '.ar-canvas');
  assert.ok(canvasSel.width < canvas0.width - 300, 'selection reserves inspector width');
  await page.screenshot({ path: path.join(shots, 'desktop-selected-en.png') });

  await page.click('button:has-text("中")');
  await page.waitForTimeout(300);
  const inspectorText = await page.locator('.ar-inspector').innerText();
  assert.match(inspectorText, /替换影响范围/, 'inspector switches to Chinese labels');
  assert.match(inspectorText, /依据仅限输入图/, 'evidence note is localised');
  await page.screenshot({ path: path.join(shots, 'desktop-selected-zh.png') });

  // PNG export + clipboard fallback
  await page.click('.ar-more-trigger');
  const [png] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('.ar-popover button:has-text("PNG"):not(:has-text("整图"))')]);
  assert.match(png.suggestedFilename(), /\.png$/);
  const pngPath = path.join(shots, 'export.png');
  await png.saveAs(pngPath);
  assert.ok(fs.statSync(pngPath).size > 5000, 'PNG has content');

  const denied = await open({ width: 1280, height: 800 }, '?locale=en', () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('clipboard blocked for this check')) },
    });
  });
  await denied.click('.ar-find-trigger');
  await denied.click('.ar-cmd-item:has-text("Order Service")');
  await denied.waitForTimeout(350);
  await denied.locator('.ar-inspector button:has-text("Copy AI prompt")').first().click();
  await denied.waitForTimeout(350);
  assert.equal(await denied.locator('textarea[aria-label]').count(), 1, 'clipboard failure exposes prompt text');
  await denied.close();

  await page.locator('.ar-inspector button:has-text("×")').click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.ar-inspector').count(), 0, 'inspector closes');
  assert.ok((await box(page, '.ar-canvas')).width > canvas0.width - 10, 'canvas returns to full width');

  // Scenario preview & Flow playback
  const scenarioBtn = page.locator('.ar-footer button:has-text("⇄")').first();
  await scenarioBtn.click();
  await page.waitForTimeout(500);
  const diffText = await page.locator('.ar-banner-float').innerText();
  assert.match(diffText, /目标预览/, 'scenario diff is labelled');
  await page.screenshot({ path: path.join(shots, 'desktop-scenario-zh.png') });
  await scenarioBtn.click();
  await page.waitForTimeout(300);

  await page.locator('.ar-footer button:has-text("▶")').first().click();
  await page.waitForTimeout(1600);
  assert.match(await page.locator('.ar-flow-toast').innerText(), /\d\/\d/, 'flow step counter appears');

  await page.click('.ar-more-trigger');
  const [viewFile] = await Promise.all([page.waitForEvent('download'), page.click('.ar-popover button:has-text("view.json")')]);
  const viewPath = path.join(shots, 'view.json');
  await viewFile.saveAs(viewPath);
  const saved = JSON.parse(fs.readFileSync(viewPath, 'utf8'));
  assert.equal(saved.viewVersion, '1');
  assert.deepEqual(saved.camera, { x: 0, y: 0, zoom: 1 });

  const before = await page.evaluate(() => document.querySelector('#archray-scene').viewBox.baseVal.width);
  const zoomed = { ...saved, viewVersion: '1', projection: '2d', camera: { x: 0, y: 0, zoom: 2 } };
  const zoomPath = path.join(shots, 'view-zoom.json');
  fs.writeFileSync(zoomPath, JSON.stringify(zoomed));
  await page.setInputFiles('.ar-file-input', zoomPath);
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => document.querySelector('#archray-scene').viewBox.baseVal.width);
  assert.ok(after < before - 1, `import restores zoom (${before} -> ${after})`);
  await page.screenshot({ path: path.join(shots, 'desktop-import-zoom-2d.png') });

  const rich = { viewVersion: '1', locale: 'en', theme: 'paper', projection: '2d', lens: 'health', scenario: 'swap-auth', camera: { x: 0, y: 0, zoom: 1.25 } };
  const richPath = path.join(shots, 'view-rich.json');
  fs.writeFileSync(richPath, JSON.stringify(rich));
  await page.setInputFiles('.ar-file-input', richPath);
  await page.waitForTimeout(800);
  assert.equal(await page.$eval('.ar-shell', (el) => getComputedStyle(el).backgroundColor), 'rgb(244, 246, 250)', 'import restores the paper theme');
  assert.match(await page.locator('.ar-banner-float').innerText(), /Target preview/, 'import restores locale and scenario');
  await page.screenshot({ path: path.join(shots, 'desktop-import-rich-en-paper.png') });

  const focusView = { viewVersion: '1', locale: 'zh-CN', focus: 'backend', collapsed: ['backend'] };
  const focusPath = path.join(shots, 'view-focus.json');
  fs.writeFileSync(focusPath, JSON.stringify(focusView));
  await page.setInputFiles('.ar-file-input', focusPath);
  await page.waitForTimeout(600);
  assert.match(await page.locator('.ar-brand-island').innerText(), /总览 \/ 后端/, 'import restores focus and locale');
  assert.equal(await page.locator('.ar-inspector').count(), 0, 'import does not reopen stale details');
  await page.screenshot({ path: path.join(shots, 'desktop-import-focus-zh.png') });
  await page.close();

  /* --------------------------------------------------- failure recovery */
  page = await open({ width: 1000, height: 700 }, '', () => {
    HTMLCanvasElement.prototype.toDataURL = function fail() { throw new Error('injected export failure'); };
  });
  await page.click('.ar-more-trigger');
  await page.click('.ar-popover button:has-text("PNG"):not(:has-text("Full"))');
  await page.waitForTimeout(500);
  assert.match(await page.locator('[role=alert]').innerText(), /PNG export failed/, 'PNG failures surface a retryable notice');
  await page.screenshot({ path: path.join(shots, 'png-failure.png') });
  await page.close();

  /* ------------------------------------------------------- layer focus */
  page = await open({ width: 1440, height: 900 }, '?layers=前端,数据&locale=zh-CN&projection=2d');
  const pressed = async () => (await page.locator('.ar-layers button[aria-pressed="true"] .ar-layer-name').allInnerTexts()).map((t) => t.trim()).sort();
  assert.deepEqual(await pressed(), ['客户端', '数据与存储'].sort(), 'URL layers activate chips');
  const layerScene = await page.locator('#archray-scene').textContent();
  assert.match(layerScene, /API 网关/, 'one-hop context stays visible');
  assert.match(layerScene, /PostgreSQL/, 'selected data layer stays visible');
  await page.screenshot({ path: path.join(shots, 'layers-zh.png') });

  await page.locator('.ar-layers button', { hasText: '客户端' }).click();
  await page.waitForTimeout(600);
  assert.ok(!/Web 控制台/.test(await page.locator('#archray-scene').textContent()), 'chip toggle removes a layer');

  await page.click('.ar-more-trigger');
  const [layerView] = await Promise.all([page.waitForEvent('download'), page.click('.ar-popover button:has-text("view.json")')]);
  const layerViewPath = path.join(shots, 'view-layers.json');
  await layerView.saveAs(layerViewPath);
  assert.deepEqual(JSON.parse(fs.readFileSync(layerViewPath, 'utf8')).layers, ['data'], 'saved view keeps the layer focus');

  await page.locator('.ar-layers button', { hasText: '全部层' }).click();
  await page.waitForTimeout(600);
  assert.equal(await page.locator('.ar-layers button[aria-pressed="true"]').count(), 1, 'all layers resets the filter');
  await page.setInputFiles('.ar-file-input', layerViewPath);
  await page.waitForTimeout(600);
  assert.deepEqual(await pressed(), ['数据与存储'], 'import restores the layer focus');
  await page.screenshot({ path: path.join(shots, 'layers-restored-zh.png') });
  await page.close();

  page = await open({ width: 1000, height: 700 }, '?layers=ghost&locale=en');
  assert.match(await page.locator('[role=alert]').innerText(), /not in this graph/, 'unknown layers name the real reason');
  await page.close();

  /* --------------------------------------------------- invalid view input */
  page = await open({ width: 1280, height: 800 }, '?theme=bad&projection=nope&lens=1&collapsed=123&focus=ghost&camera=bad&locale=zh-CN');
  const alert = (await page.locator('[role=alert]').innerText()).replace(/\s+/g, ' ');
  assert.match(alert, /已忽略无效值/, `invalid values notify: ${alert}`);
  assert.match(alert, /主题/, 'field names are localised');
  assert.match(alert, /聚焦模块已不存在/, 'stale focus is explained');
  assert.ok((await box(page, '.ar-canvas')).height > 300, 'page still renders with invalid view');
  await page.screenshot({ path: path.join(shots, 'invalid-view-zh.png') });
  await page.close();

  /* ------------------------------------------------------------ narrow */
  for (const [w, h] of [[320, 640], [375, 700], [768, 1024]]) {
    page = await open({ width: w, height: h });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${w}px has no horizontal overflow (${overflow})`);
    const canvas = await box(page, '.ar-canvas');
    assert.ok(canvas.width >= w - 1 && canvas.height > 120, `${w}px canvas usable: ${JSON.stringify(canvas)}`);

    await page.click('.ar-find-trigger');
    await page.click('.ar-cmd-item:has-text("Order Service")');
    await page.waitForTimeout(350);
    const ins = await box(page, '.ar-inspector');
    assert.ok(ins.x >= 0 && ins.y >= 0 && ins.x + ins.width <= w + 1 && ins.y + ins.height <= h + 1, `${w}px inspector inside viewport: ${JSON.stringify(ins)}`);
    await page.locator('.ar-inspector button:has-text("×")').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.ar-inspector').count(), 0, `${w}px detail closes back to the graph`);
    await page.close();
  }

  page = await open({ width: 320, height: 640 }, '?layers=client&locale=zh-CN');
  await page.click('.ar-more-trigger');
  assert.equal(await page.locator('.ar-popover').count(), 1, '320px popover opens');
  await page.click('.ar-popover button:has-text("关闭")');
  assert.equal(await page.locator('.ar-shell').getAttribute('data-motion'), 'off', 'mobile popover controls motion');
  await page.click('.ar-more-trigger');
  const chipHeights = await page.locator('.ar-layers button').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  assert.ok(Math.max(...chipHeights) < 46, `layer chips stay horizontal: ${chipHeights.join(',')}`);
  await page.close();

  /* --------------------------------------- 40 modules, light theme, 2d */
  const layers = [
    { id: 'edge', name: 'Edge', order: 0 },
    { id: 'app', name: 'Application', order: 1 },
    { id: 'async', name: 'Async', order: 2 },
    { id: 'data', name: 'Data', order: 3 },
  ];
  const nodes = Array.from({ length: 40 }, (_, i) => ({
    id: `m${i}`,
    name: `Module ${i}`,
    kind: i % 5 === 0 ? 'database' : i % 3 === 0 ? 'queue' : 'service',
    layer: layers[i % layers.length].id,
    summary: `Responsibility ${i}`,
  }));
  const edges = Array.from({ length: 39 }, (_, i) => ({ id: `l${i}`, source: `m${i}`, target: `m${i + 1}` }));
  const bigPath = path.join(outDir, 'forty.json');
  fs.writeFileSync(bigPath, JSON.stringify({ schemaVersion: '2.0', meta: { name: 'Forty module check', locales: ['en'], generatedAt: '2026-11-17T00:00:00Z' }, layers, nodes, edges }));
  const bigBuild = spawnSync(process.execPath, ['cli/bin/archray.mjs', 'build', bigPath, '--output', path.join(outDir, 'forty.html'), '--force', '--no-open'], { cwd: root, encoding: 'utf8' });
  assert.equal(bigBuild.status, 0, bigBuild.stderr);

  page = await open({ width: 1440, height: 900 }, '?theme=paper&projection=2d&locale=en', undefined, `file://${path.join(outDir, 'forty.html')}`);
  assert.ok((await page.locator('#archray-scene text').count()) >= 40, 'all 40 modules render');
  assert.ok(Number(await page.locator('.ar-shell').getAttribute('data-zoom')) >= 1.3, '40 modules open at a readable zoom');
  assert.equal(await page.$eval('.ar-shell', (el) => getComputedStyle(el).backgroundColor), 'rgb(244, 246, 250)', 'light theme applies');
  await page.screenshot({ path: path.join(shots, 'forty-paper-2d.png') });
  await page.close();

  /* --------------------------------------------------- offline integrity */
  const offline = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  await offline.context().setOffline(true);
  await offline.goto(FILE);
  await offline.waitForSelector('#archray-scene', { timeout: 15000 });
  await offline.waitForTimeout(600);
  assert.ok((await offline.locator('[data-node]').count()) > 5, 'file:// HTML renders fully offline');
  await offline.screenshot({ path: path.join(shots, 'offline-file.png') });
  await offline.close();

  await browser.close();
  assert.deepEqual(external, [], `no network requests: ${external.join(', ')}`);
  assert.deepEqual(errors, [], `no page errors: ${errors.join(' | ')}`);
  console.log('Browser verification passed. Screenshots:', shots);
})().catch((e) => { console.error(e); process.exit(1); });
