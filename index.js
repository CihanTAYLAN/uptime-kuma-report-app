const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
require('dotenv').config();

let daysAgo = 7;
let tag = 'Technohouse'; // Default değer, komut satırı argümanıyla değiştirilebilir
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

// Veritabanına bağlan
const db = new sqlite3.Database(process.env.SQLITE_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// E-posta gönderici ayarlarını yap
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

// Raporu hesapla ve gönder
function calculateAndSendReport() {
    // Tag'e göre filtre ekle
    const tagFilter = tag ? `AND m.name LIKE '%${tag}%'` : '';

    const query = `
    SELECT m.id, m.name, h.status, h.time, h.ping, h.duration
    FROM heartbeat h
    JOIN monitor m ON m.id = h.monitor_id
    WHERE h.time > datetime('now', '-${daysAgo} days') ${tagFilter}
    GROUP BY m.id, h.status, h.time, h.ping, h.duration
  `;

    db.all(query, [], (err, rows) => {
        if (err) {
            throw err;
        }

        // HTML e-posta şablonunu oluştur
        let emailContent = `
        <html>
        <head>
          <style>
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ddd;
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
          <table>
            <tr>
              <th>Monitor ID</th>
              <th>Adı</th>
              <th>Status</th>
              <th>Zaman Damgası</th>
              <th>Ping</th>
              <th>Duration</th>
            </tr>`;

        rows.forEach((row) => {
            const statusText = row.status === 1 ? 'Success' : 'Failed';
            emailContent += `
            <tr>
              <td>${row.id}</td>
              <td>${row.name}</td>
              <td>${statusText}</td>
              <td>${row.time}</td>
              <td>${row.ping}</td>
              <td>${row.duration}</td>
            </tr>`;
        });

        emailContent += `</table></body></html>`;

        // E-postayı gönder
        const mailOptions = {
            from: process.env.SMTP_USERNAME,
            to: mailTo,
            subject: `${daysAgo} Günlük Monitor Raporu`,
            html: emailContent
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    });
}

calculateAndSendReport();

// Veritabanı bağlantısını kapat
db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Close the database connection.');
});
