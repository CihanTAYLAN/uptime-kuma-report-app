const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
require('dotenv').config();

let daysAgo = 7;
let tag = '';
let mailTo = 'alerts@technohouse.com.tr';

// Komut satırı argümanlarını işle
for (const param of process.argv) {
    if (param.includes('--days-ago=')) {
        daysAgo = param.split('=')[1];
    } else if (param.includes('--tag=')) {
        tag = param.split('=')[1];
    } else if (param.includes('--mail-to=')) {
        mailTo = param.split('=')[1];
    } else if (param.includes('--help')) {
        console.log(`Param defaults ;`);
        console.log(`--days-ago=${daysAgo}`);
        console.log(`--tag=${tag}`);
        console.log(`--mail-to=${mailTo}`);
        console.log("Example usage : node ./index.js --days-ago=30 --tag=Inity --mail-to=cihan.taylan@technohouse.com.tr");
        process.exit(0);
    }
}

function onlyUnique(value, index, array) {
    return array.indexOf(value) === index;
}

const db = new sqlite3.Database(process.env.SQLITE_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});


function calculateAndSendReport() {
    return new Promise((resolve, reject) => {
        let params = [`-${daysAgo} days`]; // Parametre listesi
        let query = `
            SELECT m.id, m.name, GROUP_CONCAT(t.name) AS tags,
            AVG(CASE WHEN h.status = 1 THEN 1 ELSE 0 END) * 100 AS success_rate
            FROM monitor m
            JOIN heartbeat h ON m.id = h.monitor_id
            LEFT JOIN monitor_tag mt ON m.id = mt.monitor_id
            LEFT JOIN tag t ON mt.tag_id = t.id
            WHERE h.time > datetime('now', ?)
        `;

        if (tag) {
            query += ` AND t.name = ?`;
            params.push(tag);
        }

        query += ` GROUP BY m.id`;

        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }

            let emailContent = `
                <html>
                <head>
                <style>
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                </style>
                </head>
                <body>
                <h2>${daysAgo} Günlük Monitor Başarı Oranları</h2>
                <table border="1">
                    <tr border="1">
                    <th border="1">Monitor ID</th>
                    <th border="1">Adı</th>
                    <th border="1">Tag</th>
                    <th border="1">Başarı Oranı</th>
                    </tr>`;

            rows.forEach((row) => {
                const tags = row?.tags?.split(',').filter(onlyUnique).join(', ');
                emailContent += `
                <tr border="1">
                <td border="1">${row.id}</td>
                <td border="1">${row.name}</td>
                <td border="1">${tags}</td>
                <td border="1">${row.success_rate.toFixed(2)}%</td>
                </tr>`;
            });

            emailContent += `</table></body></html>`;

            const mailOptions = {
                from: process.env.SMTP_USERNAME,
                to: mailTo,
                subject: `${daysAgo} Günlük Monitor Raporu`,
                html: emailContent
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    console.log('Email sent: ' + info.response);
                    resolve();
                }
            });
        });
    });
}


calculateAndSendReport().then(() => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Close the database connection.');
    });
}).catch((err) => {
    console.error('An error occurred:', err);
    db.close(); // Hata durumunda da veritabanı bağlantısını kapat
});
