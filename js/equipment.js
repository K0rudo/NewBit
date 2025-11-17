/* js/equipment.js — интегрированная, полная версия
   Функции:
   - загрузка списка компьютеров (api -> localStorage -> fallback)
   - горизонтальный скрол с плитками
   - отображение деталей ПК
   - modal для add/update/delete (с fallback на localStorage)
   - кнопка "Добавить" видна пользователям с ролью worker (регистронезависимо)
   - PRESELECT из брони поддерживается
*/
(function(){
  const API = 'api/computers.php';
  const SCROLL_ID = 'computers-scroll';
  const DETAILS_ID = 'equip-details';
  const ADD_AREA_ID = 'equip-add-area';
  const LOCAL_KEY = 'nb_computers';

  function $id(id){ return document.getElementById(id); }

  // Надёжная загрузка текущего пользователя
  function currentUser(){
    try {
      if(window.AUTH && typeof window.AUTH.getCurrentUser === 'function'){
        const u = window.AUTH.getCurrentUser();
        if(u) return u;
      }
    } catch(e){ console.warn('AUTH.getCurrentUser() error', e); }
    try {
      const raw = localStorage.getItem('nb_user_current');
      if(raw) return JSON.parse(raw);
    } catch(e){ console.warn('parse nb_user_current failed', e); }
    return null;
  }

  // безопасный escape для атрибутов/текста
  function esc(s){ if(s===null||s===undefined) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

  // tile class and label helpers
  function tileClass(type){ if(type==='vip') return 'vip'; if(type==='broken') return 'broken'; return 'regular'; }
  function typeLabel(type){ if(type==='vip') return 'VIP'; if(type==='broken') return 'Ремонт'; return 'Обычный'; }

  // fetch list from API; if fails, try localStorage; else fallback empty array
  async function fetchComputers(){
    try{
      const r = await fetch(API, { cache:'no-store' });
      if(r.ok){
        const j = await r.json();
        if(j && Array.isArray(j.computers)) {
          try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(j.computers)); } catch(e){}
          return j.computers;
        }
      }
    } catch(e){
      console.warn('computers api failed', e);
    }
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if(raw) {
        const arr = JSON.parse(raw);
        if(Array.isArray(arr)) return arr;
      }
    } catch(e){ console.warn('local computers parse failed', e); }
    return []; // empty — upper layers may fallback to defaults
  }

  // save to local storage helper
  function saveComputersLocal(arr){
    try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(arr)); }catch(e){ console.warn('save local comps failed', e); }
  }

  // global cache
  let comps = [];

  // render horizontal tiles
  function renderTiles(){
    const wrap = $id(SCROLL_ID); if(!wrap) return;
    wrap.innerHTML = '';
    comps.forEach(c=>{
      const tile = document.createElement('div');
      tile.className = 'comp-tile ' + tileClass(c.type);
      tile.textContent = (c.number !== undefined && c.number !== null) ? String(c.number) : (c.label || 'ПК');
      tile.dataset.cid = c.id;
      tile.dataset.cnum = c.number;
      tile.title = c.label ? c.label : `ПК ${c.number}`;
      tile.addEventListener('click', ()=> onTileClick(c, tile));
      wrap.appendChild(tile);
    });
  }

  // render details for a computer object c
  function renderDetails(c){
    const out = $id(DETAILS_ID); if(!out) return;
    const title = `Компьютер ${c.number} — ${typeLabel(c.type)}`;
    const img = c.image ? c.image : (c.type === 'vip' ? 'img/2.jpg' : 'img/1.jpg');
    out.innerHTML = `
      <div class="card" style="display:flex;gap:12px;align-items:flex-start">
        <div style="flex:0 0 260px">
          <img src="${esc(img)}" alt="${esc(title)}" style="width:100%;height:160px;object-fit:cover;border-radius:8px">
        </div>
        <div style="flex:1">
          <h3>${esc(title)}</h3>
          <p><strong>Метка:</strong> ${esc(c.label || '')}</p>
          <p><strong>Процессор:</strong> ${esc(c.processor||'—')}</p>
          <p><strong>Видеокарта:</strong> ${esc(c.gpu||'—')}</p>
          <p><strong>ОЗУ:</strong> ${esc(c.ram||'—')}</p>
          <p><strong>Накопитель:</strong> ${esc(c.storage||'—')}</p>
          <p><strong>Монитор:</strong> ${esc(c.monitor||'—')}</p>
          <p><strong>Цена (руб/час):</strong> ${c.price!==undefined?String(c.price)+' ₽':'—'}</p>
          <p><strong>Примечания:</strong> ${esc(c.notes||'')}</p>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
            <button id="btn-book" class="save-btn">Забронировать</button>
          </div>
        </div>
      </div>
    `;

    // book button binds: set PRESELECT and go to /broni
    const bookBtn = $id('btn-book');
    if(bookBtn){
      bookBtn.addEventListener('click', ()=>{
        window.PRESELECT_COMPUTER_ID = c.id;
        window.PRESELECT_COMPUTER_NUMBER = c.number;
        location.hash = '#/broni';
      });
    }

    // attach edit/delete for workers
    const user = currentUser();
    const role = user && user.role ? String(user.role).trim().toLowerCase() : '';
    const isWorker = (role === 'worker' || role === 'admin');
    if(isWorker){
      const btnWrap = document.createElement('div');
      btnWrap.style.display = 'flex'; btnWrap.style.justifyContent = 'flex-end'; btnWrap.style.gap = '8px'; btnWrap.style.marginTop = '8px';
      const edit = document.createElement('button'); edit.textContent = 'Изменить'; edit.className = 'save-btn';
      const del = document.createElement('button'); del.textContent = 'Удалить'; del.className = 'close-btn';
      edit.addEventListener('click', ()=> openModalFor(c, true, false));
      del.addEventListener('click', async ()=>{
        if(!confirm('Удалить компьютер? Нумерация остальных сдвинется.')) return;
        // try server delete
        try{
          const resp = await fetch(API + '?id=' + encodeURIComponent(c.id), { method:'DELETE' });
          if(resp.ok){
            const j = await resp.json();
            if(j && j.success){
              await loadAndRender();
              alert('Удалено');
              return;
            }
          }
        }catch(e){ console.warn('server delete failed', e); }
        // fallback local delete + renumber
        try{
          const raw = localStorage.getItem(LOCAL_KEY);
          let arr = raw ? JSON.parse(raw) : [];
          const idx = arr.findIndex(x => String(x.id) === String(c.id));
          if(idx > -1){
            arr.splice(idx,1);
            arr.sort((a,b)=> (Number(a.number)||0) - (Number(b.number)||0));
            arr.forEach((x,i)=> x.number = i+1);
            saveComputersLocal(arr);
            await loadAndRender();
            alert('Удалено (локально)');
            return;
          } else alert('Компьютер не найден локально');
        }catch(e){ console.error('local delete failed', e); alert('Ошибка удаления'); }
      });
      btnWrap.appendChild(edit); btnWrap.appendChild(del);
      // append to the right column (second child of card)
      const parent = $id(DETAILS_ID).querySelector('div.card > div:nth-child(2)');
      if(parent) parent.appendChild(btnWrap);
    }
  }

  // tile click handler
  function onTileClick(c, tile){
    document.querySelectorAll('.comp-tile').forEach(t=>t.classList.remove('active'));
    tile.classList.add('active');
    renderDetails(c);
  }

  // modal open (c: computer object or {} for new), editable (bool), isNew (bool)
  function openModalFor(c, editable, isNew=false){
    if(!$id('equip-id')) return;
    $id('equip-id').value = c && c.id ? c.id : '';
    $id('equip-number').value = c && c.number ? c.number : '';
    $id('equip-label').value = c && c.label ? c.label : '';
    $id('equip-processor').value = c && c.processor ? c.processor : '';
    $id('equip-gpu').value = c && c.gpu ? c.gpu : '';
    $id('equip-ram').value = c && c.ram ? c.ram : '';
    $id('equip-storage').value = c && c.storage ? c.storage : '';
    $id('equip-monitor').value = c && c.monitor ? c.monitor : '';
    $id('equip-price').value = c && (c.price!==undefined) ? c.price : '';
    $id('equip-notes').value = c && c.notes ? c.notes : '';
    $id('equip-modal-title').textContent = isNew ? 'Новый компьютер' : `Редактировать компьютер ${c && c.number ? c.number : ''}`;

    const fields = ['equip-label','equip-processor','equip-gpu','equip-ram','equip-storage','equip-monitor','equip-price','equip-notes'];
    fields.forEach(id => { const el = $id(id); if(el){ if(editable) el.removeAttribute('disabled'); else el.setAttribute('disabled','disabled'); } });

    const saveBtn = $id('equip-save'); if(saveBtn) saveBtn.style.display = editable ? '' : 'none';
    const delBtn = $id('equip-delete'); if(delBtn) delBtn.style.display = isNew ? 'none' : (currentUser() && (String(currentUser().role||'').toLowerCase()==='worker' ? '' : 'none'));

    const modal = $id('equip-modal'); if(modal){ modal.classList.add('active'); modal.setAttribute('aria-hidden','false'); }

    // bind save with local fallback
    if(saveBtn){
      const newBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newBtn, saveBtn);
      newBtn.addEventListener('click', async (ev)=>{
        ev.preventDefault();
        const idVal = $id('equip-id').value;
        const payload = {
          label: $id('equip-label').value,
          processor: $id('equip-processor').value,
          gpu: $id('equip-gpu').value,
          ram: $id('equip-ram').value,
          storage: $id('equip-storage').value,
          monitor: $id('equip-monitor').value,
          price: Number($id('equip-price').value) || 0,
          notes: $id('equip-notes').value
        };
        try{
          if(isNew){
            // try server add
            try {
              const resp = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'add', computer: Object.assign({ id: 'c_'+Date.now()+'_rand', type:'regular' }, payload) }) });
              if(resp.ok){
                const j = await resp.json();
                if(j && j.success){ await loadAndRender(); closeModal(); alert('Добавлено'); return; }
              }
            } catch(e){ console.warn('server add failed', e); }

            // fallback local add
            const raw = localStorage.getItem(LOCAL_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            const newComp = Object.assign({ id: 'c_'+Date.now()+'_rand', type: 'regular' }, payload);
            const maxNum = arr.reduce((m,x)=> Math.max(m, Number(x.number)||0), 0);
            newComp.number = maxNum + 1;
            arr.push(newComp);
            saveComputersLocal(arr);
            await loadAndRender();
            closeModal();
            alert('Добавлено (локально)');
            return;
          } else {
            // update existing
            try {
              const resp = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'update', id: idVal, computer: payload }) });
              if(resp.ok){
                const j = await resp.json();
                if(j && j.success){ await loadAndRender(); closeModal(); alert('Сохранено'); return; }
              }
            } catch(e){ console.warn('server update failed', e); }

            // fallback local update
            const raw = localStorage.getItem(LOCAL_KEY);
            let arr = raw ? JSON.parse(raw) : [];
            const idx = arr.findIndex(x => String(x.id) === String(idVal));
            if(idx > -1){
              arr[idx] = Object.assign({}, arr[idx], payload);
              saveComputersLocal(arr);
              await loadAndRender();
              closeModal();
              alert('Сохранено (локально)');
              return;
            }
            alert('Не удалось сохранить');
          }
        } catch(e){
          console.error('save failed', e);
          alert('Ошибка сохранения');
        }
      });
    }

    // bind delete in modal (with fallback)
    if($id('equip-delete')){
      $id('equip-delete').onclick = async () => {
        if(!confirm('Удалить компьютер? Нумерация сдвинется.')) return;
        const idVal = $id('equip-id').value;
        try{
          const resp = await fetch(API + '?id=' + encodeURIComponent(idVal), { method:'DELETE' });
          if(resp.ok){
            const j = await resp.json();
            if(j && j.success){ await loadAndRender(); closeModal(); alert('Удалено'); return; }
          }
        }catch(e){ console.warn('server delete failed', e); }
        // fallback local delete and renumber
        try{
          const raw = localStorage.getItem(LOCAL_KEY);
          let arr = raw ? JSON.parse(raw) : [];
          const idx = arr.findIndex(x => String(x.id) === String(idVal));
          if(idx > -1){
            arr.splice(idx,1);
            arr.sort((a,b)=> (Number(a.number)||0) - (Number(b.number)||0));
            arr.forEach((x,i)=> x.number = i+1);
            saveComputersLocal(arr);
            await loadAndRender();
            closeModal();
            alert('Удалено (локально)');
            return;
          } else alert('Компьютер не найден локально');
        }catch(e){ console.error('local delete failed', e); alert('Ошибка при удалении'); }
      };
    }
  }

  function closeModal(){ const m = $id('equip-modal'); if(m){ m.classList.remove('active'); m.setAttribute('aria-hidden','true'); } }

  // "Add" button now placed in page (equip-add-area)
  function renderAddButton(){
    const area = $id(ADD_AREA_ID); if(!area) return; area.innerHTML = '';
    const user = currentUser();
    if(user && String(user.role).toLowerCase() === 'worker'){
      const btn = document.createElement('button');
      btn.className='save-btn';
      btn.textContent = 'Добавить компьютер';
      btn.addEventListener('click', ()=> openModalFor({}, true, true));
      area.appendChild(btn);
    }
  }

  // load comps from API/local and render tiles + preselect
  async function loadAndRender(){
    comps = await fetchComputers();

    // if no comps, try to populate from local defaults previously used by project
    if(!comps || !Array.isArray(comps) || comps.length === 0){
      // leave empty — broni/other modules have their own fallback
      comps = [];
    }

    // ensure numbers present and sorted by number
    comps.sort((a,b)=> (Number(a.number)||0) - (Number(b.number)||0));
    renderTiles();
    renderAddButton();

    // handle PRESELECT from booking page
    const preId = window.PRESELECT_COMPUTER_ID;
    const preNum = window.PRESELECT_COMPUTER_NUMBER || window.SELECT_COMPUTER_ID;
    let found = null;
    if(preId) found = comps.find(x => String(x.id) === String(preId));
    if(!found && (preNum !== undefined && preNum !== null)) found = comps.find(x => String(x.number) === String(preNum));
    if(found){
      const tile = document.querySelector(`.comp-tile[data-cid="${found.id}"], .comp-tile[data-cnum="${found.number}"]`);
      if(tile) tile.click();
      delete window.PRESELECT_COMPUTER_ID; delete window.PRESELECT_COMPUTER_NUMBER; delete window.SELECT_COMPUTER_ID;
    } else {
      const t = document.querySelector('.comp-tile');
      if(t) t.click();
    }
  }

  // PAGE_INIT hook
  window.PAGE_INIT = window.PAGE_INIT || {};
  window.PAGE_INIT.equioment = async function(){
    // modal close handlers: close by clicking overlay or close button
    document.addEventListener('click', function(ev){ if(ev.target && ev.target.id === 'equip-close') closeModal(); });
    document.addEventListener('DOMContentLoaded', ()=>{ const modal = $id('equip-modal'); if(modal) modal.addEventListener('click', (ev)=>{ if(ev.target === modal) closeModal(); }); });
    await loadAndRender();
  };

  // expose helper
  window.NB_EQUIP = { reload: loadAndRender, getComputers: ()=> comps, openEditModal: openModalFor };

})();
