const db = require('./db');

const initSql = [
    `CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sn VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) DEFAULT 'ESP32',
        room VARCHAR(100) NOT NULL,
        ip VARCHAR(50) DEFAULT '-',
        status ENUM('Online','Offline') DEFAULT 'Offline',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS histori_sensor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        suhu FLOAT NOT NULL,
        kelembaban FLOAT NOT NULL,
        status_led TINYINT(1) DEFAULT 0,
        sn VARCHAR(50) DEFAULT 'SN-ESP32-001'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('Admin','User') NOT NULL DEFAULT 'User',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `INSERT INTO devices (id, sn, name, type, room, ip, status) VALUES
    (1, 'SN-ESP32-001', 'ESP32 Main Controller', 'NodeMCU ESP32', 'Ruang Tamu', '192.168.1.101', 'Offline'),
    (2, 'SN-ARD-002', 'Arduino Sensor Node', 'Arduino Uno R3', 'Kamar Tidur', '192.168.1.102', 'Offline'),
    (3, 'SN-ESP82-003', 'ESP8266 Kitchen Node', 'Wemos D1 Mini', 'Dapur', '192.168.1.103', 'Offline'),
    (4, 'SN-RPI-004', 'Raspberry Pi Gateway', 'Raspberry Pi 4', 'Teras Depan', '192.168.1.104', 'Offline'),
    (48, 'SN-ESP32-005', 'Wemos Rayhan', 'Wemos D2 R32', 'Kamar Rayhan', '192.168.43.81', 'Offline')
    ON DUPLICATE KEY UPDATE name = VALUES(name), ip = VALUES(ip);`,

    `INSERT INTO users (id, username, password, role) VALUES
    (1, 'admin', '$2b$10$7Y/ud20JwoLsFT3RO0IB7e08kVlENxpRDyNT.KkpkpHjaTDxIqeue', 'Admin'),
    (6, 'albert', '$2b$10$krvXRtkEDvrGRWG/LUr5bOtltd5HMmYEZy4RRngg/LhTU4SXCT0ui', 'User'),
    (7, 'abel', '$2b$10$GapMXtcDIshxCPXSpATB5Omc1TtnN/GQOtHV2o2HtlMfsKNs30jaO', 'User'),
    (9, 'tatan', '$2b$10$G6OUPFALNvjtm1N7Qu0edebS.mLMFrdU58chhTuUk7UQ/2/0FDbh.', 'User'),
    (11, 'triii', '$2b$10$hEvyzpLQRk78Kx0L2BeuSexer3dQZKp2loig9PZuXMjimSOfu3Jje', 'User'),
    (13, 'tes', '$2b$10$9XvfONzoHEeBL8WgnRCz6.KjUTVcgY6khhgGG.ewJ7qNViU1vUpUy', 'User'),
    (14, 'depan', '$2b$10$NtxDrHm7lI/52FtiCGNfo.CCyfZCbzYeN2Z/smTJLZMrHkhFicjCK', 'User'),
    (15, 'petruk', '$2b$10$KqvpN8sS4wXR8sER.jThLu6TZ0Szx2OJEGOaSp0m1YPtk7eY9A1KO', 'User')
    ON DUPLICATE KEY UPDATE role = VALUES(role);`
];

async function initializeDatabase() {
    for (const sql of initSql) {
        try {
            await new Promise((resolve, reject) => {
                db.query(sql, (err, res) => {
                    if (err) return reject(err);
                    resolve(res);
                });
            });
        } catch (e) {
            console.error('⚠️ Info inisialisasi tabel:', e.message);
        }
    }
    console.log('✅ Skema tabel & data awal database siap digunakan');
}

module.exports = initializeDatabase;
