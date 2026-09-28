(function () {
  var mq = window.matchMedia('(max-width: 850px)');


  var core = window.PropertyLensCore;
  var properties = window.PROPERTY_DATA || [];
  var markets = window.MARKET_DATA || {};
  var cities = ['Vizag','Tanuku','Palakollu','Bhimavaram','Eluru'];
  var categories = [
    { key:'Flats', label:'Flats', icon:'▥', note:'Apartments & gated communities' },
    { key:'Independent Houses', label:'Independent Houses', icon:'⌂', note:'More privacy & land ownership' },
    { key:'Plots', label:'Plots', icon:'▧', note:'Build your home or invest' }
  ];
  var compare = new Set();
  var state = { city:null, category:null, view:'all', query:'', budget:'50', sort:'recommended', filtersOpen:false };
  var screen = 'locations';

  var saved = new Set(core.readArray('ap-shortlist'));

  function persistSaved() {
    try { localStorage.setItem('ap-shortlist', JSON.stringify(Array.from(saved))); } catch (e) {}
  }

  var esc = core.escapeHtml;
  var price = core.formatPrice;

  function iconForCity(city) {
    if (city === 'Vizag') return '🌊';
    if (city === 'Tanuku') return '🏡';
    if (city === 'Palakollu') return '🌿';
    if (city === 'Bhimavaram') return '🏙️';
    return '🌳';
  }

  function categoryFor(p) { return p.category; }

  function typeLabel(type) {
    return type === 'Independent House' ? 'House' : type;
  }

  function countFor(city, category) {
    return properties.filter(function (p) {
      return p.city === city && core.isEligibleLead(p) && (!category || categoryFor(p) === category);
    }).length;
  }

  var root = document.createElement('div');
  root.id = 'mobilePropertyApp';
  root.className = 'mpl-app';
  var skipLink = document.querySelector('.skip-link');
  if (skipLink) {
    document.body.insertBefore(root, skipLink.nextSibling);
    function syncSkipLink() { skipLink.setAttribute('href', mq.matches ? '#mplMain' : '#main'); }
    syncSkipLink();
    mq.addEventListener('change', syncSkipLink);
  } else document.body.prepend(root);
  document.body.classList.add('mobile-app-active');

  var dialog = document.createElement('dialog');
  dialog.id = 'mobilePropertyDialog';
  dialog.className = 'mpl-dialog';
  dialog.setAttribute('aria-label','Property details');
  document.body.appendChild(dialog);

  function topHeader(title, subtitle, backAction, showFilter) {
    return '<header class="mpl-topbar">' +
      '<button type="button" class="mpl-back" data-action="' + esc(backAction) + '" aria-label="Go back">‹</button>' +
      '<div class="mpl-topcopy"><small>' + esc(subtitle || '') + '</small><strong>' + esc(title) + '</strong></div>' +
      (showFilter ? '<button type="button" class="mpl-filter-btn" data-action="toggle-filter" aria-expanded="' + (state.filtersOpen ? 'true' : 'false') + '" aria-controls="mplFilters">Filters</button>' : '<span class="mpl-header-spacer"></span>') +
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
    screen = 'locations';
    state.filtersOpen = false;
    state.city = null;
    state.category = null;
    state.view = 'all';
    root.innerHTML =
      '<section class="mpl-chooser">' +
        '<header class="mpl-brandbar">' +
          '<div class="mpl-brand"><div class="mpl-logo" aria-hidden="true">⌂</div><div><strong>Property Lens</strong><small>Properties under ₹50L</small></div></div>' +
          '<button type="button" class="mpl-saved-head" data-nav="saved" aria-label="Open saved properties">♡</button>' +
        '</header>' +
        '<main id="mplMain" tabindex="-1" class="mpl-chooser-body">' +
          '<p class="mpl-eyebrow">STEP 1 OF 2</p>' +
          '<h1>Where do you want to buy?</h1>' +
          '<p class="mpl-lead">Find properties under ₹50 lakh. Choose a city, then Flats, Independent Houses or Plots.</p>' +
          '<div class="mpl-city-grid">' +
            cities.map(function (city) {
              var m = markets[city] || {};
              return '<button type="button" class="mpl-city" data-city="' + esc(city) + '">' +
                '<div class="mpl-city-icon" aria-hidden="true">' + iconForCity(city) + '</div>' +
                '<b>' + countFor(city) + ' listed</b>' +
                '<strong>' + esc(city) + '</strong>' +
                '<span>' + esc(m.subtitle || 'Andhra Pradesh') + '</span>' +
                '<small>' + countFor(city,'Flats') + ' flats · ' + countFor(city,'Independent Houses') + ' houses · ' + countFor(city,'Plots') + ' plots</small>' +
                '<div class="mpl-arrow" aria-hidden="true">›</div>' +
              '</button>';
            }).join('') +
          '</div>' +
          '<div class="mpl-trust"><span>✓ Listed below ₹50L</span><span>✓ Source links</span><span>✓ Maps & poster info</span></div>' +
          '<a class="mpl-submit-lead" href="https://github.com/varunjakkampudi-tech/property-lens/issues/new?template=property-lead.yml" target="_blank" rel="noopener">Found a reel or property? Submit a lead ↗</a>' +
        '</main>' +
      '</section>';
    bind();
  }

  function renderCategories(city) {
    screen = 'categories';
    state.filtersOpen = false;
    state.city = city;
    state.category = null;
    state.view = 'all';
    state.query = '';
    state.budget = '50';
    state.sort = 'recommended';

    var market = markets[city] || {};
    root.innerHTML =
      '<section class="mpl-category-screen">' +
        topHeader(city, market.subtitle || 'Choose property type', 'locations', false) +
        '<main id="mplMain" tabindex="-1" class="mpl-category-body">' +
          '<p class="mpl-eyebrow">STEP 2 OF 2</p>' +
          '<h1>What are you looking for?</h1>' +
          '<p class="mpl-lead">Choose one property type to see only relevant ' + esc(city) + ' listings.</p>' +
          '<div class="mpl-category-list">' +
            categories.map(function (c) {
              var count = countFor(city,c.key);
              return '<button type="button" class="mpl-category-card" data-category="' + esc(c.key) + '"' + (count ? '' : ' disabled') + '>' +
                '<div class="mpl-category-icon" aria-hidden="true">' + c.icon + '</div>' +
                '<div class="mpl-category-copy"><strong>' + esc(c.label) + '</strong><span>' + esc(c.note) + '</span><small>' + count + ' listed ' + (count === 1 ? 'lead' : 'leads') + '</small></div>' +
                '<div class="mpl-category-arrow" aria-hidden="true">›</div>' +
              '</button>';
            }).join('') +
          '</div>' +
          '<button type="button" class="mpl-all-types" data-category="all">See all ' + countFor(city) + ' properties in ' + esc(city) + '</button>' +
        '</main>' +
        bottomNav('browse') +
      '</section>';
    bind();
  }


  function filtered() {
    var q = state.query.trim().toLowerCase();
    var budget = Number(state.budget);
    var list = properties.filter(function (p) {
      if (state.city && state.city !== 'all' && p.city !== state.city) return false;
      if (state.category && state.category !== 'all' && categoryFor(p) !== state.category) return false;
      if (state.view === 'saved' && !saved.has(p.id)) return false;
      if (state.view === 'best' && Number(p.score || 0) < 90) return false;
      if (state.view === 'gated' && p.gated !== 'yes') return false;
      if (!core.isEligibleLead(p)) return false;
      if (p.price > budget) return false;
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
    return '<section id="mplFilters" class="mpl-filters"' + (state.filtersOpen ? '' : ' hidden') + '>' +
      '<label>Budget<select id="mplBudget"><option value="50">All under ₹50L</option><option value="20">Up to ₹20L</option><option value="25">Up to ₹25L</option><option value="30">Up to ₹30L</option><option value="35">Up to ₹35L</option><option value="40">Up to ₹40L</option><option value="45">Up to ₹45L</option></select></label>' +
      '<label>Sort<select id="mplSort"><option value="recommended">Best first</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option></select></label>' +
    '</section>';
  }

  function card(p) {
    var isSaved = saved.has(p.id);
    var inCompare = compare.has(p.id);
    var facts = [p.bhk, p.size ? p.size + ' ' + p.sizeUnit : null, p.gated === 'yes' ? 'Gated' : typeLabel(p.type)].filter(Boolean);
    return '<article class="mpl-property">' +
      '<div class="mpl-property-top">' +
        '<div class="mpl-thumb"><div>' + (p.type === 'Plot' ? '▧' : p.type === 'Flat' ? '▥' : '⌂') + '</div><small>' + esc(typeLabel(p.type)) + '</small></div>' +
        '<div class="mpl-property-info">' +
          '<div class="mpl-badges"><span class="mpl-deal">' + esc(p.deal || 'Active') + '</span><span class="mpl-source">' + esc(p.platform || p.source) + '</span><button type="button" class="mpl-heart ' + (isSaved ? 'active' : '') + '" data-save="' + esc(p.id) + '" aria-pressed="' + isSaved + '" aria-label="' + (isSaved ? 'Remove from saved' : 'Save property') + '">' + (isSaved ? '♥' : '♡') + '</button></div>' +
          '<div class="mpl-price">' + price(p.price) + '<small>' + esc(p.target || 'Negotiate') + '</small></div>' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<div class="mpl-loc">' + esc(p.locality) + ', ' + esc(p.city) + '</div>' +
          '<div class="mpl-facts">' + facts.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="mpl-poster">Posted by ' + esc(p.poster || 'Source listing') + ' · ' + esc(p.lastSeen || 'Recently verified') + '</div>' +
      '<div class="mpl-actions">' +
        '<button type="button" class="mpl-details" data-details="' + esc(p.id) + '">View details</button>' +
        '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(core.sourceLinkLabel(p)) + ' ↗</a>' +
        (p.mapUrl ? '<a class="mpl-map" href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener" aria-label="Open map">⌖</a>' : '<span></span>') +
      '</div>' +
      '<button type="button" class="mpl-compare-toggle ' + (inCompare ? 'active' : '') + '" data-compare="' + esc(p.id) + '" aria-pressed="' + inCompare + '">' + (inCompare ? '✓ Added to compare' : '+ Add to compare') + '</button>' +
    '</article>';
  }

  function renderResults(options) {
    screen = 'results';
    options = options || {};
    var list = filtered();
    var savedMode = state.view === 'saved';
    var categoryLabel = state.category && state.category !== 'all' ? state.category : 'All properties';
    var title = savedMode ? 'Saved properties' : (state.city === 'all' ? 'All locations' : state.city);
    var subtitle = savedMode ? 'Your shortlist' : categoryLabel;
    var heading = list.length + ' listed ' + (list.length === 1 ? 'property' : 'properties');

    root.innerHTML =
      '<section class="mpl-results">' +
        topHeader(title, subtitle, savedMode ? 'locations' : 'categories', !savedMode) +
        '<main id="mplMain" tabindex="-1" class="mpl-results-body">' +
          '<div class="mpl-search"><span aria-hidden="true">⌕</span><input id="mplSearch" type="search" aria-label="Search properties" placeholder="Search locality or property" value="' + esc(state.query) + '"></div>' +
          filterPanel() +
          '<div class="mpl-pills" role="group" aria-label="Property filters">' +
            [['all','All'],['best','Best'],['gated','Gated']].map(function (pair) {
              return '<button type="button" aria-pressed="' + (state.view === pair[0] ? 'true' : 'false') + '" class="mpl-pill ' + (state.view === pair[0] ? 'active' : '') + '" data-view="' + pair[0] + '">' + pair[1] + '</button>';
            }).join('') +
          '</div>' +
          '<div class="mpl-result-head"><div><small>' + esc(categoryLabel) + '</small><h2 aria-live="polite" aria-atomic="true">' + esc(heading) + '</h2></div><span>' + (state.sort === 'recommended' ? 'Best first' : state.sort === 'price-asc' ? 'Lowest price' : 'Highest price') + '</span></div>' +
          '<div class="mpl-cards">' + (list.length ? list.map(card).join('') : '<div class="mpl-empty"><strong>No matching properties</strong><span>Try another filter or category.</span></div>') + '</div>' +
        '</main>' +
        bottomNav(savedMode ? 'saved' : 'browse') +
      '</section>';
    bind();
    var b = document.getElementById('mplBudget'); if (b) b.value = state.budget;
    var s = document.getElementById('mplSort'); if (s) s.value = state.sort;
    if (options.focusResults) {
      var h = root.querySelector('.mpl-result-head h2');
      if (h) { h.tabIndex = -1; h.focus({preventScroll:true}); }
    }
  }

  function renderCompare() {
    screen = 'compare';
    var list = Array.from(compare).map(function (id) { return properties.find(function (p) { return p.id === id; }); }).filter(Boolean);
    root.innerHTML =
      '<section class="mpl-results">' +
        topHeader('Compare', list.length ? list.length + ' selected' : 'No properties selected', state.city ? 'categories' : 'locations', false) +
        '<main id="mplMain" tabindex="-1" class="mpl-results-body mpl-compare-body">' +
          (list.length ? '<div class="mpl-cards">' + list.map(card).join('') + '</div>' : '<div class="mpl-empty mpl-empty-large"><strong>No properties selected</strong><span>Open a property and tap “Add to compare”.</span><button type="button" data-nav="browse">Browse properties</button></div>') +
        '</main>' +
        bottomNav('compare') +
      '</section>';
    bind();
  }

  function openDetails(id) {
    var p = properties.find(function (x) { return x.id === id; });
    if (!p) return;
    var phone = core.normalizeIndianBusinessPhone(p.publicPhone);
    dialog.innerHTML =
      '<div class="mpl-dialog-head"><div><small>' + esc(p.platform || p.source) + '</small><h2>' + esc(p.name) + '</h2><p>' + esc(p.locality) + ', ' + esc(p.city) + '</p></div><button type="button" data-close aria-label="Close">×</button></div>' +
      '<div class="mpl-dialog-body">' +
        '<div class="mpl-detail-price"><strong>' + price(p.price) + '</strong><span>Target ' + esc(p.target || 'Negotiate') + '</span></div>' +
        '<div class="mpl-detail-grid">' +
          '<div><span>Category</span><strong>' + esc(categoryFor(p)) + '</strong></div>' +
          '<div><span>BHK</span><strong>' + esc(p.bhk) + '</strong></div>' +
          '<div><span>Size</span><strong>' + esc(p.size ? p.size + ' ' + p.sizeUnit : 'Verify') + '</strong></div>' +
          '<div><span>Age</span><strong>' + esc(p.age || 'Verify') + '</strong></div>' +
          '<div><span>Posted by</span><strong>' + esc(p.poster || 'Source listing') + '</strong></div>' +
          '<div><span>Verified</span><strong>' + esc(p.verifiedOn || '') + '</strong></div>' +
        '</div>' +
        '<h3>Why it is worth checking</h3><ul>' + (p.highlights || []).map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' +
        '<h3>Availability & source</h3><p>' + esc(p.lastSeen || '') + ' · ' + esc(p.status || 'Publicly listed; confirm availability') + '</p>' +
        '<div class="mpl-dialog-actions">' +
          '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(core.sourceLinkLabel(p)) + ' ↗</a>' +
          (p.mapUrl ? '<a href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener">Open map ⌖</a>' : '') +
          (phone ? '<a href="tel:+91' + esc(phone) + '">Call</a>' : '') +
        '</div>' +
        '<button type="button" class="mpl-dialog-compare" data-compare="' + esc(p.id) + '" aria-pressed="' + compare.has(p.id) + '">' + (compare.has(p.id) ? '✓ Added to compare' : '+ Add to compare') + '</button>' +
      '</div>';
    dialog.querySelector('[data-close]').onclick = function () { dialog.close(); };
    dialog.querySelector('[data-compare]').onclick = function () {
      toggleCompare(p.id);
      this.textContent = compare.has(p.id) ? '✓ Added to compare' : '+ Add to compare';
      this.setAttribute('aria-pressed', String(compare.has(p.id)));
    };
    dialog.showModal();
  }

  function toggleSaved(id) {
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    persistSaved();
    window.dispatchEvent(new Event('pl-saved-sync'));
    if (screen === 'compare') renderCompare(); else renderResults();
  }

  function toggleCompare(id) {
    if (compare.has(id)) compare.delete(id);
    else if (compare.size < 4) compare.add(id);
    else { showToast('Compare up to 4 properties.'); return; }
    if (!dialog.open) {
      if (screen === 'compare') renderCompare(); else renderResults();
    }
  }

  function showToast(message) {
    var old = document.querySelector('.mpl-toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'mpl-toast';
    t.setAttribute('role', 'status');
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  function bindPropertyCards() {
    root.querySelectorAll('[data-details]').forEach(function (el) { el.onclick = function () { openDetails(el.getAttribute('data-details')); }; });
    root.querySelectorAll('[data-save]').forEach(function (el) { el.onclick = function () { toggleSaved(el.getAttribute('data-save')); }; });
    root.querySelectorAll('[data-compare]').forEach(function (el) { el.onclick = function () { toggleCompare(el.getAttribute('data-compare')); }; });
  }

  function updateResultCards() {
    var list = filtered();
    var heading = root.querySelector('.mpl-result-head h2');
    if (heading) heading.textContent = list.length + ' listed ' + (list.length === 1 ? 'property' : 'properties');
    var cards = root.querySelector('.mpl-cards');
    if (cards) cards.innerHTML = list.length ? list.map(card).join('') : '<div class="mpl-empty"><strong>No matching properties</strong><span>Try another filter or category.</span></div>';
    bindPropertyCards();
  }

  function bind() {
    root.querySelectorAll('[data-city]').forEach(function (el) {
      el.onclick = function () { renderCategories(el.getAttribute('data-city')); };
    });

    root.querySelectorAll('[data-category]').forEach(function (el) {
      el.onclick = function () {
        state.category = el.getAttribute('data-category');
        state.view = 'all';
        state.query = '';
        state.budget = '50';
        state.sort = 'recommended';
        state.filtersOpen = false;
        renderResults({focusResults:true});
      };
    });

    root.querySelectorAll('[data-action="locations"]').forEach(function (el) { el.onclick = renderChooser; });
    root.querySelectorAll('[data-action="categories"]').forEach(function (el) {
      el.onclick = function () { if (state.city && state.city !== 'all') renderCategories(state.city); else renderChooser(); };
    });

    root.querySelectorAll('[data-action="toggle-filter"]').forEach(function (el) {
      el.onclick = function () {
        var panel = document.getElementById('mplFilters');
        if (!panel) return;
        var open = panel.hasAttribute('hidden');
        state.filtersOpen = open;
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
          if (state.city && state.city !== 'all') renderCategories(state.city);
          else renderChooser();
        } else if (nav === 'saved') {
          state.city = 'all';
          state.category = 'all';
          state.view = 'saved';
          state.query = '';
          renderResults();
        } else if (nav === 'compare') renderCompare();
      };
    });

    bindPropertyCards();

    var search = document.getElementById('mplSearch');
    if (search) search.oninput = function () {
      state.query = search.value;
      updateResultCards();
    };
    var budget = document.getElementById('mplBudget');
    if (budget) budget.onchange = function () { state.budget = budget.value; renderResults(); };
    var sort = document.getElementById('mplSort');
    if (sort) sort.onchange = function () { state.sort = sort.value; renderResults(); };
  }

  window.addEventListener('pl-saved-sync', function () {
    var ids = core.readArray('ap-shortlist');
    if (ids.length === saved.size && ids.every(function (id) { return saved.has(id); })) return;
    saved.clear();
    ids.forEach(function (id) { saved.add(id); });
    if (screen === 'compare') renderCompare();
    else if (screen === 'categories') renderCategories(state.city);
    else if (screen === 'locations') renderChooser();
    else renderResults();
  });

  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  renderChooser();
})();