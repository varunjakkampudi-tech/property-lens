'use strict';

/* Converts an approved discovery run into a reviewable data-only proposal. */
const fs = require('node:fs');
const vm = require('node:vm');
const { validateRecord } = require('./discovery.cjs');

function loadDataset(filename = 'data/properties.js') {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { timeout: 3000 });
  if (!Array.isArray(sandbox.window.PROPERTY_DATA) || !sandbox.window.MARKET_DATA || !Array.isArray(sandbox.window.SOURCE_CONTACTS)) throw new Error('Current dataset is incomplete');
  return sandbox.window;
}

function buildProposal(run, current) {
  if (!run || run.schemaVersion !== 1 || !Array.isArray(run.accepted)) throw new Error('Invalid discovery run');
  const byId = new Map(current.PROPERTY_DATA.map(item => [item.id, item]));
  const byUrl = new Set(current.PROPERTY_DATA.map(item => item.url));
  for (const item of run.accepted) {
    validateRecord(item);
    if (byId.has(item.id) || byUrl.has(item.url)) throw new Error(`Duplicate identity in publisher input: ${item.id}`);
    byId.set(item.id, item); byUrl.add(item.url);
  }
  const properties = [...byId.values()];
  const changed = properties.length !== current.PROPERTY_DATA.length || properties.some((item, index) => JSON.stringify(item) !== JSON.stringify(current.PROPERTY_DATA[index]));
  return { changed, properties, market: current.MARKET_DATA, contacts: current.SOURCE_CONTACTS };
}

function serializeDataset(proposal) {
  return 'window.MARKET_DATA = ' + JSON.stringify(proposal.market, null, 2) + ';\n\n' +
    'window.PROPERTY_DATA = ' + JSON.stringify(proposal.properties, null, 2) + ';\n\n' +
    'window.SOURCE_CONTACTS = ' + JSON.stringify(proposal.contacts, null, 2) + ';\n';
}

function publish(options = {}) {
  const run = JSON.parse(fs.readFileSync(options.runFile || 'artifacts/discovery-run.json', 'utf8'));
  const proposal = buildProposal(run, loadDataset(options.currentFile || 'data/properties.js'));
  if (proposal.changed && options.outputFile) {
    fs.mkdirSync(require('node:path').dirname(options.outputFile), { recursive: true });
    fs.writeFileSync(options.outputFile, serializeDataset(proposal));
  }
  return { changed: proposal.changed, count: proposal.properties.length, serialized: proposal.changed && Boolean(options.outputFile) };
}

if (require.main === module) {
  try { console.log(JSON.stringify(publish({ outputFile: process.env.PROPOSED_DATA || 'artifacts/proposed-properties.js' }))); }
  catch (error) { console.error(`PUBLISH FAILED: ${error.message}`); process.exitCode = 1; }
}

module.exports = { loadDataset, buildProposal, serializeDataset, publish };
