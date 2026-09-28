'use strict';

/*
 * Evidence-first discovery adapter. The workflow supplies an approved HTTPS
 * feed; this script never scrapes a portal or invents a listing. A missing
 * feed is a successful no-op and is reported explicitly.
 */
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const dns = require('node:dns').promises;
const { setTimeout: sleep } = require('node:timers/promises');

const CITIES = new Set(['Vizag', 'Tanuku', 'Palakollu', 'Bhimavaram', 'Eluru']);
const CATEGORIES = new Set(['Flats', 'Independent Houses', 'Plots']);
const TYPES = new Set(['Flat', 'Independent House', 'Villa', 'Plot']);
const AGE_GROUPS = new Set(['new', 'resale', 'unknown']);
const GATED = new Set(['yes', 'no', 'partial']);
const TYPE_CATEGORY = { Flat: 'Flats', 'Independent House': 'Independent Houses', Villa: 'Independent Houses', Plot: 'Plots' };
const MAX_PRICE = 50;

function publicHttpsUrl(raw, field = 'URL') {
  let url;
  try { url = new URL(raw); } catch { throw new Error(`Invalid ${field}`); }
  const ip = net.isIP(url.hostname.replace(/^\[|\]$/g, ''));
  if (url.protocol !== 'https:' || url.username || url.password || ip === 6 ||
      /^(localhost\.?|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|0\.|.*\.local\.?)$/i.test(url.hostname)) {
    throw new Error(`${field} must be a public HTTPS URL`);
  }
  url.hash = '';
  return url.href.replace(/\/$/, '');
}

async function assertSafeFeedHost(url) {
  const host = new URL(url).hostname;
  const answers = await dns.lookup(host, { all: true, verbatim: true });
  if (!answers.length || answers.some(answer => {
    const address = answer.address;
    if (net.isIP(address) === 6) return address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe8') || address.startsWith('fe9') || address.startsWith('fea') || address.startsWith('feb');
    const octets = address.split('.').map(Number);
    return octets[0] === 10 || octets[0] === 127 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 169 && octets[1] === 254) || octets[0] === 0;
  })) throw new Error('Discovery feed host resolves to a private or reserved address');
}

function canonicalUrl(raw) { return publicHttpsUrl(raw, 'source URL'); }

function validateRecord(record) {
  if (!record || typeof record !== 'object') throw new Error('Discovery record must be an object');
  const required = ['id', 'city', 'category', 'type', 'name', 'locality', 'price', 'size', 'sizeUnit', 'url', 'mapUrl', 'verifiedOn'];
  for (const field of required) if (record[field] === undefined || record[field] === null || record[field] === '') throw new Error(`Missing ${field}: ${record.id || 'unknown'}`);
  if (!/^[a-z0-9][a-z0-9_-]+$/i.test(record.id)) throw new Error(`Unsafe property ID: ${record.id}`);
  if (!CITIES.has(record.city) || !CATEGORIES.has(record.category) || !TYPES.has(record.type) || TYPE_CATEGORY[record.type] !== record.category) throw new Error(`Unsupported location, type or category: ${record.id}`);
  if (!(typeof record.price === 'number' && Number.isFinite(record.price) && record.price > 0 && record.price < MAX_PRICE)) throw new Error(`Price is not strictly below ₹50L: ${record.id}`);
  if (!(typeof record.size === 'number' && Number.isFinite(record.size) && record.size > 0)) throw new Error(`Invalid size: ${record.id}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.verifiedOn) || !Number.isFinite(Date.parse(record.verifiedOn)) || new Date(record.verifiedOn).toISOString().slice(0, 10) !== record.verifiedOn || record.verifiedOn > new Date(Date.now() + 86400000).toISOString().slice(0, 10)) throw new Error(`Invalid or future source-check date: ${record.id}`);
  if (!record.linkType || !/direct listing|results|listings page/i.test(record.linkType)) throw new Error(`Missing source link classification: ${record.id}`);
  if (!record.status || !record.platform || !record.poster || !record.lastSeen || !record.source) throw new Error(`Missing provenance fields: ${record.id}`);
  if (!AGE_GROUPS.has(record.ageGroup) || !GATED.has(record.gated)) throw new Error(`Invalid age or community status: ${record.id}`);
  if (record.availabilityStatus !== 'publicly_listed_unconfirmed' && record.availabilityStatus !== 'seller_confirmed') throw new Error(`Unsupported availability state: ${record.id}`);
  if (record.availabilityStatus === 'publicly_listed_unconfirmed' && !record.status.includes('must be confirmed')) throw new Error(`Unconfirmed lead must disclose uncertainty: ${record.id}`);
  if (record.availabilityStatus === 'seller_confirmed' && (!record.availabilityEvidence || !/^\d{4}-\d{2}-\d{2}$/.test(record.availabilityCheckedOn || '') || record.availabilityCheckedOn > new Date(Date.now() + 86400000).toISOString().slice(0, 10))) throw new Error(`Seller-confirmed lead requires dated evidence: ${record.id}`);
  if (typeof record.score !== 'number' || !Number.isFinite(record.score) || record.score < 0 || record.score > 100 || !Array.isArray(record.highlights)) throw new Error(`Invalid score or highlights: ${record.id}`);
  canonicalUrl(record.url);
  const map = new URL(publicHttpsUrl(record.mapUrl, 'map URL'));
  if (!['google.com', 'www.google.com', 'maps.google.com'].includes(map.hostname)) throw new Error(`Map URL must use Google Maps: ${record.id}`);
  if (record.publicPhone && !record.phoneLabel) throw new Error(`Public contact requires provenance: ${record.id}`);
  if (record.publicPhone && !/^[0-9]{10}$/.test(String(record.publicPhone).replace(/[^0-9]/g, '').replace(/^91(?=[0-9]{10}$)/, ''))) throw new Error(`Invalid public contact: ${record.id}`);
  return { ...record, url: canonicalUrl(record.url) };
}

function deduplicate(records, existing = []) {
  const ids = new Set(existing.map(item => item.id));
  const urls = new Set(existing.map(item => { try { return canonicalUrl(item.url); } catch { return ''; } }));
  const accepted = [];
  const rejected = [];
  for (const input of records) {
    try {
      const record = validateRecord(input);
      if (ids.has(record.id) || urls.has(record.url)) { rejected.push({ id: record.id, reason: 'duplicate_identity' }); continue; }
      ids.add(record.id); urls.add(record.url); accepted.push(record);
    } catch (error) {
      rejected.push({ id: input && input.id, reason: error.message });
    }
  }
  return { accepted, rejected };
}

async function fetchJson(url, options = {}) {
  const fetcher = options.fetcher || fetch;
  const attempts = options.attempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 15000;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetcher(url, {
        headers: { accept: 'application/json', ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
        signal: AbortSignal.timeout(timeoutMs), redirect: 'error'
      });
      if (response.status === 429 || response.status >= 500) throw new Error(`retryable HTTP ${response.status}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(Math.min(8000, 500 * (2 ** (attempt - 1))));
    }
  }
  throw new Error(`Discovery feed failed after ${attempts} attempts: ${lastError.message}`);
}

function loadExisting(filename = 'data/properties.js') {
  const vm = require('node:vm');
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { timeout: 3000 });
  return Array.isArray(sandbox.window.PROPERTY_DATA) ? sandbox.window.PROPERTY_DATA : [];
}

async function run(options = {}) {
  const startedAt = new Date().toISOString();
  const output = options.output || process.env.DISCOVERY_OUTPUT || path.join('artifacts', 'discovery-run.json');
  const feedUrl = options.feedUrl || process.env.DISCOVERY_FEED_URL;
  const result = { schemaVersion: 1, startedAt, status: 'no_feed', feedConfigured: Boolean(feedUrl), accepted: [], rejected: [], source: null };
  if (feedUrl) {
    const sourceUrl = publicHttpsUrl(feedUrl, 'discovery feed URL');
    await assertSafeFeedHost(sourceUrl);
    const payload = await fetchJson(sourceUrl, { token: options.token || process.env.DISCOVERY_FEED_TOKEN, fetcher: options.fetcher, attempts: options.attempts, timeoutMs: options.timeoutMs });
    const records = Array.isArray(payload) ? payload : payload && Array.isArray(payload.records) ? payload.records : null;
    if (!records) throw new Error('Discovery feed must be an array or { records: [] }');
    const deduped = deduplicate(records, options.existing || loadExisting());
    result.status = deduped.accepted.length ? 'changes_found' : 'no_change';
    result.accepted = deduped.accepted;
    result.rejected = deduped.rejected;
    result.source = { feedUrl: sourceUrl, fetchedAt: new Date().toISOString(), recordCount: records.length };
  }
  result.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  return result;
}

if (require.main === module) run().then(result => {
  console.log(JSON.stringify({ status: result.status, accepted: result.accepted.length, rejected: result.rejected.length, output: process.env.DISCOVERY_OUTPUT || 'artifacts/discovery-run.json' }));
}).catch(error => { console.error(`DISCOVERY FAILED: ${error.message}`); process.exitCode = 1; });

module.exports = { publicHttpsUrl, validateRecord, deduplicate, fetchJson, run };
