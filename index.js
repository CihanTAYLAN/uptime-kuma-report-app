const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./db.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the in-memory SQlite database.');
});

db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, password TEXT)');
db.run('INSERT INTO users (name, email, password) VALUES ("John Doe", "john@example.com", "password123")');
db.all("SELECT * FROM users", function (err, rows) {

    let contador = 0;

    rows.forEach(function (row) {
        console.log(row);
    });
});