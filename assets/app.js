(() => {
  const properties = window.PROPERTY_DATA || [];
  const markets = window.MARKET_DATA || {};
  const $ = (id) => document.getElementById(id);
  const state = { view: 'all', city: 'all' };
  const shortlist = new Set(JSON.parse(localStorage.getItem('ap-shortlist') || '[]'));
  const visited = new Set(JSON.parse(localStorage.getItem('ap-visited') || '[]'));
  const compare = new Set();
  const notes = JSON.parse(localStorage.getItem('ap-notes') || '{}');

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const priceText = p => p == null ? 'Price on request' : `₹${Number(p).toFixed(Number(p)%1 ? 1 : 0)} Lakhs`;
  const gatedText = g => g === 'yes' ? 'Gated' : g === 'partial' ? 'Verify gated' : 'Independent';
  const icon = p => p.type === 'Plot' ? '▧' : p.type === 'Independent House' ? '⌂' : p.type === 'Villa' ? '⌂' : p.type === 'Watchlist' ? '◎' : '▥';
  const heroClass = p => p.type === 'Plot' ? 'plot' : p.type === 'Independent House' ? 'house' : p.type === 'Watchlist' ? 'watch' : '';
  const dealClass = d => d === 'Strong Deal' ? 'strong' : d === 'Potential Bargain' ? 'bargain' : d === 'Good Value' ? 'good' : d === 'Fair / Negotiate' ? 'fair' : 'watch';

  function persist() {
    localStorage.setItem('ap-shortlist', JSON.stringify([...shortlist]));
    localStorage.setItem('ap-visited', JSON.stringify([...visited]));
    localStorage.setItem('ap-notes', JSON.stringify(notes));
  }

  function updateCounts() {
    $('shortlistCount').textContent = shortlist.size;
    $('shortlistCountSide').textContent = shortlist.size;
    $('visitedCountSide').textContent = visited.size;
    $('compareCount').textContent = compare.size;
  }

  function renderCities() {
    $('citySummary').innerHTML = Object.entries(markets).map(([city, m]) => `
      <article class="city-card ${state.city===city?'active':''}" data-city-card="${city}" tabindex="0">
        <h3>${city}</h3><span class="city-sub">${esc(m.subtitle)}</span>
        <div class="market-rate">${esc(m.range)}</div><div class="market-note">${esc(m.note)}</div>
        <div class="trend">↗ ${esc(m.trend)}</div>
      </article>`).join('');
    document.querySelectorAll('[data-city-card]').forEach(el => {
      const select = () => { state.city = state.city === el.dataset.cityCard ? 'all' : el.dataset.cityCard; $('cityFilter').value = state.city; renderCities(); render(); };
      el.addEventListener('click', select); el.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') select(); });
    });
  }

  function setupFilters() {
    Object.keys(markets).forEach(city => $('cityFilter').insertAdjacentHTML('beforeend', `<option value="${city}">${city}</option>`));
    ['cityFilter','typeFilter','budgetFilter','ageFilter','gatedFilter','dealFilter','sortSelect'].forEach(id => $(id).addEventListener('change', () => { if(id==='cityFilter'){state.city=$(id).value;renderCities();} render(); }));
    $('searchInput').addEventListener('input', render);
    $('resetFilters').addEventListener('click', () => {
      state.city='all'; state.view='all';
      $('cityFilter').value='all'; $('typeFilter').value='all'; $('budgetFilter').value='999'; $('ageFilter').value='all'; $('gatedFilter').value='all'; $('dealFilter').value='all'; $('sortSelect').value='recommended'; $('searchInput').value='';
      document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view==='all')); renderCities(); render();
    });
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');state.view=tab.dataset.view;render(); }));
  }

  function getFiltered() {
    const type=$('typeFilter').value, budget=Number($('budgetFilter').value), age=$('ageFilter').value, gated=$('gatedFilter').value, deal=$('dealFilter').value, q=$('searchInput').value.trim().toLowerCase();
    let list=properties.filter(p => {
      if(state.city!=='all'&&p.city!==state.city) return false;
      if(type!=='all'&&p.type!==type) return false;
      if(p.price!=null&&p.price>budget) return false;
      if(p.price==null&&budget<999) return false;
      if(age!=='all'&&p.ageGroup!==age) return false;
      if(gated!=='all') {
        if(gated==='yes'&&p.gated!=='yes') return false;
        if(gated==='partial'&&p.gated!=='partial') return false;
        if(gated==='no'&&p.gated!=='no') return false;
      }
      if(deal!=='all'&&p.deal!==deal) return false;
      if(state.view==='recommended'&&p.score<85) return false;
      if(state.view==='gated'&&p.gated!=='yes') return false;
      if(state.view==='houses'&&p.type!=='Independent House') return false;
      if(state.view==='shortlisted'&&!shortlist.has(p.id)) return false;
      if(q&&!`${p.name} ${p.locality} ${p.city} ${p.source} ${p.poster||''} ${p.deal}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const sort=$('sortSelect').value;
    list.sort((a,b)=> sort==='price-asc' ? ((a.price??999)-(b.price??999)) : sort==='price-desc' ? ((b.price??-1)-(a.price??-1)) : sort==='size-desc' ? ((b.size??0)-(a.size??0)) : b.score-a.score);
    return list;
  }

  function card(p) {
    const chips = [p.gated==='yes'?'Gated community':p.gated==='partial'?'Community / verify':'Land ownership focus',...(p.highlights||[]).slice(0,2)];
    return `<article class="property-card">
      <div class="card-hero ${heroClass(p)}"><span class="deal-badge ${dealClass(p.deal)}">${esc(p.deal)}</span><span class="hero-icon">${icon(p)}</span><button class="heart-btn ${shortlist.has(p.id)?'active':''}" data-shortlist="${p.id}" aria-label="Toggle shortlist">${shortlist.has(p.id)?'♥':'♡'}</button></div>
      <div class="card-body">
        <div class="price-row"><span class="price">${priceText(p.price)}</span><span class="negotiation">Target ${esc(p.target)}</span></div>
        <h3>${esc(p.name)}</h3><div class="location">⌖ ${esc(p.locality)}, ${esc(p.city)}</div>
        <div class="stats"><span>${esc(p.bhk)}</span><span>${p.size?`${esc(p.size)} ${esc(p.sizeUnit)}`:'Size verify'}</span><span>${esc(p.age)}</span></div>
        <div class="chips">${chips.map((c,i)=>`<span class="chip ${i===0?'green':''}">${esc(c)}</span>`).join('')}</div>
        <div class="valuation"><div>Market / area ref<strong>${esc(p.market)}</strong></div><div>Asking rate<strong>${esc(p.askingRate)}</strong></div></div>
        <div class="card-actions"><button class="details-btn" data-details="${p.id}">View details</button><a class="source-link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.source)} ↗</a></div>
        <div class="small-actions"><button class="small-action ${compare.has(p.id)?'active':''}" data-compare="${p.id}" title="Compare">⇄</button><button class="small-action ${visited.has(p.id)?'active':''}" data-visited="${p.id}" title="Visited">✓</button><button class="small-action" data-note="${p.id}" title="Notes">✎</button></div>
      </div></article>`;
  }

  function bindCards() {
    document.querySelectorAll('[data-shortlist]').forEach(b=>b.onclick=()=>{shortlist.has(b.dataset.shortlist)?shortlist.delete(b.dataset.shortlist):shortlist.add(b.dataset.shortlist);persist();updateCounts();render();});
    document.querySelectorAll('[data-visited]').forEach(b=>b.onclick=()=>{visited.has(b.dataset.visited)?visited.delete(b.dataset.visited):visited.add(b.dataset.visited);persist();updateCounts();render();});
    document.querySelectorAll('[data-compare]').forEach(b=>b.onclick=()=>{const id=b.dataset.compare;if(compare.has(id))compare.delete(id);else if(compare.size<4)compare.add(id);else alert('Compare up to 4 properties at a time.');updateCounts();render();});
    document.querySelectorAll('[data-details]').forEach(b=>b.onclick=()=>openDetails(b.dataset.details));
    document.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>openDetails(b.dataset.note,true));
  }

  function render() {
    const list=getFiltered();
    $('propertyGrid').innerHTML=list.map(card).join('');
    $('emptyState').hidden=list.length!==0;
    $('resultsMeta').textContent=`${list.length} lead${list.length===1?'':'s'} shown · ${properties.length} total active verified leads`;
    $('resultsTitle').textContent=state.city==='all'?'Property leads':`${state.city} property leads`;
    bindCards(); updateCounts();
  }

  function openDetails(id, focusNote=false) {
    const p=properties.find(x=>x.id===id); if(!p)return;
    const d=$('detailsDialog');
    d.innerHTML=`<div class="dialog-head"><div><span class="deal-badge ${dealClass(p.deal)}">${esc(p.deal)}</span><h2>${esc(p.name)}</h2><span class="location">${esc(p.locality)}, ${esc(p.city)}</span></div><button class="close-btn" aria-label="Close">×</button></div>
      <div class="dialog-content"><div class="dialog-grid">
        <div class="detail-box"><span>Asking price</span><strong>${priceText(p.price)}</strong></div><div class="detail-box"><span>Negotiation target</span><strong>${esc(p.target)}</strong></div>
        <div class="detail-box"><span>Size</span><strong>${p.size?`${esc(p.size)} ${esc(p.sizeUnit)}`:'Verify'}</strong></div><div class="detail-box"><span>Age/status</span><strong>${esc(p.age)}</strong></div>
        <div class="detail-box"><span>Community</span><strong>${esc(gatedText(p.gated))}</strong></div><div class="detail-box"><span>Availability signal</span><strong>${esc(p.status)}</strong></div>
        <div class="detail-box"><span>Area market reference</span><strong>${esc(p.market)}</strong></div><div class="detail-box"><span>Asking rate</span><strong>${esc(p.askingRate)}</strong></div>
      </div><h3>Why it is on the list</h3><ul class="highlights-list">${(p.highlights||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ul><h3>Research note</h3><p class="location" style="font-size:12px;line-height:1.7">${esc(p.notes)}</p>
      <h3>My notes</h3><textarea id="propertyNote" class="note-area" placeholder="Site-visit observations, seller quote, plot size, road width...">${esc(notes[p.id]||'')}</textarea>
      <div class="card-actions" style="margin-top:12px"><button id="saveNote" class="details-btn">Save note</button><a class="source-link" href="${esc(p.url)}" target="_blank" rel="noopener">Open ${esc(p.source)} ↗</a></div></div>`;
    d.querySelector('.close-btn').onclick=()=>d.close(); d.querySelector('#saveNote').onclick=()=>{notes[p.id]=d.querySelector('#propertyNote').value;persist();d.querySelector('#saveNote').textContent='Saved ✓';}; d.showModal(); if(focusNote)setTimeout(()=>d.querySelector('#propertyNote').focus(),50);
  }

  function openCompare() {
    const list=[...compare].map(id=>properties.find(p=>p.id===id)).filter(Boolean); const d=$('compareDialog');
    if(!list.length){alert('Select properties using the ⇄ button first.');return;}
    const rows=[['Price',p=>priceText(p.price)],['Location',p=>`${p.locality}, ${p.city}`],['Type',p=>p.type],['Size',p=>p.size?`${p.size} ${p.sizeUnit}`:'Verify'],['Age',p=>p.age],['Gated',p=>gatedText(p.gated)],['Market ref',p=>p.market],['Asking rate',p=>p.askingRate],['Deal',p=>p.deal],['Target',p=>p.target]];
    d.innerHTML=`<div class="dialog-head"><h2>Compare ${list.length} properties</h2><button class="close-btn">×</button></div><div class="dialog-content compare-table-wrap"><table class="compare-table"><thead><tr><th>Metric</th>${list.map(p=>`<th>${esc(p.name)}<br><button class="remove-compare" data-remove="${p.id}">Remove</button></th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th>${label}</th>${list.map(p=>`<td>${esc(fn(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    d.querySelector('.close-btn').onclick=()=>d.close(); d.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{compare.delete(b.dataset.remove);updateCounts();d.close();openCompare();render();}); d.showModal();
  }

  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    const n=b.dataset.nav; if(n==='compare')openCompare(); else if(n==='shortlist'){state.view='shortlisted';document.querySelector('[data-view="shortlisted"]').click();window.scrollTo({top:300,behavior:'smooth'});} else if(n==='visited'){state.view='all';$('searchInput').value='';const ids=[...visited];$('propertyGrid').innerHTML=properties.filter(p=>ids.includes(p.id)).sort((a,b)=>b.score-a.score).map(card).join('');$('resultsTitle').textContent='Visited properties';$('resultsMeta').textContent=`${ids.length} marked visited`;bindCards();window.scrollTo({top:300,behavior:'smooth'});} else if(n==='checklist')$('checklistSection').scrollIntoView({behavior:'smooth'}); else {state.view='all';render();window.scrollTo({top:0,behavior:'smooth'});}
  }));
  $('compareBtn').onclick=openCompare; $('shortlistBtn').onclick=()=>document.querySelector('[data-view="shortlisted"]').click();
  [$('detailsDialog'),$('compareDialog')].forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
  setupFilters(); renderCities(); render(); updateCounts();
})();