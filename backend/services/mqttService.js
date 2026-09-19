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

                console.log('📥 Menerima data dari MQTT:', {suhu, kelembaban, status_led: statusLed });

                const sql = 'INSERT INTO histori_sensor (suhu, kelembaban, status_led, sn) VALUES (?, ?, ?, ?)';
                db.query(sql, [suhu, kelembaban, statusLed, sn], (err, result) => {
                    if (err) {
                        console.error('❌ GAGAL SIMPAN KE DB:', err.message);
                    } else {
                        console.log('✅ BERHASIL TERSIMPAN KE DATABASE');
                    }
                });
            } catch (e) {
                console.error('Gagal parse JSON dari MQTT:', e.message);
            }
        }
    });
}

function publishLedControl(status) {
    if (client && client.connected) {
        client.publish('tugasiot/kontrol_led', status);
        return true;
    }
    return false;
}

module.exports = {
    initMqtt,
    publishLedControl
};
