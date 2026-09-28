const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

async function seriousA11y(page) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations.filter(v => ['serious','critical'].includes(v.impact));
}

test.describe('Property Lens production flows', () => {
  test('mobile: location-first flow, listing visual integrity, details, filters and compare', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));
    await page.goto('/');
    const a11y = [];
    await expect(page.locator('#mobilePropertyApp')).toBeVisible();
    await expect(page.locator('.mpl-city')).toHaveCount(4);
    await expect(page.getByRole('heading', { name: 'Where do you want to buy?' })).toBeVisible();
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-01-location.png', fullPage: false });
    a11y.push(...await seriousA11y(page));

    await page.locator('[data-city="Vizag"]').click();
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Vizag');
    await expect(page.locator('.mpl-property')).toHaveCount(18);
    const locations = await page.locator('.mpl-property .mpl-loc').allTextContents();
    expect(locations.every(x => /Vizag/i.test(x))).toBeTruthy();
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-02-vizag-top.png', fullPage: false });
    a11y.push(...await seriousA11y(page));

    const last = page.locator('.mpl-property').last();
    await last.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 500));
    const overlap = await page.evaluate(() => {
      const card = document.querySelector('.mpl-property:last-child').getBoundingClientRect();
      const nav = document.querySelector('.mpl-bottom-nav').getBoundingClientRect();
      return { hiddenPixels: Math.max(0, card.bottom - nav.top) };
    });
    expect(overlap.hiddenPixels).toBe(0);
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-03-last-card.png', fullPage: false });

    await page.locator('.mpl-details').first().click();
    const details = page.locator('#mobilePropertyDialog');
    await expect(details).toHaveJSProperty('open', true);
    await expect(details.locator('[data-close]')).toBeVisible();
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-04-details.png', fullPage: false });
    a11y.push(...await seriousA11y(page));
    await details.locator('[data-close]').click();
    await expect(details).not.toHaveJSProperty('open', true);

    await page.locator('.mpl-filter-btn').click();
    await expect(page.locator('#mplFilters')).toBeVisible();
    await expect(page.locator('.mpl-filter-btn')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#mplBudget').selectOption('45');
    await expect(page.locator('.mpl-property').first()).toBeVisible();

    await page.locator('.mpl-compare-toggle').nth(0).click();
    await page.locator('.mpl-compare-toggle').nth(1).click();
    await page.locator('.mpl-bottom-nav [data-nav="compare"]').click();
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Compare');
    await expect(page.locator('.mpl-property')).toHaveCount(2);

    await page.locator('.mpl-back').click();
    await expect(page.getByRole('heading', { name: 'Where do you want to buy?' })).toBeVisible();
    await page.locator('[data-city="Bhimavaram"]').click();
    await expect(page.locator('.mpl-property')).toHaveCount(12);
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Bhimavaram');
    expect(a11y).toEqual([]);
  });

  test('mobile: search, save and saved navigation work', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));
    await page.goto('/');
    await page.locator('[data-city="Tanuku"]').click();
    await expect(page.locator('.mpl-property')).toHaveCount(8);
    await page.locator('#mplSearch').fill('RK Nagar');
    await expect(page.locator('.mpl-property')).toHaveCount(2);
    await page.locator('#mplSearch').fill('');
    await expect(page.locator('.mpl-property')).toHaveCount(8);
    await page.locator('.mpl-heart').first().click();
    await page.locator('.mpl-bottom-nav [data-nav="saved"]').click();
    await expect(page.locator('.mpl-property')).toHaveCount(1);
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Saved properties');
  });

  test('desktop: browse, details, filters and accessibility remain intact', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.goto('/');
    await expect(page.locator('#mobilePropertyApp')).toBeHidden();
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(42);
    const desktopA11y = await seriousA11y(page);
    await page.locator('#propertyGrid .details-btn').first().click();
    const details = page.locator('#detailsDialog');
    await expect(details).toHaveJSProperty('open', true);
    await page.keyboard.press('Escape');
    await expect(details).not.toHaveJSProperty('open', true);
    await page.locator('#cityFilter').selectOption('Palakollu');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(4);
    await page.screenshot({ path: 'visual-desktop-palakollu.png', fullPage: false });
    expect(desktopA11y).toEqual([]);
  });
});