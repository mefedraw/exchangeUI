// App State
const state = {
    userId: null,
    userEmail: null,
    balance: 0,
    orders: [],
    ticker: 'BTC/USDT',
    amount: '',
    leverage: 1,
    chart: 'BTC/USDT',
    isRegistering: false,
    loading: false
};

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authSubmit = document.getElementById('auth-submit');
const errorMessage = document.getElementById('error-message');
const userEmailDisplay = document.getElementById('user-email');
const balanceDisplay = document.getElementById('balance-display');
const logoutBtn = document.getElementById('logout-btn');
const tickerSelect = document.getElementById('ticker-select');
const amountInput = document.getElementById('amount-input');
const leverageSelect = document.getElementById('leverage-select');
const buyBtn = document.getElementById('buy-btn');
const sellBtn = document.getElementById('sell-btn');
const positionSize = document.getElementById('position-size');
const ordersTable = document.getElementById('orders-table');
const depositBtn = document.getElementById('deposit-btn');
const depositModal = document.getElementById('deposit-modal');
const depositAmount = document.getElementById('deposit-amount');
const depositCancel = document.getElementById('deposit-cancel');
const depositConfirm = document.getElementById('deposit-confirm');

// Initialize app
async function init() {
    const savedId = localStorage.getItem('userId');
    const savedEmail = localStorage.getItem('userEmail');

    if (savedId && savedEmail) {
        state.userId = savedId;
        state.userEmail = savedEmail;

        // Сначала показываем приложение
        showMainApp();

        userEmailDisplay.textContent = state.userEmail;

        // Потом загружаем данные
        await fetchBalance(savedId);
        await fetchOrders(savedId);

        // initChart() уже вызывается в showMainApp()
    } else {
        showAuthScreen();
    }

    setupEventListeners();
}


// Event Listeners
function setupEventListeners() {
    // Auth tabs
    loginTab.addEventListener('click', () => {
        state.isRegistering = false;
        updateAuthTabs();
    });

    registerTab.addEventListener('click', () => {
        state.isRegistering = true;
        updateAuthTabs();
    });

    // Auth form
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.isRegistering ? handleRegister() : handleLogin();
    });

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Trading
    tickerSelect.addEventListener('change', (e) => {
        state.ticker = e.target.value;
        if (window.updateTradingViewSymbol) {
            window.updateTradingViewSymbol(state.ticker.replace('/', ''));
        } else {
            initChart();
        }
        fetchOrders(parseInt(state.userId));
    });


    amountInput.addEventListener('input', (e) => {
        state.amount = e.target.value;
        updatePositionSize();
    });

    leverageSelect.addEventListener('change', (e) => {
        state.leverage = e.target.value;
        updatePositionSize();
    });

    buyBtn.addEventListener('click', () => openOrder('long'));
    sellBtn.addEventListener('click', () => openOrder('short'));

    // Deposit
    depositBtn.addEventListener('click', () => {
        depositModal.classList.remove('hidden');
    });

    depositCancel.addEventListener('click', () => {
        depositModal.classList.add('hidden');
        depositAmount.value = '';
    });

    depositConfirm.addEventListener('click', handleDeposit);
}

// UI Updates
function updateAuthTabs() {
    if (state.isRegistering) {
        loginTab.classList.remove('border-orange-500', 'text-orange-500');
        loginTab.classList.add('text-gray-400');
        registerTab.classList.add('border-orange-500', 'text-orange-500');
        registerTab.classList.remove('text-gray-400');
        authSubmit.textContent = 'Создать аккаунт';
    } else {
        registerTab.classList.remove('border-orange-500', 'text-orange-500');
        registerTab.classList.add('text-gray-400');
        loginTab.classList.add('border-orange-500', 'text-orange-500');
        loginTab.classList.remove('text-gray-400');
        authSubmit.textContent = 'Войти';
    }
}

function showMainApp() {
    // Сначала скрываем экран авторизации
    authScreen.style.display = 'none';

    // Задаем пользовательские данные
    userEmailDisplay.textContent = state.userEmail;

    // Затем показываем основное приложение
    mainApp.style.display = 'block';

    // Инициализируем график с большей задержкой
    setTimeout(() => {
        initChart();
    }, 150);
}

function showAuthScreen() {
    mainApp.style.display = 'none';
    authScreen.style.display = 'flex';
}

function updatePositionSize() {
    const amount = parseFloat(state.amount) || 0;
    const leverage = parseFloat(state.leverage) || 1;
    positionSize.textContent = '$' + (amount * leverage).toFixed(2);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function updateOrdersTable() {
    if (!ordersTable) {
        console.error('Orders table element not found');
        return;
    }

    if (state.orders.length === 0) {
        ordersTable.innerHTML = `
        <tr>
            <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                Нет открытых сделок по выбранной паре
            </td>
        </tr>`;
        return;
    }

    ordersTable.innerHTML = state.orders.map(order => {
        const date = new Date(order.CreatedAt).toLocaleString('ru-RU');
        const typeLabel = order.Type === 'long'
            ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">long</span>`
            : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">short</span>`;
        const margin = `$${parseFloat(order.Margin).toFixed(2)}`;
        const leverage = `${order.Leverage}x`;
        const entryPrice = `$${parseFloat(order.EntryPrice).toFixed(2)}`;
        const ticker = `${order.Ticker}`;
        const orderIdGuid = order.Id; // "123e4567-e89b-12d3-a456-426614174000"
        const orderId = orderIdGuid.split('-')[0]; // "123e4567"
        const statusLabel = order.Status === 'open'
            ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Активен</span>`
            : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Закрыт</span>`;
        const actionBtn = order.Status === 'open'
            ? `<button onclick="closeOrder('${order.Id}')" class="text-orange-600 hover:text-orange-800 transition">Закрыть</button>`
            : '';

        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${date}</td>
            <td class="px-6 py-4 whitespace-nowrap">${orderId}</td>
            <td class="px-6 py-4 whitespace-nowrap">${ticker}</td>
            <td class="px-6 py-4 whitespace-nowrap">${typeLabel}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${margin}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${leverage}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${entryPrice}</td>
            <td class="px-6 py-4 whitespace-nowrap">${statusLabel}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">${actionBtn}</td>
        </tr>`;
    }).join('');
}



// Chart Initialization
function initChart() {
    const chartContainer = document.getElementById('chart');

    if (!chartContainer) {
        console.error('Chart container not found');
        return;
    }

    // Очищаем контейнер
    chartContainer.innerHTML = '';

    // Создаём HTML разметку для виджета TradingView
    chartContainer.innerHTML = `
        <div class="tradingview-widget-container" style="height:100%;width:100%">
          <div id="tradingview_widget" class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
          <div class="tradingview-widget-copyright"><a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a></div>
        </div>
    `;

    // Создаём скрипт для загрузки виджета
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

    // Конфигурация виджета
    const config = {
        "autosize": true,
        "symbol": `BINANCE:${state.ticker.replace('/', '')}`,
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "ru",
        "gridColor": "rgba(0, 0, 0, 0.06)",
        "hide_top_toolbar": false,
        "hide_legend": true,
        "allow_symbol_change": false,
        "save_image": false,
        "hide_volume": true,
        "support_host": "https://www.tradingview.com"
    };

    // Добавляем конфигурацию в скрипт
    script.text = JSON.stringify(config);

    // Функция для обновления символа при изменении тикера
    window.updateTradingViewSymbol = function(newSymbol) {
        // Удаляем старый виджет
        chartContainer.innerHTML = '';

        // Пересоздаем виджет с новым символом
        initChart();
    };

    // Добавляем скрипт на страницу
    const widgetContainer = document.getElementById('tradingview_widget');
    if (widgetContainer) {
        widgetContainer.appendChild(script);
    }
}

tickerSelect.addEventListener('change', (e) => {
    state.ticker = e.target.value;
    if (window.updateTradingViewSymbol) {
        window.updateTradingViewSymbol(state.ticker.replace('/', ''));
    } else {
        initChart();
    }
    fetchOrders(parseInt(state.userId));
});

// API Functions
async function handleLogin() {
    state.loading = true;
    hideError();

    try {
        const res = await fetch('http://localhost:8080/user/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailInput.value,
                password: passwordInput.value
            })
        });

        const data = await res.json();

        if (res.status === 200) {
            state.userId = data.id;
            state.userEmail = data.email;
            localStorage.setItem('userId', data.id);
            localStorage.setItem('userEmail', data.email);
            showMainApp();

            await fetchBalance(data.id);
            await fetchOrders(data.id);

        } else {
            showError(data.error || 'Ошибка авторизации');
        }
    } catch (err) {
        showError('Ошибка сервера. Попробуйте позже.');
    } finally {
        state.loading = false;
    }
}


async function handleRegister() {
    state.loading = true;
    hideError();

    try {
        const res = await fetch('http://localhost:8080/user/api/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailInput.value,
                password: passwordInput.value
            })
        });

        const data = await res.json();

        if (res.status === 201) {
            state.userId = data.id;
            state.userEmail = emailInput.value;
            localStorage.setItem('userId', data.id);
            localStorage.setItem('userEmail', emailInput.value);
            showMainApp();

            await fetchBalance(data.id);
            await fetchOrders(data.id);
        } else {
            showError(data.error || 'Ошибка регистрации');
        }
    } catch (err) {
        showError('Ошибка сервера. Попробуйте позже.');
    } finally {
        state.loading = false;
    }
}

function handleLogout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    state.userId = null;
    state.userEmail = null;
    state.balance = 0;
    state.orders = [];
    showAuthScreen();
}

async function fetchBalance(id) {
    if (!id) {
        console.error('No user ID provided for balance fetch');
        return;
    }

    try {
        const res = await fetch('http://localhost:8080/user/api/user/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: parseInt(id) })
        });

        console.log(res.ok, res.body)
        const data = await res.json();
        console.log("Balance data:", data);

        if (data && data.balance !== undefined) {
            state.balance = parseFloat(data.balance);

            if (balanceDisplay) {
                balanceDisplay.textContent = '$' + state.balance.toFixed(2);
            }
        } else {
            console.error('Invalid balance data received');
        }
    } catch (err) {
        console.error('Error fetching balance:', err);
    }
}


async function fetchOrders(id) {
    if (!id) {
        console.error('No user ID provided for orders fetch');
        return;
    }

    try {
        const res = await fetch('http://localhost:8080/trade/api/trade/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: +id })
        });

        const { orders } = await res.json();
        console.log('Orders from server:', orders);
        if (Array.isArray(orders)) {
            // оставляем только открытые
            state.orders = orders.filter(o => o.Status === 'open');
            updateOrdersTable();
        }
        else {
            console.error('Invalid orders data received');
        }
    } catch (err) {
        console.error('Error fetching orders:', err);
    }
}

async function openOrder(type) {
    if (!state.amount || parseFloat(state.amount) <= 0) {
        alert('Введите корректную сумму');
        return;
    }

    state.loading = true;
    buyBtn.disabled = sellBtn.disabled = true; // блокируем кнопки сразу при нажатии

    try {
        await fetch('http://localhost:8080/trade/api/trade/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: parseInt(state.userId),
                ticker: state.ticker,
                order_type: type,
                margin: parseFloat(state.amount),
                leverage: +state.leverage
            })
        });

        amountInput.value = '';
        state.amount = '';
        updatePositionSize();
        await fetchBalance(parseInt(state.userId));
        await fetchOrders(parseInt(state.userId));
    } catch (err) {
        console.error('Error opening order:', err);
    } finally {
        state.loading = false;
        buyBtn.disabled = sellBtn.disabled = false; // ← обязательно разблокируем кнопки
    }
}


async function closeOrder(orderId) {
    state.loading = true;
    try {
        await fetch('http://localhost:8080/trade/api/trade/close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderId,
                ticker: state.ticker
            })
        });

        await fetchBalance(parseInt(state.userId));
        await fetchBalance(parseInt(state.userId));
        await fetchOrders(parseInt(state.userId));
    } catch (err) {
        console.error('Error closing order:', err);
    } finally {
        state.loading = false;
    }
}

async function handleDeposit() {
    const amount = depositAmount.value;
    if (!amount || parseFloat(amount) <= 0) {
        alert('Введите корректную сумму');
        return;
    }

    state.loading = true;
    try {
        await fetch('http://localhost:8080/user/api/user/balance/increase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: parseInt(state.userId),
                amount: parseFloat(amount)
            })
        });

        depositAmount.value = '';
        depositModal.classList.add('hidden');
        await fetchBalance(parseInt(state.userId));
    } catch (err) {
        console.error('Error depositing funds:', err);
    } finally {
        state.loading = false;
    }
}

// Make closeOrder available globally for event handlers
window.closeOrder = closeOrder;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    init();
});