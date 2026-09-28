'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assessFreshness, verifyLive, REQUIRED_ASSETS } = require('../scripts/production-health.cjs');

const SHA = 'a'.repeat(40);
const SITE = 'https://example.org/property-lens/';
const sample = [
  { id: 'a', city: 'Vizag', verifiedOn: '2026-09-28' },
  { id: 'b', city: 'Vizag', verifiedOn: '2026-09-01' },
  { id: 'c', city: 'Tanuku', verifiedOn: '2026-09-20' }
];

test('freshness is assessed per city without confusing a source check with seller availability', () => {
  const result = assessFreshness(sample, new Date('2026-09-28T18:00:00Z'), 14);
  assert.equal(result.total, 3);
  assert.equal(result.fresh, 2);
  assert.equal(result.stale, 1);
  assert.deepEqual(result.staleCities, []);
  assert.equal(result.cities.Vizag.latest, '2026-09-28');
  const stale = assessFreshness(sample, new Date('2026-10-14T00:00:00Z'), 14);
  assert.deepEqual(stale.staleCities, ['Vizag', 'Tanuku']);
});

test('future, malformed and missing source-check dates are rejected', () => {
  assert.throws(() => assessFreshness([{ id:'x', city:'Vizag', verifiedOn:'2026-10-01' }],
    new Date('2026-09-28T00:00:00Z')), /Future/);
  assert.throws(() => assessFreshness([{ id:'x', city:'Vizag', verifiedOn:'2026-02-30' }],
    new Date('2026-09-28T00:00:00Z')), /Invalid/);
  assert.throws(() => assessFreshness([], new Date('2026-09-28T00:00:00Z')), /No published/);
});

test('live health requires exact SHA and all six public assets', async () => {
  const requested = [];
  const fetcher = async url => {
    const path = new URL(url).pathname.replace('/property-lens/', '');
    requested.push(path);
    const content = path === 'deploy-version.txt' ? SHA :
      REQUIRED_ASSETS.find(([p]) => p === path)?.[1] || '';
    return { ok:true, status:200, text:async () => content };
  };
  const result = await verifyLive({ siteUrl:SITE, sha:SHA, fetcher, attempts:1, delayMs:0 });
  assert.equal(result.sha, SHA);
  assert.equal(result.assetsChecked, 6);
  assert.deepEqual(requested, ['deploy-version.txt', ...REQUIRED_ASSETS.map(([p]) => p)]);
});

test('live health fails closed on wrong commit or missing assets', async () => {
  await assert.rejects(verifyLive({ siteUrl:SITE, sha:SHA, attempts:1, delayMs:0,
    fetcher:async () => ({ ok:true, status:200, text:async () => 'b'.repeat(40) }) }), /Live SHA mismatch/);
  await assert.rejects(verifyLive({ siteUrl:SITE, sha:SHA, attempts:1, delayMs:0,
    fetcher:async url => ({ ok:true, status:200, text:async () =>
      new URL(url).pathname.endsWith('deploy-version.txt') ? SHA : '' }) }), /content marker missing/);
  await assert.rejects(verifyLive({ siteUrl:'http://example.org/', sha:SHA, attempts:1, delayMs:0 }),
    /HTTPS/);
});

test('live health retries a transient stale commit then succeeds', async () => {
  let checks = 0;
  const fetcher = async url => {
    const path = new URL(url).pathname.replace('/property-lens/', '');
    if (path === 'deploy-version.txt') checks++;
    return { ok:true, status:200, text:async () => path === 'deploy-version.txt'
      ? checks === 1 ? 'b'.repeat(40) : SHA
      : REQUIRED_ASSETS.find(([p]) => p === path)?.[1] || '' };
  };
  const result = await verifyLive({ siteUrl:SITE, sha:SHA, fetcher, attempts:2, delayMs:0 });
  assert.equal(result.attempts, 2);
});
