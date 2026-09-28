(() => {
  const core = window.PropertyLensCore;
  const properties = window.PROPERTY_DATA || [];
  const markets = window.MARKET_DATA || {};
  const $ = (id) => document.getElementById(id);
  const state = { view: 'all', city: 'all' };
  const shortlist = new Set(core.readArray('ap-shortlist'));
  const visited = new Set(core.readArray('ap-visited'));
  const compare = new Set();
  const notes = core.readRecord('ap-notes');
  const esc = core.escapeHtml;
  const priceText = p => core.formatPrice(p, ' Lakhs');
  const gatedText = g => g === 'yes' ? 'Gated' : g === 'partial' ? 'Verify gated' : 'Independent';
  const icon = p => p.type === 'Plot' ? '▧' : p.type === 'Independent House' || p.type === 'Villa' ? '⌂' : '▥';
  const heroClass = p => p.type === 'Plot' ? 'plot' : p.type === 'Independent House' || p.type === 'Villa' ? 'house' : '';
  const dealClass = d => d === 'Strong Deal' ? 'strong' : d === 'Potential Bargain' ? 'bargain' : d === 'Good Value' ? 'good' : d === 'Fair / Negotiate' ? 'fair' : 'watch';

  function persist() {
    try {
      localStorage.setItem('ap-shortlist', JSON.stringify([...shortlist]));
      localStorage.setItem('ap-visited', JSON.stringify([...visited]));
      localStorage.setItem('ap-notes', JSON.stringify(notes));
    } catch {
      // The UI remains usable when storage is unavailable or full.
    }
  }

  function updateCounts() {
    $('shortlistCount').textContent = shortlist.size;
    $('shortlistCountSide').textContent = shortlist.size;
    $('visitedCountSide').textContent = visited.size;
    $('compareCount').textContent = compare.size;
  }

  function renderCities() {
    $('citySummary').innerHTML = Object.entries(markets).map(([city, m]) => `
      <button type="button" class="city-card ${state.city===city?'active':''}" data-city-card="${esc(city)}" aria-pressed="${state.city===city?'true':'false'}">
        <h3>${esc(city)}</h3><span class="city-sub">${esc(m.subtitle)}</span>
        <div class="market-rate">${esc(m.range)}</div><div class="market-note">${esc(m.note)}</div>
        <div class="trend">↗ ${esc(m.trend)}</div>
      </button>`).join('');
    document.querySelectorAll('[data-city-card]').forEach(el => {
      const select = () => { state.city = state.city === el.dataset.cityCard ? 'all' : el.dataset.cityCard; $('cityFilter').value = state.city; renderCities(); render(); };
      el.addEventListener('click', select);
    });
  }

  function setupFilters() {
    Object.keys(markets).forEach(city => $('cityFilter').insertAdjacentHTML('beforeend', `<option value="${esc(city)}">${esc(city)}</option>`));
    ['cityFilter','typeFilter','budgetFilter','ageFilter','gatedFilter','dealFilter','sortSelect'].forEach(id => $(id).addEventListener('change', () => { if(id==='cityFilter'){state.city=$(id).value;renderCities();} render(); }));
    $('searchInput').addEventListener('input', render);
    $('resetFilters').addEventListener('click', () => {
      state.city='all'; state.view='all';
      $('cityFilter').value='all'; $('typeFilter').value='all'; $('budgetFilter').value='50'; $('ageFilter').value='all'; $('gatedFilter').value='all'; $('dealFilter').value='all'; $('sortSelect').value='recommended'; $('searchInput').value='';
      document.querySelectorAll('.tab').forEach(t=>{ const active=t.dataset.view==='all'; t.classList.toggle('active',active); t.setAttribute('aria-pressed', active ? 'true' : 'false'); }); renderCities(); render();
    });
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t=>{ t.classList.remove('active'); t.setAttribute('aria-pressed','false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-pressed','true');
      state.view=tab.dataset.view;
      render();
    }));
  }

  function getFiltered() {
    const type=$('typeFilter').value, budget=Number($('budgetFilter').value), age=$('ageFilter').value, gated=$('gatedFilter').value, deal=$('dealFilter').value, q=$('searchInput').value.trim().toLowerCase();
    let list=properties.filter(p => {
      if(state.city!=='all'&&p.city!==state.city) return false;
      if(type!=='all'&&p.type!==type) return false;
      if (!core.isEligibleLead(p)) return false;
      if(p.price>budget) return false;
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
      if(state.view==='visited'&&!visited.has(p.id)) return false;
      if(q&&!`${p.name} ${p.locality} ${p.city} ${p.source} ${p.poster||''} ${p.deal}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const sort=$('sortSelect').value;
    list.sort((a,b)=> sort==='price-asc' ? ((a.price??999)-(b.price??999)) : sort==='price-desc' ? ((b.price??-1)-(a.price??-1)) : sort==='size-desc' ? ((b.size??0)-(a.size??0)) : b.score-a.score);
    return list;
  }

  function card(p) {
    const chips = [...new Set([p.gated==='yes'?'Gated community':p.gated==='partial'?'Community / verify':'Land ownership focus',...(p.highlights||[]).slice(0,2)])].slice(0,3);
    return `<article class="property-card">
      <div class="card-hero ${heroClass(p)}"><span class="deal-badge ${dealClass(p.deal)}">${esc(p.deal)}</span><span class="hero-icon">${icon(p)}</span><button type="button" class="heart-btn ${shortlist.has(p.id)?'active':''}" data-shortlist="${p.id}" aria-label="Toggle shortlist" aria-pressed="${shortlist.has(p.id)?'true':'false'}">${shortlist.has(p.id)?'♥':'♡'}</button></div>
      <div class="card-body">
        <div class="price-row"><span class="price">${priceText(p.price)}</span><span class="negotiation">Target ${esc(p.target)}</span></div>
        <h3>${esc(p.name)}</h3><div class="location">⌖ ${esc(p.locality)}, ${esc(p.city)}</div>
        <div class="stats"><span>${esc(p.bhk)}</span><span>${p.size?`${esc(p.size)} ${esc(p.sizeUnit)}`:'Size verify'}</span><span>${esc(p.age)}</span></div>
        <div class="chips">${chips.map((c,i)=>`<span class="chip ${i===0?'green':''}">${esc(c)}</span>`).join('')}</div>
        <div class="valuation"><div>Market / area ref<strong>${esc(p.market)}</strong></div><div>Asking rate<strong>${esc(p.askingRate)}</strong></div></div>
        <div class="card-actions"><button type="button" class="details-btn" data-details="${p.id}">View details</button><a class="source-link" href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="${esc(core.sourceLinkLabel(p))} on ${esc(p.source)}">${esc(p.source)} ↗</a></div>
        <div class="small-actions"><button type="button" class="small-action ${compare.has(p.id)?'active':''}" data-compare="${p.id}" aria-pressed="${compare.has(p.id)?'true':'false'}" aria-label="Compare ${esc(p.name)}"><span aria-hidden="true">⇄</span><span>Compare</span></button><button type="button" class="small-action ${visited.has(p.id)?'active':''}" data-visited="${p.id}" aria-pressed="${visited.has(p.id)?'true':'false'}" aria-label="Mark ${esc(p.name)} visited"><span aria-hidden="true">✓</span><span>Visited</span></button><button type="button" class="small-action" data-note="${p.id}" aria-label="Notes for ${esc(p.name)}"><span aria-hidden="true">✎</span><span>Notes</span></button></div>
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
    $('resultsMeta').textContent=state.view==='visited' ? `${list.length} visited propert${list.length===1?'y':'ies'}` : `${list.length} lead${list.length===1?'':'s'} shown · ${properties.length} public leads under ₹50L · confirm availability`;
    $('resultsTitle').textContent=state.view==='visited' ? 'Visited properties' : state.view==='shortlisted' ? 'Saved properties' : state.city==='all' ? 'Property leads' : `${state.city} property leads`;
    bindCards(); updateCounts();
  }

  function openDetails(id, focusNote=false) {
    const p=properties.find(x=>x.id===id); if(!p)return;
    const d=$('detailsDialog');
    d.dataset.propertyId = p.id;
    d.innerHTML=`<div class="dialog-head"><div><span class="deal-badge ${dealClass(p.deal)}">${esc(p.deal)}</span><h2>${esc(p.name)}</h2><span class="location">${esc(p.locality)}, ${esc(p.city)}</span></div><button type="button" class="close-btn" data-dialog-close aria-label="Close property details">×</button></div>
      <div class="dialog-content"><div class="dialog-grid">
        <div class="detail-box"><span>Asking price</span><strong>${priceText(p.price)}</strong></div><div class="detail-box"><span>Negotiation target</span><strong>${esc(p.target)}</strong></div>
        <div class="detail-box"><span>Size</span><strong>${p.size?`${esc(p.size)} ${esc(p.sizeUnit)}`:'Verify'}</strong></div><div class="detail-box"><span>Age/status</span><strong>${esc(p.age)}</strong></div>
        <div class="detail-box"><span>Community</span><strong>${esc(gatedText(p.gated))}</strong></div><div class="detail-box"><span>Availability signal</span><strong>${esc(p.status)}</strong></div>
        <div class="detail-box"><span>Area market reference</span><strong>${esc(p.market)}</strong></div><div class="detail-box"><span>Asking rate</span><strong>${esc(p.askingRate)}</strong></div>
      </div><h3>Why it is on the list</h3><ul class="highlights-list">${(p.highlights||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ul><h3>Research note</h3><p class="location" style="font-size:12px;line-height:1.7">${esc(p.notes)}</p>
      <h3>My notes</h3><textarea id="propertyNote" class="note-area" aria-label="My property notes" placeholder="Site-visit observations, seller quote, plot size, road width...">${esc(notes[p.id]||'')}</textarea>
      <div class="card-actions" style="margin-top:12px"><button type="button" id="saveNote" class="details-btn">Save note</button><a class="source-link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(core.sourceLinkLabel(p))} ↗</a></div></div>`;
    d.querySelector('#saveNote').onclick=()=>{notes[p.id]=d.querySelector('#propertyNote').value;persist();d.querySelector('#saveNote').textContent='Saved ✓';};
    d.showModal();
    d.querySelector('.close-btn')?.focus({preventScroll:true});
    if(focusNote)setTimeout(()=>d.querySelector('#propertyNote')?.focus(),50);
  }

  function openCompare() {
    const list=[...compare].map(id=>properties.find(p=>p.id===id)).filter(Boolean); const d=$('compareDialog');
    if(!list.length){alert('Select properties using the ⇄ button first.');return;}
    const rows=[['Price',p=>priceText(p.price)],['Location',p=>`${p.locality}, ${p.city}`],['Type',p=>p.type],['Size',p=>p.size?`${p.size} ${p.sizeUnit}`:'Verify'],['Age',p=>p.age],['Gated',p=>gatedText(p.gated)],['Market ref',p=>p.market],['Asking rate',p=>p.askingRate],['Deal',p=>p.deal],['Target',p=>p.target]];
    d.innerHTML=`<div class="dialog-head"><h2>Compare ${list.length} properties</h2><button type="button" class="close-btn" data-dialog-close aria-label="Close comparison">×</button></div><div class="dialog-content compare-table-wrap"><table class="compare-table"><thead><tr><th>Metric</th>${list.map(p=>`<th>${esc(p.name)}<br><button class="remove-compare" data-remove="${p.id}">Remove</button></th>`).join('')}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th>${label}</th>${list.map(p=>`<td>${esc(fn(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    d.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{compare.delete(b.dataset.remove);updateCounts();d.close();openCompare();render();});
    d.showModal();
    d.querySelector('.close-btn')?.focus({preventScroll:true});
  }

  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');
    const n=b.dataset.nav; if(n==='compare')openCompare(); else if(n==='shortlist'){state.view='shortlisted';document.querySelector('[data-view="shortlisted"]').click();window.scrollTo({top:300,behavior:'smooth'});} else if(n==='visited'){state.view='visited';state.city='all';$('cityFilter').value='all';$('typeFilter').value='all';$('budgetFilter').value='50';$('ageFilter').value='all';$('gatedFilter').value='all';$('dealFilter').value='all';$('sortSelect').value='recommended';$('searchInput').value='';document.querySelectorAll('.tab').forEach(t=>{t.classList.remove('active');t.setAttribute('aria-pressed','false');});renderCities();render();window.scrollTo({top:300,behavior:'smooth'});} else if(n==='checklist')$('checklistSection').scrollIntoView({behavior:'smooth'}); else {document.querySelector('[data-view="all"]').click();window.scrollTo({top:0,behavior:'smooth'});}
  }));
  $('compareBtn').onclick=openCompare; $('shortlistBtn').onclick=()=>document.querySelector('[data-view="shortlisted"]').click();
  [$('detailsDialog'),$('compareDialog')].forEach(d=>{
    d.addEventListener('click',e=>{
      if(e.target.closest?.('[data-dialog-close]') || e.target===d) d.close();
    });
    d.addEventListener('cancel',e=>{
      e.preventDefault();
      d.close();
    });
  });
  setupFilters(); renderCities(); render(); updateCounts();
})();