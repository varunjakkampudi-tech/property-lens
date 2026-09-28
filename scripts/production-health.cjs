/* Production health: independent, read-only site and lead-freshness verification. */
'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
const { setTimeout: sleep } = require('node:timers/promises');

const DEFAULT_SITE = 'https://varunjakkampudi-tech.github.io/property-lens/';
const MAX_SOURCE_AGE_DAYS = 14;
const REQUIRED_ASSETS = Object.freeze([
  ['', 'Property Lens'],
  ['data/properties.js', 'window.PROPERTY_DATA'],
  ['assets/core.js', 'PropertyLensCore'],
  ['assets/mobile-location.js', 'mobilePropertyApp'],
  ['assets/design-refresh.css', 'desktop-category-card'],
  ['assets/icons.svg', 'id="map-pin"']
]);

function readLeads(filename = 'data/properties.js') {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { timeout: 3000 });
  if (!Array.isArray(sandbox.window.PROPERTY_DATA)) throw Error('Property dataset is missing');
  return sandbox.window.PROPERTY_DATA;
}

function assessFreshness(leads, now = new Date(), maxAgeDays = MAX_SOURCE_AGE_DAYS) {
  if (!Array.isArray(leads) || !leads.length) throw Error('No published property leads');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw Error('Invalid current date');
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 1) throw Error('Invalid freshness threshold');
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const cities = new Map();
  let fresh = 0;
  for (const lead of leads) {
    if (!lead || typeof lead.city !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(lead.verifiedOn || '')) {
      throw Error('Invalid source-check metadata');
    }
    const checked = Date.parse(lead.verifiedOn + 'T00:00:00Z');
    if (!Number.isFinite(checked) || new Date(checked).toISOString().slice(0, 10) !== lead.verifiedOn) {
      throw Error('Invalid source-check date for ' + lead.id);
    }
    const ageDays = Math.floor((today - checked) / 86400000);
    if (ageDays < 0) throw Error('Future source-check date for ' + lead.id);
    const city = cities.get(lead.city) || { total: 0, fresh: 0, latest: '' };
    city.total++;
    if (ageDays <= maxAgeDays) { city.fresh++; fresh++; }
    if (lead.verifiedOn > city.latest) city.latest = lead.verifiedOn;
    cities.set(lead.city, city);
  }
  const staleCities = [...cities].filter(([, data]) => data.fresh === 0).map(([city]) => city);
  return { total: leads.length, fresh, stale: leads.length - fresh, staleCities, cities: Object.fromEntries(cities) };
}

async function verifyLive(options = {}) {
  const siteUrl = options.siteUrl || DEFAULT_SITE;
  const sha = options.sha;
  const fetcher = options.fetcher || fetch;
  const attempts = options.attempts === undefined ? 6 : options.attempts;
  const delayMs = options.delayMs === undefined ? 20000 : options.delayMs;
  if (!/^[a-f0-9]{40}$/i.test(sha || '')) throw Error('Expected a full 40-character commit SHA');
  const base = new URL(siteUrl);
  if (base.protocol !== 'https:' || base.username || base.password) throw Error('Production URL must use HTTPS');
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 30) throw Error('Invalid attempt count');
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const suffix = '?health=' + encodeURIComponent(sha.slice(0, 12) + '-' + attempt);
    try {
      async function getText(path) {
        const url = new URL(path, base).href + suffix;
        const response = await fetcher(url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
        if (!response.ok) throw Error(path + ': HTTP ' + response.status);
        return response.text();
      }
      const liveSha = (await getText('deploy-version.txt')).trim();
      if (liveSha !== sha) throw Error('Live SHA mismatch: expected ' + sha + ', received ' + liveSha);
      for (const [path, marker] of REQUIRED_ASSETS) {
        const text = await getText(path);
        if (!text.includes(marker)) throw Error((path || 'homepage') + ': expected content marker missing');
      }
      return { sha, assetsChecked: REQUIRED_ASSETS.length, attempts: attempt, siteUrl: base.href };
    } catch (error) {
      lastError = error;
      if (attempt < attempts && delayMs) await sleep(delayMs);
    }
  }
  throw Error('Live verification failed after ' + attempts + ' attempts: ' + lastError.message);
}

async function main() {
  const leads = readLeads();
  const freshness = assessFreshness(leads);
  if (freshness.staleCities.length) {
    throw Error('No recently source-checked leads in: ' + freshness.staleCities.join(', '));
  }
  if (process.env.FRESHNESS_ONLY === '1') {
    console.log('PASS: Per-city source freshness: ' + JSON.stringify(freshness));
    return;
  }
  const sha = process.env.EXPECTED_SHA || process.env.GITHUB_SHA;
  const live = await verifyLive({ siteUrl: process.env.SITE_URL || DEFAULT_SITE, sha });
  const summary = {
    live, freshness, checkedAt: new Date().toISOString(),
    note: 'Source-check dates indicate review of public sources, not seller-confirmed availability.'
  };
  console.log(JSON.stringify(summary, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '## Property Lens production health\n\n' +
      '- Exact live commit: \x60' + live.sha + '\x60\n' +
      '- Public assets checked: ' + live.assetsChecked + '\n' +
      '- Recently source-checked leads: ' + freshness.fresh + '/' + freshness.total + '\n' +
      '- Cities without a source check in the past ' + MAX_SOURCE_AGE_DAYS + ' days: ' +
      (freshness.staleCities.join(', ') || 'None') + '\n\n' +
      'Source checks do not establish seller availability.\n');
  }
}

if (require.main === module) main().catch(error => {
  console.error('PRODUCTION HEALTH FAILED: ' + error.message);
  process.exitCode = 1;
});

module.exports = { readLeads, assessFreshness, verifyLive, REQUIRED_ASSETS };
