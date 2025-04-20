// API URL для прокси
// const API_BASE_URL = '';
let userId = null;
let userOrders = [];

// Инициализация приложения
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    try {
        // Проверяем, есть ли сохраненный userId в localStorage
        const savedUserId = localStorage.getItem('userId');
        console.log('Saved userId:', savedUserId);

        if (savedUserId) {
            // Если ID есть - запрашиваем данные
            userId = parseInt(savedUserId);
            console.log('User ID set:', userId);
            fetchUserBalance();
            fetchUserOrders();
        } else {
            // Иначе показываем форму входа
            showAuthForm();
        }

        // Инициализируем TradingView график
        console.log('Initializing TradingView chart');
        initializeTradingViewChart();

        // Запускаем обновление цены
        console.log('Starting price update');
        updatePrice();
    } catch (error) {
        console.error('Error during initialization:', error);
        alert('Ошибка инициализации приложения: ' + error.message);
    }
});

// Функция для инициализации TradingView графика
function initializeTradingViewChart() {
    try {
        new TradingView.widget({
            "container_id": "tradingview_chart",
            "width": "100%",
            "height": 500,
            "symbol": "BINANCE:BTCUSDT",
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "light",
            "style": "1",
            "locale": "ru",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "allow_symbol_change": true,
            "details": true,
            "hotlist": true,
            "calendar": true,
            "studies": [
                "MASimple@tv-basicstudies"
            ]
        });
        console.log('TradingView chart initialized');
    } catch (error) {
        console.error('Error initializing TradingView:', error);
    }
}

// Функция для показа формы входа/регистрации
function showAuthForm(mode = 'login') {
    console.log('Showing auth form in mode:', mode);
    try {
        // Удаляем уже существующую форму, если такая есть
        const existingForm = document.querySelector('.login-form');
        if (existingForm) {
            existingForm.remove();
        }

        if (!document.body) {
            throw new Error('document.body is not available');
        }

        const form = document.createElement('div');
        form.className = 'login-form';

        const title = mode === 'login' ? 'Вход в систему' : 'Регистрация нового аккаунта';
        const buttonText = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
        const toggleText = mode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите';
        const buttonId = mode === 'login' ? 'login-button' : 'register-button';
        const toggleMode = mode === 'login' ? 'register' : 'login';

        form.innerHTML = `
            <div class="login-overlay"></div>
            <div class="login-container">
                <h2>${title}</h2>
                <div class="form-group">
                    <label for="auth-email">Email</label>
                    <input type="email" id="auth-email" placeholder="Введите email" required>
                </div>
                <div class="form-group">
                    <label for="auth-password">Пароль</label>
                    <input type="password" id="auth-password" placeholder="Введите пароль" required>
                </div>
                <button class="btn btn-buy" id="${buttonId}">${buttonText}</button>
                <p class="auth-toggle" id="auth-toggle">${toggleText}</p>
            </div>
        `;
        document.body.appendChild(form);

        // Добавляем обработчик события на кнопку входа/регистрации
        if (mode === 'login') {
            document.getElementById('login-button').addEventListener('click', loginUser);
        } else {
            document.getElementById('register-button').addEventListener('click', registerUser);
        }

        // Обработчик переключения режима формы
        document.getElementById('auth-toggle').addEventListener('click', function() {
            showAuthForm(toggleMode);
        });

        // Добавляем обработчик события нажатия Enter в полях формы
        document.getElementById('auth-email').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                mode === 'login' ? loginUser() : registerUser();
            }
        });
        document.getElementById('auth-password').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                mode === 'login' ? loginUser() : registerUser();
            }
        });

        // Установка фокуса на поле email
        document.getElementById('auth-email').focus();

        console.log('Auth form appended to body');

        // Блокировка прокрутки основного контента
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error showing auth form:', error);
        alert('Ошибка отображения формы: ' + error.message);
    }
}

// Функция для регистрации пользователя
async function registerUser() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    console.log('Sending register request to:', `user/api/user/register`);

    try {
        const response = await fetch(`user/api/user/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 409) {
                // Если пользователь уже существует, предлагаем авторизоваться
                alert('Пользователь с таким email уже существует. Пожалуйста, войдите в систему.');
                showAuthForm('login');
                return;
            }
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        userId = data.id || data.userId;
        localStorage.setItem('userId', userId);

        hideAuthForm();
        fetchUserBalance();
        fetchUserOrders();
        alert('Регистрация успешна! Вы автоматически вошли в систему.');
    } catch (error) {
        console.error('Error during registration:', error);
        if (error.message.includes('Failed to fetch')) {
            alert('Ошибка соединения с сервером. Убедитесь, что сервер работает на http://localhost:8080.');
        } else {
            alert('Произошла ошибка при регистрации: ' + error.message);
        }
    }
}

// Функция для входа пользователя
async function loginUser() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    console.log('Sending login request to:', `user/api/user/login`);

    try {
        const response = await fetch(`user/api/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('Неверный email или пароль. Пожалуйста, попробуйте еще раз.');
                return;
            }
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        userId = data.id || data.userId;
        localStorage.setItem('userId', userId);

        hideAuthForm();
        fetchUserBalance();
        fetchUserOrders();
        alert('Вход выполнен успешно!');
    } catch (error) {
        console.error('Error during login:', error);
        if (error.message.includes('Failed to fetch')) {
            alert('Ошибка соединения с сервером. Убедитесь, что сервер работает на http://localhost:8080.');
        } else {
            alert('Произошла ошибка при входе: ' + error.message);
        }
    }
}

// Скрыть форму авторизации
function hideAuthForm() {
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.remove();
        // Возвращаем возможность прокрутки основного контента
        document.body.style.overflow = '';
    }
}

// Функция выхода из аккаунта
function logout() {
    localStorage.removeItem('userId');
    userId = null;
    userOrders = [];
    document.getElementById('userBalance').textContent = '0.00';

    // Очистка истории ордеров
    const historyTable = document.getElementById('ordersHistory').getElementsByTagName('tbody')[0];
    historyTable.innerHTML = '<tr><td colspan="6" class="no-orders">У вас пока нет сделок. Совершите первую сделку!</td></tr>';

    // Показать форму входа
    showAuthForm('login');
}

// Функция для получения баланса пользователя
function getBalance(userId) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://localhost:8080/user/api/user/balance', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            console.log('Баланс:', data.balance);
        } else {
            console.error('Ошибка:', xhr.status);
        }
    };
    xhr.send(JSON.stringify({ id: userId }));
}

getBalance(1);

// Функция для получения списка ордеров пользователя
async function fetchUserOrders() {
    if (!userId) return;

    try {
        const response = await fetch(`trade/api/trade/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: userId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        userOrders = data.orders || [];
        updateOrdersHistory();
    } catch (error) {
        console.error('Ошибка получения ордеров:', error);
        if (error.message.includes('Failed to fetch')) {
            // Если сервер недоступен, показываем форму входа
            localStorage.removeItem('userId');
            userId = null;
            showAuthForm('login');
        } else {
            alert('Произошла ошибка при получении списка ордеров: ' + error.message);
        }
    }
}

// Функция добавления средств на счет (для тестирования)
async function addFunds() {
    if (!userId) {
        alert('Пожалуйста, войдите в систему');
        return;
    }

    const amount = prompt('Введите сумму для пополнения (USD):', '100');
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        alert('Пожалуйста, введите корректную сумму');
        return;
    }

    try {
        const response = await fetch(`user/api/user/balance/increase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: userId,
                amount: parseFloat(amount)
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        document.getElementById('userBalance').textContent = data.balance.toFixed(2);
        alert(`Счет успешно пополнен на $${amount}`);
    } catch (error) {
        console.error('Ошибка пополнения счета:', error);
        alert('Произошла ошибка при пополнении счета: ' + error.message);
    }
}

// Обновление истории ордеров на странице
function updateOrdersHistory() {
    try {
        const historyTable = document.getElementById('ordersHistory').getElementsByTagName('tbody')[0];
        historyTable.innerHTML = '';

        if (userOrders.length === 0) {
            const row = historyTable.insertRow(0);
            const cell = row.insertCell(0);
            cell.colSpan = 6;
            cell.className = 'no-orders';
            cell.textContent = 'У вас пока нет сделок. Совершите первую сделку!';
            return;
        }

        userOrders.forEach(order => {
            const newRow = historyTable.insertRow(0);
            const dateCell = newRow.insertCell(0);
            const typeCell = newRow.insertCell(1);
            const priceCell = newRow.insertCell(2);
            const amountCell = newRow.insertCell(3);
            const leverageCell = newRow.insertCell(4);
            const statusCell = newRow.insertCell(5);

            const orderDate = new Date(order.createdAt);
            dateCell.textContent = orderDate.toLocaleDateString('ru-RU') + ' ' + orderDate.toLocaleTimeString('ru-RU');
            typeCell.textContent = order.orderType === 'BUY' || order.orderType === 'long' ? 'Покупка' : 'Продажа';
            typeCell.className = order.orderType === 'BUY' || order.orderType === 'long' ? 'buy-order' : 'sell-order';
            priceCell.textContent = '$' + (order.price ? order.price.toFixed(2) : '0.00');
            amountCell.textContent = '$' + order.margin.toFixed(2);
            leverageCell.textContent = order.leverage + 'x';
            statusCell.textContent = order.active ? 'Активен' : 'Закрыт';

            if (order.active) {
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Закрыть';
                closeButton.className = 'btn-close-order';
                closeButton.onclick = function() {
                    closeOrder(order.orderId, order.ticker);
                };
                statusCell.appendChild(closeButton);
            }
        });
    } catch (error) {
        console.error('Error updating orders history:', error);
    }
}

// Функция для закрытия ордера
async function closeOrder(orderId, ticker) {
    if (!userId) return;

    try {
        const response = await fetch(`trade/api/trade/close`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: orderId,
                ticker: ticker
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        fetchUserOrders();
        getBalance();
        alert('Ордер успешно закрыт!');
    } catch (error) {
        console.error('Ошибка закрытия ордера:', error);
        alert('Произошла ошибка при закрытии ордера: ' + error.message);
    }
}

// Обновление цены каждые несколько секунд
function updatePrice() {
    try {
        const currentPrice = parseFloat(document.getElementById('btcPrice').textContent);
        const change = (Math.random() - 0.48) * 100;
        const newPrice = currentPrice + change;

        document.getElementById('btcPrice').textContent = newPrice.toFixed(2);

        const changePercent = (change / currentPrice * 100).toFixed(2);
        const changeElement = document.getElementById('priceChange');

        if (change >= 0) {
            changeElement.textContent = `+${changePercent}%`;
            changeElement.classList.remove('negative');
        } else {
            changeElement.textContent = `${changePercent}%`;
            changeElement.classList.add('negative');
        }

        setTimeout(updatePrice, 3000 + Math.random() * 5000);
    } catch (error) {
        console.error('Error updating price:', error);
    }
}

// Функция для изменения временного диапазона
function changeTimeframe(timeframe) {
    try {
        document.querySelectorAll('.time-filter').forEach(el => {
            el.classList.remove('active');
        });
        event.target.classList.add('active');
    } catch (error) {
        console.error('Error changing timeframe:', error);
    }
}

// Функция для размещения ордера на покупку
async function placeBuyOrder() {
    if (!userId) {
        alert('Пожалуйста, войдите или зарегистрируйтесь');
        showAuthForm('login');
        return;
    }

    const amount = document.getElementById('buy-amount').value;
    const leverage = document.getElementById('buy-leverage').value;

    if (!amount || amount <= 0) {
        alert('Пожалуйста, введите корректную сумму');
        return;
    }

    try {
        const currentPrice = parseFloat(document.getElementById('btcPrice').textContent);

        const response = await fetch(`trade/api/trade/open`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                ticker: 'BTC',
                orderType: 'BUY',
                margin: parseFloat(amount),
                leverage: parseInt(leverage)
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert(`Ордер на покупку успешно создан: $${amount} с плечом ${leverage}x`);
        document.getElementById('buy-amount').value = '';
        fetchUserOrders();
        getBalance();
    } catch (error) {
        console.error('Ошибка размещения ордера:', error);
        if (error.message.includes("insufficient funds")) {
            alert('Недостаточно средств на счете. Пожалуйста, пополните баланс.');
        } else {
            alert('Произошла ошибка при размещении ордера: ' + error.message);
        }
    }
}

// Функция для размещения ордера на продажу
async function placeSellOrder() {
    if (!userId) {
        alert('Пожалуйста, войдите или зарегистрируйтесь');
        showAuthForm('login');
        return;
    }

    const amount = document.getElementById('sell-amount').value;
    const leverage = document.getElementById('sell-leverage').value;

    if (!amount || amount <= 0) {
        alert('Пожалуйста, введите корректную сумму');
        return;
    }

    try {
        const response = await fetch(`trade/api/trade/open`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                ticker: 'BTC',
                orderType: 'SELL',
                margin: parseFloat(amount),
                leverage: parseInt(leverage)
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
        }

        alert(`Ордер на продажу успешно создан: $${amount} с плечом ${leverage}x`);
        document.getElementById('sell-amount').value = '';
        fetchUserOrders();
        fetchUserBalance();
    } catch (error) {
        console.error('Ошибка размещения ордера:', error);
        if (error.message.includes("insufficient funds")) {
            alert('Недостаточно средств на счете. Пожалуйста, пополните баланс.');
        } else {
            alert('Произошла ошибка при размещении ордера: ' + error.message);
        }
    }
}