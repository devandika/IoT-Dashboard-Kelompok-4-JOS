const db = require('../config/db');

// Inisialisasi tabel devices dan seed awal jika belum ada
const initDevicesTable = () => {
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS devices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sn VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            type VARCHAR(50) DEFAULT 'ESP32',
            room VARCHAR(100) NOT NULL,
            ip VARCHAR(50) DEFAULT '-',
            status ENUM('Online', 'Offline') DEFAULT 'Offline',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    db.query(createTableSql, (err) => {
        if (err) {
            console.error('❌ Gagal membuat tabel devices:', err.message);
            return;
        }
        console.log('✅ Tabel devices siap digunakan');

        // Seed perangkat bawaan jika belum ada
        const seedSql = `
            INSERT INTO devices (sn, name, type, room, ip, status) VALUES 
                ('SN-ESP32-001', 'ESP32 Main Controller', 'NodeMCU ESP32', 'Ruang Tamu', '192.168.1.101', 'Offline'),
                ('SN-ARD-002', 'Arduino Sensor Node', 'Arduino Uno R3', 'Kamar Tidur', '192.168.1.102', 'Offline'),
                ('SN-ESP82-003', 'ESP8266 Kitchen Node', 'Wemos D1 Mini', 'Dapur', '192.168.1.103', 'Offline'),
                ('SN-RPI-004', 'Raspberry Pi Gateway', 'Raspberry Pi 4', 'Teras Depan', '192.168.1.104', 'Offline')
            ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), room=VALUES(room), ip=VALUES(ip)
        `;

        db.query(seedSql, (seedErr) => {
            if (seedErr) {
                console.error('❌ Gagal seed perangkat awal:', seedErr.message);
            } else {
                console.log('✅ Perangkat awal berhasil disinkronisasi ke database');
            }
        });
    });
};

// Jalankan inisialisasi tabel
initDevicesTable();

// GET /api/devices - Ambil semua perangkat terdaftar
const getDevices = (req, res) => {
    const sql = 'SELECT * FROM devices ORDER BY id ASC';
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('Error getDevices:', err);
            return res.status(500).json({ success: false, message: 'Gagal mengambil data perangkat dari database.' });
        }
        res.json({ success: true, data: rows });
    });
};

// POST /api/devices - Tambah perangkat baru
const addDevice = (req, res) => {
    const { name, type, sn, ip, room } = req.body;

    if (!name || !sn || !room) {
        return res.status(400).json({ success: false, message: 'Nama perangkat, Serial Number (SN), dan Ruangan wajib diisi.' });
    }

    const cleanSN = String(sn).trim();
    const cleanName = String(name).trim();
    const cleanType = type ? String(type).trim() : 'ESP32';
    const cleanRoom = String(room).trim();
    const cleanIP = ip ? String(ip).trim() : '-';

    // Cek apakah SN sudah terdaftar
    const checkSql = 'SELECT id FROM devices WHERE sn = ?';
    db.query(checkSql, [cleanSN], (errCheck, rowsCheck) => {
        if (errCheck) {
            console.error('Error check SN:', errCheck);
            return res.status(500).json({ success: false, message: 'Gagal memeriksa serial number perangkat.' });
        }

        if (rowsCheck && rowsCheck.length > 0) {
            return res.status(409).json({ success: false, message: `Perangkat dengan Serial Number "${cleanSN}" sudah terdaftar.` });
        }

        const insertSql = 'INSERT INTO devices (name, type, sn, ip, room, status) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(insertSql, [cleanName, cleanType, cleanSN, cleanIP, cleanRoom, 'Offline'], (insertErr, result) => {
            if (insertErr) {
                console.error('Error insert device:', insertErr);
                return res.status(500).json({ success: false, message: 'Gagal menyimpan perangkat baru ke database.' });
            }

            res.status(201).json({
                success: true,
                message: 'Perangkat baru berhasil ditambahkan ke database!',
                data: {
                    id: result.insertId,
                    name: cleanName,
                    type: cleanType,
                    sn: cleanSN,
                    ip: cleanIP,
                    room: cleanRoom,
                    status: 'Offline'
                }
            });
        });
    });
};

// PUT /api/devices/:id - Update perangkat
const updateDevice = (req, res) => {
    const { id } = req.params;
    const { name, type, sn, ip, room } = req.body;

    if (!name || !sn || !room) {
        return res.status(400).json({ success: false, message: 'Nama perangkat, Serial Number (SN), dan Ruangan wajib diisi.' });
    }

    let updateSql = 'UPDATE devices SET name = ?, type = ?, sn = ?, room = ? WHERE id = ?';
    let params = [name, type || 'ESP32', sn, room, id];

    if (ip !== undefined && ip !== null && String(ip).trim() !== '') {
        updateSql = 'UPDATE devices SET name = ?, type = ?, sn = ?, ip = ?, room = ? WHERE id = ?';
        params = [name, type || 'ESP32', sn, String(ip).trim(), room, id];
    }

    db.query(updateSql, params, (err, result) => {
        if (err) {
            console.error('Error update device:', err);
            return res.status(500).json({ success: false, message: 'Gagal memperbarui data perangkat.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
        }

        res.json({ success: true, message: 'Data perangkat berhasil diperbarui!' });
    });
};

// DELETE /api/devices/:id - Hapus perangkat
const deleteDevice = (req, res) => {
    const { id } = req.params;

    const deleteSql = 'DELETE FROM devices WHERE id = ?';
    db.query(deleteSql, [id], (err, result) => {
        if (err) {
            console.error('Error delete device:', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus perangkat dari database.' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Perangkat tidak ditemukan.' });
        }

        res.json({ success: true, message: 'Perangkat berhasil dihapus dari database.' });
    });
};

module.exports = {
    initDevicesTable,
    getDevices,
    addDevice,
    updateDevice,
    deleteDevice
};
