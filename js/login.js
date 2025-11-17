/* js/login.js */
(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};

  function $id(id){ return document.getElementById(id); }
  function showMsg(containerId, text, type='info'){
    const c = $id(containerId);
    if(!c) return;
    c.innerHTML = `<div class="message ${type}">${text}</div>`;
  }
  function clearMsg(containerId){ const c = $id(containerId); if(c) c.innerHTML = ''; }

  function showPanel(name){
    const loginPanel = $id('login-panel');
    const regPanel = $id('register-panel');
    const tabLogin = $id('tab-login');
    const tabReg = $id('tab-register');
    if(!loginPanel || !regPanel || !tabLogin || !tabReg) return;

    if(name === 'register'){
      loginPanel.style.display = 'none';
      regPanel.style.display = '';
      tabLogin.classList.remove('active');
      tabReg.classList.add('active');
      tabLogin.setAttribute('aria-selected','false');
      tabReg.setAttribute('aria-selected','true');
    } else {
      loginPanel.style.display = '';
      regPanel.style.display = 'none';
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
      tabLogin.setAttribute('aria-selected','true');
      tabReg.setAttribute('aria-selected','false');
    }
    clearMsg('login-message'); clearMsg('reg-message');
  }

  async function tryLoadServerUsers(){
    try{
      const r = await fetch('api/users.php');
      if(!r.ok) throw new Error('no');
      const j = await r.json();
      return j.users || [];
    }catch(e){
      return null;
    }
  }

  function loadLocalUsers(){
    try{ return JSON.parse(localStorage.getItem('nb_users_local') || '[]'); }catch(e){ return []; }
  }

  window.PAGE_INIT.login = function(){
    // вкладки
    const tabLogin = $id('tab-login');
    const tabReg = $id('tab-register');
    if(tabLogin) tabLogin.addEventListener('click', ()=> showPanel('login'));
    if(tabReg) tabReg.addEventListener('click', ()=> showPanel('register'));

    // по хэшу, если пришли на /register
    if(location.hash && location.hash.indexOf('register') !== -1) showPanel('register');
    else showPanel('login');

    // Вход
    const submit = $id('login-submit');
    if(submit){
      submit.addEventListener('click', async ()=>{
        clearMsg('login-message');
        const ident = ($id('login-login') && $id('login-login').value.trim()) || '';
        const pass = ($id('login-password') && $id('login-password').value) || '';
        if(!ident || !pass){ showMsg('login-message','Заполните все поля','error'); return; }

        // сначала пробуем серверных пользователей
        const serverUsers = await tryLoadServerUsers();
        if(serverUsers){
          const found = serverUsers.find(u => (u.login === ident || u.email === ident) && u.password === pass);
          if(found){
            // используем роль, если есть, иначе ставим 'user' по умолчанию
            const role = (found.role && String(found.role).trim()) ? String(found.role) : 'user';
            window.AUTH.setCurrentUser({ id: found.id, email: found.email, login: found.login, role: role });
            showMsg('login-message','Вход успешен','success');
            setTimeout(()=> location.hash = '#/', 400);
            return;
          }
        }

        // локально
        const locals = loadLocalUsers();
        const found = locals.find(u => (u.login === ident || u.email === ident) && u.password === pass);
        if(found){
          const role = (found.role && String(found.role).trim()) ? String(found.role) : 'user';
          window.AUTH.setCurrentUser({ id: found.id, email: found.email, login: found.login, role: role });
          showMsg('login-message','Вход успешен (локально)','success');
          setTimeout(()=> location.hash = '#/', 400);
          return;
        }

        showMsg('login-message','Неверный логин или пароль','error');
      });
    }

    // Регистрация — если есть PAGE_INIT.register (твой register.js), он навесит обработчик reg-submit.
    // Если нет — создаём fallback обработчик.
    if(window.PAGE_INIT && typeof window.PAGE_INIT.register === 'function'){
      try{ window.PAGE_INIT.register(); }catch(e){ console.error('register init failed', e); }
    } else {
      const regBtn = $id('reg-submit');
      if(regBtn){
        regBtn.addEventListener('click', ()=>{
          clearMsg('reg-message');
          const e = ($id('reg-email') && $id('reg-email').value.trim()) || '';
          const l = ($id('reg-login') && $id('reg-login').value.trim()) || '';
          const p = ($id('reg-password') && $id('reg-password').value) || '';

          if(!e || !l || !p){ showMsg('reg-message','Заполните все поля','error'); return; }
          if(!/^\S+@\S+\.\S+$/.test(e)){ showMsg('reg-message','Неверный email','error'); return; }

          let users = loadLocalUsers();
          if(users.some(u => (u.email && u.email.toLowerCase() === e.toLowerCase()) || (u.login && u.login.toLowerCase() === l.toLowerCase()))){
            showMsg('reg-message','Пользователь с таким email или логином уже существует','error'); return;
          }

          // Добавляем роль 'user' по умолчанию при регистрации
          const newUser = { id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2,8), email: e, login: l, password: p, role: 'user' };
          users.push(newUser);
          localStorage.setItem('nb_users_local', JSON.stringify(users));

          window.AUTH.setCurrentUser({ id: newUser.id, email: newUser.email, login: newUser.login, role: newUser.role });
          showMsg('reg-message','Регистрация успешна (локально)','success');
          setTimeout(()=> location.hash = '#/', 600);
        });
      }
    }
  };
})();
