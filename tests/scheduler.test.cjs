'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { deduplicate, validateRecord, fetchJson, run, publicHttpsUrl } = require('../scripts/discovery.cjs');
const { buildProposal } = require('../scripts/publish-data.cjs');

const record = { id:'new-1', city:'Tanuku', category:'Flats', type:'Flat', name:'Evidence flat', locality:'Center', price:32, size:1000, sizeUnit:'sq.ft', mapUrl:'https://www.google.com/maps/search/?api=1&query=Tanuku', url:'https://example.com/listing/1', linkType:'Direct listing', verifiedOn:'2026-09-28', availabilityStatus:'publicly_listed_unconfirmed', status:'Public listing; availability must be confirmed', ageGroup:'new', gated:'no', source:'Approved feed', platform:'Approved feed', poster:'Public poster', lastSeen:'Checked Sep 28, 2026', score:75, highlights:['Evidence-backed'], notes:'Reconfirm before visiting.' };

test('discovery accepts only public, under-budget, explicitly classified records', () => {
  assert.equal(validateRecord(record).id, 'new-1');
  assert.throws(() => validateRecord({ ...record, price: 50 }), /below/);
  assert.throws(() => validateRecord({ ...record, url: 'http://localhost/x' }), /public HTTPS/);
  assert.throws(() => validateRecord({ ...record, linkType: 'Unverified' }), /classification/);
  assert.throws(() => validateRecord({ ...record, category: 'Plots' }), /category/);
  assert.throws(() => validateRecord({ ...record, score: 101 }), /score/);
  assert.throws(() => publicHttpsUrl('https://[::1]/feed', 'feed URL'), /public HTTPS/);
});

test('deduplication preserves existing identity and quarantines invalid input', () => {
  const result = deduplicate([record, { ...record, id:'new-2', url:'https://example.com/listing/2', price:0 }], [record]);
  assert.deepEqual(result.accepted, []);
  assert.equal(result.rejected.length, 2);
  assert.match(result.rejected[0].reason, /duplicate/);
});

test('feed retries bounded transient failures and succeeds', async () => {
  let calls = 0;
  const payload = await fetchJson('https://feed.example.test/data', { attempts:3, fetcher: async () => {
    calls++;
    if (calls < 3) return { status:503, ok:false };
    return { status:200, ok:true, json: async () => ({ records:[record] }) };
  }});
  assert.equal(calls, 3); assert.equal(payload.records.length, 1);
});

test('feed rejects oversized responses without retrying permanent failures', async () => {
  let calls = 0;
  await assert.rejects(fetchJson('https://feed.example.test/data', { attempts:3, fetcher: async () => {
    calls++;
    return { status:200, ok:true, text: async () => 'x'.repeat(32) };
  }, maxBytes:16 }), /2 MB limit/);
  assert.equal(calls, 1);
});

test('missing approved feed is an explicit no-op with a persistent run record', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'property-lens-run-'));
  const output = path.join(dir, 'run.json');
  const result = await run({ output });
  assert.equal(result.status, 'no_feed');
  assert.equal(JSON.parse(fs.readFileSync(output)).feedConfigured, false);
  fs.rmSync(dir, { recursive:true, force:true });
});

test('feed failures persist a sanitized failure record', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'property-lens-failure-'));
  const output = path.join(dir, 'run.json');
  await assert.rejects(run({ output, feedUrl:'https://example.com/data', fetcher: async () => ({ status:401, ok:false }) }), /failed/);
  const result = JSON.parse(fs.readFileSync(output));
  assert.equal(result.status, 'failed');
  assert.equal(result.failure.class, 'validation_or_configuration_error');
  assert.doesNotMatch(result.failure.message, /feed\.example/);
  fs.rmSync(dir, { recursive:true, force:true });
});

test('feed rejects more than 500 records and persists a failure record', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'property-lens-record-limit-'));
  const output = path.join(dir, 'run.json');
  const records = Array.from({ length: 501 }, (_, index) => ({ id: `lead-${index}` }));
  await assert.rejects(run({
    output,
    feedUrl: 'https://example.com/data',
    attempts: 1,
    fetcher: async () => ({ status:200, ok:true, text: async () => JSON.stringify(records) })
  }), /500-record limit/);
  const result = JSON.parse(fs.readFileSync(output));
  assert.equal(result.status, 'failed');
  assert.match(result.failure.message, /500-record limit/);
  fs.rmSync(dir, { recursive:true, force:true });
});

test('publisher does not report a change for duplicate or empty input', () => {
  const current = { PROPERTY_DATA:[record], MARKET_DATA:{}, SOURCE_CONTACTS:[], REVIEW_QUEUE:{ reviewedOn:'2026-09-28', excludedFromActiveResults:[], candidatesNeedingSellerConfirmation:[] } };
  const result = buildProposal({ schemaVersion:1, accepted:[], reviewCandidates:[] }, current);
  assert.equal(result.changed, false);
});

test('publisher places safe rejected records in the review queue', () => {
  const current = { PROPERTY_DATA:[record], MARKET_DATA:{}, SOURCE_CONTACTS:[], REVIEW_QUEUE:{ reviewedOn:'2026-09-28', excludedFromActiveResults:[], candidatesNeedingSellerConfirmation:[] } };
  const result = buildProposal({ schemaVersion:1, accepted:[], finishedAt:'2026-09-28T12:00:00Z', reviewCandidates:[{ reason:'invalid price', name:'Needs review', city:'Tanuku', category:'Flats', url:'https://example.com/review/1' }] }, current);
  assert.equal(result.changed, true);
  assert.equal(result.reviewQueue.candidatesNeedingSellerConfirmation.length, 1);
});

test('scheduled publisher enables protected auto-merge for data-only PRs', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'scheduled-discovery.yml'), 'utf8');
  assert.match(workflow, /^name: Approved-feed discovery publisher/m);
  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /cron:/);
  assert.match(workflow, /- name: Checkout default branch\n        uses: actions\/checkout@v7/);
  assert.match(workflow, /timeout-minutes: 15/);
  assert.match(workflow, /concurrency:\n  group: property-lens-scheduled-discovery/);
  assert.match(workflow, /gh pr create --base main --head "\$branch"/);
  assert.match(workflow, /gh pr merge "\$pr_url" --auto --squash --delete-branch/);
  assert.match(workflow, /Unable to create or locate the scheduled discovery PR after retries/);
  assert.match(workflow, /Unable to enable protected auto-merge after retries/);
});
