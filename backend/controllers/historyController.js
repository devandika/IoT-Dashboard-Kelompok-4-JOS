const db = require('../config/db');

const getHistory = (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const sn = req.query.sn;
    let sql = 'SELECT * FROM histori_sensor ORDER BY id DESC LIMIT ?';
    let queryParams = [limit];
    if (sn) {
        sql = 'SELECT * FROM histori_sensor WHERE sn = ? ORDER BY id DESC LIMIT ?';
        queryParams = [sn, limit];
    }
    
    db.query(sql, queryParams, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        res.json({ success: true, data: results });
    });
};

const getHistoryByDate = (req, res) => {
    const date = req.query.date; // format: YYYY-MM-DD
    if (!date) return res.status(400).json({ success: false, message: 'Tanggal tidak diberikan' });

    const sn = req.query.sn;
    let sql = `SELECT waktu, suhu, kelembaban FROM histori_sensor WHERE DATE(waktu) = ? ORDER BY waktu ASC`;
    let queryParams = [date];
    if (sn) {
        sql = `SELECT waktu, suhu, kelembaban FROM histori_sensor WHERE DATE(waktu) = ? AND sn = ? ORDER BY waktu ASC`;
        queryParams = [date, sn];
    }

    db.query(sql, queryParams, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        
        // Generate 48 buckets (tiap 30 menit)
        const buckets = {};
        for(let h = 0; h < 24; h++) {
            const hStr = String(h).padStart(2, '0');
            buckets[`${hStr}:00`] = { sumSuhu: 0, sumHum: 0, count: 0 };
            buckets[`${hStr}:30`] = { sumSuhu: 0, sumHum: 0, count: 0 };
        }

        let totalSuhu = 0;
        let totalHum = 0;

        results.forEach(row => {
            const d = new Date(row.waktu);
            const hStr = String(d.getHours()).padStart(2, '0');
            const mStr = d.getMinutes() < 30 ? '00' : '30';
            const key = `${hStr}:${mStr}`;
            
            buckets[key].sumSuhu += row.suhu;
            buckets[key].sumHum += row.kelembaban;
            buckets[key].count += 1;

            totalSuhu += row.suhu;
            totalHum += row.kelembaban;
        });

        const finalData = Object.keys(buckets).map(k => {
            const b = buckets[k];
            return {
                time_label: k,
                avg_suhu: b.count > 0 ? parseFloat((b.sumSuhu / b.count).toFixed(1)) : null,
                avg_hum: b.count > 0 ? parseFloat((b.sumHum / b.count).toFixed(1)) : null
            };
        });

        const validCount = results.length;
        const avgDayTemp = validCount > 0 ? (totalSuhu / validCount).toFixed(1) : '-';
        const avgDayHum = validCount > 0 ? (totalHum / validCount).toFixed(1) : '-';

        res.json({ 
            success: true, 
            data: finalData, 
            avgTemp: avgDayTemp, 
            avgHum: avgDayHum, 
            targetDate: date
        });
    });
};

const getActuatorHistory = (req, res) => {
    const limit = parseInt(req.query.limit) || 25;
    
    // Ambil data dalam jumlah besar untuk mencari histori perubahan state (ON/OFF)
    const sql = 'SELECT id, waktu, status_led FROM histori_sensor ORDER BY id DESC LIMIT 5000';
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        
        const changes = [];
        
        // Selalu tampilkan status terbaru (baris paling atas) agar tabel tidak kosong
        if (results.length > 0) {
            changes.push(results[0]);
        }

        for (let i = 0; i < results.length - 1; i++) {
            const current = results[i];
            const previous = results[i + 1]; 
            
            // Jika status LED berubah dibanding rekaman sebelumnya, berarti ini adalah momen toggle
            if (current.status_led !== previous.status_led) {
                // Cegah duplikasi jika perubahan terjadi tepat di baris pertama
                if (changes[changes.length - 1].id !== current.id) {
                    changes.push(current);
                }
                if (changes.length >= limit) break;
            }
        }
        
        res.json({ success: true, data: changes });
    });
};

module.exports = {
    getHistory,
    getHistoryByDate,
    getActuatorHistory
};
