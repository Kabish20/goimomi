import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, channel: process.env.VERIFY_BROWSER_CHANNEL || 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const base = process.env.VERIFY_BASE_URL || 'http://localhost:5174';
const output = fileURLToPath(new URL('../../../output/design/azerbaijan/', import.meta.url));
await fs.mkdir(output, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => sessionStorage.setItem('generalEnquiryShown', 'true'));
await page.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (url.origin === new URL(base).origin || (url.hostname === 'cdn-icons-png.flaticon.com' && route.request().resourceType() === 'image')) return route.continue();
  return route.abort();
});
try {
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('link', { name: 'View Azerbaijan package', exact: true }).click();
  await page.locator('#az-title').waitFor();
  assert.equal(await page.locator('#az-title').count(), 1);
  assert.equal(await page.locator('.az-nav').count(), 1);
  assert.equal(new URL(page.url()).pathname, '/azerbaijan');
  assert.match(await page.locator('.az-hero-actions').innerText(), /26,215[\s\S]*per adult.*twin sharing/);
  for (const [index, price] of [26215, 31850].entries()) {
    assert.match(await page.locator('.az-hotel-price').nth(index).innerText(), new RegExp(price.toLocaleString('en-IN')));
    assert.match(await page.locator('.az-hotel-price').nth(index).innerText(), /per adult.*twin sharing/);
    assert.match(await page.locator('#az-hotel option').nth(index).innerText(), new RegExp(price.toLocaleString('en-IN')));
  }
  await page.locator('.td-hero-image').evaluate(image => image.decode());
  await page.screenshot({ path: `${output}/desktop-top.png` });
  await page.screenshot({ path: `${output}/desktop-full.png`, fullPage: true });
  assert.equal(await page.locator('.az-day').count(), 5);
  await page.locator('.az-day summary').nth(1).click();
  assert.equal(await page.locator('.az-day').nth(1).locator('.az-attractions li').count(), 8);
  assert.match(await page.locator('.az-day').nth(1).innerText(), /exterior visit/);
  assert.equal(await page.locator('.az-inclusions-grid article').first().locator('li').count(), 17);
  assert.equal(await page.locator('.az-inclusions-grid article').nth(1).locator('li').count(), 9);
  for (const href of await page.locator('.az-nav a').evaluateAll(links => links.map(link => link.getAttribute('href')))) {
    assert.equal(await page.locator(href).count(), 1, `Navigation must target one existing section: ${href}`);
  }
  await page.getByRole('button', { name: 'Select 4-star option' }).click();
  assert.equal(await page.locator('#az-hotel').inputValue(), '1');
  assert.match(await page.locator('.az-selection').innerText(), /Parkside Hotel[\s\S]*31,850 per adult.*twin sharing/);
  assert.match(await page.locator('.az-quote-summary').innerText(), /31,850[\s\S]*per adult.*twin sharing/);
  assert.match(await page.locator('.az-quote-summary').innerText(), /Package total for 2 adults:.*63,700/);
  await page.locator('#az-name').fill('Preview Test');
  await page.locator('#az-phone').fill('+919876543210');
  await page.locator('#az-email').fill('preview@example.com');
  await page.locator('#az-date').fill('2027-06-15');
  let payload;
  let fail = true;
  await page.route('**/api/holiday-form/', async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: fail ? 500 : 201, contentType: 'application/json', body: fail ? '{"detail":"Simulated failure"}' : '{"id":0}' });
  });
  await page.getByRole('button', { name: 'Enquire about Azerbaijan', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('#az-name').inputValue(), 'Preview Test');
  fail = false;
  await page.getByRole('button', { name: 'Enquire about Azerbaijan', exact: true }).click();
  await page.locator('.az-success').waitFor();
  assert.equal(payload.budget, '63700');
  assert.equal(payload.adults, 2);
  assert.equal(payload.rooms, 1);
  assert.equal(payload.nights, 4);
  assert.equal(payload.star_rating, '4');
  assert.match(payload.message, /total package price INR 63700 for 2 adults together/i);
  assert.match(payload.message, /Price per adult on twin sharing: INR 31850/);
  await page.getByRole('button', { name: 'Make another enquiry' }).click();
  await page.locator('#az-hotel').selectOption('0');
  assert.match(await page.locator('.az-selection').innerText(), /26,215 per adult.*twin sharing/);
  assert.match(await page.locator('.az-quote-summary').innerText(), /Package total for 2 adults:.*52,430/);
  await page.getByRole('button', { name: 'Enquire about Azerbaijan', exact: true }).click();
  await page.locator('.az-success').waitFor();
  assert.equal(payload.budget, '52430');
  assert.equal(payload.star_rating, '3');
  assert.match(payload.message, /Metro City Hotel/);
  assert.match(payload.message, /Price per adult on twin sharing: INR 26215/);
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${base}/azerbaijan`, { waitUntil: 'networkidle' });
    await page.locator('.td-hero-image').evaluate(image => image.decode());
    const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(size.scroll <= size.viewport, `Horizontal overflow at ${width}`);
    if (width === 390) {
      await page.screenshot({ path: `${output}/mobile-top.png` });
      await page.screenshot({ path: `${output}/mobile-full.png`, fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  const report = { passed: true, checks: ['Homepage international card opens Azerbaijan', 'Per-adult twin-sharing prices 26215 and 31850 shown in cards and form options', 'Five days, eight city attractions, 17 inclusions, nine exclusions', 'Hotel selection updates the per-adult price and two-adult enquiry total', 'Mocked failed request retains input', 'Both hotel enquiry payloads retain the correct total and include the per-adult rate', 'No page overflow at 320px, 390px or 768px', 'No browser JavaScript errors'], note: 'No live enquiries submitted; API success and error responses were mocked.' };
  await fs.writeFile(`${output}/verification.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
