const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2');

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'tugasiot_4',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Aktifkan SSL untuk cloud MySQL (TiDB, Aiven, dll) jika host bukan localhost atau DB_SSL=true
if (process.env.DB_SSL === 'true' || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const db = mysql.createPool(poolConfig);

db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Gagal koneksi ke database MySQL:', err.message);
    } else {
        console.log(`✅ Terhubung ke database MySQL [${process.env.DB_NAME || 'tugasiot_4'}] di ${process.env.DB_HOST || 'localhost'}`);
        connection.release();
    }
});

module.exports = db;
