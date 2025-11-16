/* js/main.js */
(function(){
  const USER_KEY = 'nb_user_current'; // хранит объект текущего пользователя (json string)

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
    const ua = document.getElementById('user-area');
    if(!ua) return;
    const link = document.getElementById('user-link');
    const user = getCurrentUser();
    if(user){
      // показываем имя и делаем ссылку на профиль
      link.textContent = user.login;
      link.setAttribute('href', '#/akaynt');
      link.classList.add('user-link');
    } else {
      link.textContent = 'Войти';
      link.setAttribute('href', '#/login');
      link.classList.add('user-link');
    }
  }

  // публичные функции для других модулей
  window.AUTH = {
    getCurrentUser,
    setCurrentUser
  };

  window.addEventListener('load', ()=>{ renderUserArea(); });
})();
