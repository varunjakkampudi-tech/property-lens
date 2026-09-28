'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const baseline = fs.readFileSync(path.join(root, 'data/properties.js'), 'utf8');
const queue = fs.readFileSync(path.join(root, 'data/review-queue.json'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8');

function validate(properties = baseline, review = queue) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'property-lens-validation-'));
  try {
    fs.mkdirSync(path.join(directory, 'data'));
    fs.writeFileSync(path.join(directory, 'data/properties.js'), properties);
    fs.writeFileSync(path.join(directory, 'data/review-queue.json'), review);
    fs.writeFileSync(path.join(directory, 'manifest.webmanifest'), manifest);
    return spawnSync(process.execPath, [path.join(root, 'scripts/validate-data.cjs')], {
      cwd: directory, encoding: 'utf8', timeout: 10000
    });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('published dataset passes the release-blocking trust contract', () => {
  const result = validate();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS:/);
});

test('zero-price and future-dated research leads are rejected', () => {
  const zero = validate(baseline.replace('"price": 37,', '"price": 0,'));
  assert.notEqual(zero.status, 0);
  assert.match(zero.stderr, /strictly below/);
  const future = validate(baseline.replace('"verifiedOn": "2026-09-28"', '"verifiedOn": "2099-01-01"'));
  assert.notEqual(future.status, 0);
  assert.match(future.stderr, /Future source-check date/);
});

test('unrecognized link types, age categories and private URLs are rejected', () => {
  const link = validate(baseline.replace('"linkType": "Direct listing"', '"linkType": "Unverified claim"'));
  assert.notEqual(link.status, 0);
  assert.match(link.stderr, /Unrecognized source-link type/);
  const age = validate(baseline.replace('"ageGroup": "new"', '"ageGroup": "unsupported"'));
  assert.notEqual(age.status, 0);
  assert.match(age.stderr, /Invalid age or community status/);
  const url = validate(baseline.replace(/"url": "https:\/\/[^"]+"/, '"url": "https://localhost/private"'));
  assert.notEqual(url.status, 0);
  assert.match(url.stderr, /Only public HTTPS/);
});

test('review queue cannot claim a future review date', () => {
  const result = validate(baseline, queue.replace('"reviewedOn": "2026-09-28"', '"reviewedOn": "2099-01-01"'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid review queue/);
});
