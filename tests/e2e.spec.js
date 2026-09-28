const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

async function seriousA11y(page) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations.filter(v => ['serious','critical'].includes(v.impact));
}

test.describe('Property Lens production flows', () => {
  test('mobile: location -> category -> listings -> details -> filters -> compare', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));

    await page.goto('/');
    const a11y = [];

    await expect(page.locator('#mobilePropertyApp')).toBeVisible();
    await expect(page.locator('.mpl-city')).toHaveCount(4);
    await expect(page.getByRole('heading', { name: 'Where do you want to buy?' })).toBeVisible();
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-01-location.png', fullPage: false });
    a11y.push(...await seriousA11y(page));

    await page.locator('[data-city="Vizag"]').click();
    await expect(page.getByRole('heading', { name: 'What are you looking for?' })).toBeVisible();
    await expect(page.locator('.mpl-category-card')).toHaveCount(3);
    await expect(page.locator('[data-category="Flats"]')).toContainText('18 active');
    await expect(page.locator('[data-category="Independent Houses"]')).toContainText('2 active');
    await expect(page.locator('[data-category="Plots"]')).toContainText('3 active');
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-02-vizag-categories.png', fullPage: false });
    a11y.push(...await seriousA11y(page));

    await page.locator('[data-category="Flats"]').click();
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Vizag');
    await expect(page.locator('.mpl-property')).toHaveCount(18);
    expect(await page.evaluate(() => window.PROPERTY_DATA.every(p => typeof p.price === 'number' && p.price >= 0 && p.price < 50))).toBeTruthy();
    const locations = await page.locator('.mpl-property .mpl-loc').allTextContents();
    expect(locations.every(x => /Vizag/i.test(x))).toBeTruthy();
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-03-vizag-flats.png', fullPage: false });
    a11y.push(...await seriousA11y(page));

    await page.locator('.mpl-back').click();
    await expect(page.getByRole('heading', { name: 'What are you looking for?' })).toBeVisible();
    await page.locator('[data-category="Plots"]').click();
    await expect(page.locator('.mpl-property')).toHaveCount(3);
    await expect(page.locator('.mpl-property').first()).toContainText('Plot');

    await page.locator('.mpl-details').first().click();
    const details = page.locator('#mobilePropertyDialog');
    await expect(details).toHaveJSProperty('open', true);
    await expect(details.locator('[data-close]')).toBeVisible();
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-04-details.png', fullPage: false });
    a11y.push(...await seriousA11y(page));
    await details.locator('[data-close]').click();

    await page.locator('.mpl-filter-btn').click();
    await expect(page.locator('#mplFilters')).toBeVisible();
    await page.locator('#mplBudget').selectOption('45');
    await expect(page.locator('.mpl-property').first()).toBeVisible();

    await page.locator('.mpl-compare-toggle').nth(0).click();
    await page.locator('.mpl-compare-toggle').nth(1).click();
    await page.locator('.mpl-bottom-nav [data-nav="compare"]').click();
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Compare');
    await expect(page.locator('.mpl-property')).toHaveCount(2);

    await page.locator('[data-nav="locations"]').click();
    await page.locator('[data-city="Bhimavaram"]').click();
    await expect(page.locator('[data-category="Flats"]')).toContainText('6 active');
    await expect(page.locator('[data-category="Independent Houses"]')).toContainText('6 active');
    await expect(page.locator('[data-category="Plots"]')).toContainText('4 active');

    expect(a11y).toEqual([]);
  });

  test('mobile: Tanuku category counts, search, save and saved navigation work', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));

    await page.goto('/');
    await page.locator('[data-city="Tanuku"]').click();
    await expect(page.locator('[data-category="Flats"]')).toContainText('2 active');
    await expect(page.locator('[data-category="Independent Houses"]')).toContainText('6 active');
    await expect(page.locator('[data-category="Plots"]')).toContainText('1 active');

    await page.locator('[data-category="Independent Houses"]').click();
    await expect(page.locator('.mpl-property')).toHaveCount(6);
    await page.locator('#mplSearch').fill('RK Nagar');
    await expect(page.locator('.mpl-property')).toHaveCount(2);
    await page.locator('#mplSearch').fill('');
    await expect(page.locator('.mpl-property')).toHaveCount(6);

    await page.locator('.mpl-heart').first().click();
    await page.locator('.mpl-bottom-nav [data-nav="saved"]').click();
    await expect(page.locator('.mpl-property')).toHaveCount(1);
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Saved properties');
  });

  test('mobile: selected price ceiling narrows results, default stays under ₹50L', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));
    await page.goto('/');
    await page.locator('[data-city="Vizag"]').click();
    await page.locator('[data-category="Flats"]').click();
    await expect(page.locator('.mpl-property')).toHaveCount(18);
    await page.locator('.mpl-filter-btn').click();
    await expect(page.locator('#mplBudget')).toHaveValue('50');
    await page.locator('#mplBudget').selectOption('30');
    await expect(page.locator('.mpl-property')).toHaveCount(1);
    await expect(page.locator('.mpl-price').first()).toContainText('₹30L');
    await page.locator('.mpl-filter-btn').click();
    await page.locator('#mplBudget').selectOption('50');
    await expect(page.locator('.mpl-property')).toHaveCount(18);
  });

  test('desktop: refreshed inventory, details, filters and accessibility remain intact', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');

    await page.goto('/');
    await expect(page.locator('#mobilePropertyApp')).toBeHidden();
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(54);
    expect(await page.evaluate(() => window.PROPERTY_DATA.every(p => typeof p.price === 'number' && p.price >= 0 && p.price < 50))).toBeTruthy();
    const desktopA11y = await seriousA11y(page);

    await page.locator('#propertyGrid .details-btn').first().click();
    const details = page.locator('#detailsDialog');
    await expect(details).toHaveJSProperty('open', true);
    await page.keyboard.press('Escape');
    await expect(details).not.toHaveJSProperty('open', true);

    await page.locator('#cityFilter').selectOption('Palakollu');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(6);
    await page.screenshot({ path: 'visual-desktop-palakollu.png', fullPage: false });

    expect(desktopA11y).toEqual([]);
  });
});
