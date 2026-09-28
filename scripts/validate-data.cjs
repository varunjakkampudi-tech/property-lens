const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('data/properties.js', 'utf8'), sandbox, { timeout: 3000 });
const leads = sandbox.window.PROPERTY_DATA;
const validCities = new Set(['Vizag', 'Tanuku', 'Palakollu', 'Bhimavaram']);
const validCategories = new Set(['Flats', 'Independent Houses', 'Plots']);
if (!Array.isArray(leads) || !leads.length) throw Error('Active lead dataset missing');
const ids = new Set();
const urls = new Set();
for (const p of leads) {
  if (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0 || p.price >= 50) {
    throw Error('Active lead must have a confirmed price strictly below ₹50L: ' + p.id);
  }
  if (!validCities.has(p.city) || !validCategories.has(p.category)) throw Error('Invalid location/category: ' + p.id);
  if (!p.id || ids.has(p.id)) throw Error('Missing/duplicate property ID: ' + p.id);
  if (!p.url || urls.has(p.url)) throw Error('Missing/duplicate source URL: ' + p.id);
  if (!p.name || !p.locality || !p.platform) throw Error('Missing required lead metadata: ' + p.id);
  ids.add(p.id);
  urls.add(p.url);
}
console.log('PASS: ' + leads.length + ' active listings under ₹50L; unique IDs and URLs; valid cities and categories.');
