/* Register HTML templates used by the SPA. Save as js/templates.js */
window.TEMPLATES = (function(){
  return {
    home: `
      <div class="card">
        <h2>Компьютерный клуб "Новый Бит"</h2>
        <!-- TODO: при желании замените текст ниже на содержимое glav.html из репозитория -->
        <p>Добро пожаловать в компьютерный клуб «Новый Бит» — место для игр, учебы и встреч единомышленников. У нас современные компьютеры, удобное рабочее пространство и гибкие тарифы бронирования.</p>
        <p>Забронируйте компьютер на нужную дату и время, проверьте свои брони в личном кабинете, или посмотрите наше оборудование в разделе «Оборудование».</p>
      </div>
    `,

    broni: `
      <div class="card">
        <h2>Бронирование компьютера</h2>
        <div class="legend">
          <div><span class="legend-color legend-available"></span> Свободно</div>
          <div><span class="legend-color legend-booked"></span> Занято</div>
          <div><span class="legend-color legend-selected"></span> Выбрано</div>
        </div>
        <label for="broni-date">Дата</label>
        <input type="date" id="broni-date">
        <label for="broni-computer">Номер компьютера</label>
        <select id="broni-computer">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
        </select>
        <div id="broni-time-area" style="display:none">
          <label>Временные интервалы</label>
          <div class="time-slots" id="broni-times"></div>
        </div>
        <div id="broni-message"></div>
        <div class="total" id="broni-total">Общая стоимость: 0 руб.</div>
        <button id="broni-confirm" style="display:none">Забронировать</button>
      </div>
    `,

    analiz: `
      <div class="card">
        <h2>Отчёты</h2>
        <label for="rep-computer">Компьютер</label>
        <select id="rep-computer">
          <option value="all">Все</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
        </select>
        <label for="rep-start">Дата начала</label>
        <input type="date" id="rep-start">
        <label for="rep-end">Дата окончания</label>
        <input type="date" id="rep-end">
        <button id="rep-gen">Сформировать</button>
        <table class="report-table" id="rep-table">
          <thead><tr><th>Дата</th><th>Компьютер</th><th>Часы</th><th>Пользователь</th></tr></thead>
          <tbody></tbody>
          <tfoot><tr><td colspan="3">Итого брони</td><td id="rep-count">0</td></tr></tfoot>
        </table>
      </div>
    `,

    equioment: `
      <div class="card">
        <h2>Оборудование</h2>
        <p>Ниже — фотографии оборудования (1.jpg и 2.jpg из репозитория)</p>
        <div class="equipment-grid">
          <img src="img/1.jpg" alt="Оборудование 1">
          <img src="img/2.jpg" alt="Оборудование 2">
        </div>
      </div>
    `,

    /* Страница регистрации */
    register: `
      <div class="card form-card">
        <h2>Регистрация</h2>
        <div class="form-row">
          <label for="reg-email">Email</label>
          <input id="reg-email" type="email" placeholder="you@example.com">
        </div>
        <div class="form-row">
          <label for="reg-login">Логин</label>
          <input id="reg-login" type="text" placeholder="Логин">
        </div>
        <div class="form-row">
          <label for="reg-password">Пароль</label>
          <input id="reg-password" type="password" placeholder="Пароль">
        </div>
        <div id="reg-message"></div>
        <div class="form-actions">
          <button id="reg-submit">Зарегистрироваться</button>
        </div>
      </div>
    `,

    /* Страница входа */
    login: `
      <div class="card form-card">
        <h2>Вход</h2>
        <div class="form-row">
          <label for="login-login">Логин или Email</label>
          <input id="login-login" type="text" placeholder="Логин или Email">
        </div>
        <div class="form-row">
          <label for="login-password">Пароль</label>
          <input id="login-password" type="password" placeholder="Пароль">
        </div>
        <div id="login-message"></div>
        <div class="form-actions">
          <button id="login-submit">Войти</button>
        </div>
      </div>
    `,

    akaynt: `
      <div class="card">
        <h2>Мой профиль</h2>
        <div id="profile-area"></div>
        <div style="margin-top:12px">
          <button id="logout-btn" class="secondary">Выйти</button>
        </div>
        <h3 style="margin-top:18px">Мои брони</h3>
        <div id="my-bookings"></div>
      </div>
    `,

    oplata: `
      <div class="card">
        <h2>Оплата (заглушка)</h2>
        <p>Здесь будет интеграция с платёжной системой в будущем.</p>
      </div>
    `,

    reservation: `
      <div class="card">
        <h2>Резервации (пользователь)</h2>
        <p>Список резерваций (см. Мои брони).</p>
      </div>
    `,

    reservation_admin: `
      <div class="card">
        <h2>Резервации — админ</h2>
        <p>Админская панель — заглушка (можно показать все брони и редактировать).</p>
      </div>
    `,

    glav: `
      <div class="card">
        <h2>Главная (альтернативная)</h2>
        <p>Дополнительный вариант главной страницы.</p>
      </div>
    `,

    glav_reg: `
      <div class="card">
        <h2>Главная регистр</h2>
        <p>Заглушка.</p>
      </div>
    `
  };
})();

