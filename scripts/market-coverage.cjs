'use strict';

/*
 * Transparent comparable-coverage report. This intentionally reuses the same
 * renderer method as the UI so the report cannot overstate supported values.
 */
const fs = require('node:fs');
const vm = require('node:vm');

function loadDataset(filename = 'data/properties.js') {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { timeout: 3000 });
  vm.runInNewContext(fs.readFileSync('assets/core.js', 'utf8'), sandbox, { timeout: 3000 });
  return sandbox.window.PROPERTY_DATA;
}

function increment(group, key, supported) {
  const item = group[key] || { total: 0, supported: 0 };
  item.total++;
  if (supported) item.supported++;
  group[key] = item;
}

function report(leads = loadDataset(), asOf = process.env.COVERAGE_AS_OF || new Date().toISOString().slice(0, 10)) {
  if (!Array.isArray(leads)) throw new Error('Property dataset is missing');
  const core = (() => {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync('assets/core.js', 'utf8'), sandbox, { timeout: 3000 });
    return sandbox.window.PropertyLensCore;
  })();
  const byCity = {};
  const byType = {};
  const reasons = {};
  let supported = 0;
  let directLinks = 0;
  let resultsLinks = 0;
  for (const lead of leads) {
    const estimate = core.comparableMarketValue(lead, leads, asOf);
    const isSupported = Boolean(estimate);
    if (isSupported) supported++;
    if (lead.linkType === 'Direct listing') directLinks++;
    else if (lead.linkType === 'Results page') resultsLinks++;
    increment(byCity, lead.city, isSupported);
    increment(byType, lead.type, isSupported);
    if (!isSupported) {
      const reason = lead.category === 'Independent Houses' || lead.type === 'Villa'
        ? 'house-or-villa-land-building-methodology'
        : lead.linkType !== 'Direct listing'
          ? 'requires-direct-listing-evidence'
          : 'insufficient-recent-like-for-like-comparables';
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
  }
  const percentage = value => leads.length ? Number((value / leads.length * 100).toFixed(1)) : 0;
  for (const group of [byCity, byType]) for (const item of Object.values(group)) item.coveragePct = percentage(item.supported);
  return {
    asOf,
    totalProperties: leads.length,
    supportedBenchmarks: supported,
    unsupportedProperties: leads.length - supported,
    coveragePct: percentage(supported),
    sourceLinks: { directListing: directLinks, resultsPage: resultsLinks, other: leads.length - directLinks - resultsLinks },
    byCity,
    byType,
    unsupportedReasons: reasons,
    methodology: 'Uses the same strict renderer estimator: recent, same-city/category/type/unit peers, compatible size and age, three local or five flat city-wide direct listings. It is an asking-price comparison, not an appraisal.'
  };
}

if (require.main === module) console.log(JSON.stringify(report(), null, 2));

module.exports = { loadDataset, report };
