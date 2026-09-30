import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => sessionStorage.setItem('generalEnquiryShown', 'true'));
const option = { optionId: 'o1', roomInfo: [{ name: 'Deluxe' }], mealBasis: 'Breakfast', pricing: { totalPrice: 12500, basePrice: 10000, taxes: 2000, mf: 400, mft: 100, currency: 'INR' }, bookingNotes: 'Bring a valid photo ID.', cancellation: { penalties: [{ from: '2026-09-30T00:00:00', to: '2027-01-01T00:00:00', amount: 500 }] }, compliance: { panRequired: true } };
await page.route('**/api/**', async route => {
  const path = new URL(route.request().url()).pathname;
  let data = [];
  if (path.endsWith('/hotels/nationalities/')) data = [{ countryId: '106', countryName: 'India' }];
  if (path.endsWith('/hotels/countries/')) data = ['INDIA', 'UNITED ARAB EMIRATES'];
  if (path.endsWith('/hotels/destinations/')) data = [{ cityRegionId: 1, fullRegionName: 'DELHI, INDIA' }];
  if (path.endsWith('/hotels/search/')) {
    const body = route.request().postDataJSON();
    assert.equal(body.regionId, '1'); assert.equal(body.nationality, '106'); assert.equal(body.rooms[0].children, 1); assert.deepEqual(body.rooms[0].childAge, [5]);
    data = { hotels: [{ tjHotelId: '123', name: 'Example Hotel', options: [option], static: { star_rating: '5', property_type: { name: 'Hotel' } } }, { tjHotelId: '456', name: 'Second Hotel', options: [option], static: { star_rating: '4', property_type: { name: 'Hotel' } } }, { tjHotelId: '789', name: 'Unrated Hotel', options: [option], static: { property_type: { name: 'Hotel' } } }], token: 'search', expiresAt: Date.now() / 1000 + 900 };
  }
  if (path.endsWith('/hotels/pricing/')) {
    assert.equal(route.request().postDataJSON().token, 'search');
    data = { hotelName: 'Example Hotel', options: [option], token: 'detail' };
  }
  if (path.endsWith('/hotels/review/')) {
    assert.deepEqual(route.request().postDataJSON(), { token: 'detail', optionId: 'o1' });
    data = { hotelName: 'Example Hotel', option };
  }
  await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
});
try {
  await mkdir('output/hotels', { recursive: true });
  await page.goto(`${process.env.VERIFY_BASE_URL || 'http://127.0.0.1:5174'}/hotel`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.setViewportSize({ width: 1103, height: 850 });
  const flights = await page.locator('nav a[href="/flights"]').boundingBox();
  const hotels = await page.locator('nav a[href="/hotel"]').boundingBox();
  const visa = await page.locator('nav a[href="/visa"]').boundingBox();
  assert.ok(flights && hotels && visa && flights.x < hotels.x && hotels.x < visa.x);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.screenshot({ path: 'output/hotels/search-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'output/hotels/search-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.getByLabel('Destination', { exact: true }).fill('Delhi');
  await page.getByRole('button', { name: /DELHI, INDIA/ }).click();
  assert.equal(await page.getByLabel('Guest nationality').count(), 0);
  await page.getByRole('button', { name: 'More Options' }).click();
  await page.locator('.hotel-rating-menu summary').click();
  for (const star of [5, 4, 3]) assert.equal(await page.getByRole('checkbox', { name: `${star} Star`, exact: true }).isChecked(), true);
  for (const star of [2, 1]) assert.equal(await page.getByRole('checkbox', { name: `${star} Star`, exact: true }).isChecked(), false);
  assert.equal(await page.getByRole('checkbox', { name: 'Unrated', exact: true }).isChecked(), false);
  await page.screenshot({ path: 'output/hotels/rating-menu.png' });
  await page.getByRole('checkbox', { name: '4 Star', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: '3 Star', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Unrated', exact: true }).check();
  await page.locator('.hotel-rating-menu summary').click();
  await page.getByLabel('Guest nationality').selectOption('106');
  await page.getByLabel('Country of residence').selectOption('UNITED ARAB EMIRATES');
  assert.equal(await page.getByLabel('Country of residence').inputValue(), 'UNITED ARAB EMIRATES');
  await page.screenshot({ path: 'output/hotels/more-options-desktop.png', fullPage: true });
  await page.getByRole('button', { name: /Rooms & guests/ }).click();
  await page.getByRole('button', { name: 'Add children room 1' }).click();
  await page.getByLabel('Child 1 age room 1').selectOption('5');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await page.getByRole('button', { name: 'Search hotels', exact: true }).click();
  await page.waitForURL('**/hotel/results');
  assert.equal(await page.locator('.hotel-list-card').count(), 2);
  await page.getByLabel('Search hotels by name').fill('Missing');
  await page.getByText('No hotels match these filters.').waitFor();
  await page.getByRole('button', { name: 'Reset all' }).click();
  assert.equal(await page.locator('.hotel-list-card').count(), 3);
  await page.getByText('5 star').first().waitFor();
  await page.screenshot({ path: 'output/hotels/results-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'View rooms', exact: true }).first().click();
  await page.getByText('Price breakdown and cancellation policy').click();
  await page.getByText('Management fee tax', { exact: true }).waitFor();
  await page.getByText('Bring a valid photo ID.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Review this room', exact: true }).click();
  await page.waitForURL('**/hotel/review');
  await page.getByRole('heading', { name: /Review your stay.*Example Hotel/ }).waitFor();
  await page.screenshot({ path: 'output/hotels/review-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'output/hotels/review-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  const fallback = await browser.newPage();
  let fallbackSearches = 0;
  await fallback.addInitScript(() => sessionStorage.setItem('generalEnquiryShown', 'true'));
  await fallback.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/hotels/search/')) fallbackSearches += 1;
    const data = path.endsWith('/hotels/nationalities/') ? [{ countryId: 'local:1', countryName: 'India', source: 'local' }]
      : path.endsWith('/hotels/countries/') ? ['INDIA']
        : path.endsWith('/hotels/destinations/') ? [{ cityRegionId: 1, cityName: 'Delhi', fullRegionName: 'DELHI, INDIA' }] : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await fallback.goto(`${process.env.VERIFY_BASE_URL || 'http://127.0.0.1:5174'}/hotel`, { waitUntil: 'domcontentloaded' });
  await fallback.getByText('Showing local country and nationality choices.').waitFor();
  await fallback.getByRole('button', { name: 'More Options' }).click();
  await fallback.getByLabel('Guest nationality').selectOption('local:1');
  await fallback.getByLabel('Country of residence').selectOption('INDIA');
  await fallback.getByLabel('Destination', { exact: true }).fill('Delhi');
  await fallback.getByRole('button', { name: /DELHI, INDIA/ }).click();
  await fallback.getByRole('button', { name: 'Search hotels', exact: true }).click();
  await fallback.getByText('Live hotel search needs a TripJack hotel API key.').waitFor();
  assert.equal(fallbackSearches, 0);
  await fallback.close();
  console.log('Passed hotel search and review, local dropdown fallback, supplier-ID guard and mobile overflow checks. Supplier APIs mocked.');
} finally { await browser.close(); }
