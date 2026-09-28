(function () {
  var mq = window.matchMedia('(max-width: 850px)');
  if (!mq.matches) return;

  var properties = window.PROPERTY_DATA || [];
  var markets = window.MARKET_DATA || {};
  var cities = ['Vizag','Tanuku','Palakollu','Bhimavaram'];
  var compare = new Set();
  var state = { city: null, view: 'all', query: '', budget: '999', type: 'all', sort: 'recommended' };

  function readSaved() {
    try { return new Set(JSON.parse(localStorage.getItem('ap-shortlist') || '[]')); }
    catch (e) { return new Set(); }
  }
  var saved = readSaved();

  function persistSaved() {
    try { localStorage.setItem('ap-shortlist', JSON.stringify(Array.from(saved))); } catch (e) {}
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>'"]/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];
    });
  }

  function price(p) {
    if (p == null) return 'Price on request';
    var n = Number(p);
    return '₹' + n.toFixed(n % 1 ? 1 : 0) + 'L';
  }

  function iconForCity(city) {
    if (city === 'Vizag') return '🌊';
    if (city === 'Tanuku') return '🏡';
    if (city === 'Palakollu') return '🌿';
    return '🏙️';
  }

  function propertyIcon(type) {
    if (type === 'Independent House') return '⌂';
    if (type === 'Plot') return '▧';
    if (type === 'Villa') return '⌂';
    return '▥';
  }

  function typeLabel(type) {
    return type === 'Independent House' ? 'House' : type;
  }

  function countFor(city) {
    return properties.filter(function (p) { return p.city === city; }).length;
  }

  function typeCounts(city) {
    var list = properties.filter(function (p) { return p.city === city; });
    return {
      houses: list.filter(function (p) { return p.type === 'Independent House'; }).length,
      flats: list.filter(function (p) { return p.type === 'Flat'; }).length
    };
  }

  var root = document.createElement('div');
  root.id = 'mobilePropertyApp';
  root.className = 'mpl-app';
  document.body.prepend(root);
  document.body.classList.add('mobile-app-active');

  var dialog = document.createElement('dialog');
  dialog.id = 'mobilePropertyDialog';
  dialog.className = 'mpl-dialog';
  dialog.setAttribute('aria-label','Property details');
  document.body.appendChild(dialog);

  function topCityHeader(title, subtitle, showFilter) {
    return '<header class="mpl-topbar">' +
      '<button type="button" class="mpl-back" data-action="locations" aria-label="Choose another location">‹</button>' +
      '<div class="mpl-topcopy"><small>' + esc(subtitle || 'Showing properties in') + '</small><strong>' + esc(title) + '</strong></div>' +
      (showFilter ? '<button type="button" class="mpl-filter-btn" data-action="toggle-filter" aria-expanded="false">Filters</button>' : '<span class="mpl-header-spacer"></span>') +
    '</header>';
  }

  function bottomNav(active) {
    return '<nav class="mpl-bottom-nav" aria-label="Mobile navigation">' +
      '<button type="button" class="' + (active === 'locations' ? 'active' : '') + '" data-nav="locations">⌖<span>Locations</span></button>' +
      '<button type="button" class="' + (active === 'browse' ? 'active' : '') + '" data-nav="browse">▦<span>Browse</span></button>' +
      '<button type="button" class="' + (active === 'saved' ? 'active' : '') + '" data-nav="saved">♡<span>Saved' + (saved.size ? ' (' + saved.size + ')' : '') + '</span></button>' +
      '<button type="button" class="' + (active === 'compare' ? 'active' : '') + '" data-nav="compare">⇄<span>Compare' + (compare.size ? ' (' + compare.size + ')' : '') + '</span></button>' +
    '</nav>';
  }

  function renderChooser() {
    state.city = null;
    root.innerHTML =
      '<section class="mpl-chooser">' +
        '<header class="mpl-brandbar">' +
          '<div class="mpl-brand"><div class="mpl-logo" aria-hidden="true">⌂</div><div><strong>Property Lens</strong><small>Verified property leads</small></div></div>' +
          '<button type="button" class="mpl-saved-head" data-nav="saved" aria-label="Open saved properties">♡</button>' +
        '</header>' +
        '<main class="mpl-chooser-body">' +
          '<p class="mpl-eyebrow">CHOOSE LOCATION</p>' +
          '<h1>Where do you want to buy?</h1>' +
          '<p class="mpl-lead">Select a city to see only currently active properties.</p>' +
          '<div class="mpl-city-grid">' +
            cities.map(function (city) {
              var m = markets[city] || {};
              var c = typeCounts(city);
              return '<button type="button" class="mpl-city" data-city="' + esc(city) + '">' +
                '<div class="mpl-city-icon" aria-hidden="true">' + iconForCity(city) + '</div>' +
                '<b>' + countFor(city) + ' active</b>' +
                '<strong>' + esc(city) + '</strong>' +
                '<span>' + esc(m.subtitle || 'Andhra Pradesh') + '</span>' +
                '<small>' + c.houses + ' houses · ' + c.flats + ' flats</small>' +
                '<div class="mpl-arrow" aria-hidden="true">›</div>' +
              '</button>';
            }).join('') +
          '</div>' +
          '<button type="button" class="mpl-all" data-city="all">Browse all ' + properties.length + ' active properties</button>' +
          '<div class="mpl-trust"><span>✓ Active-only</span><span>✓ Exact source links</span><span>✓ Maps & poster info</span></div>' +
        '</main>' +
      '</section>';
    bind();
  }

  function filtered() {
    var q = state.query.trim().toLowerCase();
    var budget = Number(state.budget);
    var list = properties.filter(function (p) {
      if (state.city && state.city !== 'all' && p.city !== state.city) return false;
      if (state.view === 'saved' && !saved.has(p.id)) return false;
      if (state.view === 'best' && Number(p.score || 0) < 90) return false;
      if (state.view === 'flats' && p.type !== 'Flat') return false;
      if (state.view === 'houses' && p.type !== 'Independent House') return false;
      if (state.view === 'gated' && p.gated !== 'yes') return false;
      if (state.type !== 'all' && p.type !== state.type) return false;
      if (p.price != null && Number(p.price) > budget) return false;
      if (p.price == null && budget < 999) return false;
      if (q && (p.name + ' ' + p.locality + ' ' + p.city + ' ' + (p.poster || '') + ' ' + (p.platform || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    list.sort(function (a,b) {
      if (state.sort === 'price-asc') return (a.price == null ? 999 : a.price) - (b.price == null ? 999 : b.price);
      if (state.sort === 'price-desc') return (b.price == null ? -1 : b.price) - (a.price == null ? -1 : a.price);
      return Number(b.score || 0) - Number(a.score || 0);
    });
    return list;
  }

  function filterPanel() {
    return '<section id="mplFilters" class="mpl-filters" hidden>' +
      '<label>Budget<select id="mplBudget"><option value="999">Any price</option><option value="45">Up to ₹45L</option><option value="50">Up to ₹50L</option><option value="60">Up to ₹60L</option></select></label>' +
      '<label>Property type<select id="mplType"><option value="all">All types</option><option value="Flat">Flats</option><option value="Independent House">Houses</option><option value="Plot">Plots</option><option value="Villa">Villas</option></select></label>' +
      '<label>Sort<select id="mplSort"><option value="recommended">Best first</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option></select></label>' +
    '</section>';
  }

  function card(p) {
    var isSaved = saved.has(p.id);
    var inCompare = compare.has(p.id);
    var facts = [p.bhk, p.size ? p.size + ' ' + p.sizeUnit : null, p.gated === 'yes' ? 'Gated' : typeLabel(p.type)].filter(Boolean);
    var deal = p.deal || 'Active';
    return '<article class="mpl-property">' +
      '<div class="mpl-property-top">' +
        '<div class="mpl-thumb"><div>' + propertyIcon(p.type) + '</div><small>' + esc(typeLabel(p.type)) + '</small></div>' +
        '<div class="mpl-property-info">' +
          '<div class="mpl-badges"><span class="mpl-deal">' + esc(deal) + '</span><span class="mpl-source">' + esc(p.platform || p.source) + '</span><button type="button" class="mpl-heart ' + (isSaved ? 'active' : '') + '" data-save="' + esc(p.id) + '" aria-label="' + (isSaved ? 'Remove from saved' : 'Save property') + '">' + (isSaved ? '♥' : '♡') + '</button></div>' +
          '<div class="mpl-price">' + price(p.price) + '<small>' + esc(p.target || 'Negotiate') + '</small></div>' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<div class="mpl-loc">' + esc(p.locality) + ', ' + esc(p.city) + '</div>' +
          '<div class="mpl-facts">' + facts.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="mpl-poster">Posted by ' + esc(p.poster || 'Source listing') + ' · ' + esc(p.lastSeen || 'Recently verified') + '</div>' +
      '<div class="mpl-actions">' +
        '<button type="button" class="mpl-details" data-details="' + esc(p.id) + '">View details</button>' +
        '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">Source ↗</a>' +
        (p.mapUrl ? '<a class="mpl-map" href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener" aria-label="Open map">⌖</a>' : '<span></span>') +
      '</div>' +
      '<button type="button" class="mpl-compare-toggle ' + (inCompare ? 'active' : '') + '" data-compare="' + esc(p.id) + '">' + (inCompare ? '✓ Added to compare' : '+ Add to compare') + '</button>' +
    '</article>';
  }

  function renderResults(options) {
    options = options || {};
    var list = filtered();
    var title = state.city === 'all' ? 'All locations' : state.city;
    var savedMode = state.view === 'saved';
    var heading = savedMode ? 'Saved properties' : list.length + ' active ' + (list.length === 1 ? 'property' : 'properties');
    root.innerHTML =
      '<section class="mpl-results">' +
        topCityHeader(savedMode ? 'Saved properties' : title, savedMode ? 'Your shortlist' : 'Showing properties in', !savedMode) +
        '<main class="mpl-results-body">' +
          '<div class="mpl-search"><span aria-hidden="true">⌕</span><input id="mplSearch" type="search" aria-label="Search properties" placeholder="Search locality or property" value="' + esc(state.query) + '"></div>' +
          filterPanel() +
          '<div class="mpl-pills" role="tablist" aria-label="Property filters">' +
            [['all','All'],['best','Best'],['flats','Flats'],['houses','Houses'],['gated','Gated']].map(function (pair) {
              return '<button type="button" role="tab" aria-selected="' + (state.view === pair[0] ? 'true' : 'false') + '" class="mpl-pill ' + (state.view === pair[0] ? 'active' : '') + '" data-view="' + pair[0] + '">' + pair[1] + '</button>';
            }).join('') +
          '</div>' +
          '<div class="mpl-result-head"><h2>' + esc(heading) + '</h2><span>' + (state.sort === 'recommended' ? 'Best first' : state.sort === 'price-asc' ? 'Lowest price' : 'Highest price') + '</span></div>' +
          '<div class="mpl-cards">' + (list.length ? list.map(card).join('') : '<div class="mpl-empty"><strong>No matching properties</strong><span>Try another filter or location.</span></div>') + '</div>' +
        '</main>' +
        bottomNav(savedMode ? 'saved' : 'browse') +
      '</section>';
    bind();
    var b = document.getElementById('mplBudget'); if (b) b.value = state.budget;
    var t = document.getElementById('mplType'); if (t) t.value = state.type;
    var s = document.getElementById('mplSort'); if (s) s.value = state.sort;
    if (options.focusResults) {
      var h = root.querySelector('.mpl-result-head h2');
      if (h) { h.tabIndex = -1; h.focus({preventScroll:true}); }
    }
  }

  function renderCompare() {
    var list = Array.from(compare).map(function (id) { return properties.find(function (p) { return p.id === id; }); }).filter(Boolean);
    root.innerHTML =
      '<section class="mpl-results">' +
        topCityHeader('Compare', list.length ? list.length + ' selected' : 'No properties selected', false) +
        '<main class="mpl-results-body mpl-compare-body">' +
          (list.length ? '<div class="mpl-cards">' + list.map(card).join('') + '</div>' : '<div class="mpl-empty mpl-empty-large"><strong>No properties selected</strong><span>Open a property and tap “Add to compare”.</span><button type="button" data-nav="browse">Browse properties</button></div>') +
        '</main>' +
        bottomNav('compare') +
      '</section>';
    bind();
  }

  function openDetails(id) {
    var p = properties.find(function (x) { return x.id === id; });
    if (!p) return;
    var phone = p.publicPhone ? String(p.publicPhone).replace(/\D/g,'').replace(/^91/,'') : '';
    dialog.innerHTML =
      '<div class="mpl-dialog-head"><div><small>' + esc(p.platform || p.source) + '</small><h2>' + esc(p.name) + '</h2><p>' + esc(p.locality) + ', ' + esc(p.city) + '</p></div><button type="button" data-close aria-label="Close">×</button></div>' +
      '<div class="mpl-dialog-body">' +
        '<div class="mpl-detail-price"><strong>' + price(p.price) + '</strong><span>Target ' + esc(p.target || 'Negotiate') + '</span></div>' +
        '<div class="mpl-detail-grid">' +
          '<div><span>BHK</span><strong>' + esc(p.bhk) + '</strong></div>' +
          '<div><span>Size</span><strong>' + esc(p.size ? p.size + ' ' + p.sizeUnit : 'Verify') + '</strong></div>' +
          '<div><span>Age</span><strong>' + esc(p.age || 'Verify') + '</strong></div>' +
          '<div><span>Posted by</span><strong>' + esc(p.poster || 'Source listing') + '</strong></div>' +
        '</div>' +
        '<h3>Why it is worth checking</h3><ul>' + (p.highlights || []).map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' +
        '<h3>Source status</h3><p>' + esc(p.lastSeen || '') + ' · ' + esc(p.status || 'Active / publicly discoverable') + '</p>' +
        '<div class="mpl-dialog-actions">' +
          '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">Open source ↗</a>' +
          (p.mapUrl ? '<a href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener">Open map ⌖</a>' : '') +
          (phone ? '<a href="tel:+91' + esc(phone) + '">Call</a>' : '') +
        '</div>' +
        '<button type="button" class="mpl-dialog-compare" data-compare="' + esc(p.id) + '">' + (compare.has(p.id) ? '✓ Added to compare' : '+ Add to compare') + '</button>' +
      '</div>';
    dialog.querySelector('[data-close]').onclick = function () { dialog.close(); };
    dialog.querySelector('[data-compare]').onclick = function () {
      toggleCompare(p.id);
      this.textContent = compare.has(p.id) ? '✓ Added to compare' : '+ Add to compare';
    };
    dialog.showModal();
  }

  function toggleSaved(id) {
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    persistSaved();
    if (state.view === 'saved') renderResults(); else renderResults();
  }

  function toggleCompare(id) {
    if (compare.has(id)) compare.delete(id);
    else if (compare.size < 4) compare.add(id);
    else {
      showToast('Compare up to 4 properties.');
      return;
    }
    if (!dialog.open) renderResults();
  }

  function showToast(message) {
    var old = document.querySelector('.mpl-toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'mpl-toast';
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  function bind() {
    root.querySelectorAll('[data-city]').forEach(function (el) {
      el.onclick = function () {
        state.city = el.getAttribute('data-city');
        state.view = 'all';
        state.query = '';
        state.budget = '999';
        state.type = 'all';
        state.sort = 'recommended';
        renderResults({focusResults:true});
      };
    });

    root.querySelectorAll('[data-action="locations"]').forEach(function (el) { el.onclick = renderChooser; });

    root.querySelectorAll('[data-action="toggle-filter"]').forEach(function (el) {
      el.onclick = function () {
        var panel = document.getElementById('mplFilters');
        if (!panel) return;
        var open = panel.hasAttribute('hidden');
        if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden','');
        el.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
    });

    root.querySelectorAll('[data-view]').forEach(function (el) {
      el.onclick = function () { state.view = el.getAttribute('data-view'); renderResults(); };
    });

    root.querySelectorAll('[data-nav]').forEach(function (el) {
      el.onclick = function () {
        var nav = el.getAttribute('data-nav');
        if (nav === 'locations') renderChooser();
        else if (nav === 'browse') {
          if (!state.city) state.city = 'all';
          state.view = 'all';
          renderResults();
        } else if (nav === 'saved') {
          state.city = 'all';
          state.view = 'saved';
          renderResults();
        } else if (nav === 'compare') renderCompare();
      };
    });

    root.querySelectorAll('[data-details]').forEach(function (el) { el.onclick = function () { openDetails(el.getAttribute('data-details')); }; });
    root.querySelectorAll('[data-save]').forEach(function (el) { el.onclick = function () { toggleSaved(el.getAttribute('data-save')); }; });
    root.querySelectorAll('[data-compare]').forEach(function (el) { el.onclick = function () { toggleCompare(el.getAttribute('data-compare')); }; });

    var search = document.getElementById('mplSearch');
    if (search) search.oninput = function () { state.query = search.value; renderResults(); };

    var budget = document.getElementById('mplBudget');
    if (budget) budget.onchange = function () { state.budget = budget.value; renderResults(); };
    var type = document.getElementById('mplType');
    if (type) type.onchange = function () { state.type = type.value; renderResults(); };
    var sort = document.getElementById('mplSort');
    if (sort) sort.onchange = function () { state.sort = sort.value; renderResults(); };
  }

  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  renderChooser();
})();