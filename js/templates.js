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

    /* ===== broni template (заменить в js/templates.js) ===== */
broni: `
  <div class="card">
    <h2>Бронирование компьютера</h2>

    <p>Выберите компьютер в сетке ниже:</p>
    <div id="computers-grid" class="computers-grid" aria-live="polite"></div>

    <!-- Панель бронирования (фикс. размер, показывается после клика по компьютеру) -->
    <div id="booking-panel" class="card" style="margin-top:16px; display:none;">
      <h3 id="booking-title">Бронирование</h3>

      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <label for="booking-date">Дата</label>
          <input type="date" id="booking-date">
        </div>

        <div style="min-width:160px">
          <label>&nbsp;</label>
          <button id="equip-link" class="secondary">Посмотреть характеристики</button>
        </div>
      </div>

      <label style="margin-top:12px">Временные интервалы (прокрутите и выберите):</label>
      <div id="booking-times" class="time-slots scrollable-times" aria-live="polite"></div>

      <div id="booking-message" style="margin-top:8px"></div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
        <div>
          <div>Общая стоимость: <strong id="booking-total">0 руб.</strong></div>
          <div style="font-size:13px;color:#666">Обычный — 150 ₽/ч, VIP — 250 ₽/ч</div>
        </div>
        <div style="display:flex;gap:8px">
          <button id="booking-cancel" class="secondary">Отмена</button>
          <button id="booking-pay">Оплатить</button>
        </div>
      </div>
    </div>
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

    login: `
  <div class="card form-card">
    <!-- вкладки сверху -->
    <div class="auth-tabs-top" role="tablist" aria-label="Auth tabs">
      <button id="tab-login" class="auth-tab active" role="tab" aria-selected="true">Вход</button>
      <button id="tab-register" class="auth-tab" role="tab" aria-selected="false">Регистрация</button>
    </div>

    <!-- панель Вход -->
    <div id="login-panel" class="auth-panel">
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

    <!-- панель Регистрация -->
    <div id="register-panel" class="auth-panel" style="display:none">
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

