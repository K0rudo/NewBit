// js/analiz-guard.js
window.PAGE_INIT = window.PAGE_INIT || {};
(function(){
  const prev = window.PAGE_INIT.analiz; // если уже был init, сохраним его
  window.PAGE_INIT.analiz = async function(){
    const user = (window.AUTH && window.AUTH.getCurrentUser) ? window.AUTH.getCurrentUser() : null;
    const isStaff = user && (String(user.role).toLowerCase() === 'worker' || String(user.role).toLowerCase() === 'admin');
    // если не сотрудник — покажем уведомление и прервём инициализацию
    if(!isStaff){
      const card = document.querySelector('#app .card');
      if(card){
        card.innerHTML = '<h2>Отчёты</h2><p>Доступ к отчётам ограничен — только для сотрудников.</p>';
      }
      return;
    }
    // иначе — вызвать старую инициализацию (если есть)
    if(typeof prev === 'function') {
      try { await prev(); } catch(e){ console.error('analiz init failed', e); }
    } else {
      // если у вас нет отдельной логики — можно инициализировать стандартные контролы здесь
    }
  };
})();
