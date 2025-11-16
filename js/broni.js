/* js/broni.js
   Обновлённая логика бронирования:
   - запрет открытия бронирования без логина
   - проверка дубликатов (date+computer+time) на фронте
   - фиксированная панель, выбор времени, сохранение в API или localStorage
*/
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};

  const BOOKINGS_API = 'api/bookings.php';
  const BOOKING_STORAGE_KEY = 'nb_bookings';
  const COMPUTERS_STORAGE_KEY = 'nb_computers';
  const PRICE_REG = 150;
  const PRICE_VIP = 250;
  const MAX_HOURS_SELECT = 8;

  function el(id){ return document.getElementById(id); }
  function safeParse(s){ try{return JSON.parse(s);}catch(e){return null;} }

  async function isApiAvailable(){
    try{
      const r = await fetch(BOOKINGS_API, { method:'GET' });
      return r && r.ok;
    }catch(e){ return false; }
  }

  async function loadBookingsFromApiOrLocal(){
    try{
      if(await isApiAvailable()){
        const resp = await fetch(BOOKINGS_API);
        if(resp.ok){
          const j = await resp.json();
          return j.bookings || [];
        }
      }
    }catch(e){}
    return safeParse(localStorage.getItem(BOOKING_STORAGE_KEY)) || [];
  }

  function saveBookingsLocal(arr){
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(arr));
  }

  function defaultComputers(){
    return [
      { id: 'c1', number: 1, type: 'regular' },
      { id: 'c2', number: 2, type: 'regular' },
      { id: 'c3', number: 3, type: 'vip' },
      { id: 'c4', number: 4, type: 'regular' },
      { id: 'c5', number: 5, type: 'broken' },
      { id: 'c6', number: 6, type: 'regular' },
      { id: 'c7', number: 7, type: 'vip' },
      { id: 'c8', number: 8, type: 'regular' },
      { id: 'c9', number: 9, type: 'regular' },
      { id: 'c10', number: 10, type: 'regular' },
      { id: 'c11', number: 11, type: 'regular' },
      { id: 'c12', number: 12, type: 'regular' }
    ];
  }

  function loadComputers(){
    const raw = safeParse(localStorage.getItem(COMPUTERS_STORAGE_KEY));
    if(Array.isArray(raw) && raw.length) return raw;
    const defs = defaultComputers();
    localStorage.setItem(COMPUTERS_STORAGE_KEY, JSON.stringify(defs));
    return defs;
  }

  // кэш бронирований
  let bookingsCache = [];

  async function refreshBookingsCache(){
    bookingsCache = await loadBookingsFromApiOrLocal();
  }

  function renderComputersGrid(){
    const grid = el('computers-grid');
    if(!grid) return;
    grid.innerHTML = '';
    const computers = loadComputers();

    computers.forEach(c=>{
      const tile = document.createElement('button');
      tile.className = 'computer-tile';
      tile.dataset.id = c.id;
      tile.dataset.number = c.number;
      tile.dataset.type = c.type;
      tile.setAttribute('aria-label', `Компьютер ${c.number} ${c.type}`);
      tile.innerHTML = `<div class="comp-num">${c.number}</div><div class="comp-type">${c.type === 'vip' ? 'VIP' : c.type === 'broken' ? 'Ремонт' : 'Обычный'}</div>`;

      if(c.type === 'vip') tile.classList.add('vip');
      else if(c.type === 'broken') tile.classList.add('broken');
      else tile.classList.add('regular');

      tile.addEventListener('click', ()=>onComputerClick(c));
      grid.appendChild(tile);
    });
  }

  // получение уже занятых таймов для даты и компьютера
  function getBookedTimesFor(date, computerNumber){
    return bookingsCache.filter(b => b.date === date && String(b.computer) === String(computerNumber)).map(b=>b.time);
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

  // состояние
  let currentComputer = null;
  let selectedTimes = [];

  function showBookingPanelFor(c){
    currentComputer = c;
    selectedTimes = [];
    const panel = el('booking-panel');
    if(!panel) return;
    panel.style.display = '';
    el('booking-title').textContent = `Бронирование — компьютер №${c.number}`;
    // убрали показ типа вверху (как просил)

    const equip = el('equip-link');
    equip.onclick = ()=> { location.hash = '#/equioment'; };

    const dateInput = el('booking-date');
    const today = new Date(); today.setHours(0,0,0,0);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    renderTimeSlotsFor(dateInput.value);

    const cancelBtn = el('booking-cancel');
    if(cancelBtn) cancelBtn.onclick = ()=> { panel.style.display='none'; currentComputer=null; selectedTimes=[]; updateBookingTotal(); };
    const payBtn = el('booking-pay');
    if(payBtn) payBtn.onclick = ()=> payBooking();
    dateInput.onchange = ()=> {
      const d = new Date(dateInput.value); d.setHours(0,0,0,0);
      if(d < today){ showMessage('booking-message','Нельзя выбрать прошедшую дату','error'); return; }
      renderTimeSlotsFor(dateInput.value);
    };

    updateBookingTotal();
  }

  function showMessage(containerId, text, type='info', timeout=2500){
    const container = el(containerId);
    if(!container) return;
    container.innerHTML = `<div class="message ${type}">${text}</div>`;
    if(timeout>0) setTimeout(()=>{ if(container) container.innerHTML = ''; }, timeout);
  }

  function renderTimeSlotsFor(date){
    const timesDiv = el('booking-times');
    if(!timesDiv) return;
    timesDiv.innerHTML = '';
    selectedTimes = [];
    updateBookingTotal();

    const booked = getBookedTimesFor(date, currentComputer.number);
    const ranges = generateTimeRanges();
    ranges.forEach(r=>{
      const slot = document.createElement('div');
      slot.className = 'time-slot';
      slot.textContent = r;
      if(booked.includes(r)){
        slot.classList.add('booked');
      } else {
        slot.classList.add('available');
        // hover не меняет фон, цвет меняется только при клике (см. CSS)
        slot.tabIndex = 0;
        slot.addEventListener('click', ()=> toggleTimeSlot(slot,r));
      }
      timesDiv.appendChild(slot);
    });
    timesDiv.scrollTop = 0;
  }

  function toggleTimeSlot(slot, timeStr){
    if(slot.classList.contains('booked')) return;
    if(slot.classList.contains('selected')){
      slot.classList.remove('selected');
      selectedTimes = selectedTimes.filter(t=>t!==timeStr);
    } else {
      if(selectedTimes.length >= MAX_HOURS_SELECT){
        showMessage('booking-message',`Нельзя выбрать больше ${MAX_HOURS_SELECT} часов.`,'error');
        return;
      }
      slot.classList.add('selected');
      selectedTimes.push(timeStr);
    }
    updateBookingTotal();
  }

  function updateBookingTotal(){
    const totalEl = el('booking-total');
    if(!totalEl) return;
    const type = currentComputer ? currentComputer.type : 'regular';
    const price = (type === 'vip') ? PRICE_VIP : PRICE_REG;
    const total = selectedTimes.length * price;
    totalEl.textContent = `${total} руб.`;
    const payBtn = el('booking-pay');
    if(payBtn) payBtn.style.display = selectedTimes.length ? 'inline-block' : 'none';
  }

  // проверка дубликатов: возвращает массив конфликтующих (существующих) записей
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

    const date = el('booking-date').value;
    const d = new Date(date); d.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    if(d < today){ showMessage('booking-message','Нельзя выбрать прошедшую дату','error'); return; }

    // проверка входа
    const userObj = (window.AUTH && window.AUTH.getCurrentUser) ? window.AUTH.getCurrentUser() : null;
    if(!userObj){
      alert('Нужно войти в аккаунт, чтобы бронировать.');
      location.hash = '#/login';
      return;
    }

    // проверка конфликтов
    const conflicts = findConflicts(date, currentComputer.number, selectedTimes);
    if(conflicts.length){
      showMessage('booking-message',`Некоторые выбранные интервалы уже заняты: ${conflicts.map(c=>c.time).join(', ')}`,'error',4000);
      // перерисуем слоты чтобы показать актуальное состояние
      await refreshBookingsCache();
      renderTimeSlotsFor(date);
      return;
    }

    // готовим записи
    const newBookings = selectedTimes.map(t => ({
      id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      date,
      computer: String(currentComputer.number),
      time: t,
      user_login: userObj.login || '',
      user_email: userObj.email || '',
      user_id: userObj.id || '',
      created_at: new Date().toISOString()
    }));

    // попытка записать на сервер
    try{
      if(await isApiAvailable()){
        const resp = await fetch(BOOKINGS_API, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ action:'add', bookings: newBookings })
        });
        if(resp.ok){
          const j = await resp.json();
          // если сервер вернул добавленные и/или пропущенные дубликаты — отобразим
          const added = j.added || [];
          const skipped = j.skipped || [];
          // обновим local кэш
          await refreshBookingsCache();
          if(added.length){
            showMessage('booking-message','Бронирование сохранено. Перенаправление...','success',1200);
            setTimeout(()=> location.hash = '#/akaynt', 900);
            return;
          } else {
            showMessage('booking-message','Ничего не добавлено (возможно дубликаты).','error',2500);
            return;
          }
        }
      }
    }catch(e){
      console.warn('api add failed', e);
    }

    // fallback локально (проверим на всякий случай ещё раз)
    const local = safeParse(localStorage.getItem(BOOKING_STORAGE_KEY)) || [];
    // еще одна проверка на дубликаты в локальном хранилище
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
    showMessage('booking-message','Бронь сохранена локально. Перенаправление...','success',1200);
    setTimeout(()=> location.hash = '#/akaynt', 850);
  }

  // при клике по компьютеру — проверяем авторизацию
  async function onComputerClick(c){
    const userObj = (window.AUTH && window.AUTH.getCurrentUser) ? window.AUTH.getCurrentUser() : null;
    if(!userObj){
      // перенаправляем на страницу входа
      alert('Войдите в аккаунт, чтобы сделать бронирование.');
      location.hash = '#/login';
      return;
    }
    if(c.type === 'broken'){
      // найдем контейнер сообщения (если панель ещё не открыта — создадим временное уведомление)
      alert('Этот компьютер на ремонте.');
      return;
    }
    await refreshBookingsCache();
    showBookingPanelFor(c);
  }

  // инициализация страницы broni
  window.PAGE_INIT.broni = async function(){
    await refreshBookingsCache();
    renderComputersGrid();
    const payBtn = el('booking-pay');
    if(payBtn) payBtn.style.display = 'none';
  };

})();
