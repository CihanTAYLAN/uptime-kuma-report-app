const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

// Veritabanı bağlantısını ayarla
const db = new sqlite3.Database('./kuma.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// // SMTP transporter'ı oluştur
// const transporter = nodemailer.createTransport({
//     host: 'mail.technohouse.com.tr',
//     port: 587,
//     secure: false,
//     auth: {
//         user: 'cihan.taylan@technohouse.com.tr',
//         pass: '182419Ct'
//     }
// });

// Monitor başına haftalık success oranını hesapla ve e-posta gönder
function calculateAndSendReport() {
    const query = `
    SELECT m.id, m.name,
           AVG(CASE WHEN h.status = 1 THEN 1 ELSE 0 END) AS success_rate
    FROM heartbeat h
    JOIN monitor m ON m.id = h.monitor_id
    WHERE h.time > datetime('now', '-7 days')
    GROUP BY m.id
  `;

    db.all(query, [], (err, rows) => {
        if (err) {
            throw err;
        }

        // E-posta içeriğini oluştur
        let emailContent = 'Haftalık Monitor Başarı Oranları:\n\n';
        rows.forEach((row) => {
            emailContent += `Monitor ID: ${row.id}, Adı: ${row.name}, Başarı Oranı: ${(row.success_rate * 100).toFixed(2)}%\n`;
        });

        console.log(emailContent);
        // E-postayı gönder
        // const mailOptions = {
        //     from: 'sender@example.com',
        //     to: 'recipient@example.com',
        //     subject: 'Haftalık Monitor Raporu',
        //     text: emailContent
        // };

        // transporter.sendMail(mailOptions, function (error, info) {
        //     if (error) {
        //         console.log(error);
        //     } else {
        //         console.log('Email sent: ' + info.response);
        //     }
        // });
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
