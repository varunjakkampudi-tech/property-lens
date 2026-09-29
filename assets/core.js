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
    return Boolean(lead && typeof lead.price === 'number' && Number.isFinite(lead.price) && lead.price > 0 && lead.price < 50);
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
  var iconNames = new Set(['map-pin','building','house','plot','search','heart','compare','check',
    'check-circle','filter','arrow-left','chevron-right','external','book-open','list',
    'info','x','plus','clipboard','reset','phone','note','chart']);
  function icon(name, className) {
    if (!iconNames.has(name)) return '';
    var cssClass = typeof className === 'string' && /^[a-zA-Z0-9_-]+$/.test(className) ? ' ' + className : '';
    return '<svg class="pl-icon' + cssClass + '" aria-hidden="true" focusable="false"><use href="assets/icons.svg#' + name + '"></use></svg>';
  }
  // Median comparable *asking* prices, never a sale-price valuation.
  // Require recent, similarly sized listings with the same area measurement basis.
  function comparableMarketValue(lead, leads, asOf) {
    if (!lead || !isEligibleLead(lead) || !Array.isArray(leads) ||
        !['Flats', 'Plots'].includes(lead.category) ||
        typeof lead.size !== 'number' || !Number.isFinite(lead.size) || lead.size <= 0 ||
        typeof lead.sizeUnit !== 'string' || !lead.sizeUnit.trim()) return null;
    var now = asOf ? new Date(asOf) : new Date();
    if (!Number.isFinite(now.getTime())) return null;
    var latest = now.getTime() + 86400000;
    var earliest = now.getTime() - 90 * 86400000;
    function recentlyChecked(date) {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      var timestamp = Date.parse(date + 'T00:00:00Z');
      return Number.isFinite(timestamp) && timestamp >= earliest && timestamp <= latest;
    }
    if (!recentlyChecked(lead.verifiedOn)) return null;
    var locality = String(lead.market || lead.locality || '').trim().toLowerCase();
    var peers = leads.filter(function (candidate) {
      if (!candidate || candidate.id === lead.id || !isEligibleLead(candidate) ||
          candidate.city !== lead.city || candidate.category !== lead.category ||
          candidate.type !== lead.type || candidate.sizeUnit !== lead.sizeUnit ||
          candidate.linkType !== 'Direct listing' || !recentlyChecked(candidate.verifiedOn) ||
          typeof candidate.size !== 'number' || !Number.isFinite(candidate.size) ||
          candidate.size < lead.size * 0.7 || candidate.size > lead.size * 1.3) return false;
      return !lead.ageGroup || lead.ageGroup === 'unknown' ||
        !candidate.ageGroup || candidate.ageGroup === 'unknown' ||
        candidate.ageGroup === lead.ageGroup;
    });
    var local = peers.filter(function (p) {
      return locality && String(p.market || p.locality || '').trim().toLowerCase() === locality;
    });
    // A city-wide fallback is only useful for flats, and requires more evidence.
    // House values combine land and buildings, so built-up-area ratios are not comparable.
    var comparables = local.length >= 3 ? local :
      lead.category === 'Flats' && peers.length >= 5 ? peers : [];
    if (comparables.length < 3) return null;
    var rates = comparables.map(function (p) { return p.price * 100000 / p.size; })
      .filter(function (rate) { return Number.isFinite(rate) && rate > 0; })
      .sort(function (a, b) { return a - b; });
    if (rates.length < 3) return null;
    var middle = Math.floor(rates.length / 2);
    var medianRate = rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2;
    var valueLakh = Math.round(medianRate * lead.size / 10000) / 10;
    if (!(valueLakh > 0)) return null;
    return Object.freeze({
      valueLakh: valueLakh,
      rate: Math.round(medianRate),
      sampleSize: rates.length,
      scope: local.length >= 3 ? 'same locality' : 'city-wide asking listings',
      checkedOn: comparables.map(function (p) { return p.verifiedOn; }).sort().pop(),
      deltaPct: Math.round((lead.price - valueLakh) / valueLakh * 100)
    });
  }
  function sourceLinkLabel(lead) {
    return lead && lead.linkType === 'Direct listing' ? 'Open listing' : 'Open source results';
  }
  function formatDataUpdatedAt(value) {
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Update time unavailable';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata'
      }).format(date) + ' IST';
    } catch (_) { return String(value); }
  }
  window.PropertyLensCore = Object.freeze({
    escapeHtml: escapeHtml, formatPrice: formatPrice, isEligibleLead: isEligibleLead,
    readArray: readArray, readRecord: readRecord,
    normalizeIndianBusinessPhone: normalizeIndianBusinessPhone, sourceLinkLabel: sourceLinkLabel,
    comparableMarketValue: comparableMarketValue, formatDataUpdatedAt: formatDataUpdatedAt, icon: icon
  });
})();
