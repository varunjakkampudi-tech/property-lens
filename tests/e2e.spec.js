const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const cities = ['Vizag', 'Tanuku', 'Palakollu', 'Bhimavaram', 'Eluru'];
const categories = ['Flats', 'Independent Houses', 'Plots'];

async function inventory(page) {
  return page.evaluate(() => window.PROPERTY_DATA.filter(p =>
    typeof p.price === 'number' && Number.isFinite(p.price) && p.price >= 0 && p.price < 50
  ));
}

function matching(leads, city, category, ceiling = 50) {
  return leads.filter(p =>
    (city === 'all' || p.city === city) &&
    (category === 'all' || p.category === category) &&
    p.price <= ceiling
  );
}

async function assertA11y(page) {
  const report = await new AxeBuilder({ page }).analyze();
  expect(report.violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);
}

async function assertNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function chooseCategory(page, city, category) {
  await page.locator('[data-city="' + city + '"]').click();
  await page.locator('[data-category="' + category + '"]').click();
}

test.describe('Property Lens production flows', () => {
  test('mobile: every city and category renders the current dataset, including zero-inventory states', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));
    await page.goto('/');
    const leads = await inventory(page);
    await expect(page.locator('#mobilePropertyApp')).toBeVisible();
    await expect(page.locator('.mpl-city')).toHaveCount(cities.length);
    await expect(page.locator('.skip-link')).toHaveAttribute('href', '#mplMain');
    await assertNoHorizontalOverflow(page);
    await assertA11y(page);
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-01-location.png', fullPage: false });

    for (const city of cities) {
      const cityCount = matching(leads, city, 'all').length;
      await expect(page.locator('[data-city="' + city + '"]')).toContainText(cityCount + ' listed');
      await page.locator('[data-city="' + city + '"]').click();
      await expect(page.getByRole('heading', { name: 'What are you looking for?' })).toBeVisible();
      await expect(page.locator('.mpl-category-card')).toHaveCount(categories.length);

      for (const category of categories) {
        const count = matching(leads, city, category).length;
        const chooser = page.locator('[data-category="' + category + '"]');
        await expect(chooser).toContainText(count + ' listed');
        if (!count) {
          await expect(chooser).toBeDisabled();
          continue;
        }
        await chooser.click();
        await expect(page.locator('.mpl-property')).toHaveCount(count);
        const labels = await page.locator('.mpl-property .mpl-loc').allTextContents();
        expect(labels.every(label => label.includes(city))).toBeTruthy();
        await assertNoHorizontalOverflow(page);
        if (city === cities[0] && category === 'Flats') {
          await assertA11y(page);
          await page.screenshot({ path: 'visual-' + testInfo.project.name + '-02-listings.png', fullPage: false });
        }
        await page.locator('.mpl-back').click();
        await expect(page.getByRole('heading', { name: 'What are you looking for?' })).toBeVisible();
      }
      await page.locator('.mpl-back').click();
      await expect(page.getByRole('heading', { name: 'Where do you want to buy?' })).toBeVisible();
    }
  });

  test('mobile: details, persistent filters, compare and shortlist retain their context', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));
    await page.goto('/');
    const leads = await inventory(page);
    const group = cities.flatMap(city => categories.map(category => ({
      city, category, count: matching(leads, city, category).length
    }))).find(item => item.count >= 2);
    test.skip(!group, 'Two leads in one category are needed for the compare journey');

    await chooseCategory(page, group.city, group.category);
    await expect(page.locator('.mpl-property')).toHaveCount(group.count);

    await page.locator('.mpl-details').first().click();
    const details = page.locator('#mobilePropertyDialog');
    await expect(details).toHaveJSProperty('open', true);
    await assertA11y(page);
    await page.screenshot({ path: 'visual-' + testInfo.project.name + '-03-details.png', fullPage: false });
    await details.locator('[data-close]').click();

    await page.locator('.mpl-filter-btn').click();
    await expect(page.locator('#mplFilters')).toBeVisible();
    await expect(page.locator('.mpl-filter-btn')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#mplBudget').selectOption('30');
    await expect(page.locator('#mplFilters')).toBeVisible();
    await expect(page.locator('.mpl-property')).toHaveCount(matching(leads, group.city, group.category, 30).length);
    await page.locator('#mplBudget').selectOption('50');
    await expect(page.locator('.mpl-property')).toHaveCount(group.count);

    await page.locator('.mpl-compare-toggle').first().click();
    await page.locator('.mpl-compare-toggle').nth(1).click();
    await page.locator('.mpl-bottom-nav [data-nav="compare"]').click();
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Compare');
    await expect(page.locator('.mpl-property')).toHaveCount(2);
    await page.locator('.mpl-compare-toggle').first().click();
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Compare');
    await expect(page.locator('.mpl-property')).toHaveCount(1);
    await page.locator('.mpl-heart').first().click();
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Compare');
    await expect(page.locator('.mpl-property')).toHaveCount(1);
    await page.locator('.mpl-bottom-nav [data-nav="saved"]').click();
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Saved properties');
    await expect(page.locator('.mpl-property')).toHaveCount(1);
  });

  test('mobile: typing updates only results and preserves input focus and caret', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));
    await page.goto('/');
    const leads = await inventory(page);
    const first = leads[0];
    test.skip(!first, 'No active leads available for this journey');
    await chooseCategory(page, first.city, first.category);
    const search = page.locator('#mplSearch');
    const term = first.locality.trim().split(/[\s,/()-]+/)[0];
    const expected = matching(leads, first.city, first.category).filter(p =>
      (p.name + ' ' + p.locality + ' ' + p.city + ' ' + (p.poster || '') + ' ' + (p.platform || '')).toLowerCase().includes(term.toLowerCase())
    ).length;
    await search.pressSequentially(term, { delay: 30 });
    await expect(search).toBeFocused();
    await expect(search).toHaveValue(term);
    await expect(page.locator('.mpl-property')).toHaveCount(expected);
    await search.fill('');
    await expect(page.locator('.mpl-property')).toHaveCount(matching(leads, first.city, first.category).length);
    await assertA11y(page);
  });

  test('mobile: budget options enforce the strict under-50L ceiling', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'));
    await page.goto('/');
    const leads = await inventory(page);
    const first = leads[0];
    test.skip(!first, 'No active leads available for this journey');
    await chooseCategory(page, first.city, first.category);
    await page.locator('.mpl-filter-btn').click();
    await expect(page.locator('#mplBudget')).toHaveValue('50');
    for (const ceiling of [20, 25, 30, 35, 40, 45, 50]) {
      await page.locator('#mplBudget').selectOption(String(ceiling));
      await expect(page.locator('#mplFilters')).toBeVisible();
      await expect(page.locator('.mpl-property')).toHaveCount(matching(leads, first.city, first.category, ceiling).length);
    }
    expect(leads.every(p => p.price < 50)).toBeTruthy();
  });

  test('desktop: current inventory, detail enrichment, filters and accessibility', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.goto('/');
    const leads = await inventory(page);
    await expect(page.locator('#mobilePropertyApp')).toBeHidden();
    await expect(page.locator('.skip-link')).toHaveAttribute('href', '#main');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(leads.length);
    await assertA11y(page);

    test.skip(!leads.length, 'No active leads available for details');
    await page.locator('#propertyGrid .details-btn').first().click();
    const dialog = page.locator('#detailsDialog');
    await expect(dialog).toHaveJSProperty('open', true);
    await expect(dialog.locator('.source-detail-panel')).toHaveCount(1);
    await page.waitForTimeout(150);
    await expect(dialog.locator('.source-detail-panel')).toHaveCount(1);
    await expect(dialog).toHaveAttribute('data-property-id', leads.slice().sort((a, b) => b.score - a.score)[0].id);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toHaveJSProperty('open', true);

    await page.locator('#cityFilter').selectOption('Palakollu');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(matching(leads, 'Palakollu', 'all').length);
    await page.locator('#budgetFilter').selectOption('30');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(matching(leads, 'Palakollu', 'all', 30).length);
    await page.screenshot({ path: 'visual-desktop-palakollu.png', fullPage: false });
  });

  test('desktop: visited state survives filtering and malformed saved storage', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.addInitScript(() => localStorage.setItem('ap-shortlist', '{"unexpected":true}'));
    await page.goto('/');
    const leads = await inventory(page);
    test.skip(!leads.length, 'No leads to mark visited');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(leads.length);
    const firstId = leads.slice().sort((x, y) => y.score - x.score)[0].id;
    await page.locator('#propertyGrid [data-visited]').first().click();
    await page.locator('.nav-item[data-nav="visited"]').click();
    await expect(page.locator('#resultsTitle')).toHaveText('Visited properties');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(1);
    await page.locator('#budgetFilter').selectOption('20');
    await expect(page.locator('#resultsTitle')).toHaveText('Visited properties');
    const visited = leads.find(p => p.id === firstId);
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(visited.price <= 20 ? 1 : 0);
    await page.locator('#budgetFilter').selectOption('50');
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(1);
    await page.locator('.nav-item[data-nav="dashboard"]').click();
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(leads.length);
  });

  test('desktop: crossing the responsive breakpoint keeps both navigation systems functional', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.goto('/');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#mobilePropertyApp')).toBeVisible();
    await expect(page.locator('.skip-link')).toHaveAttribute('href', '#mplMain');
    await page.locator('[data-city="Eluru"]').click();
    await expect(page.getByRole('heading', { name: 'What are you looking for?' })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.locator('#mobilePropertyApp')).toBeHidden();
    await expect(page.locator('.skip-link')).toHaveAttribute('href', '#main');
    await expect(page.locator('#propertyGrid .property-card').first()).toBeVisible();
  });
  test('desktop and mobile share the same saved-property state across viewport changes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.goto('/');
    const leads = await inventory(page);
    test.skip(!leads.length, 'No lead available to save');
    await page.locator('#propertyGrid [data-shortlist]').first().click();
    await expect(page.locator('#shortlistCount')).toHaveText('1');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.mpl-saved-head').click();
    await expect(page.locator('.mpl-topcopy strong')).toHaveText('Saved properties');
    await expect(page.locator('.mpl-property')).toHaveCount(1);
    await page.locator('.mpl-heart').click();
    await expect(page.locator('.mpl-property')).toHaveCount(0);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.locator('#shortlistCount')).toHaveText('0');
    await page.locator('#shortlistBtn').click();
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(0);
  });

  test('source results are labeled differently from direct listing URLs', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.goto('/');
    const leads = await inventory(page);
    const searchResult = leads.find(p => p.linkType !== 'Direct listing');
    test.skip(!searchResult, 'No source-results lead currently present');
    const card = page.locator('#propertyGrid .property-card').filter({
      has: page.locator('[data-details="' + searchResult.id + '"]')
    });
    await expect(card.locator('.source-link').first()).toHaveAttribute('aria-label', /Open source results/);
    await card.locator('[data-details]').click();
    await expect(page.locator('#detailsDialog .source-detail-actions')).toContainText('Open source results');
    await page.keyboard.press('Escape');

    await page.setViewportSize({ width: 390, height: 844 });
    await chooseCategory(page, searchResult.city, searchResult.category);
    const mobileCard = page.locator('.mpl-property').filter({
      has: page.locator('[data-details="' + searchResult.id + '"]')
    });
    await expect(mobileCard.locator('.mpl-actions a').first()).toContainText('Open source results');
  });

  test('desktop: location and category flow stays simple and data-driven', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop');
    await page.goto('/');
    const leads = await inventory(page);
    await expect(page.locator('.city-card')).toHaveCount(cities.length);
    await expect(page.locator('#desktopCategoryStep')).toBeHidden();
    await expect(page.locator('#propertyGrid .property-card')).toHaveCount(leads.length);
    await expect(page.locator('.desktop-resources .source-evidence')).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await assertA11y(page);
    await page.screenshot({ path: 'visual-desktop-refresh-location.png', fullPage: false });

    for (const city of cities) {
      const cityCount = matching(leads, city, 'all').length;
      await expect(page.locator('[data-city-card="' + city + '"]')).toContainText(cityCount + ' listed');
      await page.locator('[data-city-card="' + city + '"]').click();
      await expect(page.locator('#desktopCategoryStep')).toBeVisible();
      await expect(page.locator('.desktop-category-card')).toHaveCount(4);
      await expect(page.locator('#propertyGrid .property-card')).toHaveCount(cityCount);
      for (const category of categories) {
        const count = matching(leads, city, category).length;
        const button = page.locator('[data-category-card="' + category + '"]');
        await expect(button).toContainText(count + ' listed');
        if (!count) { await expect(button).toBeDisabled(); continue; }
        await button.click();
        await expect(page.locator('#propertyGrid .property-card')).toHaveCount(count);
        await expect(page.locator('#resultsTitle')).toContainText(category);
        await assertNoHorizontalOverflow(page);
        if (city === 'Vizag' && category === 'Flats') {
          await assertA11y(page);
          await page.screenshot({ path: 'visual-desktop-refresh-category.png', fullPage: false });
        }
      }
      await page.locator('#allLocations').click();
      await expect(page.locator('#desktopCategoryStep')).toBeHidden();
      await expect(page.locator('#propertyGrid .property-card')).toHaveCount(leads.length);
    }
    await page.locator('.desktop-resources > summary').click();
    await expect(page.locator('.desktop-resources .source-evidence')).toBeVisible();
  });

  test('brand, typography and professional icon assets work at desktop and mobile sizes', async ({ page }) => {
    await page.goto('/');
    const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(font).toContain('Manrope');
    const logo = await page.request.get('/assets/favicon.svg');
    const icons = await page.request.get('/assets/icons.svg');
    const theme = await page.request.get('/assets/design-refresh.css');
    expect(logo.ok()).toBeTruthy();
    expect(icons.ok()).toBeTruthy();
    expect(theme.ok()).toBeTruthy();
    expect(await icons.text()).toContain('id="heart"');
    await expect(page.locator('#mobilePropertyApp')).toHaveCount(1);
    if (page.viewportSize().width > 850) {
      await expect(page.locator('.brand-mark img')).toBeVisible();
      await expect(page.locator('.nav-item .pl-icon').first()).toBeVisible();
    } else {
      await expect(page.locator('.mpl-logo img')).toBeVisible();
      await expect(page.locator('.mpl-city-icon .pl-icon').first()).toBeVisible();
    }
    await assertNoHorizontalOverflow(page);
    await assertA11y(page);
  });

});
