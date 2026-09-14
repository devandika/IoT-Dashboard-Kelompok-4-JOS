const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tugasiot_4'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Gagal koneksi ke database:', err.message);
    } else {
        console.log('✅ Terhubung ke database MySQL tugasiot_4');
    }
});

module.exports = db;
