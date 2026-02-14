const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('shop.db');

db.serialize(() => {
    // Таблица товаров
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT,
        price REAL,
        description TEXT
    )`);

    // Таблица пользователей (пароли в открытом виде - уязвимость!)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        password TEXT,
        email TEXT
    )`);

    // Таблица комментариев
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY,
        product_id INTEGER,
        username TEXT,
        comment TEXT
    )`);

    db.run("DELETE FROM products");
    db.run("INSERT INTO products VALUES (1, 'Ноутбук', 75000, 'Игровой ноутбук')");
    db.run("INSERT INTO products VALUES (2, 'Мышь', 2500, 'Беспроводная мышь')");
    db.run("INSERT INTO products VALUES (3, 'Клавиатура', 4500, 'Механическая клавиатура')");

    db.run("DELETE FROM users");
    db.run("INSERT INTO users VALUES (1, 'admin', 'superpass123', 'admin@shop.ru')");
    db.run("INSERT INTO users VALUES (2, 'user', 'qwerty', 'user@mail.ru')");
    
    db.run("DELETE FROM comments");
});

console.log("База данных готова!");

module.exports = db;
