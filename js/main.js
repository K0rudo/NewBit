/* js/main.js */
(function(){
  const USER_KEY = 'nb_user_current';

  function getCurrentUser(){
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch(e){ return null; }
  }
  function setCurrentUser(userObj){
    if(userObj) localStorage.setItem(USER_KEY, JSON.stringify(userObj));
    else localStorage.removeItem(USER_KEY);
    renderUserArea();
  }

  function renderUserArea(){
    const link = document.getElementById('user-link');
    const navMy = document.getElementById('nav-my-bookings');

    const analizLink = document.querySelector('a[href="#/analiz"]'); // ссылка Отчёты
    const user = getCurrentUser();

    // staff = worker OR admin
    const staff = user && (String(user.role).toLowerCase() === 'worker' || String(user.role).toLowerCase() === 'admin');

    if(user){
      if(link){ link.textContent = user.login; link.setAttribute('href','#/akaynt'); }
      if(navMy) navMy.style.display = ''; // show (if you use it)
    } else {
      if(link){ link.textContent = 'Войти'; link.setAttribute('href','#/login'); }
      if(navMy) navMy.style.display = 'none';
    }

    // show/hide "Отчёты" only for staff
    if(analizLink){
      analizLink.style.display = staff ? '' : 'none';
    }
  }

  window.AUTH = {
    getCurrentUser,
    setCurrentUser
  };

  window.addEventListener('load', ()=> renderUserArea());
  window.addEventListener('hashchange', ()=> renderUserArea());
})();
