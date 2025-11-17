(function(){
  window.PAGE_INIT = window.PAGE_INIT || {};

  // Функция для загрузки бронирований из localStorage (JSON)
  function loadLocal(){
    try {
      return JSON.parse(localStorage.getItem('nb_bookings') || '[]');
    } catch(e) {
      return [];
    }
  }

  window.PAGE_INIT.analiz = function(){
    // Получаем элементы
    const typeSelect   = document.getElementById('rep-type');
    const compSelect   = document.getElementById('rep-computer');
    const startInput   = document.getElementById('rep-start');
    const endInput     = document.getElementById('rep-end');
    const genBtn       = document.getElementById('rep-gen');
    const tableList    = document.getElementById('rep-table');        // Список бронирований
    const tableIncome  = document.getElementById('rep-table-income');
    const tableUsed    = document.getElementById('rep-table-used');
    const tableUser    = document.getElementById('rep-table-user');
    const repCount     = document.getElementById('rep-count');
    const incomeTotal  = document.getElementById('income-total');
    const usedTotal    = document.getElementById('used-total');
    const userTotal    = document.getElementById('user-total');

    if (!genBtn) return;

    genBtn.addEventListener('click', () => {
      const comp      = compSelect.value;
      const type      = typeSelect.value;
      const startDate = startInput.value;
      const endDate   = endInput.value;
      let allData     = loadLocal();

      // Фильтр по выбранному компьютеру
      if (comp && comp !== 'all') {
        allData = allData.filter(item => String(item.computer) === comp);
      }
      // Фильтр по дате
      if (startDate) {
        allData = allData.filter(item => item.date >= startDate);
      }
      if (endDate) {
        allData = allData.filter(item => item.date <= endDate);
      }

      // Скрываем все таблицы отчётов
      tableList.style.display   = 'none';
      tableIncome.style.display = 'none';
      tableUsed.style.display   = 'none';
      tableUser.style.display   = 'none';
      // Очищаем tbody всех таблиц
      document.querySelectorAll('.report-table tbody').forEach(tb => tb.innerHTML = '');

      // Обрабатываем по типу отчёта
      if (type === 'list') {
        // Таблица списка бронирований
        tableList.style.display = 'table';
        // Заполняем каждую запись
        allData.forEach(b => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${b.date}</td><td>${b.computer}</td><td>1</td><td>${b.user}</td>`;
          tableList.querySelector('tbody').appendChild(tr);
        });
        repCount.textContent = allData.length;
      }
      else if (type === 'income') {
        // Таблица доходов по компьютерам
        tableIncome.style.display = 'table';
        // Суммируем часы брони по компьютерам
        const hoursByComp = {};
        allData.forEach(b => {
          hoursByComp[b.computer] = (hoursByComp[b.computer] || 0) + 1;
        });
        // Задаём почасовую ставку (примерно)
        const RATE = 100; // например, 100 руб./час
        let totalIncome = 0;
        Object.keys(hoursByComp).forEach(compId => {
          const hours  = hoursByComp[compId];
          const income = hours * RATE;
          totalIncome += income;
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${compId}</td><td>${hours}</td><td>${RATE}</td><td>${income}</td>`;
          tableIncome.querySelector('tbody').appendChild(tr);
        });
        incomeTotal.textContent = totalIncome;
      }
      else if (type === 'used') {
        // Таблица самых используемых компьютеров
        tableUsed.style.display = 'table';
        // Суммируем часы брони по компьютерам
        const hoursByComp = {};
        allData.forEach(b => {
          hoursByComp[b.computer] = (hoursByComp[b.computer] || 0) + 1;
        });
        // Сортируем компьютеры по убыванию часов использования
        const usage = Object.keys(hoursByComp).map(compId => ({
          comp: compId,
          hours: hoursByComp[compId]
        })).sort((a, b) => b.hours - a.hours);
        let totalHours = 0;
        usage.forEach(u => {
          totalHours += u.hours;
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${u.comp}</td><td>${u.hours}</td>`;
          tableUsed.querySelector('tbody').appendChild(tr);
        });
        usedTotal.textContent = totalHours;
      }
      else if (type === 'user') {
        // Таблица бронирований по пользователям
        tableUser.style.display = 'table';
        // Считаем брони по пользователям
        const bookingsByUser = {};
        allData.forEach(b => {
          bookingsByUser[b.user] = (bookingsByUser[b.user] || 0) + 1;
        });
        let totalBookings = 0;
        Object.keys(bookingsByUser).forEach(user => {
          totalBookings += bookingsByUser[user];
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${user}</td><td>${bookingsByUser[user]}</td>`;
          tableUser.querySelector('tbody').appendChild(tr);
        });
        userTotal.textContent = totalBookings;
      }
    });
  };
})();
