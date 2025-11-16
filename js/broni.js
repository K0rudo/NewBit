/* Booking logic (localStorage only). Save as js/broni.js */
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};

  function loadBookingsLocal(){
    try{ return JSON.parse(localStorage.getItem('nb_bookings')||'[]'); }catch(e){return []}
  }
  function saveBookingsLocal(arr){ localStorage.setItem('nb_bookings', JSON.stringify(arr)); }

  function uid(){
    return 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
  }

  window.PAGE_INIT.broni = function(){
    const pricePerHour = 150;
    const dateInput = document.getElementById('broni-date');
    const compSelect = document.getElementById('broni-computer');
    const timeArea = document.getElementById('broni-time-area');
    const timesDiv = document.getElementById('broni-times');
    const msg = document.getElementById('broni-message');
    const totalDiv = document.getElementById('broni-total');
    const confirmBtn = document.getElementById('broni-confirm');

    let selected = [];

    function showMessage(text,type='info',timeout=3000){
      if(!msg) return;
      msg.innerHTML = `<div class="message ${type}">${text}</div>`;
      if(timeout>0) setTimeout(()=>{ if(msg) msg.innerHTML=''; }, timeout);
    }

    function generateRanges(){ const ranges=[]; for(let i=0;i<24;i++){ const s=String(i).padStart(2,'0')+':00'; const e=String(i+1).padStart(2,'0')+':00'; ranges.push(`${s}-${e}`);} return ranges; }

    function getBookedFor(date, computer, bookings){
      return bookings.filter(b=>b.date===date && String(b.computer)===String(computer)).map(b=>b.time);
    }

    function renderTimes(bookings){
      if(!timesDiv) return;
      timesDiv.innerHTML=''; selected=[]; updateTotal();
      const date = dateInput.value; const comp = compSelect.value;
      if(!date) return;
      const booked = getBookedFor(date, comp, bookings);
      const ranges = generateRanges();
      ranges.forEach(r=>{
        const el = document.createElement('div');
        el.className = 'time-slot';
        el.textContent = r;
        if(booked.includes(r)){
          el.classList.add('booked');
        } else {
          el.classList.add('available');
          el.addEventListener('click', ()=>toggleSelect(el,r));
        }
        timesDiv.appendChild(el);
      });
      timeArea.style.display = 'block';
    }

    function toggleSelect(el,range){
      if(el.classList.contains('selected')){
        el.classList.remove('selected');
        selected = selected.filter(x=>x!==range);
      } else {
        if(selected.length>=8){ showMessage('Нельзя выбрать больше 8 часов.','error'); return; }
        el.classList.add('selected');
        selected.push(range);
      }
      updateTotal();
    }

    function updateTotal(){ if(totalDiv) totalDiv.textContent = `Общая стоимость: ${selected.length*pricePerHour} руб.`; if(confirmBtn) confirmBtn.style.display = selected.length? 'inline-block':'none'; }

    // events
    dateInput && dateInput.addEventListener('change', ()=>{
      const d = dateInput.value;
      if(!d){ timeArea.style.display='none'; return; }
      const selDate = new Date(d); selDate.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      if(selDate < today){ showMessage('Нельзя выбрать прошедшую дату.','error',4000); timeArea.style.display='none'; return; }
      const all = loadBookingsLocal(); renderTimes(all);
    });

    compSelect && compSelect.addEventListener('change', ()=>{
      const all = loadBookingsLocal(); renderTimes(all);
    });

    confirmBtn && confirmBtn.addEventListener('click', ()=>{
      if(!selected.length){ showMessage('Выберите хотя бы один интервал.','error'); return; }
      const user = localStorage.getItem('nb_user') || 'Гость';
      const date = dateInput.value; const computer = compSelect.value;
      const bookings = loadBookingsLocal();
      const newBookings = selected.map(t=>({ id: uid(), date, computer, time: t, user }));
      newBookings.forEach(n=>bookings.push(n));
      saveBookingsLocal(bookings);
      showMessage(`Брони сохранены локально. (${newBookings.length})`,'success',3000);
      renderTimes(loadBookingsLocal());
    });
  };
})();
