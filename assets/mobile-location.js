(function () {
  var mq = window.matchMedia('(max-width: 850px)');
  var properties = window.PROPERTY_DATA || [];
  var markets = window.MARKET_DATA || {};
  var cities = ['Vizag','Tanuku','Palakollu','Bhimavaram'];
  var hasSelection = false;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];
    });
  }
  function countFor(city){ return properties.filter(function(p){ return p.city === city; }).length; }
  function typesFor(city){
    var list = properties.filter(function(p){ return p.city === city; });
    return {
      houses: list.filter(function(p){ return p.type === 'Independent House'; }).length,
      flats: list.filter(function(p){ return p.type === 'Flat'; }).length
    };
  }
  function iconFor(city){
    if(city === 'Vizag') return '🌊';
    if(city === 'Tanuku') return '🏡';
    if(city === 'Palakollu') return '🌿';
    return '🏙️';
  }

  var overlay = document.createElement('section');
  overlay.id = 'mobileLocationScreen';
  overlay.className = 'mobile-location-screen is-hidden';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','mobileLocationTitle');

  var cards = cities.map(function(city){
    var market = markets[city] || {};
    var types = typesFor(city);
    return '<button type="button" class="mobile-city-choice" data-mobile-city="'+esc(city)+'">' +
      '<div class="mobile-city-icon" aria-hidden="true">'+iconFor(city)+'</div>' +
      '<div class="mobile-city-copy">' +
        '<div class="mobile-city-title-row"><strong>'+esc(city)+'</strong><span>'+countFor(city)+' active</span></div>' +
        '<p>'+esc(market.subtitle || 'Andhra Pradesh')+'</p>' +
        '<small>'+types.houses+' houses · '+types.flats+' flats'+(market.range ? ' · '+esc(market.range) : '')+'</small>' +
      '</div>' +
      '<div class="mobile-city-arrow" aria-hidden="true">›</div>' +
    '</button>';
  }).join('');

  overlay.innerHTML = '<div class="mobile-location-header">' +
    '<div class="mobile-location-brand"><div class="mobile-location-logo" aria-hidden="true">⌂</div><div><strong>Property Lens</strong><span>Active property leads</span></div></div>' +
    '<div class="mobile-location-updated">Checked 28 Sep 2026</div>' +
    '</div>' +
    '<div class="mobile-location-content">' +
      '<p class="mobile-location-kicker">WHERE ARE YOU LOOKING?</p>' +
      '<h1 id="mobileLocationTitle" tabindex="-1">Choose a location</h1>' +
      '<p class="mobile-location-subtitle">Tap a city to see all currently active properties there.</p>' +
      '<div class="mobile-city-list">'+cards+'</div>' +
      '<button type="button" id="mobileAllLocations" class="mobile-all-locations">Browse all '+properties.length+' active properties</button>' +
      '<div class="mobile-location-trust"><span>✓ Active-only leads</span><span>✓ Exact source links</span><span>✓ Maps & poster details</span></div>' +
    '</div>';
  document.body.prepend(overlay);

  var cityBar = document.createElement('div');
  cityBar.id = 'mobileCityBar';
  cityBar.className = 'mobile-city-bar';
  cityBar.hidden = true;
  cityBar.innerHTML = '<button type="button" id="changeMobileLocation" class="mobile-back-btn" aria-label="Change location">‹</button>' +
    '<div><span>Showing properties in</span><strong id="mobileSelectedCity">All locations</strong></div>' +
    '<button type="button" id="mobileQuickFilter" class="mobile-filter-btn" aria-expanded="false">Filters</button>';
  document.body.appendChild(cityBar);

  var appShell = document.querySelector('.app-shell');
  var mobileNav = document.querySelector('.mobile-bottom-nav');
  var filterPanel = document.querySelector('.filter-panel');
  var browseAll = document.getElementById('browseAll');
  var cityFilter = document.getElementById('cityFilter');

  function setUnderlyingDisabled(disabled){
    [appShell,mobileNav].forEach(function(el){
      if(!el) return;
      el.inert = disabled;
      if(disabled) el.setAttribute('aria-hidden','true');
      else el.removeAttribute('aria-hidden');
    });
  }

  function resetFiltersExceptCity(){
    ['typeFilter','ageFilter','gatedFilter','dealFilter'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.value='all';
    });
    var budget=document.getElementById('budgetFilter'); if(budget) budget.value='999';
    var sort=document.getElementById('sortSelect'); if(sort) sort.value='recommended';
    var search=document.getElementById('searchInput'); if(search) search.value='';
  }

  function showChooser(){
    if(!mq.matches) return;
    document.body.classList.remove('mobile-city-mode');
    document.body.classList.add('mobile-location-active');
    overlay.classList.remove('is-hidden');
    cityBar.hidden = true;
    if(filterPanel) filterPanel.classList.remove('mobile-filter-open');
    var filterButton=document.getElementById('mobileQuickFilter');
    if(filterButton) filterButton.setAttribute('aria-expanded','false');
    setUnderlyingDisabled(true);
    window.scrollTo({top:0,behavior:'auto'});
    setTimeout(function(){ document.getElementById('mobileLocationTitle').focus(); },0);
  }

  function enterListingsView(){
    document.body.classList.remove('mobile-location-active');
    document.body.classList.add('mobile-city-mode');
    overlay.classList.add('is-hidden');
    cityBar.hidden = false;
    setUnderlyingDisabled(false);
  }

  function selectCity(city){
    hasSelection = true;
    resetFiltersExceptCity();
    if(cityFilter){
      cityFilter.value=city;
      cityFilter.dispatchEvent(new Event('change',{bubbles:true}));
    }
    enterListingsView();
    document.getElementById('mobileSelectedCity').textContent = city === 'all' ? 'All locations' : city;
    var resultsTitle=document.getElementById('resultsTitle');
    if(resultsTitle) {
      resultsTitle.textContent = city === 'all' ? 'All active properties' : city + ' properties';
      resultsTitle.setAttribute('tabindex','-1');
    }
    window.scrollTo({top:0,behavior:'auto'});
    setTimeout(function(){
      if(browseAll) browseAll.scrollIntoView({block:'start',behavior:'auto'});
      if(resultsTitle) resultsTitle.focus({preventScroll:true});
    },0);
  }

  overlay.querySelectorAll('[data-mobile-city]').forEach(function(btn){
    btn.addEventListener('click',function(){ selectCity(btn.getAttribute('data-mobile-city')); });
  });
  document.getElementById('mobileAllLocations').addEventListener('click',function(){ selectCity('all'); });
  document.getElementById('changeMobileLocation').addEventListener('click',showChooser);

  document.getElementById('mobileQuickFilter').addEventListener('click',function(){
    if(!filterPanel) return;
    var open = !filterPanel.classList.contains('mobile-filter-open');
    filterPanel.classList.toggle('mobile-filter-open',open);
    this.setAttribute('aria-expanded', open ? 'true' : 'false');
    if(open) filterPanel.scrollIntoView({behavior:'smooth',block:'start'});
  });

  if(cityFilter) cityFilter.addEventListener('change',function(){
    if(!document.body.classList.contains('mobile-city-mode')) return;
    document.getElementById('mobileSelectedCity').textContent = cityFilter.value === 'all' ? 'All locations' : cityFilter.value;
  });

  var locationsButton=document.getElementById('mobileLocations');
  if(locationsButton) locationsButton.addEventListener('click',showChooser);

  var savedButton=document.getElementById('mobileSaved');
  if(savedButton) savedButton.addEventListener('click',function(){
    var tab=document.querySelector('[data-view="shortlisted"]');
    if(tab) tab.click();
    if(browseAll) browseAll.scrollIntoView({behavior:'smooth',block:'start'});
  });

  var compareButton=document.getElementById('mobileCompare');
  if(compareButton) compareButton.addEventListener('click',function(){
    var desktopCompare=document.getElementById('compareBtn');
    if(desktopCompare) desktopCompare.click();
  });

  function syncViewport(event){
    if(!event.matches){
      document.body.classList.remove('mobile-location-active','mobile-city-mode');
      overlay.classList.add('is-hidden');
      cityBar.hidden = true;
      setUnderlyingDisabled(false);
      return;
    }
    if(hasSelection) enterListingsView();
    else showChooser();
  }

  if(typeof mq.addEventListener === 'function') mq.addEventListener('change',syncViewport);
  else if(typeof mq.addListener === 'function') mq.addListener(syncViewport);
  syncViewport(mq);
})();