import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const base = 'http://127.0.0.1:5174';
const output = new URL('../../../output/design/thailand/', import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => sessionStorage.setItem('generalEnquiryShown', 'true'));
await page.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  return url.origin === base ? route.continue() : route.abort();
});
try {
  await page.goto(`${base}/trendinginternationaldestination`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'View Thailand package' }).click();
  await page.locator('#th-title').waitFor();
  assert.equal(new URL(page.url()).pathname, '/thailand');
  assert.equal(await page.locator('.bl-day').count(), 4);
  assert.equal(await page.locator('.th-rates tbody tr').count(), 5);
  let payload, fail = true, submissions = 0;
  await page.route('**/api/holiday-form/', async route => {
    submissions++;
    payload = route.request().postDataJSON();
    await route.fulfill({ status: fail ? 500 : 201, contentType: 'application/json', body: '{}' });
  });
  await page.locator('#th-name').fill('Preview Test');
  await page.locator('#th-phone').fill('123');
  await page.locator('#th-email').fill('preview@example.com');
  await page.locator('#th-date').fill('2027-01-10');
  const submit = page.getByRole('button', { name: 'Enquire about Thailand', exact: true });
  await submit.click();
  await page.getByRole('alert').waitFor();
  assert.equal(submissions, 0);
  await page.locator('#th-phone').fill('+919876543210');
  await submit.click();
  await page.getByRole('alert').filter({ hasText: 'could not send' }).waitFor();
  assert.equal(await page.locator('#th-name').inputValue(), 'Preview Test');
  fail = false;
  for (const [adults, rate] of [[2,13499],[4,11399],[6,10599],[8,9999],[10,9499]]) {
    await page.locator('#th-adults').selectOption(String(adults));
    assert.ok((await page.locator('.bl-enquiry-summary').innerText()).includes((adults * rate).toLocaleString('en-IN')));
    await submit.click();
    await page.locator('.bl-success').waitFor();
    assert.equal(payload.adults, adults);
    assert.equal(payload.rooms, adults / 2);
    assert.equal(payload.budget, String(adults * rate));
    assert.equal(payload.room_details.length, adults / 2);
    assert.ok(payload.room_details.every(room => room.adults === 2));
    assert.deepEqual(payload.cities, [{ destination: 'Pattaya', nights: 2 }, { destination: 'Bangkok', nights: 1 }]);
    assert.ok(payload.transfer_details.length <= 100);
    await page.getByRole('button', { name: 'Make another enquiry' }).click();
  }
  for (const width of [1440,768,390,320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/thailand`, { waitUntil: 'networkidle' });
    await page.locator('.thailand-page img').evaluateAll(images => Promise.all(images.map(img => { img.loading = 'eager'; return img.decode(); })));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `overflow at ${width}`);
    if ([1440,390].includes(width)) await page.screenshot({ path: fileURLToPath(new URL(`page-${width}.png`, output)), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: Thailand card, itinerary, rates, all five enquiry payloads, validation, failure recovery, images and responsive layout. API mocked; no enquiries sent.');
} finally { await browser.close(); }
