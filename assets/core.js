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
  var iconNames = new Set(['map-pin','building','house','plot','search','heart','compare','check',
    'check-circle','filter','arrow-left','chevron-right','external','book-open','list',
    'info','x','plus','clipboard','reset','phone','note']);
  function icon(name, className) {
    if (!iconNames.has(name)) return '';
    var cssClass = typeof className === 'string' && /^[a-zA-Z0-9_-]+$/.test(className) ? ' ' + className : '';
    return '<svg class="pl-icon' + cssClass + '" aria-hidden="true" focusable="false"><use href="assets/icons.svg#' + name + '"></use></svg>';
  }
  // An asking-price comparison is NOT a professional valuation or a completed-sale price.
  // Match locality, property type, measurement basis and recent source-check dates.
  function marketBenchmark(lead, leads, asOf) {
    if (!lead || !Array.isArray(leads) || !isEligibleLead(lead) ||
        !['Flats', 'Plots'].includes(lead.category) ||
        typeof lead.size !== 'number' || !Number.isFinite(lead.size) || lead.size <= 0 ||
        typeof lead.market !== 'string' || !lead.market.trim() ||
        typeof lead.sizeUnit !== 'string' || !lead.sizeUnit.trim()) return null;
    var today = asOf ? new Date(asOf) : new Date();
    if (!Number.isFinite(today.getTime())) return null;
    var todayMs = today.getTime();
    var cutoff = todayMs - 90 * 86400000;
    function recent(value) {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      var checked = Date.parse(value + 'T00:00:00Z');
      return Number.isFinite(checked) && checked >= cutoff && checked <= todayMs + 86400000;
    }
    if (!recent(lead.verifiedOn)) return null;
    var peers = leads.filter(function (p) {
      return p && p.id !== lead.id && isEligibleLead(p) &&
        p.city === lead.city && p.category === lead.category &&
        p.type === lead.type && p.sizeUnit === lead.sizeUnit &&
        typeof p.market === 'string' && p.market.trim().toLowerCase() === lead.market.trim().toLowerCase() &&
        typeof p.size === 'number' && Number.isFinite(p.size) &&
        p.size >= lead.size * 0.7 && p.size <= lead.size * 1.3 &&
        p.linkType === 'Direct listing' && recent(p.verifiedOn);
    });
    if (peers.length < 3) return null;
    var rates = peers.map(function (p) { return p.price / p.size; }).sort(function (a,b) { return a-b; });
    var middle = Math.floor(rates.length / 2);
    var medianRate = rates.length % 2 ? rates[middle] : (rates[middle-1] + rates[middle]) / 2;
    var estimateLakhs = Math.round(medianRate * lead.size * 10) / 10;
    if (!(estimateLakhs > 0)) return null;
    var checkedOn = peers.map(function (p) { return p.verifiedOn; }).sort().pop();
    return {
      estimateLakhs: estimateLakhs,
      differencePercent: Math.round((lead.price - estimateLakhs) / estimateLakhs * 100),
      sampleSize: peers.length,
      checkedOn: checkedOn,
      locality: lead.market,
      sizeUnit: lead.sizeUnit,
      method: 'comparable asking listings'
    };
  }
  function marketValueMarkup(lead, leads) {
    var benchmark = marketBenchmark(lead, leads);
    var title = 'Indicative market value';
    if (!benchmark) {
      return '<div class="market-value market-value--unavailable" aria-label="' + title + '">' +
        '<span class="market-value__label">' + icon('info') + title + '</span>' +
        '<strong>Not available</strong>' +
        '<small>Insufficient recent, like-for-like listings. Confirm with local sale records or an independent valuer.</small></div>';
    }
    var delta = benchmark.differencePercent === 0 ? 'Asking matches benchmark' :
      'Asking ' + Math.abs(benchmark.differencePercent) + '% ' +
      (benchmark.differencePercent < 0 ? 'below' : 'above') + ' benchmark';
    return '<div class="market-value" aria-label="' + title + '">' +
      '<span class="market-value__label">' + icon('info') + title + '</span>' +
      '<strong>' + formatPrice(benchmark.estimateLakhs) + '</strong>' +
      '<span class="market-value__delta">' + escapeHtml(delta) + '</span>' +
      '<small>Indicative only: ' + benchmark.sampleSize + ' comparable asking listings in ' +
      escapeHtml(benchmark.locality) + ' (' + escapeHtml(benchmark.sizeUnit) + '); sources checked through ' +
      escapeHtml(benchmark.checkedOn) + '. Not a verified sale price or appraisal.</small></div>';
  }
  function sourceLinkLabel(lead) {
    return lead && lead.linkType === 'Direct listing' ? 'Open listing' : 'Open source results';
  }
  window.PropertyLensCore = Object.freeze({
    escapeHtml: escapeHtml, formatPrice: formatPrice, isEligibleLead: isEligibleLead,
    readArray: readArray, readRecord: readRecord,
    normalizeIndianBusinessPhone: normalizeIndianBusinessPhone, sourceLinkLabel: sourceLinkLabel, icon: icon,
    marketBenchmark: marketBenchmark, marketValueMarkup: marketValueMarkup
  });
})();
