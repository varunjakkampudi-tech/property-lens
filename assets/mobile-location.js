(function () {
  var mq = window.matchMedia('(max-width: 850px)');
  if (!mq.matches) return;

  var properties = window.PROPERTY_DATA || [];
  var markets = window.MARKET_DATA || {};
  var cities = ['Vizag','Tanuku','Palakollu','Bhimavaram'];

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
  overlay.className = 'mobile-location-screen';
  overlay.setAttribute('aria-label','Choose a location');

  var cards = cities.map(function(city){
    var market = markets[city] || {};
    var types = typesFor(city);
    return '<button class="mobile-city-choice" data-mobile-city="'+city+'">' +
      '<div class="mobile-city-icon">'+iconFor(city)+'</div>' +
      '<div class="mobile-city-copy">' +
        '<div class="mobile-city-title-row"><strong>'+city+'</strong><span>'+countFor(city)+' active</span></div>' +
        '<p>'+(market.subtitle || 'Andhra Pradesh')+'</p>' +
        '<small>'+types.houses+' houses · '+types.flats+' flats'+(market.range ? ' · '+market.range : '')+'</small>' +
      '</div>' +
      '<div class="mobile-city-arrow">›</div>' +
    '</button>';
  }).join('');

  overlay.innerHTML = '<div class="mobile-location-header">' +
    '<div class="mobile-location-brand"><div class="mobile-location-logo">⌂</div><div><strong>Property Lens</strong><span>Active property leads</span></div></div>' +
    '<div class="mobile-location-updated">Checked 28 Sep 2026</div>' +
    '</div>' +
    '<div class="mobile-location-content">' +
      '<p class="mobile-location-kicker">WHERE ARE YOU LOOKING?</p>' +
      '<h1>Choose a location</h1>' +
      '<p class="mobile-location-subtitle">Tap a city to see all currently active properties there.</p>' +
      '<div class="mobile-city-list">'+cards+'</div>' +
      '<button id="mobileAllLocations" class="mobile-all-locations">Browse all '+properties.length+' active properties</button>' +
      '<div class="mobile-location-trust"><span>✓ Active-only leads</span><span>✓ Exact source links</span><span>✓ Maps & poster details</span></div>' +
    '</div>';
  document.body.prepend(overlay);

  var cityBar = document.createElement('div');
  cityBar.id = 'mobileCityBar';
  cityBar.className = 'mobile-city-bar';
  cityBar.hidden = true;
  cityBar.innerHTML = '<button id="changeMobileLocation" class="mobile-back-btn" aria-label="Change location">‹</button>' +
    '<div><span>Showing properties in</span><strong id="mobileSelectedCity">All locations</strong></div>' +
    '<button id="mobileQuickFilter" class="mobile-filter-btn">Filters</button>';
  document.body.appendChild(cityBar);

  var filterPanel = document.querySelector('.filter-panel');
  var browseAll = document.getElementById('browseAll');

  function resetMobileFiltersExceptCity(){
    var ids = ['typeFilter','ageFilter','gatedFilter','dealFilter'];
    ids.forEach(function(id){ var el=document.getElementById(id); if(el) el.value='all'; });
    var budget=document.getElementById('budgetFilter'); if(budget) budget.value='999';
    var sort=document.getElementById('sortSelect'); if(sort) sort.value='recommended';
    var search=document.getElementById('searchInput'); if(search) search.value='';
  }

  function selectCity(city){
    resetMobileFiltersExceptCity();
    var cityFilter=document.getElementById('cityFilter');
    if(cityFilter){ cityFilter.value=city; cityFilter.dispatchEvent(new Event('change',{bubbles:true})); }
    document.body.classList.add('mobile-city-mode');
    overlay.classList.add('is-hidden');
    cityBar.hidden=false;
    document.getElementById('mobileSelectedCity').textContent = city === 'all' ? 'All locations' : city;
    var resultsTitle=document.getElementById('resultsTitle');
    if(resultsTitle) resultsTitle.textContent = city === 'all' ? 'All active properties' : city + ' properties';
    window.scrollTo({top:0,behavior:'instant'});
    setTimeout(function(){ if(browseAll) browseAll.scrollIntoView({block:'start'}); },0);
  }

  overlay.querySelectorAll('[data-mobile-city]').forEach(function(btn){
    btn.addEventListener('click',function(){ selectCity(btn.getAttribute('data-mobile-city')); });
  });
  document.getElementById('mobileAllLocations').addEventListener('click',function(){ selectCity('all'); });
  document.getElementById('changeMobileLocation').addEventListener('click',function(){
    document.body.classList.remove('mobile-city-mode');
    overlay.classList.remove('is-hidden');
    cityBar.hidden=true;
    if(filterPanel) filterPanel.classList.remove('mobile-filter-open');
    window.scrollTo({top:0,behavior:'instant'});
  });
  document.getElementById('mobileQuickFilter').addEventListener('click',function(){
    if(!filterPanel) return;
    filterPanel.classList.toggle('mobile-filter-open');
    if(filterPanel.classList.contains('mobile-filter-open')) filterPanel.scrollIntoView({behavior:'smooth',block:'start'});
  });

  var cityFilter=document.getElementById('cityFilter');
  if(cityFilter) cityFilter.addEventListener('change',function(){
    if(!document.body.classList.contains('mobile-city-mode')) return;
    document.getElementById('mobileSelectedCity').textContent = cityFilter.value === 'all' ? 'All locations' : cityFilter.value;
  });
})();