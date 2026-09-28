const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('data/properties.js', 'utf8'), sandbox, { timeout: 3000 });
const leads = sandbox.window.PROPERTY_DATA;
const markets = sandbox.window.MARKET_DATA;
const contacts = sandbox.window.SOURCE_CONTACTS;
const validCities = new Set(['Vizag', 'Tanuku', 'Palakollu', 'Bhimavaram', 'Eluru']);
const validCategories = new Set(['Flats', 'Independent Houses', 'Plots']);
const typeCategory = {
  Flat: 'Flats',
  'Independent House': 'Independent Houses',
  Villa: 'Independent Houses',
  Plot: 'Plots'
};

if (!Array.isArray(leads)) throw Error('Lead dataset missing');
if (!markets || typeof markets !== 'object') throw Error('Market metadata missing');
for (const city of validCities) {
  if (!markets[city]) throw Error('Missing market metadata: ' + city);
}
for (const city of Object.keys(markets)) {
  if (!validCities.has(city)) throw Error('Unexpected market city: ' + city);
}

function secureUrl(raw, field, id) {
  let parsed;
  try { parsed = new URL(raw); }
  catch { throw Error('Invalid ' + field + ' URL: ' + id); }
  if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
    throw Error('Only public HTTPS ' + field + ' URLs are allowed: ' + id);
  }
  return parsed;
}

const ids = new Set();
const urls = new Set();
for (const p of leads) {
  if (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0 || p.price >= 50) {
    throw Error('Active lead price must be strictly below ₹50L: ' + p.id);
  }
  if (!p.id || !/^[a-z0-9][a-z0-9_-]*$/i.test(p.id) || ids.has(p.id)) {
    throw Error('Missing, unsafe or duplicate property ID: ' + p.id);
  }
  if (!validCities.has(p.city) || !validCategories.has(p.category)) {
    throw Error('Invalid location/category: ' + p.id);
  }
  if (typeCategory[p.type] !== p.category) throw Error('Property type/category mismatch: ' + p.id);
  if (!p.name || !p.locality || !p.platform || !p.poster || !p.lastSeen || !p.verifiedOn || !p.mapUrl || !p.url || !p.linkType || !p.status) {
    throw Error('Missing required lead metadata: ' + p.id);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.verifiedOn) || !Number.isFinite(Date.parse(p.verifiedOn)) || new Date(p.verifiedOn).toISOString().slice(0, 10) !== p.verifiedOn) {
    throw Error('Invalid source-check date: ' + p.id);
  }
  if (!['publicly_listed_unconfirmed', 'seller_confirmed'].includes(p.availabilityStatus)) {
    throw Error('Missing or invalid availability state: ' + p.id);
  }
  if (p.availabilityStatus === 'seller_confirmed' && (!p.availabilityEvidence || !p.availabilityCheckedOn)) {
    throw Error('Seller-confirmed state requires dated evidence: ' + p.id);
  }
  if (p.availabilityStatus === 'publicly_listed_unconfirmed' && !p.status.includes('must be confirmed')) {
    throw Error('Unconfirmed lead must disclose uncertainty: ' + p.id);
  }
  if (p.publicPhone && !/^[0-9]{10}$/.test(String(p.publicPhone).replace(/[^0-9]/g, '').replace(/^91(?=[0-9]{10}$)/, ''))) {
    throw Error('Invalid public business phone: ' + p.id);
  }
  if (typeof p.score !== 'number' || !Number.isFinite(p.score) || p.score < 0 || p.score > 100) {
    throw Error('Invalid deal score: ' + p.id);
  }
  if (!Array.isArray(p.highlights)) throw Error('Invalid highlights: ' + p.id);
  const source = secureUrl(p.url, 'source', p.id);
  const map = secureUrl(p.mapUrl, 'map', p.id);
  if (!['google.com', 'www.google.com', 'maps.google.com'].includes(map.hostname)) {
    throw Error('Unexpected map host: ' + p.id);
  }
  source.hash = '';
  const canonical = source.href.replace(/\/$/, '');
  if (urls.has(canonical)) throw Error('Duplicate canonical source URL: ' + p.id);
  ids.add(p.id);
  urls.add(canonical);
}

const review = JSON.parse(fs.readFileSync('data/review-queue.json', 'utf8'));
if (!Array.isArray(review.excludedFromActiveResults) || !Array.isArray(review.candidatesNeedingSellerConfirmation)) {
  throw Error('Invalid review queue');
}
if (!Array.isArray(contacts)) throw Error('Public business contact directory missing');
for (const contact of contacts) {
  if (!contact.city || !contact.platform || !contact.name || !contact.note || !contact.url) {
    throw Error('Incomplete public contact record');
  }
  secureUrl(contact.url, 'business contact', contact.name);
  if (contact.phone && !/^[0-9]{10}$/.test(String(contact.phone).replace(/[^0-9]/g, '').replace(/^91(?=[0-9]{10}$)/, ''))) {
    throw Error('Invalid public contact phone: ' + contact.name);
  }
}
for (const candidate of review.candidatesNeedingSellerConfirmation) {
  if (!candidate.reason || !candidate.city || !candidate.category || !candidate.url) {
    throw Error('Incomplete review candidate');
  }
  if (!validCities.has(candidate.city) || !validCategories.has(candidate.category)) {
    throw Error('Invalid review candidate location/category');
  }
  secureUrl(candidate.url, 'review candidate', candidate.name || candidate.reason);
}
for (const item of review.excludedFromActiveResults) {
  if (!item.reason || !item.lead || !item.lead.id || ids.has(item.lead.id)) {
    throw Error('Invalid or active-listed review item: ' + (item.lead && item.lead.id));
  }
  if (item.lead.url) secureUrl(item.lead.url, 'excluded lead', item.lead.id);
}
JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
console.log('PASS: ' + leads.length + ' public listings under ₹50L; explicit availability states, safe URLs, unique IDs, consistent categories and review queue.');
