/* Register HTML templates used by the SPA. Save as js/templates.js */
window.TEMPLATES = (function(){
  return {
home: `
  <div class="home-page">

    <!-- Приветственный баннер -->
    <section class="hero">
      <h1>Компьютерный клуб "Новый Бит"</h1>
      <p>Место, где технологии и комфорт встречаются для игр, работы и встреч единомышленников.</p>
    </section>

    <!-- Преимущества клуба -->
    <section class="advantages">
      <h2>Наши преимущества</h2>
      <div class="adv-cards">
        <div class="adv-card">
          <h3>Современные компьютеры</h3>
          <p>Высокопроизводительные ПК для игр и работы.</p>
        </div>
        <div class="adv-card">
          <h3>Просторные залы</h3>
          <p>Комфортное пространство для игр и работы в компании друзей.</p>
        </div>
        <div class="adv-card">
          <h3>Профессиональное обслуживание</h3>
          <p>Поддержка и помощь клиентам круглосуточно.</p>
        </div>
      </div>
    </section>

    <!-- Как забронировать -->
    <section class="how-to">
      <h2>Как забронировать</h2>
      <ol>
        <li>Выберите компьютер в разделе «Бронирование».</li>
        <li>Укажите дату и время.</li>
        <li>Подтвердите бронь и ждите подтверждение.</li>
      </ol>
    </section>

    <!-- Контакты -->
    <section class="contacts">
      <h2>Контакты</h2>
      <p>Адрес: ул. Грибоедова, 63</p>
      <p>Телефон: +7 (902) 178-53-77</p>
      <p>Email: vasakondra@mail.ru</p>
    </section>

  </div>
`,
    /* ===== broni template (заменить в js/templates.js) ===== */
broni: `
  <div class="card">
    <h2>Бронирование компьютера</h2>

    <div class="broni-tabs" role="tablist" aria-label="Бронирование и управление">
      <button class="broni-tab active" data-tab="tab-book">Бронь</button>
      <button class="broni-tab" data-tab="tab-manage">Управление бронями</button>
    </div>

    <div id="tab-book" class="broni-panel active">
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

    <div id="tab-manage" class="broni-panel" style="display:none;">
      <!-- Контент для worker: поиск + список броней -->
      <div id="worker-bookings-root"></div>
    </div>
  </div>
`,


    analiz: `
      <div class="card">
  <h2>Отчёты</h2>
  <label for="rep-type">Тип отчёта</label>
  <select id="rep-type">
    <option value="list">Список бронирований</option>
    <option value="income">Доходы по компьютерам</option>
    <option value="used">Самые используемые компьютеры</option>
    <option value="user">Бронирования по пользователям</option>
  </select>

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

  <!-- Таблица списка бронирований -->
  <table class="report-table" id="rep-table">
    <thead>
      <tr><th>Дата</th><th>Компьютер</th><th>Часы</th><th>Пользователь</th></tr>
    </thead>
    <tbody></tbody>
    <tfoot>
      <tr><td colspan="3">Итого брони</td><td id="rep-count">0</td></tr>
    </tfoot>
  </table>

  <!-- Таблица доходов по компьютерам -->
  <table class="report-table" id="rep-table-income" style="display:none;">
    <thead>
      <tr><th>Компьютер</th><th>Часы</th><th>Ставка</th><th>Доход</th></tr>
    </thead>
    <tbody></tbody>
    <tfoot>
      <tr><td colspan="3">Итого доход</td><td id="income-total">0</td></tr>
    </tfoot>
  </table>

  <!-- Таблица самых используемых компьютеров -->
  <table class="report-table" id="rep-table-used" style="display:none;">
    <thead>
      <tr><th>Компьютер</th><th>Часы</th></tr>
    </thead>
    <tbody></tbody>
    <tfoot>
      <tr><td>Всего часов</td><td id="used-total">0</td></tr>
    </tfoot>
  </table>

  <!-- Таблица бронирований по пользователям -->
  <table class="report-table" id="rep-table-user" style="display:none;">
    <thead>
      <tr><th>Пользователь</th><th>Бронирования</th></tr>
    </thead>
    <tbody></tbody>
    <tfoot>
      <tr><td>Итого бронирований</td><td id="user-total">0</td></tr>
    </tfoot>
  </table>
</div>
    `,

    equioment: `
  <div class="card">
    <h2>Оборудование</h2>

    <div class="computers-scroll-wrap">
      <div id="computers-scroll" class="computers-scroll" tabindex="0" aria-label="Список компьютеров"></div>
    </div>

    <div id="equip-controls" style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:12px">
      <div id="equip-add-area"></div> <!-- <-- сюда переместили кнопку "Добавить" -->
      <div id="equip-search-area" style="margin-left:auto"></div>
    </div>

    <div id="equip-details" style="margin-top:18px;"></div>
  </div>

  <!-- modal for edit/add -->
  <div id="equip-modal" class="modal-overlay" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="equip-modal-title">
      <h2 id="equip-modal-title">Компьютер</h2>
      <form id="equip-form" onsubmit="return false;">
        <label>Номер</label>
        <input id="equip-number" type="number" disabled>

        <!-- label скрыта: хранится, но не видна -->
        <input id="equip-label" type="hidden">

        <!-- выбор типа (видно при редактировании/добавлении персоналом) -->
        <label>Тип</label>
        <select id="equip-type">
          <option value="regular">Обычный</option>
          <option value="vip">VIP</option>
          <option value="broken">Ремонт</option>
        </select>

        <label>Процессор</label>
        <input id="equip-processor" type="text">

        <label>Видеокарта</label>
        <input id="equip-gpu" type="text">

        <label>ОЗУ</label>
        <input id="equip-ram" type="text">

        <label>Накопитель</label>
        <input id="equip-storage" type="text">

        <label>Монитор</label>
        <input id="equip-monitor" type="text">

        <label>Цена (руб/час)</label>
        <input id="equip-price" type="number" min="0">

        <label>Примечания</label>
        <textarea id="equip-notes" rows="4" style="width:100%"></textarea>

        <input type="hidden" id="equip-id">

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button type="button" id="equip-save" class="save-btn" style="display:none">Сохранить</button>
          <button type="button" id="equip-delete" class="close-btn" style="display:none">Удалить</button>
          <button type="button" id="equip-close" class="close-btn">Закрыть</button>
        </div>
      </form>
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

