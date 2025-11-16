/* js/akaynt.js */
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};
  const USERS_KEY_LOCAL = 'nb_users_local';
  const BOOKINGS_KEY = 'nb_bookings';
  const USER_CURRENT_KEY = 'nb_user_current';

  function loadBookingsLocal(){ try{ return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]'); }catch(e){ return []; } }
  function saveBookingsLocal(arr){ localStorage.setItem(BOOKINGS_KEY, JSON.stringify(arr)); }

  function getCurrentUser(){
    try{ return JSON.parse(localStorage.getItem(USER_CURRENT_KEY) || 'null'); }catch(e){ return null; }
  }

  window.PAGE_INIT.akaynt = function(){
    const profileArea = document.getElementById('profile-area');
    const list = document.getElementById('my-bookings');
    const logoutBtn = document.getElementById('logout-btn');

    const user = getCurrentUser();
    if(!user){
      profileArea.innerHTML = '<p>Вы не авторизованы. <a href="#/login">Войти</a> или <a href="#/register">Зарегистрироваться</a></p>';
      if(list) list.innerHTML = '';
      return;
    }

    profileArea.innerHTML = `<p>Вы вошли как <strong>${user.login}</strong> (${user.email})</p>`;

    // show user's bookings
    const all = loadBookingsLocal();
    const my = all.filter(b => (b.user === user.login) || (b.user === user.email));
    if(!my.length){
      list.innerHTML = '<p>У вас пока нет броней.</p>';
    } else {
      list.innerHTML = '';
      my.forEach(b=>{
        const div = document.createElement('div');
        div.className = 'booking-item';
        div.innerHTML = `<strong>Компьютер ${b.computer}</strong><div>Дата: ${b.date}</div><div>Время: ${b.time}</div>`;
        list.appendChild(div);
      });
    }

    // logout
    logoutBtn && logoutBtn.addEventListener('click', ()=>{
      localStorage.removeItem(USER_CURRENT_KEY);
      // re-render header and redirect to home
      if(window.AUTH && window.AUTH.setCurrentUser) window.AUTH.setCurrentUser(null);
      location.hash = '#/';
    });
  };
})();
