/* js/broni.js — модуль бронирования (полный)
   - загружает компьютеры (api -> localStorage -> default)
   - рендер сетки и панель бронирования
   - добавляет price_per_hour в каждую запись брони
   - поддерживает PRESELECT (await loadComputers)
   - worker: панель управления бронями (поиск/удаление/создать)
*/
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};

  const BOOKINGS_API = 'api/bookings.php';
  const COMPUTERS_API = 'api/computers.php';
  const BOOKING_STORAGE_KEY = 'nb_bookings';
  const COMPUTERS_LOCAL_KEY = 'nb_computers';
  const PRICE_REG = 150;
  const PRICE_VIP = 250;
  const MAX_HOURS_SELECT = 8;

  function el(id){ return document.getElementById(id); }
  function safeParse(s){ try{return JSON.parse(s);}catch(e){return null;} }

  // default computers (fallback) — used only if API+localStorage fail
  function defaultComputers(){
    return [
      { id: 'c1', number:1, type:'regular', label:'Обычный ПК 1', processor:'AMD Ryzen 5 5600', gpu:'NVIDIA GeForce RTX 3060', ram:'16 GB DDR4', storage:'SSD 512 GB NVMe', monitor:'24" Full HD, 144 Hz', price:150 },
      { id: 'c2', number:2, type:'vip',     label:'VIP ПК 2',     processor:'AMD Ryzen 9 7950X', gpu:'NVIDIA GeForce RTX 4090', ram:'32 GB DDR5', storage:'SSD 2 TB NVMe', monitor:'27" QHD, 240 Hz', price:250 },
      { id: 'c3', number:3, type:'regular', label:'Обычный ПК 3', processor:'AMD Ryzen 5 5600', gpu:'NVIDIA GeForce RTX 3060', ram:'16 GB DDR4', storage:'SSD 512 GB', monitor:'24" Full HD', price:150 },
      { id: 'c4', number:4, type:'regular', label:'Обычный ПК 4', processor:'AMD Ryzen 5 5600', gpu:'NVIDIA GeForce RTX 3060', ram:'16 GB DDR4', storage:'SSD 512 GB', monitor:'24" Full HD', price:150 },
      { id: 'c5', number:5, type:'broken',  label:'ПК 5 (ремонт)', processor:'Intel Core i5-7400', gpu:'GeForce GTX 970', ram:'8 GB DDR4', storage:'HDD 1 TB', monitor:'22"', price:0 },
      { id: 'c6', number:6, type:'regular', label:'Обычный ПК 6', processor:'AMD Ryzen 5 5600', gpu:'NVIDIA GeForce RTX 3060', ram:'16 GB DDR4', storage:'SSD 512 GB', monitor:'24" Full HD', price:150 },
      { id: 'c7', number:7, type:'vip',     label:'VIP ПК 7',     processor:'AMD Ryzen 9 7900X', gpu:'NVIDIA GeForce RTX 4080', ram:'32 GB DDR5', storage:'SSD 1 TB NVMe', monitor:'27" QHD', price:250 },
      { id: 'c8', number:8, type:'regular', label:'Обычный ПК 8', processor:'AMD Ryzen 5 5600', gpu:'NVIDIA GeForce RTX 3060', ram:'16 GB DDR4', storage:'SSD 512 GB', monitor:'24" Full HD', price:150 },
      { id: 'c9', number:9, type:'regular', label:'Обычный ПК 9', processor:'AMD Ryzen 5 5600', gpu:'NVIDIA GeForce RTX 3060', ram:'16 GB DDR4', storage:'SSD 512 GB', monitor:'24" Full HD', price:150 },
      { id: 'c10', number:10, type:'regular', label:'Обычный ПК 10', processor:'AMD Ryzen 5 5600', gpu:'NVIDIA GeForce RTX 3060', ram:'16 GB DDR4', storage:'SSD 512 GB', monitor:'24" Full HD', price:150 },
      { id: 'c11', number:11, type:'regular', label:'Обычный ПК 11', processor:'AMD Ryzen 5 5600', gpu:'NVIDIA GeForce RTX 3060', ram:'16 GB DDR4', storage:'SSD 512 GB', monitor:'24" Full HD', price:150 },
      { id: 'c12', number:12, type:'broken',  label:'ПК 12 (ремонт)', processor:'Intel Core i3-6100', gpu:'Intel HD Graphics', ram:'8 GB DDR3', storage:'HDD 500 GB', monitor:'19"', price:0 }
    ];
  }

  // load computers: try API -> localStorage -> default, and cache to localStorage if API succeeds
  async function loadComputers(){
    try{
      const r = await fetch(COMPUTERS_API, { method:'GET', cache:'no-store' });
      if(r && r.ok){
        const j = await r.json();
        if(j && Array.isArray(j.computers)){
          try{ localStorage.setItem(COMPUTERS_LOCAL_KEY, JSON.stringify(j.computers)); }catch(e){}
          return j.computers;
        }
      }
    }catch(e){ console.warn('computers api unavailable', e); }

    try{
      const raw = localStorage.getItem(COMPUTERS_LOCAL_KEY);
      if(raw){
        const arr = JSON.parse(raw);
        if(Array.isArray(arr) && arr.length) return arr;
      }
    }catch(e){ /* ignore */ }

    const defs = defaultComputers();
    try{ localStorage.setItem(COMPUTERS_LOCAL_KEY, JSON.stringify(defs)); }catch(e){}
    return defs;
  }

  // bookings cache and refresh
  let bookingsCache = [];
  async function refreshBookingsCache(){
    try{
      const r = await fetch(BOOKINGS_API, { method:'GET' });
      if(r && r.ok){
        const j = await r.json();
        bookingsCache = Array.isArray(j.bookings) ? j.bookings : [];
        return;
      }
    }catch(e){}
    bookingsCache = safeParse(localStorage.getItem(BOOKING_STORAGE_KEY)) || [];
  }

  function saveBookingsLocal(arr){
    try{ localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(arr)); }catch(e){ console.warn('save bookings local failed', e); }
  }

  function getBookedTimesFor(date, computerNumber){
    if(!date) return [];
    return bookingsCache.filter(b => b.date === date && String(b.computer) === String(computerNumber)).map(b => b.time);
  }

  function generateTimeRanges(){
    const ranges = [];
    for(let i=0;i<24;i++){
      const s = String(i).padStart(2,'0') + ':00';
      const e = String(i+1).padStart(2,'0') + ':00';
      ranges.push(`${s}-${e}`);
    }
    return ranges;
  }

  // state
  let currentComputer = null;
  let selectedTimes = [];

  // UI
  function showMessage(containerId, text, type='info', timeout=2500){
    const c = el(containerId); if(!c) return;
    c.innerHTML = `<div class="message ${type}">${text}</div>`;
    if(timeout>0) setTimeout(()=>{ if(c) c.innerHTML = ''; }, timeout);
  }

  function toggleTimeSlot(slot, timeStr){
    if(!slot || slot.classList.contains('booked')) return;
    if(slot.classList.contains('selected')){
      slot.classList.remove('selected');
      slot.setAttribute('aria-pressed','false');
      selectedTimes = selectedTimes.filter(t => t !== timeStr);
    } else {
      if(selectedTimes.length >= MAX_HOURS_SELECT){ showMessage('booking-message', `Нельзя выбрать больше ${MAX_HOURS_SELECT} часов.`, 'error'); return; }
      slot.classList.add('selected');
      slot.setAttribute('aria-pressed','true');
      selectedTimes.push(timeStr);
    }
    updateBookingTotal();
  }

  function updateBookingTotal(){
    const totalEl = el('booking-total'); if(!totalEl) return;
    const type = currentComputer ? currentComputer.type : 'regular';
    const price = (type === 'vip') ? PRICE_VIP : PRICE_REG;
    const total = selectedTimes.length * price;
    totalEl.textContent = `${total} руб.`;
    const payBtn = el('booking-pay');
    if(payBtn){
      if(selectedTimes.length){
        payBtn.style.display = 'inline-block';
        payBtn.removeAttribute('disabled');
        payBtn.setAttribute('aria-disabled','false');
      } else {
        payBtn.style.display = 'none';
        payBtn.setAttribute('aria-disabled','true');
      }
    }
  }

  // show booking panel for computer c (also inserts compact specs into panel)
  function showBookingPanelFor(c){
    currentComputer = c;
    selectedTimes = [];
    const panel = el('booking-panel'); if(!panel) return;
    panel.style.display = '';
    el('booking-title').textContent = `Бронирование — компьютер №${c.number}`;

    // insert compact spec
    let compHtml = `
      <div id="booking-comp-spec" style="margin-top:8px;padding:10px;border:1px solid #eee;border-radius:8px;background:#fafafa">
        <div><strong>Процессор:</strong> ${c.processor || '—'}</div>
        <div><strong>Видеокарта:</strong> ${c.gpu || '—'}</div>
        <div><strong>ОЗУ:</strong> ${c.ram || '—'}</div>
        <div><strong>Накопитель:</strong> ${c.storage || '—'}</div>
        <div><strong>Монитор:</strong> ${c.monitor || '—'}</div>
        <div style="margin-top:8px"><strong>Цена:</strong> ${(c.price!==undefined?c.price:'—')} ₽/ч</div>
      </div>
    `;
    let detailsContainer = document.getElementById('booking-comp-details');
    if(!detailsContainer){
      detailsContainer = document.createElement('div'); detailsContainer.id = 'booking-comp-details';
      const timesDiv = document.getElementById('booking-times');
      if(timesDiv) timesDiv.parentNode.insertBefore(detailsContainer, timesDiv);
      else panel.insertBefore(detailsContainer, panel.firstChild);
    }
    detailsContainer.innerHTML = compHtml;

    const equip = el('equip-link');
    if(equip) equip.onclick = ()=> {
      window.PRESELECT_COMPUTER_ID = c.id;
      window.PRESELECT_COMPUTER_NUMBER = c.number;
      location.hash = '#/equioment';
    };

    const dateInput = el('booking-date');
    const today = new Date(); today.setHours(0,0,0,0);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    renderTimeSlotsFor(dateInput.value);

const cancelBtn = el('booking-cancel');
if (cancelBtn) cancelBtn.onclick = ()=> {
  try {
    panel.style.display = 'none';
    // НЕ трогаем panel.style.width / maxWidth — оставляем фиксированную ширину
    // удаляем только внутренний выбор
  } catch(e){ /* ignore */ }
  currentComputer = null;
  selectedTimes = [];
  updateBookingTotal();
};
    const payBtn = el('booking-pay'); if(payBtn) payBtn.onclick = ()=> payBooking();
    dateInput.onchange = ()=> {
      const d = new Date(dateInput.value); d.setHours(0,0,0,0);
      if(d < today){ showMessage('booking-message','Нельзя выбрать прошедшую дату','error'); return; }
      renderTimeSlotsFor(dateInput.value);
    };


    
    updateBookingTotal();
  }

  function findConflicts(date, computerNumber, selectedTimesArr){
    const conflicts = [];
    selectedTimesArr.forEach(t=>{
      const exists = bookingsCache.find(b => b.date === date && String(b.computer) === String(computerNumber) && b.time === t);
      if(exists) conflicts.push({ time: t, id: exists.id });
    });
    return conflicts;
  }

  async function payBooking(){
    if(!currentComputer) return;
    if(selectedTimes.length === 0){ showMessage('booking-message','Выберите хотя бы один интервал','error'); return; }
    const date = el('booking-date').value; if(!date){ showMessage('booking-message','Выберите дату','error'); return; }
    const d = new Date(date); d.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    if(d < today){ showMessage('booking-message','Нельзя выбрать прошедшую дату','error'); return; }

    const userObj = (window.AUTH && window.AUTH.getCurrentUser) ? window.AUTH.getCurrentUser() : null;
    if(!userObj){ alert('Нужно войти в аккаунт, чтобы бронировать.'); location.hash = '#/login'; return; }

    const conflicts = findConflicts(date, currentComputer.number, selectedTimes);
    if(conflicts.length){
      showMessage('booking-message',`Некоторые выбранные интервалы уже заняты: ${conflicts.map(c=>c.time).join(', ')}`,'error',4000);
      await refreshBookingsCache();
      renderTimeSlotsFor(date);
      return;
    }

    const pricePerHour = (currentComputer && currentComputer.type === 'vip') ? PRICE_VIP : PRICE_REG;

    const newBookings = selectedTimes.map(t => ({
      id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      date,
      computer: String(currentComputer.number),
      time: t,
      user_login: userObj.login || '',
      user_email: userObj.email || '',
      user_id: userObj.id || '',
      created_at: new Date().toISOString(),
      price_per_hour: pricePerHour
    }));

    // try server first
    try{
      const resp = await fetch(BOOKINGS_API, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action:'add', bookings: newBookings })
      });
      console.log('BOOKINGS POST status:', resp.status);
      const text = await resp.text();
      let j = null;
      try{ j = JSON.parse(text); } catch(e){ console.warn('BOOKINGS resp not json', e); }
      if(resp.ok && j){
        const added = j.added || [];
        if(added.length){
          await refreshBookingsCache();
          showMessage('booking-message','Бронирование сохранено. Перенаправление...','success',1200);
          setTimeout(()=> location.hash = '#/akaynt', 900);
          return;
        } else {
          console.warn('Server returned OK but no added', j);
          showMessage('booking-message','Сервер принял запрос, но ничего не добавил.','error',4000);
        }
      } else {
        console.warn('Server error on bookings POST', resp.status, j);
        showMessage('booking-message','Ошибка на сервере при сохранении брони.','error',4000);
      }
    } catch(e){
      console.warn('Booking POST failed', e);
    }

    // fallback: local save (still check duplicates)
    const local = safeParse(localStorage.getItem(BOOKING_STORAGE_KEY)) || [];
    const conflictsLocal = findConflicts(date, currentComputer.number, selectedTimes);
    if(conflictsLocal.length){
      showMessage('booking-message',`Некоторые интервалы уже заняты: ${conflictsLocal.map(c=>c.time).join(', ')}`,'error',4000);
      await refreshBookingsCache();
      renderTimeSlotsFor(date);
      return;
    }
    newBookings.forEach(nb => local.push(nb));
    saveBookingsLocal(local);
    await refreshBookingsCache();
    showMessage('booking-message','Сервер недоступен — бронь сохранена локально.','success',1200);
    setTimeout(()=> location.hash = '#/akaynt', 850);
  }

  function renderTimeSlotsFor(date){
    const timesDiv = el('booking-times'); if(!timesDiv) return;
    timesDiv.innerHTML = '';
    selectedTimes = [];
    updateBookingTotal();

    const booked = currentComputer ? getBookedTimesFor(date, currentComputer.number) : [];
    const ranges = generateTimeRanges();
    ranges.forEach(r=>{
      const slot = document.createElement('div');
      slot.className = 'time-slot';
      slot.textContent = r;
      slot.setAttribute('role','button');
      slot.setAttribute('tabindex','0');
      slot.setAttribute('aria-label', `Интервал ${r}`);
      slot.setAttribute('aria-pressed','false');
      if(booked.includes(r)){
        slot.classList.add('booked');
        slot.setAttribute('aria-disabled','true');
      } else {
        slot.classList.add('available');
        slot.setAttribute('aria-disabled','false');
        slot.addEventListener('click', ()=> toggleTimeSlot(slot, r));
        slot.addEventListener('keydown', (ev)=>{ if(ev.key==='Enter' || ev.key===' '){ ev.preventDefault(); toggleTimeSlot(slot,r); } });
      }
      timesDiv.appendChild(slot);
    });
    timesDiv.scrollTop = 0;
  }

  // click handler from grid: check auth & broken status -> show panel
  async function onComputerClick(c){
    const userObj = (window.AUTH && window.AUTH.getCurrentUser) ? window.AUTH.getCurrentUser() : null;
    if(!userObj){
      alert('Войдите в аккаунт, чтобы сделать бронирование.');
      location.hash = '#/login';
      return;
    }
    if(c.type === 'broken'){
      alert('Этот компьютер на ремонте.');
      return;
    }
    await refreshBookingsCache();
    showBookingPanelFor(c);
  }

  // render grid of buttons (uses loadComputers())
  async function renderComputersGrid(){
    const grid = el('computers-grid'); if(!grid) return;
    grid.innerHTML = '';
    const computers = await loadComputers();
    computers.forEach(c=>{
      const tile = document.createElement('button');
      tile.className = 'computer-tile';
      tile.type = 'button';
      tile.dataset.id = c.id;
      tile.dataset.number = c.number;
      tile.dataset.type = c.type;
      tile.setAttribute('aria-label', c.label ? `${c.label}` : `Компьютер ${c.number}`);
      tile.innerHTML = `<div class="comp-num">${c.number}</div><div class="comp-type">${c.type === 'vip' ? 'VIP' : c.type === 'broken' ? 'Ремонт' : 'Обычный'}</div>`;
      if(c.type === 'vip') tile.classList.add('vip'); else if(c.type === 'broken') tile.classList.add('broken'); else tile.classList.add('regular');
      tile.addEventListener('click', ()=> onComputerClick(c));
      tile.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); onComputerClick(c); } });
      grid.appendChild(tile);
    });
  }

window.PAGE_INIT.broni = async function(){
  await refreshBookingsCache();
  await renderComputersGrid();
  // определяем пользователя и роль
  const user = (window.AUTH && window.AUTH.getCurrentUser) ? window.AUTH.getCurrentUser() : JSON.parse(localStorage.getItem('nb_user_current')||'null');
  const role = (user && user.role) ? String(user.role).toLowerCase() : '';
  const isStaff = role === 'worker' || role === 'admin';

  // Элементы табов/panels
  const tabsRoot = document.querySelector('.broni-tabs');
  const tabButtons = document.querySelectorAll('.broni-tab');
  const panelBook = document.getElementById('tab-book');
  const panelManage = document.getElementById('tab-manage');

  // Если это сотрудник — показываем табы и навешиваем обработчики
  if(isStaff){
    if(tabsRoot) tabsRoot.style.display = '';
    // поведение вкладок (локальное)
    tabButtons.forEach(btn=>{
      btn.style.display = '';
      btn.classList.remove('active');
    });
    // активируем первую вкладку (Бронь) по умолчанию
    if(tabButtons.length){
      tabButtons.forEach(b => {
        const t = b.dataset.tab;
        const p = document.getElementById(t);
        if(p) p.style.display = 'none';
      });
      const first = document.querySelector('.broni-tab[data-tab="tab-book"]');
      if(first) {
        first.classList.add('active');
        const t = first.dataset.tab;
        const p = document.getElementById(t);
        if(p) p.style.display = '';
      }
    }
    // навесим клики
    tabButtons.forEach(btn=>{
      btn.onclick = ()=>{
        tabButtons.forEach(b=>b.classList.remove('active'));
        document.querySelectorAll('.broni-panel').forEach(p=>p.style.display='none');
        btn.classList.add('active');
        const target = btn.dataset.tab;
        const el = document.getElementById(target);
        if(el) el.style.display = '';
        if(target === 'tab-manage') renderWorkerBookingsPanel();
      };
    });
  } else {
    // Обычный пользователь — СКРЫВАЕМ таббар и показываем только панель бронирования (tab-book)
    if(tabsRoot) tabsRoot.style.display = 'none';
    // скрыть manage панель
    if(panelManage) panelManage.style.display = 'none';
    // показать book панель (она уже в DOM)
    if(panelBook) panelBook.style.display = '';
  }

  // preselect logic (если кто-то предварительно выбрал ПК в equip)
  const preId = window.PRESELECT_COMPUTER_ID;
  const preNum = window.PRESELECT_COMPUTER_NUMBER || window.SELECT_COMPUTER_ID;
  if(preId || (preNum !== undefined && preNum !== null)){
    const comps = await loadComputers();
    let comp = null;
    if(preId) comp = comps.find(x => x.id && String(x.id) === String(preId));
    if(!comp && preNum !== undefined && preNum !== null) comp = comps.find(x => x.number && String(x.number) === String(preNum));
    if(comp) {
      showBookingPanelFor(comp);
      delete window.PRESELECT_COMPUTER_ID; delete window.PRESELECT_COMPUTER_NUMBER; delete window.SELECT_COMPUTER_ID;
    }
  }

  // скрыть кнопку оплатить до выбора времени
  const payBtn = el('booking-pay');
  if(payBtn) payBtn.style.display = 'none';
};
  // expose util for debug
  window._NB_BOOKING = { refreshBookingsCache, getBookingsCache: ()=> bookingsCache, loadComputers };

  // Worker bookings panel (CRUD for bookings)
async function renderWorkerBookingsPanel(){
  const user = (window.AUTH && window.AUTH.getCurrentUser) ? window.AUTH.getCurrentUser() : JSON.parse(localStorage.getItem('nb_user_current')||'null');
  const root = document.getElementById('worker-bookings-root');
  if(!root) return;
  if(!user || (String(user.role).toLowerCase() !== 'worker' && String(user.role).toLowerCase() !== 'admin')){
    root.innerHTML = '<div class="card"><p>Доступно только работникам.</p></div>';
    return;
  }

  root.innerHTML = `
    <div class="card">
      <h3>Управление бронями</h3>
      <div class="wb-search" style="margin-bottom:10px">
        <input id="wb-search-input" type="search" placeholder="Поиск по логину пользователя..." />
        <button id="wb-refresh" class="save-btn" style="margin-left:auto">Показать</button>
      </div>
      <div id="wb-list"></div>
    </div>
  `;

  const debounce = (fn, ms=300)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

  // parse time range
  function parseRange(str){
    if(!str) return null;
    const p = str.split('-');
    if(p.length !== 2) return null;
    const toMin = s => {
      const [hh,mm] = s.split(':').map(x=>parseInt(x,10));
      if(isNaN(hh) || isNaN(mm)) return null;
      return hh*60 + mm;
    };
    const s = toMin(p[0]); const e = toMin(p[1]);
    if(s===null || e===null) return null;
    return { start: s, end: e, id:null, sStr: p[0], eStr: p[1] };
  }
  function formatHM(minutes){
    const hh = String(Math.floor(minutes/60)).padStart(2,'0');
    const mm = String(minutes%60).padStart(2,'0');
    return `${hh}:${mm}`;
  }
  function mergeIntervals(intervals){
    if(!intervals || !intervals.length) return [];
    intervals.sort((a,b)=> a.start - b.start || a.end - b.end);
    const res = [];
    for(const iv of intervals){
      if(res.length===0){ res.push({start:iv.start,end:iv.end, ids: iv.id ? [iv.id] : []}); continue; }
      const last = res[res.length-1];
      if(iv.start <= last.end){
        if(iv.end > last.end) last.end = iv.end;
        if(iv.id) last.ids.push(iv.id);
      } else res.push({start:iv.start,end:iv.end, ids: iv.id ? [iv.id] : []});
    }
    res.forEach(r=> r.display = `${formatHM(r.start)}-${formatHM(r.end)}`);
    return res;
  }

  async function loadAndRender(){
    // load bookings (server or local)
    let all = [];
    try{
      const r = await fetch(BOOKINGS_API);
      if(r.ok){ const j = await r.json(); all = j.bookings || []; }
      else all = JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY)||'[]');
    }catch(e){ all = JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY)||'[]'); }

    // load computers map for price/type fallback
    let comps = [];
    try{ comps = await loadComputers(); }catch(e){ comps = []; }
    const compByNumber = {};
    (comps||[]).forEach(c => { if(c && c.number !== undefined) compByNumber[String(c.number)] = c; });

    const q = (document.getElementById('wb-search-input').value || '').trim().toLowerCase();
    const list = document.getElementById('wb-list');
    if(!list) return;
    if(all.length === 0){ list.innerHTML = '<p>Броней нет</p>'; return; }

    // filter by search (login or email or user_id)
    const filtered = all.filter(b=>{
      if(!q) return true;
      const login = String(b.user_login || b.user || b.user_email || '').toLowerCase();
      const id = String(b.user_id || '');
      return login.includes(q) || id.includes(q);
    });

    if(filtered.length === 0){ list.innerHTML = '<p>Ничего не найдено</p>'; return; }

    // group by user_login|date|computer
    const groups = {};
    filtered.forEach(b=>{
      const userKey = b.user_login || b.user || b.user_email || 'unknown';
      const key = `${userKey}|${b.date}|${b.computer}`;
      if(!groups[key]) groups[key] = { user: userKey, date: b.date, computer: b.computer, rawBookings: [] };
      groups[key].rawBookings.push(b);
    });

    // build HTML: for each group, merge intervals and show merged entries + total price
    let html = '';
    Object.keys(groups).sort().forEach(k=>{
      const g = groups[k];

      // parse intervals from raw bookings
      const ivs = [];
      g.rawBookings.forEach(b=>{
        const parsed = parseRange(b.time);
        if(parsed){
          parsed.id = b.id;
          ivs.push(parsed);
        }
      });

      const merged = mergeIntervals(ivs);

      // compute total minutes & total cost for group
      // We'll compute cost by iterating raw bookings (to respect per-booking price_per_hour)
      let totalMinutes = 0;
      let totalCost = 0;
      g.rawBookings.forEach(b=>{
        const pr = parseRange(b.time);
        if(pr){
          const mins = Math.max(0, pr.end - pr.start);
          totalMinutes += mins;
          // determine price_per_hour:
          let pph = null;
          if(b.price_per_hour !== undefined && b.price_per_hour !== null) pph = Number(b.price_per_hour);
          else {
            const comp = compByNumber[String(b.computer)];
            if(comp && comp.price !== undefined) pph = Number(comp.price);
            else {
              // fallback by type if available
              if(comp && comp.type === 'vip') pph = PRICE_VIP;
              else pph = PRICE_REG;
            }
          }
          if(isNaN(pph)) pph = PRICE_REG;
          totalCost += (mins/60) * pph;
        }
      });
      totalCost = Math.round(totalCost * 100) / 100; // round to 2 decimals

      // header
      html += `<div style="padding:10px;border:1px solid #eee;margin-bottom:8px;border-radius:8px">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">`;
      html += `<div><strong>${g.date}</strong> — <strong>ПК ${g.computer}</strong><div style="font-size:13px;color:#555;margin-top:6px">${esc(g.user)}</div></div>`;
      html += `<div style="text-align:right;color:#333"><div style="font-weight:700">Сумма: ${Number.isInteger(totalCost) ? totalCost + ' ₽' : totalCost.toFixed(2) + ' ₽'}</div></div>`;
      html += `</div>`;

      // each merged interval with delete button
      merged.forEach(m=>{
        // collect ids for this merged interval (we collected them when merging)
        const idsJson = JSON.stringify(m.ids || []);
        html += `<div style="margin-top:8px;padding:8px;border-radius:6px;background:#fafafa;display:flex;justify-content:space-between;align-items:center">`;
        html += `<div><strong>${m.display}</strong></div>`;
        html += `<div style="display:flex;gap:8px"><button class="wb-del close-btn" data-ids='${esc(idsJson)}'>Удалить</button></div>`;
        html += `</div>`;
      });

      html += `</div>`;
    });

    list.innerHTML = html;

    // bind deletes
    list.querySelectorAll('.wb-del').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const raw = btn.getAttribute('data-ids');
        if(!raw) return;
        let ids;
        try{ ids = JSON.parse(raw); }catch(e){ ids = []; }
        if(!confirm('Удалить все записи в этом интервале?')) return;
        let okCount = 0;
        for(const id of ids){
          try{
            const r = await fetch(BOOKINGS_API + '?id=' + encodeURIComponent(id), { method:'DELETE' });
            const j = await r.json();
            if(r.ok && j.success) okCount++;
            else {
              // fallback local remove
              const local = JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY)||'[]');
              const idx = local.findIndex(x=>x.id===id);
              if(idx>-1){ local.splice(idx,1); localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(local)); okCount++; }
            }
          }catch(e){
            const local = JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY)||'[]');
            const idx = local.findIndex(x=>x.id===id);
            if(idx>-1){ local.splice(idx,1); localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(local)); okCount++; }
          }
        }
        if(okCount>0){ alert('Удалено'); loadAndRender(); }
        else alert('Не удалось удалить записи (проверь сервер).');
      });
    });
  }

  // helpers
  function esc(s){ if(s===null||s===undefined) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

  // wire controls (note: ensure elements exist)
  const refreshBtn = document.getElementById('wb-refresh');
  if(refreshBtn) refreshBtn.addEventListener('click', loadAndRender);
  const clearBtn = document.getElementById('wb-clear');
  if(clearBtn) clearBtn.addEventListener('click', ()=>{ const inp=document.getElementById('wb-search-input'); if(inp) inp.value=''; loadAndRender(); });
  const searchInput = document.getElementById('wb-search-input');
  if(searchInput) searchInput.addEventListener('input', debounce(loadAndRender, 300));

  // initial load
  loadAndRender();
} // end renderWorkerBookingsPanel



})();
