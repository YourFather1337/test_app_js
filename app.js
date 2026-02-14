const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require('./database');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Упрощенная "сессия" через куки (специально уязвимая)
app.use((req, res, next) => {
    if (req.cookies.username) {
        req.user = req.cookies.username;
    }
    next();
});

app.get('/', (req, res) => {
    res.send(`
        <h1>🛒 Магазин "Узбек Node.js"</h1>
        <p>Текущий пользователь: ${req.user || 'гость'}</p>
        <ul>
            <li><a href="/products">📦 Товары</a></li>
            <li><a href="/search">🔍 Поиск</a></li>
            <li><a href="/login">🔑 Вход</a></li>
            <li><a href="/profile">👤 Профиль</a></li>
            <li><a href="/comments">💬 Комментарии (XSS демо)</a></li>
        </ul>
    `);
});

// ============= ЗАДАНИЕ 1: SQL-инъекция в поиске =============
app.get('/search', (req, res) => {
    let searchTerm = req.query.q || '';

    let query = `SELECT * FROM products WHERE name LIKE '%${searchTerm}%' OR description LIKE '%${searchTerm}%'`;
    console.log("Выполняется запрос:", query);
    
    db.all(query, (err, rows) => {
        if (err) {
            res.send(`<h2>Ошибка SQL:</h2><pre>${err.message}</pre>`);
            return;
        }
        
        let html = `
            <h1>Поиск товаров</h1>
            <form method="GET">
                <input type="text" name="q" value="${searchTerm}" placeholder="Введите запрос">
                <button type="submit">Найти</button>
            </form>
            <hr>
        `;
        
        if (rows && rows.length > 0) {
            html += '<h3>Результаты:</h3><ul>';
            rows.forEach(p => {
                html += `<li><b>${p.name}</b> - ${p.price} руб.<br>${p.description}</li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>Ничего не найдено</p>';
        }
        
        res.send(html);
    });
});

// ============= ЗАДАНИЕ 2: XSS в комментариях =============
app.get('/comments', (req, res) => {
    db.all("SELECT * FROM comments ORDER BY id DESC", (err, comments) => {
        let html = `
            <h1>💬 Гостевые комментарии</h1>
            <form method="POST" action="/comment">
                <input type="text" name="username" placeholder="Ваше имя"><br>
                <textarea name="comment" placeholder="Комментарий"></textarea><br>
                <button type="submit">Отправить</button>
            </form>
            <hr>
            <h3>Комментарии:</h3>
        `;
        
        comments.forEach(c => {
            html += `
                <div style="border:1px solid #ccc; margin:5px; padding:5px;">
                    <b>${c.username}</b>: ${c.comment}
                </div>
            `;
        });
        
        res.send(html);
    });
});

app.post('/comment', (req, res) => {
    let { username, comment } = req.body;
    username = username || 'Аноним';
    db.run(
        `INSERT INTO comments (product_id, username, comment) VALUES (1, '${username}', '${comment}')`,
        (err) => {
            if (err) console.log(err);
            res.redirect('/comments');
        }
    );
});

// ============= ЗАДАНИЕ 3: Template-инъекция =============
app.get('/welcome', (req, res) => {
    let name = req.query.name || 'гость';
    
    let template = `
        <h1>Добро пожаловать, ${name}!</h1>
        <p>Спасибо за посещение нашего магазина.</p>
        <a href="/">На главную</a>
    `;
    
    res.send(template);
});

app.get('/profile', (req, res) => {
    let status = req.query.status || 'онлайн';
    let user = req.user || 'гость';
    
    res.send(`
        <h1>Профиль пользователя: ${user}</h1>
        <div style="border:1px solid blue; padding:10px;">
            Статус: ${status}
        </div>
        <form method="GET">
            <input type="text" name="status" placeholder="Введите статус">
            <button type="submit">Установить статус</button>
        </form>
        <p>Подсказка: попробуйте ввести HTML-теги как статус</p>
        <a href="/">На главную</a>
    `);
});

// ============= ЗАДАНИЕ 5: SQL-инъекция в авторизации =============
app.get('/login', (req, res) => {
    res.send(`
        <h1>Вход в систему</h1>
        <form method="POST" action="/login">
            <input type="text" name="username" placeholder="Логин"><br>
            <input type="password" name="password" placeholder="Пароль"><br>
            <button type="submit">Войти</button>
        </form>
        <p>Подсказка: можно войти без пароля!</p>
    `);
});

app.post('/login', (req, res) => {
    let { username, password } = req.body;
    
    let query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    
    console.log("Login query:", query);
    
    db.get(query, (err, user) => {
        if (err) {
            res.send(`Ошибка: ${err.message}`);
        } else if (user) {
            // Устанавливаем куку (уязвимую для XSS - без HttpOnly)
            res.cookie('username', user.username, { httpOnly: false });
            res.send(`Успешный вход! Добро пожаловать, ${user.username}<br><a href="/">На главную</a>`);
        } else {
            res.send('Неверный логин или пароль<br><a href="/login">Попробовать снова</a>');
        }
    });
});


// Запуск сервера
app.listen(port, () => {
    console.log(`🚀 Уязвимый магазин запущен на http://localhost:${port}`);
    console.log("📚 Задания для студентов:");
    console.log("1. SQL-инъекция: http://localhost:3000/search");
    console.log("2. XSS: http://localhost:3000/comments");
    console.log("3. Template-инъекция: http://localhost:3000/welcome?name=тест");
    console.log("4. HTML-инъекция: http://localhost:3000/profile");
    console.log("5. Обход авторизации: http://localhost:3000/login");
});
