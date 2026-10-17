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

                // Auto-update IP perangkat di tabel devices jika ada data IP yang valid & berubah
                if (ip && typeof ip === 'string' && ip.trim() !== '' && ip.trim() !== '-') {
                    const cleanIp = ip.trim();
                    const updateIpSql = 'UPDATE devices SET ip = ? WHERE sn = ? AND (ip != ? OR ip IS NULL OR ip = "-")';
                    db.query(updateIpSql, [cleanIp, sn, cleanIp], (errUpdate, resUpdate) => {
                        if (errUpdate) {
                            console.error('❌ GAGAL AUTO-UPDATE IP PERANGKAT:', errUpdate.message);
                        } else if (resUpdate && resUpdate.affectedRows > 0) {
                            console.log(`🌐 IP perangkat [${sn}] otomatis diperbarui ke: ${cleanIp}`);
                        }
                    });
                }
            } catch (e) {
                console.error('Gagal parse JSON dari MQTT:', e.message);
            }
        }
    });
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
