require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database(process.env.SQLITE_PATH, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the in-memory SQlite database.');
});

db.all("SELECT * FROM monitor", function (err, rows) {
    rows.forEach(function (row) {
        console.log(row);
    });
});

// select mt.id,mt.url,hs.msg from monitor as mt inner join heartbeat as hs on mt.id = hs.monitor_id limit 3;