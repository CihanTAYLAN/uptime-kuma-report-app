const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
require('dotenv').config();


let daysAgo = 7;
let tag = 'Technohouse'
let mailTo = 'alerts@technohouse.com.tr'

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

const db = new sqlite3.Database(process.env.SQLITE_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE == 'true',
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

function calculateAndSendReport() {
    const query = `
    SELECT m.id, m.name,
           AVG(CASE WHEN h.status = 1 THEN 1 ELSE 0 END) AS success_rate
    FROM heartbeat h
    JOIN monitor m ON m.id = h.monitor_id
    WHERE h.time > datetime('now', '-${daysAgo} days')
    GROUP BY m.id
  `;

    db.all(query, [], (err, rows) => {
        if (err) {
            throw err;
        }

        let emailContent = 'Haftalık Monitor Başarı Oranları:\n\n';
        rows.forEach((row) => {
            emailContent += `Monitor ID: ${row.id}, Adı: ${row.name}, Başarı Oranı: ${(row.success_rate * 100).toFixed(2)}%\n<br>`;
        });

        console.log(emailContent);
        // E-postayı gönder
        const mailOptions = {
            from: process.env.SMTP_USERNAME,
            to: mailTo,
            subject: 'Haftalık Monitor Raporu',
            html: emailContent,
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

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Close the database connection.');
});
