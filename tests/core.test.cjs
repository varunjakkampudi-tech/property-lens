const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadCore(values = {}) {
  const store = new Map(Object.entries(values));
  const window = { localStorage: { getItem: key => store.has(key) ? store.get(key) : null } };
  vm.runInNewContext(fs.readFileSync('assets/core.js', 'utf8'), { window }, { timeout: 1000 });
  return window.PropertyLensCore;
}

test('HTML and attribute content are escaped before insertion', () => {
  const core = loadCore();
  assert.equal(core.escapeHtml(`<img src="x" onerror='alert(1)'>&`),
    '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;');
  assert.equal(core.escapeHtml(null), '');
});

test('only finite positive prices strictly below 50 lakh qualify', () => {
  const { isEligibleLead } = loadCore();
  for (const price of [0.01, 12, 49.99]) assert.equal(isEligibleLead({ price }), true);
  for (const price of [-1, 0, 50, 50.01, NaN, Infinity, '35', null]) {
    assert.equal(isEligibleLead({ price }), false);
  }
  assert.equal(isEligibleLead(null), false);
});

test('malformed and unexpected storage values fail closed', () => {
  const core = loadCore({
    bad: '{not json',
    wrong: '{"unexpected":true}',
    ids: '["lead-1",null,7,"lead-2"]',
    notes: '["not","a","record"]',
    validNotes: '{"lead-1":"Viewed"}'
  });
  assert.deepEqual(Array.from(core.readArray('bad')), []);
  assert.deepEqual(Array.from(core.readArray('wrong')), []);
  assert.deepEqual(Array.from(core.readArray('ids')), ['lead-1', 'lead-2']);
  assert.deepEqual(Object.keys(core.readRecord('notes')), []);
  assert.equal(core.readRecord('validNotes')['lead-1'], 'Viewed');
});

test('source links disclose whether the URL is a direct listing or a results page', () => {
  const core = loadCore();
  assert.equal(core.sourceLinkLabel({ linkType: 'Direct listing' }), 'Open listing');
  assert.equal(core.sourceLinkLabel({ linkType: 'Current results page' }), 'Open source results');
});

test('business phone normalization rejects invalid or incomplete numbers', () => {
  const core = loadCore();
  assert.equal(core.normalizeIndianBusinessPhone('+91 98765 43210'), '9876543210');
  assert.equal(core.normalizeIndianBusinessPhone('9876543210'), '9876543210');
  assert.equal(core.normalizeIndianBusinessPhone('1234'), '');
  assert.equal(core.normalizeIndianBusinessPhone(null), '');
});

test('price formatting is stable for whole, fractional and unknown prices', () => {
  const core = loadCore();
  assert.equal(core.formatPrice(35), '₹35L');
  assert.equal(core.formatPrice(35.5, ' Lakhs'), '₹35.5 Lakhs');
  assert.equal(core.formatPrice(null), 'Price on request');
});

test('shared SVG icons reject unknown names and unsafe CSS class input', () => {
  const core = loadCore();
  assert.match(core.icon('map-pin'), /assets\/icons\.svg#map-pin/);
  assert.match(core.icon('heart', 'nav-icon'), /class="pl-icon nav-icon"/);
  assert.equal(core.icon('not-a-real-icon'), '');
  assert.equal(core.icon('map-pin', 'x" onload="alert(1)'), core.icon('map-pin'));
});

test('comparable market estimate uses three recent, like-for-like asking listings', () => {
  const core = loadCore();
  const base = { city:'Vizag', category:'Flats', type:'Flat', locality:'Sujatha Nagar',
    market:'Sujatha Nagar', price:36, size:1000, sizeUnit:'sq.ft',
    ageGroup:'new', linkType:'Direct listing', verifiedOn:'2026-09-28' };
  const subject = { ...base, id:'p0' };
  const leads = [subject, ...[38,40,42].map((price,i) => ({ ...base, id:'p'+(i+1), price }))];
  const estimate = core.comparableMarketValue(subject, leads, '2026-09-28');
  assert.ok(estimate);
  assert.equal(estimate.valueLakh, 40);
  assert.equal(estimate.sampleSize, 3);
  assert.equal(estimate.scope, 'same locality');
  assert.equal(estimate.checkedOn, '2026-09-28');
  assert.equal(estimate.deltaPct, -10);
  assert.equal(core.comparableMarketValue(subject, leads.slice(0,3), '2026-09-28'), null);
  assert.equal(core.comparableMarketValue(subject,
    [subject, ...leads.slice(1).map(p => ({ ...p, sizeUnit:'sq.ft carpet' }))], '2026-09-28'), null);
  assert.equal(core.comparableMarketValue(subject,
    [subject, ...leads.slice(1).map(p => ({ ...p, verifiedOn:'2026-01-01' }))], '2026-09-28'), null);
  assert.equal(core.comparableMarketValue(subject,
    [subject, ...leads.slice(1).map(p => ({ ...p, ageGroup:'resale' }))], '2026-09-28'), null);
});

test('comparable market estimate fails closed when comparable evidence is insufficient', () => {
  const core = loadCore();
  const subject = { id:'p0', city:'Eluru', category:'Plots', type:'Plot', locality:'Area A', market:'Area A', price:20, size:200, sizeUnit:'sq.yd', verifiedOn:'2026-09-28', linkType:'Direct listing' };
  assert.equal(core.comparableMarketValue(subject, [subject]), null);
  assert.equal(core.comparableMarketValue({ ...subject, size:null }, [subject]), null);
});
