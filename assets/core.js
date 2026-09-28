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
  function sourceLinkLabel(lead) {
    return lead && lead.linkType === 'Direct listing' ? 'Open listing' : 'Open source results';
  }
  window.PropertyLensCore = Object.freeze({
    escapeHtml: escapeHtml, formatPrice: formatPrice, isEligibleLead: isEligibleLead,
    readArray: readArray, readRecord: readRecord,
    normalizeIndianBusinessPhone: normalizeIndianBusinessPhone, sourceLinkLabel: sourceLinkLabel
  });
})();
