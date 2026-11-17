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
  const toolbar0 = await box(page, '.ar-toolbar');
  assert.ok(canvas0.width > 1200 && canvas0.height > 500, `desktop canvas ${JSON.stringify(canvas0)}`);
  assert.ok(toolbar0.y + toolbar0.height <= canvas0.y + 1, 'toolbar does not overlap the canvas');
  assert.equal(await page.locator('#archray-scene g').count() > 0, true, 'scene draws content');

  // Styles and brand icons
  await page.selectOption('.ar-style', 'blueprint');
  await page.waitForTimeout(400);
  assert.equal(await page.$eval('.ar-shell', (el) => getComputedStyle(el).backgroundColor), 'rgb(8, 26, 51)', 'blueprint style applies');
  await page.screenshot({ path: path.join(shots, 'style-blueprint.png') });
  await page.selectOption('.ar-style', 'glass');
  await page.waitForTimeout(400);
  assert.equal(await page.$eval('.ar-shell', (el) => getComputedStyle(el).backgroundColor), 'rgb(238, 243, 251)', 'glass style applies');
  await page.screenshot({ path: path.join(shots, 'style-glass.png') });
  await page.selectOption('.ar-style', 'midnight');
  await page.waitForTimeout(300);
  assert.ok((await page.locator('[data-brand="postgresql"]').count()) >= 1, 'PostgreSQL brand icon renders');
  assert.ok((await page.locator('[data-brand]').count()) >= 5, 'known tech gets brand marks');

  // Motion levels: full has particles and ambient current; calm keeps slow dashes; off stops both.
  assert.equal(await page.locator('.ar-shell').getAttribute('data-motion'), 'full', 'motion defaults to full');
  assert.ok((await page.locator('.ar-particle').count()) > 0, 'full motion draws particles');
  assert.ok((await page.locator('.ar-current').count()) > 0, 'full motion draws ambient current');
  await page.selectOption('.ar-motion', 'calm');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.ar-particle').count(), 0, 'calm motion drops particles');
  assert.ok((await page.locator('.ar-current').count()) > 0, 'calm motion keeps slow current');
  await page.selectOption('.ar-motion', 'off');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.ar-current').count(), 0, 'off removes ambient motion');
  await page.selectOption('.ar-motion', 'full');
  await page.waitForTimeout(300);

  // Recording guidance is local-only.
  await page.click('button:has-text("Record")');
  assert.match(await page.locator('[role=dialog]').innerText(), /⌘⇧5/, 'recording guide shows system shortcut');
  await page.click('button:has-text("Close")');
  assert.equal(await page.locator('[role=dialog]').count(), 0, 'recording guide closes');

  // Full-graph PNG ignores the current camera.
  const pngPage = await open({ width: 1200, height: 800 }, '?locale=en');
  const [currentPng] = await Promise.all([pngPage.waitForEvent('download'), pngPage.click('button:has-text("PNG")')]);
  await currentPng.saveAs(path.join(shots, 'camera.png'));
  const [fullPng] = await Promise.all([pngPage.waitForEvent('download'), pngPage.click('button:has-text("Full PNG")')]);
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

  // Reduced motion also clamps an embedded/URL full setting, until the user opts in.
  const reduced = await open({ width: 1000, height: 700 }, '?motion=full', undefined, FILE, { reducedMotion: 'reduce' });
  assert.equal(await reduced.locator('.ar-shell').getAttribute('data-motion'), 'calm', 'reduced motion clamps a full view');
  assert.equal(await reduced.locator('.ar-particle').count(), 0, 'reduced motion has no particles');
  await reduced.selectOption('.ar-motion', 'full');
  await reduced.waitForTimeout(400);
  assert.equal(await reduced.locator('.ar-shell').getAttribute('data-motion'), 'full', 'explicit user choice can override');
  assert.ok((await reduced.locator('.ar-particle').count()) > 0, 'override restores particles');
  await reduced.close();

  await page.selectOption('.ar-find', 'order');
  await page.waitForTimeout(400);
  const inspector = await box(page, '.ar-inspector');
  assert.ok(inspector && inspector.x > 700 && inspector.width <= 380, `inspector on the right: ${JSON.stringify(inspector)}`);
  const canvasSel = await box(page, '.ar-canvas');
  assert.ok(canvasSel.width < canvas0.width - 300, 'selection reserves inspector width');
  await page.screenshot({ path: path.join(shots, 'desktop-selected-en.png') });

  // Chinese reading path
  await page.click('button:has-text("中")');
  await page.waitForTimeout(300);
  const inspectorText = await page.locator('.ar-inspector').innerText();
  assert.match(inspectorText, /替换影响范围/, 'inspector switches to Chinese labels');
  assert.match(inspectorText, /依据仅限输入图/, 'evidence note is localised');
  await page.screenshot({ path: path.join(shots, 'desktop-selected-zh.png') });

  // PNG export
  const [png] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('button:has-text("PNG")')]);
  assert.match(png.suggestedFilename(), /\.png$/);
  const pngPath = path.join(shots, 'export.png');
  await png.saveAs(pngPath);
  assert.ok(fs.statSync(pngPath).size > 5000, 'PNG has content');

  // Clipboard refusal falls back to selectable text. Browsers differ on headless
  // clipboard permission, so this page denies writeText explicitly.
  const denied = await open({ width: 1280, height: 800 }, '?locale=en', () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('clipboard blocked for this check')) },
    });
  });
  await denied.selectOption('.ar-find', 'order');
  await denied.waitForTimeout(400);
  await denied.locator('.ar-inspector button:has-text("Copy AI prompt")').first().click();
  await denied.waitForTimeout(400);
  assert.equal(await denied.locator('textarea[aria-label]').count(), 1, 'clipboard failure exposes prompt text');
  await denied.close();

  // Close detail overlay
  await page.locator('.ar-inspector button:has-text("×")').click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.ar-inspector').count(), 0, 'inspector closes');
  assert.ok((await box(page, '.ar-canvas')).width > canvas0.width - 10, 'canvas returns to full width');

  // Scenario preview shows readable module names, not raw ids
  const scenarioBtn = page.locator('.ar-footer button:has-text("⇄")').first();
  await scenarioBtn.click();
  await page.waitForTimeout(600);
  const toolbarText = await page.locator('.ar-toolbar').innerText();
  assert.match(toolbarText, /目标预览/, 'scenario diff is labelled');
  const diffLine = toolbarText.split('\n').find((l) => l.includes('目标预览'));
  assert.ok(diffLine && !/swap-auth|"patch"/.test(diffLine), `diff uses module names: ${diffLine}`);
  await page.screenshot({ path: path.join(shots, 'desktop-scenario-zh.png') });
  await scenarioBtn.click();
  await page.waitForTimeout(300);

  // Flow playback
  await page.locator('.ar-footer button:has-text("▶")').first().click();
  await page.waitForTimeout(1600);
  assert.match(await page.locator('.ar-footer').innerText(), /\d\/\d/, 'flow step counter appears');

  // Save view.json, then restore projection and camera through import
  const [viewFile] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("view.json")')]);
  const viewPath = path.join(shots, 'view.json');
  await viewFile.saveAs(viewPath);
  const saved = JSON.parse(fs.readFileSync(viewPath, 'utf8'));
  assert.equal(saved.viewVersion, '1');
  assert.deepEqual(saved.camera, { x: 0, y: 0, zoom: 1 });

  const before = await page.evaluate(() => document.querySelector('#archray-scene').viewBox.baseVal.width);
  const zoomed = { ...saved, viewVersion: '1', projection: 'iso', camera: { x: 0, y: 0, zoom: 2 } };
  const zoomPath = path.join(shots, 'view-zoom.json');
  fs.writeFileSync(zoomPath, JSON.stringify(zoomed));
  await page.setInputFiles('.ar-file-input', zoomPath);
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => document.querySelector('#archray-scene').viewBox.baseVal.width);
  assert.ok(after < before - 1, `import restores zoom (${before} -> ${after})`);
  assert.equal(await page.locator('[role=alert]').count(), 0, 'valid import shows no warning');
  await page.screenshot({ path: path.join(shots, 'desktop-import-zoom-iso.png') });

  // A richer view restores theme, locale, projection, lens, scenario and camera together.
  const rich = { viewVersion: '1', locale: 'en', theme: 'paper', projection: 'stack', lens: 'health', scenario: 'swap-auth', camera: { x: 0, y: 0, zoom: 1.25 } };
  const richPath = path.join(shots, 'view-rich.json');
  fs.writeFileSync(richPath, JSON.stringify(rich));
  await page.setInputFiles('.ar-file-input', richPath);
  await page.waitForTimeout(900);
  assert.equal(await page.$eval('.ar-shell', (el) => getComputedStyle(el).backgroundColor), 'rgb(244, 246, 250)', 'import restores the paper theme');
  const richText = await page.locator('.ar-toolbar').innerText();
  assert.match(richText, /Target preview/, 'import restores locale and scenario');
  assert.match(richText, /added: Clerk/, 'scenario diff follows the imported scenario');
  await page.screenshot({ path: path.join(shots, 'desktop-import-rich-en-paper.png') });

  // Focus and collapsed groups restore without a detail panel.
  const focusView = { viewVersion: '1', locale: 'zh-CN', focus: 'backend', collapsed: ['backend'] };
  const focusPath = path.join(shots, 'view-focus.json');
  fs.writeFileSync(focusPath, JSON.stringify(focusView));
  await page.setInputFiles('.ar-file-input', focusPath);
  await page.waitForTimeout(700);
  assert.match(await page.locator('.ar-toolbar').innerText(), /总览 \/ 后端/, 'import restores focus and locale');
  assert.equal(await page.locator('.ar-inspector').count(), 0, 'import does not reopen stale details');
  await page.screenshot({ path: path.join(shots, 'desktop-import-focus-zh.png') });
  await page.close();

  /* --------------------------------------------------- failure recovery */
  page = await open({ width: 1000, height: 700 }, '', () => {
    HTMLCanvasElement.prototype.toDataURL = function fail() { throw new Error('injected export failure'); };
  });
  await page.click('button:has-text("PNG")');
  await page.waitForTimeout(500);
  assert.match(await page.locator('[role=alert]').innerText(), /PNG export failed/, 'PNG failures surface a retryable notice');
  await page.screenshot({ path: path.join(shots, 'png-failure.png') });
  await page.close();

  /* ------------------------------------------------------- layer focus */
  page = await open({ width: 1440, height: 900 }, '?layers=前端,数据&locale=zh-CN');
  const pressed = async () => (await page.locator('.ar-layers button[aria-pressed="true"]').allInnerTexts()).map((t) => t.trim()).sort();
  assert.deepEqual(await pressed(), ['客户端与前端', '数据与存储'].sort(), 'URL layers activate chips');
  const layerScene = await page.locator('#archray-scene').textContent();
  assert.match(layerScene, /API 网关/, 'one-hop context stays visible');
  assert.match(layerScene, /PostgreSQL/, 'selected data layer stays visible');
  const opacityOf = (label) => page.evaluate((text) => {
    const node = [...document.querySelectorAll('#archray-scene text')].find((t) => t.textContent.includes(text));
    const group = node?.closest('g[opacity]');
    return group ? Number(getComputedStyle(group).opacity) : null;
  }, label);
  assert.ok((await opacityOf('订单服务')) < 0.5, 'unselected service is dimmed context');
  assert.equal(await opacityOf('PostgreSQL'), 1, 'selected layer is fully visible');
  await page.screenshot({ path: path.join(shots, 'layers-zh.png') });

  await page.locator('.ar-layers button', { hasText: '客户端与前端' }).click();
  await page.waitForTimeout(700);
  assert.ok(!/Web 控制台/.test(await page.locator('#archray-scene').textContent()), 'chip toggle removes a layer');

  const [layerView] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("view.json")')]);
  const layerViewPath = path.join(shots, 'view-layers.json');
  await layerView.saveAs(layerViewPath);
  assert.deepEqual(JSON.parse(fs.readFileSync(layerViewPath, 'utf8')).layers, ['data'], 'saved view keeps the layer focus');

  await page.locator('.ar-layers button', { hasText: '全部层' }).click();
  await page.waitForTimeout(600);
  assert.equal(await page.locator('.ar-layers button[aria-pressed="true"]').count(), 1, 'all layers resets the filter');
  await page.setInputFiles('.ar-file-input', layerViewPath);
  await page.waitForTimeout(700);
  assert.deepEqual(await pressed(), ['数据与存储'], 'import restores the layer focus');
  await page.screenshot({ path: path.join(shots, 'layers-restored-zh.png') });
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

    await page.selectOption('.ar-find', 'order');
    await page.waitForTimeout(400);
    const ins = await box(page, '.ar-inspector');
    assert.ok(ins.x >= 0 && ins.y >= 0 && ins.x + ins.width <= w + 1 && ins.y + ins.height <= h + 1, `${w}px inspector inside viewport: ${JSON.stringify(ins)}`);
    const close = await page.locator('.ar-inspector button:has-text("×")').boundingBox();
    assert.ok(close && close.x > 0 && close.x + close.width <= w, `${w}px close button reachable`);
    assert.ok((await page.locator('.ar-inspector').innerText()).length > 50, `${w}px long detail text readable`);
    await page.screenshot({ path: path.join(shots, `narrow-${w}-selected.png`) });

    await page.locator('.ar-inspector button:has-text("×")').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.ar-inspector').count(), 0, `${w}px detail closes back to the graph`);
    assert.ok((await box(page, '.ar-canvas')).width >= w - 1, `${w}px canvas regains full width`);
    await page.screenshot({ path: path.join(shots, `narrow-${w}-graph.png`) });
    await page.close();
  }

  page = await open({ width: 320, height: 640 }, '?layers=client&locale=zh-CN');
  await page.click('.ar-more');
  assert.equal(await page.locator('[role=dialog]').count(), 1, '320px more menu opens');
  assert.match(await page.locator('[role=dialog]').innerText(), /整图 PNG|Full PNG/, 'more menu exposes full export');
  await page.selectOption('.ar-motion-sheet', 'off');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.ar-shell').getAttribute('data-motion'), 'off', 'mobile menu controls motion');
  await page.click('.ar-more');
  await page.locator('[role=dialog] button:has-text("关闭")').last().click();
  assert.equal(await page.locator('[role=dialog]').count(), 0, 'more menu closes');
  assert.equal(await page.locator('.ar-layers button[aria-pressed="true"]').count(), 1, '320px layer chips stay usable');
  assert.ok((await box(page, '.ar-layers')).width <= 320, '320px layer row fits the viewport');
  assert.ok((await box(page, '.ar-canvas')).height > 120, '320px filtered canvas stays usable');
  const chipHeights = await page.locator('.ar-layers button').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  assert.ok(Math.max(...chipHeights) < 46, `layer chips stay horizontal: ${chipHeights.join(',')}`);
  const lastChip = page.locator('.ar-layers button').last();
  await lastChip.scrollIntoViewIfNeeded();
  assert.ok(await lastChip.isVisible(), 'last layer chip is reachable');
  await page.screenshot({ path: path.join(shots, 'narrow-320-layers.png') });
  await page.close();

  /* --------------------------------------- 40 modules, light theme, stack */
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

  page = await open({ width: 1440, height: 900 }, '?theme=paper&projection=stack&locale=en', undefined, `file://${path.join(outDir, 'forty.html')}`);
  assert.ok((await page.locator('#archray-scene text').count()) >= 40, 'all 40 modules render');
  assert.ok((await box(page, '.ar-canvas')).height > 500, '40-module canvas keeps height');
  assert.equal(await page.$eval('.ar-shell', (el) => getComputedStyle(el).backgroundColor), 'rgb(244, 246, 250)', 'light theme applies');
  assert.ok((await page.locator('#archray-scene').getAttribute('viewBox')), 'stack projection renders');
  await page.screenshot({ path: path.join(shots, 'forty-paper-stack.png') });
  await page.close();

  /* --------------------------------------------------- offline integrity */
  const offline = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  await offline.context().setOffline(true);
  await offline.goto(FILE);
  await offline.waitForSelector('#archray-scene', { timeout: 15000 });
  await offline.waitForTimeout(600);
  assert.ok((await offline.locator('#archray-scene g').count()) > 5, 'file:// HTML renders fully offline');
  await offline.screenshot({ path: path.join(shots, 'offline-file.png') });
  await offline.close();

  await browser.close();
  assert.deepEqual(external, [], `no network requests: ${external.join(', ')}`);
  assert.deepEqual(errors, [], `no page errors: ${errors.join(' | ')}`);
  console.log('Browser verification passed. Screenshots:', shots);
})().catch((e) => { console.error(e); process.exit(1); });
