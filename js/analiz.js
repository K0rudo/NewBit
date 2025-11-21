// js/analiz.js — Простая, надёжная версия отчетов: одна форма + одна кнопка + таблица под формой
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};

  const BOOKINGS_API = 'api/bookings.php';
  const COMPUTERS_API = 'api/computers.php';
  const BOOKING_LOCAL_KEY = 'nb_bookings';
  const COMPUTERS_LOCAL_KEY = 'nb_computers';
  const PRICE_REG = 150;
  const PRICE_VIP = 250;

  function $id(id){ return document.getElementById(id); }
  function el(tag, props){ const e = document.createElement(tag); if(props) Object.keys(props).forEach(k=>{ if(k==='text') e.textContent = props[k]; else e.setAttribute(k, props[k]); }); return e; }
  function safeParse(s, fallback){ try{ return JSON.parse(s); } catch(e){ return fallback; } }
function fmtMoney(v){
  if(v===null||v===undefined||isNaN(Number(v))) return '0';
  const n = Number(v);
  return Number.isInteger(n) ? `${n}` : `${n.toFixed(2)}`;
}
  function esc(s){ if(s===null||s===undefined) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

  // parse time "HH:MM-HH:MM"
  function parseRange(str){
    if(!str) return null;
    const p = str.split('-');
    if(p.length!==2) return null;
    const toMin = s => { const a = s.split(':').map(x=>parseInt(x,10)); if(a.length<2||isNaN(a[0])||isNaN(a[1])) return null; return a[0]*60 + a[1]; };
    const smin = toMin(p[0]), emin = toMin(p[1]);
    if(smin===null||emin===null) return null;
    return { start: smin, end: emin, minutes: Math.max(0, emin - smin), sStr:p[0], eStr:p[1] };
  }

  // merge overlapping/adjacent intervals
  function mergeIntervals(arr){
    if(!Array.isArray(arr) || arr.length===0) return [];
    const a = arr.slice().map(x=>({ start:x.start, end:x.end, id:x.id||null }));
    a.sort((x,y)=> x.start - y.start || x.end - y.end);
    const res = [];
    for(const iv of a){
      if(res.length===0){ res.push({ start: iv.start, end: iv.end, ids: iv.id ? [iv.id] : [] }); continue; }
      const last = res[res.length-1];
      if(iv.start <= last.end){ // overlap or adjacent
        if(iv.end > last.end) last.end = iv.end;
        if(iv.id) last.ids.push(iv.id);
      } else {
        res.push({ start: iv.start, end: iv.end, ids: iv.id ? [iv.id] : [] });
      }
    }
    res.forEach(r => { r.minutes = Math.max(0, r.end - r.start); const hh = String(Math.floor(r.start/60)).padStart(2,'0'); const mm = String(r.start%60).padStart(2,'0'); const hh2 = String(Math.floor(r.end/60)).padStart(2,'0'); const mm2 = String(r.end%60).padStart(2,'0'); r.display = `${hh}:${mm}-${hh2}:${mm2}`; });
    return res;
  }

  // fetch helpers
  async function fetchJson(url){
    try {
      const r = await fetch(url, { cache:'no-store' });
      if(r.ok) return await r.json();
    } catch(e) { /* fallback */ }
    return null;
  }

  async function loadComputers(){
    const server = await fetchJson(COMPUTERS_API);
    if(server && Array.isArray(server.computers)) return { source:'server', computers: server.computers };
    const local = safeParse(localStorage.getItem(COMPUTERS_LOCAL_KEY), []);
    return { source:'local', computers: Array.isArray(local) ? local : [] };
  }

  async function loadBookings(){
    const server = await fetchJson(BOOKINGS_API);
    if(server && Array.isArray(server.bookings)) return { source:'server', bookings: server.bookings };
    const local = safeParse(localStorage.getItem(BOOKING_LOCAL_KEY), []);
    return { source:'local', bookings: Array.isArray(local) ? local : [] };
  }

  // build control form and data windows (tables) placed under form
  function buildUI(container){
    // remove existing if any (idempotent)
    const exist = $id('analiz-panel');
    if(exist) exist.remove();
    const root = el('div'); root.id = 'analiz-panel'; root.className = 'card';

    // controls row
    const controls = el('div'); controls.style.display='flex'; controls.style.gap='12px'; controls.style.flexWrap='wrap'; controls.style.alignItems='flex-end';

    // type
    const divType = el('div'); divType.style.display='flex'; divType.style.flexDirection='column';
    const labType = el('label'); labType.textContent = 'Тип отчёта'; labType.setAttribute('for','rep-type-simple');
    const selType = el('select'); selType.id='rep-type-simple';
    selType.innerHTML = '<option value="list">Список бронирований</option><option value="income">Доходы по компьютерам</option><option value="user">Часы по пользователям</option>';
    divType.appendChild(labType); divType.appendChild(selType);

    // computer select
    const divComp = el('div'); divComp.style.display='flex'; divComp.style.flexDirection='column';
    const labComp = el('label'); labComp.textContent = 'Компьютер'; labComp.setAttribute('for','rep-computer-simple');
    const selComp = el('select'); selComp.id='rep-computer-simple';
    selComp.innerHTML = '<option value="all">Все</option>';
    divComp.appendChild(labComp); divComp.appendChild(selComp);

    // date start/end
    const divStart = el('div'); divStart.style.display='flex'; divStart.style.flexDirection='column';
    const labStart = el('label'); labStart.textContent = 'Дата начала'; labStart.setAttribute('for','rep-start-simple');
    const inStart = el('input'); inStart.type='date'; inStart.id='rep-start-simple';
    divStart.appendChild(labStart); divStart.appendChild(inStart);

    const divEnd = el('div'); divEnd.style.display='flex'; divEnd.style.flexDirection='column';
    const labEnd = el('label'); labEnd.textContent = 'Дата окончания'; labEnd.setAttribute('for','rep-end-simple');
    const inEnd = el('input'); inEnd.type='date'; inEnd.id='rep-end-simple';
    divEnd.appendChild(labEnd); divEnd.appendChild(inEnd);

    // generate button
    const divBtn = el('div'); divBtn.style.display='flex'; divBtn.style.flexDirection='column'; divBtn.style.justifyContent='flex-end';
    const btnGen = el('button'); btnGen.textContent = 'Сформировать'; btnGen.id='rep-gen-simple'; btnGen.className='save-btn';
    divBtn.appendChild(btnGen);

    // status/message row
    const msg = el('div'); msg.id='rep-msg-simple'; msg.style.marginTop='8px'; msg.style.fontSize='13px';

    controls.appendChild(divType);
    controls.appendChild(divComp);
    controls.appendChild(divStart);
    controls.appendChild(divEnd);
    controls.appendChild(divBtn);

    root.appendChild(controls);
    root.appendChild(msg);

    // data windows: we'll create a placeholder container where table will be placed
    const windows = el('div'); windows.id = 'rep-windows-simple'; windows.style.marginTop = '12px';
    // clear existing tables inside windows on each run; but create containers for three types (hidden/shown)
    const wrapList = el('div'); wrapList.id='rep-window-list'; wrapList.style.marginTop='8px';
    const wrapIncome = el('div'); wrapIncome.id='rep-window-income'; wrapIncome.style.marginTop='8px';
    const wrapUser = el('div'); wrapUser.id='rep-window-user'; wrapUser.style.marginTop='8px';
    windows.appendChild(wrapList); windows.appendChild(wrapIncome); windows.appendChild(wrapUser);

    // insert into container (top)
    container.insertBefore(root, container.firstChild);
    container.insertBefore(windows, root.nextSibling);

    // default dates (last 7 days)
    const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth()+1).padStart(2,'0'); const dd = String(today.getDate()).padStart(2,'0');
    inEnd.value = `${yyyy}-${mm}-${dd}`;
    const dd7 = new Date(); dd7.setDate(dd7.getDate()-7); inStart.value = `${dd7.getFullYear()}-${String(dd7.getMonth()+1).padStart(2,'0')}-${String(dd7.getDate()).padStart(2,'0')}`;

    return { selType, selComp, inStart, inEnd, btnGen, msg, wrapList, wrapIncome, wrapUser };
  }

  // helper to fill computers select
  function fillComputersSelect(sel, comps){
    sel.innerHTML = '<option value="all">Все</option>';
    (comps||[]).slice().sort((a,b)=> (Number(a.number)||0) - (Number(b.number)||0)).forEach(c=>{
      const v = (c.number!==undefined && c.number!==null) ? String(c.number) : (c.id||'');
      const opt = document.createElement('option'); opt.value = v; opt.textContent = c.number ? String(c.number) : (c.label||c.id||'ПК');
      sel.appendChild(opt);
    });
  }

  // create table helper
  function makeTable(headers, id){
    const table = el('table'); table.className='report-table'; if(id) table.id = id;
    const thead = el('thead'); const tr = el('tr');
    headers.forEach(h => { const th = el('th'); th.textContent = h; tr.appendChild(th); });
    thead.appendChild(tr);
    const tbody = el('tbody');
    const tfoot = el('tfoot');
    table.appendChild(thead); table.appendChild(tbody); table.appendChild(tfoot);
    return { table, tbody, tfoot };
  }

  // render functions for three report types
  async function generateAndRender(panel){
    try{
      panel.msg.textContent = 'Загружаю данные...';
      const [cRes, bRes] = await Promise.all([ loadComputers(), loadBookings() ]);
      const comps = Array.isArray(cRes.computers) ? cRes.computers : [];
      const bookingsRaw = Array.isArray(bRes.bookings) ? bRes.bookings : [];

      // fill comp select if empty
      if(panel.selComp.options.length <= 1) fillComputersSelect(panel.selComp, comps);

      // prepare comp map
      const compByNumber = {};
      comps.forEach(c => {
        if(c && (c.number !== undefined && c.number !== null)) compByNumber[String(c.number)] = c;
        else if(c && c.id) compByNumber[c.id] = c;
      });

      // filter by inputs
      const type = panel.selType.value;
      const compFilter = panel.selComp.value;
      const start = panel.inStart.value;
      const end = panel.inEnd.value;

      // normalize bookings: compute parsed, minutes, hours, pph, total
      const bookings = bookingsRaw.map(b => {
        const parsed = parseRange(b.time);
        let pph = null;
        if(b.price_per_hour !== undefined && b.price_per_hour !== null) pph = Number(b.price_per_hour);
        else {
          const comp = compByNumber[String(b.computer)];
          if(comp && comp.price !== undefined && comp.price !== null) pph = Number(comp.price);
          else pph = (comp && comp.type === 'vip') ? PRICE_VIP : PRICE_REG;
        }
        if(isNaN(pph)) pph = PRICE_REG;
        const hours = parsed ? parsed.minutes / 60 : 0;
        const total = Math.round(hours * pph * 100) / 100;
        return {
          id: b.id || null,
          date: b.date || '',
          computer: (b.computer !== undefined && b.computer !== null) ? String(b.computer) : '',
          time: b.time || '',
          parsed,
          minutes: parsed ? parsed.minutes : 0,
          hours,
          pph,
          total,
          user: b.user_login || b.user || b.user_email || ''
        };
      });

      // apply filters
      let filtered = bookings.slice();
      if(compFilter && compFilter !== 'all') filtered = filtered.filter(x => String(x.computer) === String(compFilter));
      if(start) filtered = filtered.filter(x => x.date >= start);
      if(end) filtered = filtered.filter(x => x.date <= end);

      // clear windows
      panel.wrapList.innerHTML = ''; panel.wrapIncome.innerHTML = ''; panel.wrapUser.innerHTML = '';

      if(filtered.length === 0){
        panel.msg.textContent = 'Нет данных по выбранным параметрам.';
        return;
      }

      // --- LIST ---
      if(type === 'list'){
        panel.msg.textContent = '';
        const headers = ['Дата','Компьютер','Время','Часы','Пользователь','Итого, ₽'];
        const tbl = makeTable(headers, 'rep-table');
        // group by user|date|comp
        const groups = {};
        filtered.forEach(b => {
          const who = b.user || 'unknown';
          const key = `${who}|${b.date}|${b.computer}`;
          if(!groups[key]) groups[key] = { who, date: b.date, computer: b.computer, rawBookings: [] };
          groups[key].rawBookings.push(b);
        });
        let totalSum = 0;
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
          let totalMinutes = 0;
          let totalCost = 0;
          g.rawBookings.forEach(b=>{
            const pr = parseRange(b.time);
            if(pr){
              const mins = Math.max(0, pr.end - pr.start);
              totalMinutes += mins;
              let pph = null;
              if(b.price_per_hour !== undefined && b.price_per_hour !== null) pph = Number(b.price_per_hour);
              else {
                const comp = compByNumber[String(b.computer)];
                if(comp && comp.price !== undefined) pph = Number(comp.price);
                else pph = (comp && comp.type === 'vip') ? PRICE_VIP : PRICE_REG;
              }
              if(isNaN(pph)) pph = PRICE_REG;
              totalCost += (mins/60) * pph;
            }
          });
          totalCost = Math.round(totalCost * 100) / 100;

          const timesDisplay = merged.map(m=>m.display).join(', ');
          const hours = Math.round((totalMinutes/60) * 100) / 100;
          totalSum += totalCost;

          const tr = el('tr');
          tr.innerHTML = `<td>${esc(g.date)}</td><td>${esc(g.computer)}</td><td>${esc(timesDisplay)}</td><td>${hours}</td><td>${esc(g.who)}</td><td>${fmtMoney(totalCost)}</td>`;
          tbl.tbody.appendChild(tr);
        });

        tbl.tfoot.innerHTML = `<tr><td colspan="5"><strong>Итого (сумма)</strong></td><td><strong>${fmtMoney(Math.round(totalSum*100)/100)}</strong></td></tr>`;

        panel.wrapList.appendChild(tbl.table);
        return;
      }

      // --- INCOME ---
      if(type === 'income'){
        panel.msg.textContent = '';
        const headers = ['Компьютер','Часы','Ставка','Итого, ₽'];
        const tbl = makeTable(headers, 'rep-table-income');
        const byComp = {};
        filtered.forEach(b => {
          const key = String(b.computer);
          if(!byComp[key]) byComp[key] = { comp:key, bookings: [], intervalsByDate: {}, income:0 };
          byComp[key].bookings.push(b);
          byComp[key].income += b.total || 0;
          const dk = b.date || '';
          if(!byComp[key].intervalsByDate[dk]) byComp[key].intervalsByDate[dk] = [];
          if(b.parsed) byComp[key].intervalsByDate[dk].push({ start: b.parsed.start, end: b.parsed.end });
        });
        let totalIncome = 0;
        Object.keys(byComp).sort((a,b)=> (Number(a)||Infinity) - (Number(b)||Infinity)).forEach(k=>{
          const r = byComp[k];
          let minutes = 0;
          Object.keys(r.intervalsByDate).forEach(d=>{
            const merged = mergeIntervals(r.intervalsByDate[d]);
            minutes += merged.reduce((s,m)=> s + (m.minutes||0), 0);
          });
          const hours = Math.round((minutes/60) * 100) / 100;
          let sumH = 0, sumMoney = 0;
          r.bookings.forEach(bb => { sumH += (bb.hours||0); sumMoney += ((bb.hours||0) * (bb.pph||0)); });
          const avg = sumH > 0 ? Math.round((sumMoney / sumH)*100)/100 : (r.bookings.length ? r.bookings[0].pph : PRICE_REG);
          const income = Math.round(r.income*100)/100;
          totalIncome += income;
          const tr = el('tr');
          tr.innerHTML = `<td>${esc(r.comp)}</td><td>${hours}</td><td>${avg.toFixed(2)} </td><td>${fmtMoney(income)}</td>`;
          tbl.tbody.appendChild(tr);
        });
        tbl.tfoot.innerHTML = `<tr><td colspan="3"><strong>Итого доход</strong></td><td><strong>${fmtMoney(Math.round(totalIncome*100)/100)}</strong></td></tr>`;


        panel.wrapIncome.appendChild(tbl.table);
        return;
      }

      // --- USER ---
      if(type === 'user'){
    panel.msg.textContent = '';
    const headers = ['Пользователь','Компьютеры','Часы'];   // ← поменяли порядок
    const tbl = makeTable(headers, 'rep-table-user');

    const byUser = {};
    filtered.forEach(b=>{
        const who = b.user || 'unknown';
        if(!byUser[who]) byUser[who] = { who, intervalsByKey: {}, comps: new Set() };

        const key = `${b.date}|${b.computer}`;
        if(!byUser[who].intervalsByKey[key]) byUser[who].intervalsByKey[key] = [];

        if(b.parsed)
            byUser[who].intervalsByKey[key].push({ start: b.parsed.start, end: b.parsed.end });

        if(b.computer)
            byUser[who].comps.add(String(b.computer));
    });

    let totalHours = 0;

    Object.keys(byUser).sort().forEach(u=>{
        const obj = byUser[u];

        // считаем минуты
        let minutes = 0;
        Object.keys(obj.intervalsByKey).forEach(k=>{
            const merged = mergeIntervals(obj.intervalsByKey[k]);
            minutes += merged.reduce((s,m)=> s + (m.minutes||0), 0);
        });

        const hours = Math.round((minutes/60) * 100) / 100;
        totalHours += hours;

        const comps = Array.from(obj.comps).join(', ');

        // поменяли порядок ячеек
        const tr = el('tr');
        tr.innerHTML = `
            <td>${esc(obj.who)}</td>
            <td>${esc(comps || '-')}</td>
            <td>${hours}</td>
        `;
        tbl.tbody.appendChild(tr);
    });

    // итог тоже по новому порядку
    tbl.tfoot.innerHTML = `<tr><td colspan="2"><strong>Итого (часы)</strong></td><td><strong>${totalHours}</strong></td></tr>`;


    panel.wrapUser.appendChild(tbl.table);
    return;
}
      panel.msg.textContent = 'Неизвестный тип отчёта';
    } catch(e){
      console.error('generateAndRender error', e);
      panel.msg.textContent = 'Ошибка при формировании отчёта — см. консоль';
    }
  }

  // page init hook
  window.PAGE_INIT.analiz = async function(){
// Инициализация страницы — вставляем компактную панель в плейсхолдер аналита
const container = $id('analiz-root') || $id('app');

const panel = buildUI(container);
    // fill computers select from server/local
    const compsRes = await loadComputers();
    fillComputersSelect(panel.selComp, compsRes.computers || []);

    // attach button
    panel.btnGen.addEventListener('click', ()=> generateAndRender(panel));
  };

})();
