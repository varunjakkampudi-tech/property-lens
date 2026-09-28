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

test('only finite nonnegative prices strictly below 50 lakh qualify', () => {
  const { isEligibleLead } = loadCore();
  for (const price of [0, 12, 49.99]) assert.equal(isEligibleLead({ price }), true);
  for (const price of [-1, 50, 50.01, NaN, Infinity, '35', null]) {
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
