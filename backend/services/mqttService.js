const mqtt = require('mqtt');
const db = require('../config/db');

let client;

function initMqtt() {
    client = mqtt.connect('mqtt://broker.emqx.io:1883');

    client.on('connect', () => { 
        console.log('✅ Terhubung ke Broker MQTT (Service)');
        client.subscribe('tugasiot/sensor'); 
    });

    client.on('message', (topic, message) => {
        if (topic === 'tugasiot/sensor') {
            try {
                const data = JSON.parse(message.toString());
                const suhu = data.suhu;
                const kelembaban = data.kelembaban;
                // Ambil status_led (fallback ke data.led atau 0 jika tidak terdefinisi)
                const statusLed = data.status_led ?? data.led ?? 0;
                const sn = data.sn || "SN-ESP32-001"; 
                const ip = data.ip;

                console.log('📥 Menerima data dari MQTT:', {suhu, kelembaban, status_led: statusLed, sn, ip });

                const sql = 'INSERT INTO histori_sensor (suhu, kelembaban, status_led, sn) VALUES (?, ?, ?, ?)';
                db.query(sql, [suhu, kelembaban, statusLed, sn], (err, result) => {
                    if (err) {
                        console.error('❌ GAGAL SIMPAN KE DB:', err.message);
                    } else {
                        console.log('✅ BERHASIL TERSIMPAN KE DATABASE');
                    }
                });

                // Auto-update status 'Online', waktu aktif, dan IP perangkat di tabel devices (TiDB Cloud)
                let updateSql = 'UPDATE devices SET status = "Online", updated_at = CURRENT_TIMESTAMP';
                let params = [];

                if (ip && typeof ip === 'string' && ip.trim() !== '' && ip.trim() !== '-') {
                    updateSql += ', ip = ?';
                    params.push(ip.trim());
                }

                updateSql += ' WHERE sn = ?';
                params.push(sn);

                db.query(updateSql, params, (errUpdate) => {
                    if (errUpdate) {
                        console.error('❌ GAGAL AUTO-UPDATE STATUS/IP PERANGKAT:', errUpdate.message);
                    }
                });
            } catch (e) {
                console.error('Gagal parse JSON dari MQTT:', e.message);
            }
        }
    });

    // Cek heartbeat perangkat setiap 10 detik di database:
    // Jika perangkat tidak mengirim data lebih dari 30 detik, ubah statusnya menjadi 'Offline'
    setInterval(() => {
        const offlineSql = `
            UPDATE devices 
            SET status = 'Offline' 
            WHERE status = 'Online' 
              AND updated_at < NOW() - INTERVAL 30 SECOND
        `;
        db.query(offlineSql, (errOff) => {
            // silent check
        });
    }, 10000);
}

function publishLedControl(status, sn) {
    let topic = 'tugasiot/kontrol_led'; // Default untuk SN-ESP32-001
    if (sn === 'SN-ARD-002') {
        topic = 'tugasiot/kontrol_led_2';
    } else if (sn === 'SN-ESP82-003') {
        topic = 'tugasiot/kontrol_led_3';
    } else if (sn === 'SN-RPI-004') {
        topic = 'tugasiot/kontrol_led_4';
    } else if (sn) {
        topic = `tugasiot/kontrol_led_${sn}`;
    }

    if (client && client.connected) {
        client.publish(topic, status);
        // Opsional: publish juga ke path hierarkis tugasiot/kontrol_led/{sn}
        if (sn && sn !== 'SN-ESP32-001') {
            client.publish(`tugasiot/kontrol_led/${sn}`, status);
        }
        return true;
    }
    return false;
}

module.exports = {
    initMqtt,
    publishLedControl
};
