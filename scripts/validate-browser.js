'use strict';

// Optional browser smoke test. Requires Playwright and a Chromium executable.
// External images, fonts, and services are stubbed: this measures local UI only,
// not production Core Web Vitals, third-party availability, or live integrations.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const trucks = require('../data/trucks.json');
const posts = require('../data/posts.json');

const BASE_URL = process.env.DIRECTORY_URL || `http://127.0.0.1:${process.env.PORT || 22333}`;
const ORIGIN = new URL(BASE_URL).origin;
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const firstTruck = trucks.find(truck => truck.slug);
const countyTruck = trucks.find(truck => truck.slug && / County$/.test(truck.area));
const firstPost = posts.find(post => post.slug && post.published_at);
const paths = ['/', '/directory', `/blog/${firstPost.slug}`, `/trucks/${firstTruck.slug}`, '/faq'];
const issues = [];
let pageChecks = 0;
let externalRequestsStubbed = 0;

function check(condition, message) {
  if (!condition) issues.push(message);
}

async function prepareContext(browser, options) {
  const context = await browser.newContext(options);
  // Keep every actual network request within the local app. Stub remote assets
  // so intentional blocking does not produce misleading browser console errors.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === ORIGIN) return route.continue();
    externalRequestsStubbed += 1;
    return route.fulfill({
      status: 200,
      contentType: route.request().resourceType() === 'image' ? 'image/svg+xml' : 'text/css',
      body: route.request().resourceType() === 'image'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
        : ''
    });
  });
  return context;
}

function observe(page, label) {
  page.on('pageerror', error => issues.push(`${label}: JavaScript exception: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') issues.push(`${label}: console error: ${message.text()}`);
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === ORIGIN) {
      issues.push(`${label}: local resource failed: ${new URL(request.url()).pathname} (${request.failure()?.errorText})`);
    }
  });
}

async function checkPage(page, pathname, label) {
  const response = await page.goto(new URL(pathname, BASE_URL).href, { waitUntil: 'load' });
  assert.equal(response.status(), 200, `${label} ${pathname} should return 200`);
  assert.equal(await page.locator('h1').count(), 1, `${label} ${pathname}: one H1`);
  assert.ok(await page.locator('h1').isVisible(), `${label} ${pathname}: H1 visible`);
  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    page: document.documentElement.scrollWidth,
    text: document.querySelector('main')?.innerText.length || 0
  }));
  check(geometry.page <= geometry.viewport + 2, `${label} ${pathname}: horizontal overflow (${geometry.page}px/${geometry.viewport}px)`);
  check(geometry.text > 100, `${label} ${pathname}: main content is not readable`);
  pageChecks += 1;
}

async function checkMobileInteractions(page) {
  await page.goto(new URL('/', BASE_URL).href, { waitUntil: 'load' });
  const menuToggle = page.locator('#navToggle');
  const menu = page.locator('#navMobile');
  assert.equal(await menuToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(await menu.isVisible(), false);
  await menuToggle.click();
  assert.equal(await menuToggle.getAttribute('aria-expanded'), 'true', 'mobile navigation announces open state');
  assert.ok(await menu.isVisible(), 'mobile navigation opens');
  await page.keyboard.press('Escape');
  assert.equal(await menuToggle.getAttribute('aria-expanded'), 'false', 'Escape announces closed state');
  assert.equal(await menu.isVisible(), false, 'Escape closes mobile navigation');
  assert.ok(await menuToggle.evaluate(element => element === document.activeElement), 'Escape restores menu focus');
  await menuToggle.click();
  await menu.getByRole('link', { name: /Browse trucks/ }).click();
  await page.waitForURL('**/directory');
  assert.ok(await page.locator('#dirSearch').isVisible(), 'mobile menu navigates to directory');

  const query = new URLSearchParams({ q: countyTruck.name, county: countyTruck.area });
  await page.goto(new URL(`/directory?${query}`, BASE_URL).href, { waitUntil: 'load' });
  assert.equal(await page.locator('#dirSearch').inputValue(), countyTruck.name, 'shared query restores search');
  const selectedCounty = page.locator('.filter-btn[data-county]').filter({ hasText: countyTruck.area.replace(' County', '') });
  assert.equal(await selectedCounty.getAttribute('aria-pressed'), 'true', 'shared county restores accessible state');
  const visibleCards = await page.locator('.truck-card[data-name]').evaluateAll(cards => cards
    .filter(card => getComputedStyle(card).display !== 'none')
    .map(card => ({ name: card.dataset.name, county: card.dataset.county })));
  assert.ok(visibleCards.length > 0, 'shared filters must return matching trucks');
  assert.ok(visibleCards.every(card => card.county === countyTruck.area && card.name.toLowerCase().includes(countyTruck.name.toLowerCase())), 'shared filters apply to visible cards');

  // Exercise the supported manual-copy fallback without clipboard permissions.
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async () => { throw new Error('Test clipboard unavailable'); } }
  }));
  await page.locator('#copyDirLink').click();
  await page.locator('#dirShareFallback').waitFor({ state: 'visible' });
  const copiedUrl = new URL(await page.locator('#dirShareUrl').inputValue());
  assert.equal(copiedUrl.searchParams.get('q'), countyTruck.name, 'manual shared URL includes query');
  assert.equal(copiedUrl.searchParams.get('county'), countyTruck.area, 'manual shared URL includes county');
  await page.locator('#clearDirFilters').click();
  assert.equal(await page.locator('#dirSearch').inputValue(), '', 'clear resets search');
  assert.equal(new URL(page.url()).search, '', 'clear removes filter query');
  const count = await page.locator('.truck-card[data-name]').evaluateAll(cards => cards.filter(card => getComputedStyle(card).display !== 'none').length);
  assert.equal(count, trucks.length, 'clear reveals every listing');

  await page.goto(new URL('/faq', BASE_URL).href, { waitUntil: 'load' });
  const question = page.locator('.faq-question').first();
  const answer = page.locator('.faq-answer').first();
  await question.click();
  assert.ok(await answer.isVisible(), 'FAQ answer opens');
  if (await question.evaluate(element => element.tagName === 'BUTTON')) {
    assert.equal(await question.getAttribute('aria-expanded'), 'true', 'FAQ announces expanded answer');
    assert.equal(await question.getAttribute('aria-controls'), await answer.getAttribute('id'), 'FAQ control identifies its answer');
    await question.press('Enter');
    assert.equal(await question.getAttribute('aria-expanded'), 'false', 'FAQ announces collapsed answer');
    assert.equal(await answer.isVisible(), false, 'keyboard collapses answer');
    await question.press('Enter');
    assert.ok(await answer.isVisible(), 'keyboard opens answer');
  } else {
    assert.ok(await question.evaluate(element => element.closest('details')?.open), 'native FAQ disclosure exposes open state');
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      const context = await prepareContext(browser, { viewport });
      const page = await context.newPage();
      observe(page, `${viewport.width}px`);
      for (const pathname of paths) await checkPage(page, pathname, `${viewport.width}px`);
      if (viewport.width === 390) await checkMobileInteractions(page);
      await context.close();
    }
    const noJs = await prepareContext(browser, { viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await noJs.newPage();
    observe(page, 'JavaScript disabled');
    for (const pathname of paths) await checkPage(page, pathname, 'JavaScript disabled');
    const answer = page.locator('.faq-answer').first();
    if (!(await answer.isVisible())) {
      const summary = page.locator('details summary').first();
      assert.ok(await summary.count(), 'FAQ answers need readable content or native disclosure without JavaScript');
      await summary.click();
    }
    assert.ok(await answer.isVisible(), 'FAQ answers accessible without JavaScript');
    await page.goto(new URL('/directory', BASE_URL).href, { waitUntil: 'load' });
    assert.equal(await page.locator('.truck-card[data-name]:visible').count(), trucks.length, 'all directory listings remain visible without JavaScript');
    await noJs.close();
    if (issues.length) throw new Error(issues.join('\n'));
    console.log(`Browser smoke passed: ${pageChecks} rendered pages at mobile/desktop widths and without JavaScript; mobile menu, FAQ, directory share/filter/clear, overflow, and console checks. ${externalRequestsStubbed} external asset requests stubbed; external performance and integrations unmeasured.`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(`Browser smoke failed: ${error.message}`);
  process.exitCode = 1;
});
