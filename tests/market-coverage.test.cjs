'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadDataset, report } = require('../scripts/market-coverage.cjs');

test('market coverage report uses the strict renderer methodology', () => {
  const result = report(loadDataset(), '2026-09-28');
  assert.equal(result.totalProperties, 70);
  assert.equal(result.supportedBenchmarks, 14);
  assert.equal(result.unsupportedProperties, 56);
  assert.equal(result.coveragePct, 20);
  assert.equal(result.byCity.Vizag.coveragePct, 50);
  assert.equal(result.byType.Flat.coveragePct, 40);
  assert.equal(result.byCity.Tanuku.supported, 0);
  assert.equal(result.byType['Independent House'].supported, 0);
  assert.equal(result.sourceLinks.directListing, 56);
  assert.ok(result.unsupportedReasons['insufficient-recent-like-for-like-comparables'] > 0);
});
