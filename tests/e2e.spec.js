const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

async function seriousA11y(page) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations.filter(v => ['serious','critical'].includes(v.impact));
}

test.describe('Property Lens production flows', () => {
  test('mobile: location → listings → last card → details close → filters → compare', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));

    await page.goto('/');
    const a11yViolations = [];
    await expect(page.locator('#mobileLocationScreen')).toBeVisible();
    await expect(page.locator('[data-mobile-city]')).toHaveCount(4);
    await page.screenshot({ path: `visual-${testInfo.project.name}-01-location.png`, fullPage: true });
    a11yViolations.push(...await seriousA11y(page));

    await page.getByRole('button', { name: /Vizag/ }).click();
    await expect(page.locator('body')).toHaveClass(/mobile-city-mode/);
    await expect(page.locator('#mobileSelectedCity')).toHaveText('Vizag');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(18);

    const locations = await page.locator('#propertyGrid .property-card .location').allTextContents();
    expect(locations.every(x => /Vizag/i.test(x))).toBeTruthy();
    await page.screenshot({ path: `visual-${testInfo.project.name}-02-vizag-top.png`, fullPage: false });

    const last = page.locator('#propertyGrid .property-card').last();
    await last.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 500));
    const overlap = await page.evaluate(() => {
      const card = document.querySelector('#propertyGrid .property-card:last-child').getBoundingClientRect();
      const nav = document.querySelector('.mobile-bottom-nav').getBoundingClientRect();
      return { cardBottom: card.bottom, navTop: nav.top, hiddenPixels: Math.max(0, card.bottom - nav.top) };
    });
    expect(overlap.hiddenPixels).toBe(0);
    await page.screenshot({ path: `visual-${testInfo.project.name}-03-last-card.png`, fullPage: false });

    await last.getByRole('button', { name: 'View details' }).click();
    const details = page.locator('#detailsDialog');
    await expect(details).toHaveJSProperty('open', true);
    await expect(details.locator('[data-dialog-close]')).toBeVisible();
    await page.screenshot({ path: `visual-${testInfo.project.name}-04-details.png`, fullPage: false });
    a11yViolations.push(...await seriousA11y(page));

    await details.locator('[data-dialog-close]').click();
    await expect(details).not.toHaveJSProperty('open', true);

    await last.getByRole('button', { name: 'View details' }).click();
    await page.keyboard.press('Escape');
    await expect(details).not.toHaveJSProperty('open', true);

    await page.locator('#mobileQuickFilter').click();
    await expect(page.locator('.filter-panel')).toHaveClass(/mobile-filter-open/);
    await expect(page.locator('#mobileQuickFilter')).toHaveAttribute('aria-expanded', 'true');

    await page.locator('#mobileQuickFilter').click();
    await expect(page.locator('#mobileQuickFilter')).toHaveAttribute('aria-expanded', 'false');

    await page.locator('#propertyGrid [data-compare]').nth(0).click();
    await page.locator('#propertyGrid [data-compare]').nth(1).click();
    await page.locator('#mobileCompare').click();
    const compare = page.locator('#compareDialog');
    await expect(compare).toHaveJSProperty('open', true);
    await compare.locator('[data-dialog-close]').click();
    await expect(compare).not.toHaveJSProperty('open', true);

    await page.locator('#mobileLocations').click();
    await expect(page.locator('#mobileLocationScreen')).toBeVisible();
    await page.getByRole('button', { name: /Bhimavaram/ }).click();
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(12);
    await expect(page.locator('#mobileSelectedCity')).toHaveText('Bhimavaram');
    expect(a11yViolations).toEqual([]);
  });

  test('mobile: search, save and saved filter work', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));
    await page.goto('/');
    await page.getByRole('button', { name: /Tanuku/ }).click();
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(8);

    await page.locator('#searchInput').fill('RK Nagar');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(2);
    await page.locator('#searchInput').fill('');

    const firstHeart = page.locator('#propertyGrid [data-shortlist]').first();
    await firstHeart.click();
    await page.locator('#mobileSaved').click();
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(1);
  });

  test('desktop: browse, details, close, filters and accessibility', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.goto('/');
    await expect(page.locator('#mobileLocationScreen')).toBeHidden();
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(42);
    const desktopA11y = await seriousA11y(page);

    await page.locator('#propertyGrid .details-btn').first().click();
    const details = page.locator('#detailsDialog');
    await expect(details).toHaveJSProperty('open', true);
    await details.locator('[data-dialog-close]').click();
    await expect(details).not.toHaveJSProperty('open', true);

    await page.locator('#cityFilter').selectOption('Palakollu');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(4);
    await page.screenshot({ path: 'visual-desktop-palakollu.png', fullPage: false });
    expect(desktopA11y).toEqual([]);
  });
});
