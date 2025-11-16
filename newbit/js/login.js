/* js/login.js */
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};
  const USERS_KEY_LOCAL = 'nb_users_local';

  function loadUsersLocal(){
    try { return JSON.parse(localStorage.getItem(USERS_KEY_LOCAL) || '[]'); }
    catch(e){ return []; }
  }

  async function loadUsersServer(){
    try {
      const res = await fetch('api/users.php');
      if(!res.ok) throw new Error('no');
      const j = await res.json();
      return j.users || [];
    } catch(e){
      return null;
    }
  }

  window.PAGE_INIT.login = function(){
    const loginInput = document.getElementById('login-login');
    const passInput = document.getElementById('login-password');
    const submit = document.getElementById('login-submit');
    const msg = document.getElementById('login-message');

    if(!submit) return;

    function show(t, cls='info'){ if(msg) msg.innerHTML = `<div class="message ${cls}">${t}</div>`; }

    submit.addEventListener('click', async ()=>{
      const ident = loginInput.value.trim();
      const pass = passInput.value;
      if(!ident || !pass){ show('Заполните все поля', 'error'); return; }

      // Try server first
      const serverUsers = await loadUsersServer();
      if(serverUsers){
        const found = serverUsers.find(u => (u.login === ident || u.email === ident) && u.password === pass);
        if(found){
          window.AUTH.setCurrentUser({ id: found.id, email: found.email, login: found.login });
          show('Вход успешен', 'success');
          setTimeout(()=> location.hash = '#/', 500);
          return;
        }
      }

      // fallback local
      const local = loadUsersLocal();
      const found = local.find(u => (u.login === ident || u.email === ident) && u.password === pass);
      if(found){
        window.AUTH.setCurrentUser({ id: found.id, email: found.email, login: found.login });
        show('Вход успешен (локально)', 'success');
        setTimeout(()=> location.hash = '#/', 500);
        return;
      }

      show('Неверный логин или пароль', 'error');
    });
  };
})();
