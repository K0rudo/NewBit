/* js/register.js */
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};
  const USERS_KEY_LOCAL = 'nb_users_local'; // fallback storage

  function loadUsersLocal(){
    try { return JSON.parse(localStorage.getItem(USERS_KEY_LOCAL) || '[]'); }
    catch(e){ return []; }
  }
  function saveUsersLocal(arr){ localStorage.setItem(USERS_KEY_LOCAL, JSON.stringify(arr)); }

  // Проверка существования user по email или login (в массиве)
  function existsUser(arr, email, login){
    return arr.some(u => (u.email && u.email.toLowerCase() === (email||'').toLowerCase()) || (u.login && u.login.toLowerCase() === (login||'').toLowerCase()));
  }

  async function tryServerAdd(user){
    // пытаемся добавить через api, если доступен
    try {
      const res = await fetch('api/users.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'add', user })
      });
      if(!res.ok) throw new Error('server');
      const j = await res.json();
      return j.success === true;
    } catch(e){
      return false;
    }
  }

  window.PAGE_INIT.register = function(){
    const email = document.getElementById('reg-email');
    const login = document.getElementById('reg-login');
    const pass = document.getElementById('reg-password');
    const btn = document.getElementById('reg-submit');
    const msg = document.getElementById('reg-message');

    if(!btn) return;

    function show(t, cls='info'){ if(msg) msg.innerHTML = `<div class="message ${cls}">${t}</div>`; }

    btn.addEventListener('click', async ()=>{
      const e = email.value.trim();
      const l = login.value.trim();
      const p = pass.value;
      if(!e || !l || !p){ show('Заполните все поля', 'error'); return; }
      // basic email check
      if(!/^\S+@\S+\.\S+$/.test(e)){ show('Неверный email', 'error'); return; }
      // load local users and check
      let users = loadUsersLocal();
      if(existsUser(users, e, l)){ show('Пользователь с таким email или логином уже существует', 'error'); return; }

      // prepare user object (store password as plain for dev; in real — хешировать)
      const newUser = { id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), email: e, login: l, password: p };

      // try server first
      const serverOk = await tryServerAdd(newUser);
      if(serverOk){
        show('Регистрация успешна (сохранено на сервере)', 'success');
      } else {
        // fallback local
        users.push(newUser);
        saveUsersLocal(users);
        show('Регистрация успешна (сохранено локально)', 'success');
      }

      // после регистрации — выставляем текущего пользователя и редирект на главную
      window.AUTH.setCurrentUser({ id: newUser.id, email: newUser.email, login: newUser.login });
      setTimeout(()=> location.hash = '#/', 800);
    });
  };
})();
