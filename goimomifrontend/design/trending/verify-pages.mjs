import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
const groups = { domestic: ['Kerala', 'Kashmir', 'Manali', 'Andaman', 'Goa', 'Delhi Agra Jaipur'], international: ['Thailand', 'Dubai', 'Azerbaijan', 'Bali'] };
try {
 for (const touch of [false, true]) {
  console.log(touch ? 'Checking touch controls' : 'Checking mouse controls');
  const context = await browser.newContext({ viewport: { width: touch ? 390 : 1440, height: 1000 }, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => sessionStorage.setItem('generalEnquiryShown', 'true'));
  await page.route('**/*', route => {
   const url = new URL(route.request().url());
   if (url.pathname.startsWith('/api/')) return route.fulfill({ contentType: 'application/json', body: '[]' });
   return url.origin === new URL(base).origin ? route.continue() : route.abort();
  });
  for (const [kind, names] of Object.entries(groups)) {
   console.log('Collection:', kind);
   await page.goto(`${base}/trending${kind}destination`, { waitUntil: 'networkidle' });
   assert.equal(await page.locator('.destination-disclosure-card').count(), names.length);
   for (const name of names) {
    const toggle = page.getByRole('button', { name: `${name} details`, exact: true });
    const card = page.locator('.destination-disclosure-card').filter({ has: toggle });
    const details = card.locator('.destination-card-details');
    if (touch) await toggle.tap(); else await card.hover();
    await page.waitForTimeout(300);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.ok(await card.getByRole('link', { name: `Explore ${name}`, exact: true }).isVisible());
    assert.equal(await details.getAttribute('inert'), null);
    const geometry = await card.evaluate(el => {
     const box = el.getBoundingClientRect(); const panel = el.querySelector('.destination-card-panel').getBoundingClientRect();
     return { w: box.width, h: box.height, fits: panel.top >= box.top && panel.bottom <= box.bottom };
    });
    assert.equal(geometry.w, geometry.h); assert.ok(geometry.fits);
    if (touch) await toggle.tap(); else await page.mouse.move(0, 0);
    await page.waitForTimeout(450);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await details.getAttribute('inert'), '');
    if (!touch) {
     await toggle.focus(); await page.keyboard.press('Enter');
     assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
     await card.getByRole('link', { name: `Explore ${name}`, exact: true }).waitFor({ state: 'visible' });
     await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
     assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
     assert.ok(await toggle.evaluate(el => el === document.activeElement));
     await toggle.evaluate(el => el.blur());
    }
   }
   for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
   }
   await page.setViewportSize({ width: touch ? 390 : 1440, height: 1000 });
  }
  if (touch) await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
  await page.locator('button').filter({ hasText: /^Holidays$/i }).filter({ visible: true }).first().click();
  await page.getByRole('link', { name: 'Trending Domestic', exact: true }).click();
  await page.getByRole('heading', { name: 'Trending Domestic', exact: true }).waitFor();
  for (const name of Object.values(groups).flat()) {
   console.log('Route:', name);
   const slug = name === 'Delhi Agra Jaipur' ? 'golden-triangle' : name.toLowerCase();
   await page.goto(`${base}/${slug}`, { waitUntil: 'networkidle' });
   assert.ok(await page.locator('h1').count());
   assert.ok(await page.locator('.td-hero-image, .km-hero-image').first().evaluate(async image => { image.loading = 'eager'; await image.decode(); return image.naturalWidth > 0; }));
  }
  await page.goto(base, { waitUntil: 'networkidle' });
  for (const selector of ['.domestic-trending-section:not(.international-trending-section)', '.international-trending-section']) {
   await page.emulateMedia({ reducedMotion: 'no-preference' });
   const section = page.locator(selector);
   const track = section.locator('.domestic-trending-track');
   const overflow = section.locator('.domestic-trending-overflow');
   const first = track.locator('.destination-disclosure-card').first();
   if (!touch) {
    await page.mouse.move(0, 0);
    assert.equal(await track.evaluate(el => getComputedStyle(el).animationName), 'dtd-marquee');
    await overflow.hover();
   }
   await first.scrollIntoViewIfNeeded();
   if (touch) await first.getByRole('button').tap(); else await first.hover();
   assert.equal(await track.evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
   await page.emulateMedia({ reducedMotion: 'reduce' });
   assert.equal(await track.evaluate(el => getComputedStyle(el).animationName), 'none');
   assert.equal(await overflow.evaluate(el => getComputedStyle(el).overflowX), 'auto');
  }
  await context.close();
 }
 assert.deepEqual(errors, []);
 await fs.mkdir('../output/design/trending', { recursive: true });
 const report = { passed: true, checked: 'All 10 listed destinations; mouse/touch/keyboard/Escape; collapsed content inert; square panel fit; mobile and desktop menus; 320-1440px overflow; listed package routes and hero images; marquee pause and reduced motion.', errors };
 await fs.writeFile('../output/design/trending/verification.json', JSON.stringify(report, null, 2));
 console.log(JSON.stringify(report));
} finally { await browser.close(); }
