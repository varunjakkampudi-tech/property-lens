/* Shared, dependency-free browser primitives. */
(function () {
  'use strict';
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }
  function formatPrice(value, unit) {
    if (value == null || !Number.isFinite(Number(value))) return 'Price on request';
    var amount = Number(value);
    return '₹' + amount.toFixed(amount % 1 ? 1 : 0) + (unit || 'L');
  }
  function isEligibleLead(lead) {
    return Boolean(lead && typeof lead.price === 'number' && Number.isFinite(lead.price) && lead.price >= 0 && lead.price < 50);
  }
  function readStorage(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (_) { return fallback; }
  }
  function readArray(key) {
    var value = readStorage(key, []);
    return Array.isArray(value) ? value.filter(function (id) { return typeof id === 'string'; }) : [];
  }
  function readRecord(key) {
    var value = readStorage(key, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
  function normalizeIndianBusinessPhone(value) {
    var digits = String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    return /^\d{10}$/.test(digits) ? digits : '';
  }
  // Icons are same-origin SVG symbols. Both inputs are allowlisted before HTML insertion.
  var iconNames = new Set(['map-pin','waves','building','house','plot','search','heart','compare','check',
    'check-circle','filter','arrow-right','arrow-left','chevron-right','external','bookmark',
    'shield-check','book-open','clock','list','trees','landmark','info','x','plus',
    'clipboard','reset','phone','eye','note','chart','location']);
  function icon(name, className) {
    if (!iconNames.has(name)) return '';
    var cssClass = typeof className === 'string' && /^[a-zA-Z0-9_-]+$/.test(className) ? ' ' + className : '';
    return '<svg class="pl-icon' + cssClass + '" aria-hidden="true" focusable="false"><use href="assets/icons.svg#' + name + '"></use></svg>';
  }
  function comparableMarketValue(lead, leads) {
    if (!lead || !Number.isFinite(Number(lead.size)) || Number(lead.size) <= 0 || !Array.isArray(leads)) return null;
    var unit = String(lead.sizeUnit || '').toLowerCase().replace(/\s+/g, '');
    if (!unit) return null;
    var locality = String(lead.locality || '').trim().toLowerCase();
    var pool = leads.filter(function (candidate) {
      if (!candidate || candidate.id === lead.id || !isEligibleLead(candidate)) return false;
      if (candidate.city !== lead.city || candidate.category !== lead.category) return false;
      if (!Number.isFinite(Number(candidate.size)) || Number(candidate.size) <= 0) return false;
      return String(candidate.sizeUnit || '').toLowerCase().replace(/\s+/g, '') === unit;
    });
    var local = pool.filter(function (candidate) {
      return locality && String(candidate.locality || '').trim().toLowerCase() === locality;
    });
    var comparables = local.length >= 2 ? local : pool;
    if (comparables.length < 2) return null;
    var rates = comparables.map(function (candidate) {
      return Number(candidate.price) * 100000 / Number(candidate.size);
    }).filter(function (rate) { return Number.isFinite(rate) && rate > 0; }).sort(function (a, b) { return a - b; });
    if (rates.length < 2) return null;
    var middle = Math.floor(rates.length / 2);
    var medianRate = rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2;
    var valueLakh = medianRate * Number(lead.size) / 100000;
    var deltaPct = Number(lead.price) > 0 ? ((Number(lead.price) - valueLakh) / valueLakh) * 100 : null;
    return Object.freeze({
      valueLakh: valueLakh,
      rate: medianRate,
      sampleSize: rates.length,
      scope: local.length >= 2 ? 'same locality' : 'same city & property type',
      deltaPct: deltaPct
    });
  }
  function sourceLinkLabel(lead) {
    return lead && lead.linkType === 'Direct listing' ? 'Open listing' : 'Open source results';
  }
  window.PropertyLensCore = Object.freeze({
    escapeHtml: escapeHtml, formatPrice: formatPrice, isEligibleLead: isEligibleLead,
    readArray: readArray, readRecord: readRecord,
    normalizeIndianBusinessPhone: normalizeIndianBusinessPhone, sourceLinkLabel: sourceLinkLabel,
    comparableMarketValue: comparableMarketValue, icon: icon
  });
})();
