/* js/router.js — убедись, что routes включают login/register */
(function(){
  const app = document.getElementById('app');
  const routes = {
    '/': 'home',
    '/broni': 'broni',
    '/analiz': 'analiz',
    '/equioment': 'equioment',
    '/akaynt': 'akaynt',
    '/login': 'login',
    '/register': 'register'
    // остальные как есть
  };

  function render(){
    const raw = location.hash.replace('#','') || '/';
    const tpl = routes[raw] || 'home';
    app.innerHTML = window.TEMPLATES[tpl] || window.TEMPLATES.home;
    highlightNav(raw);
    if(window.PAGE_INIT && typeof window.PAGE_INIT[tpl] === 'function'){
      try { window.PAGE_INIT[tpl](); } catch(e){ console.error(e); }
    }
  }

  function highlightNav(raw){
    document.querySelectorAll('.nav-link').forEach(a=>{
      const href = a.getAttribute('href').replace('#','') || '/';
      a.classList.toggle('active', href===raw);
    });
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('load', render);
  window.SPA_RENDER = render;
})();
