/* Reports logic (localStorage only). Save as js/analiz.js */
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};

  function loadLocal(){ try{ return JSON.parse(localStorage.getItem('nb_bookings')||'[]'); }catch(e){return []} }

  window.PAGE_INIT.analiz = function(){
    const genBtn = document.getElementById('rep-gen');
    const tableBody = document.querySelector('#rep-table tbody');
    const repCount = document.getElementById('rep-count');
    if(!genBtn) return;

    genBtn.addEventListener('click', ()=>{
      const comp = document.getElementById('rep-computer').value;
      const start = document.getElementById('rep-start').value;
      const end = document.getElementById('rep-end').value;
      let all = loadLocal();

      let filtered = all;
      if(comp && comp!=='all') filtered = filtered.filter(b=>String(b.computer)===String(comp));
      if(start) filtered = filtered.filter(b=>b.date>=start);
      if(end) filtered = filtered.filter(b=>b.date<=end);
      tableBody.innerHTML = '';
      filtered.forEach(b=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${b.date}</td><td>${b.computer}</td><td>1</td><td>${b.user}</td>`;
        tableBody.appendChild(tr);
      });
      repCount.textContent = filtered.length;
    });
  };
})();
