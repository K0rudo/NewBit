/* js/akaynt.js — отображение только предстоящих броней (не удаляет прошлые из JSON) */
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};

  const BOOKINGS_API = 'api/bookings.php';
  const BOOKING_STORAGE_KEY = 'nb_bookings';
  const USER_CURRENT_KEY = 'nb_user_current';

  function loadBookingsLocal(){
    try{ return JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY) || '[]'); }catch(e){ return []; }
  }
  function saveBookingsLocal(arr){ localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(arr)); }

  function getCurrentUser(){
    try{ return JSON.parse(localStorage.getItem(USER_CURRENT_KEY) || 'null'); }catch(e){ return null; }
  }

  async function loadBookingsServer(){
    try{
      const r = await fetch(BOOKINGS_API);
      if(!r.ok) throw new Error('no');
      const j = await r.json();
      return j.bookings || [];
    }catch(e){
      return null;
    }
  }

  // сравнение дат по локальной дате (без учёта времени)
  function isFutureOrToday(dateStr){
    if(!dateStr) return false;
    // ожидаем формат YYYY-MM-DD
    const parts = dateStr.split('-').map(n => parseInt(n,10));
    if(parts.length < 3) return false;
    const d = new Date(parts[0], parts[1]-1, parts[2]);
    d.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    return d >= today;
  }

  // парсер "HH:MM-HH:MM" -> {start,end} в минутах
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
    return { start: s, end: e, sStr: p[0], eStr: p[1] };
  }

  function formatHM(minutes){
    const hh = String(Math.floor(minutes/60)).padStart(2,'0');
    const mm = String(minutes%60).padStart(2,'0');
    return `${hh}:${mm}`;
  }

  function mergeIntervals(intervals){
    if(!intervals || !intervals.length) return [];
    intervals.sort((a,b)=>a.start - b.start || a.end - b.end);
    const res = [];
    for(const iv of intervals){
      if(res.length===0){ res.push({start:iv.start,end:iv.end,ids:[iv.id]}); continue; }
      const last = res[res.length-1];
      if(iv.start <= last.end){ if(iv.end > last.end) last.end = iv.end; last.ids.push(iv.id); }
      else res.push({start:iv.start,end:iv.end,ids:[iv.id]});
    }
    res.forEach(r=> r.display = `${formatHM(r.start)}-${formatHM(r.end)}`);
    return res;
  }

  function groupBookingsForUser(bookings, user){
    const uid = user && user.id ? String(user.id) : '';
    const login = user && user.login ? String(user.login) : '';
    const email = user && user.email ? String(user.email) : '';

    // фильтрация: принадлежат ли пользователю и не в прошлом
    const my = bookings.filter(b=>{
      if(!isFutureOrToday(b.date)) return false;
      if(b.user_id && uid && String(b.user_id) === uid) return true;
      if(b.user_login && login && String(b.user_login) === login) return true;
      if(b.user_email && email && String(b.user_email) === email) return true;
      if(b.user && (b.user === login || b.user === email)) return true;
      return false;
    });

    // карта id -> booking (для быстрого доступа к price_per_hour)
    const idMap = {};
    my.forEach(b => { if(b.id) idMap[String(b.id)] = b; });

    // группируем по date|computer
    const groups = {};
    my.forEach(b=>{
      const key = `${b.date}|${b.computer}`;
      if(!groups[key]) groups[key] = { date: b.date, computer: b.computer, intervals: [], bookingIds: [] };
      const parsed = parseRange(b.time);
      if(parsed){
        groups[key].intervals.push({ start: parsed.start, end: parsed.end, id: b.id });
        if(b.id) groups[key].bookingIds.push(String(b.id));
      }
    });

    // Преобразуем группы: мержим интервалы, считаем часы и цену
    const out = Object.keys(groups).map(k=>{
      const g = groups[k];
      const merged = mergeIntervals(g.intervals); // merged items: {start,end,ids,display}
      // compute total minutes from merged intervals
      const totalMinutes = merged.reduce((sum,m)=> sum + Math.max(0,(m.end - m.start)), 0);
      const totalHours = totalMinutes / 60;

      // Собираем все price_per_hour из исходных броней, по id
      const prices = new Set();
      g.bookingIds.forEach(id=>{
        const b = idMap[id];
        if(b && (b.price_per_hour !== undefined && b.price_per_hour !== null)){
          // нормализуем в число
          const p = Number(b.price_per_hour);
          if(!isNaN(p)) prices.add(p);
        }
      });

      // выбираем отображаемую цену: если одна — показываем её и считаем totalCost
      let pricePerHour = null;
      let totalCost = null;
      if(prices.size === 1){
        pricePerHour = Array.from(prices)[0];
        totalCost = pricePerHour * totalHours;
        // округлим до 2 знаков (если потребуется)
        totalCost = Math.round(totalCost * 100) / 100;
      }

      return {
        date: g.date,
        computer: g.computer,
        merged,
        totalMinutes,
        totalHours,
        pricePerHour, // number or null
        totalCost     // number or null
      };
    });

    out.sort((a,b)=> a.date > b.date ? 1 : a.date < b.date ? -1 : (Number(a.computer) - Number(b.computer)));
    return out;
  }

  async function deleteByIds(ids){
    if(!Array.isArray(ids) || ids.length === 0) return;

    const BOOKINGS_API = 'api/bookings.php'; // убедитесь, что этот констант доступен в файле; иначе используйте глобальную переменную

    // Проверим доступность API (простым GET)
    let apiOk = false;
    try{
      const r = await fetch(BOOKINGS_API, { method: 'GET' });
      apiOk = r && r.ok;
    }catch(e){
      apiOk = false;
    }

    // Если API доступен — пробуем удалить через DELETE
    if(apiOk){
      const failed = []; // ids, которые не удалось удалить на сервере
      for(const id of ids){
        try{
          const resp = await fetch(`${BOOKINGS_API}?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
          });

          if(!resp.ok){
            // попытка прочитать тело ответа для логирования
            let txt = '';
            try{ txt = await resp.text(); }catch(e){ txt = '(no body)'; }
            console.warn(`Booking delete failed id=${id} status=${resp.status}`, txt);
            failed.push(id);
          }
        }catch(err){
          console.warn('Booking delete request error for id=' + id, err);
          failed.push(id);
        }
      }

      // Если все удалились на сервере — просто обновляем UI и выходим
      if(failed.length === 0){
        try{ await window.PAGE_INIT.akaynt(); } catch(e){ console.warn('refresh after delete failed', e); }
        // короткое уведомление пользователю
        alert('Бронь(и) успешно отменены.');
        return;
      }

      // Частичные неудачи — попытаемся синхронизовать локально: обновим кэш с сервера и отобразим предупреждение
      console.warn('Some deletions failed on server, failed ids:', failed);
      try{
        await window.PAGE_INIT.akaynt(); // внутри PAGE_INIT.akaynt мы подгружаем bookings с сервера или из localStorage
        alert('Часть броней не удалось удалить на сервере. Проверьте логи (консоль) или попробуйте позже.');
        return;
      }catch(e){
        console.warn('refresh after partial delete failed', e);
        // продолжим к fallback
      }
    }

    // Если API недоступен или удаление на сервере не удалось — делаем fallback: удаляем локально
    try{
      const LOCAL_KEY = 'nb_bookings';
      let all = [];
      try{ all = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); }catch(e){ all = []; }

      let changed = false;
      ids.forEach(id => {
        const idx = all.findIndex(x => x && x.id === id);
        if(idx > -1){ all.splice(idx, 1); changed = true; }
      });

      if(changed){
        localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
        try{ await window.PAGE_INIT.akaynt(); }catch(e){ console.warn('refresh after local delete failed', e); }
        alert('Сервер недоступен — бронь(и) удалены локально.');
        return;
      } else {
        alert('Не удалось найти выбранные брони в локальном хранилище.');
        return;
      }
    }catch(e){
      console.error('Fallback local delete failed', e);
      alert('Ошибка при попытке отменить бронь. Смотрите консоль для подробностей.');
    }
  }

  
  window.PAGE_INIT.akaynt = async function(){
    const profileArea = document.getElementById('profile-area');
    const list = document.getElementById('my-bookings');
    const logoutBtn = document.getElementById('logout-btn');
    const user = getCurrentUser();

    if(!user){
      if(profileArea) profileArea.innerHTML = '<p>Вы не авторизованы. <a href="#/login">Войти</a></p>';
      if(list) list.innerHTML = '';
      if(logoutBtn) logoutBtn.style.display = 'none';
      return;
    }

    if(profileArea) profileArea.innerHTML = `<p>Вы: <strong>${user.login}</strong> (${user.email})</p>`;
    if(logoutBtn){
      logoutBtn.style.display = '';
      logoutBtn.onclick = ()=> {
        localStorage.removeItem(USER_CURRENT_KEY);
        if(window.AUTH && window.AUTH.setCurrentUser) window.AUTH.setCurrentUser(null);
        location.hash = '#/';
      };
    }

    // load bookings (server or local)
    let bookings = null;
    try{
      const r = await fetch(BOOKINGS_API);
      if(r.ok){ const j = await r.json(); bookings = j.bookings || []; }
    }catch(e){ bookings = null; }
    if(!Array.isArray(bookings)) bookings = loadBookingsLocal();

    const groups = groupBookingsForUser(bookings, user);

    if(!list) return;
    list.innerHTML = '';

    if(groups.length === 0){
      list.innerHTML = '<p>У вас пока нет предстоящих броней.</p>';
      return;
    }

    groups.forEach(g=>{
      const block = document.createElement('div');
      block.className = 'booking-item';

      // отображение времени (как раньше)
      const displays = g.merged.map(m=>m.display);
      const displayText = displays.join(', ');
      const allIds = [].concat(...g.merged.map(m=>m.ids || []));

      // готовим кусок с ценой: если pricePerHour есть — показываем "Цена: X ₽/ч — Итого: Y ₽"
      let priceHtml = '';
      if(g.pricePerHour !== null && g.pricePerHour !== undefined){
        // форматируем: если integer — без дробной части
        const perHourStr = Number.isInteger(g.pricePerHour) ? `${g.pricePerHour}` : `${g.pricePerHour.toFixed(2)}`;
        const totalStr = Number.isInteger(g.totalCost) ? `${g.totalCost}` : `${g.totalCost.toFixed(2)}`;
        priceHtml = `<div>Цена: <strong>${totalStr} ₽</strong></div>`;
      } else {
        // если цены разные или не указаны — пишем заметку
        priceHtml = `<div style="color:#666;font-size:13px">Цена: разные или не указана для всех часов</div>`;
      }

      block.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <strong>Компьютер ${g.computer}</strong>
            <div>Дата: ${g.date}</div>
            <div>Время: ${displayText}</div>
            ${priceHtml}
          </div>
          <div style="min-width:120px;text-align:right">
            <button class="cancel-group" data-ids='${JSON.stringify(allIds)}'>Отменить</button>
          </div>
        </div>
      `;
      list.appendChild(block);
    });

    // обработчики отмены (как раньше)
    list.querySelectorAll('.cancel-group').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const raw = btn.getAttribute('data-ids');
        if(!raw) return;
        let ids; try{ ids = JSON.parse(raw); }catch(e){ ids = []; }
        if(!Array.isArray(ids) || ids.length===0) return;
        if(!confirm('Отменить эту бронь (все часы в группе)?')) return;
        await deleteByIds(ids);
      });
    });
  };

})();
