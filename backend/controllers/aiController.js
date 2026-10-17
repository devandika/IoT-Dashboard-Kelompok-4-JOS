const db = require('../config/db');

function queryAsync(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

function extractJSON(text) {
    if (!text) return null;
    let clean = text.trim();
    // Bersihkan tag <think>...</think> dari model reasoning (seperti Qwen/DeepSeek)
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(clean);
}

// === ASHRAE 55 & SNI 03-6572 Threshold Constants ===
const ASHRAE_TEMP_MIN = 20.0;   // °C — batas bawah zona nyaman ASHRAE 55
const ASHRAE_TEMP_MAX = 26.0;   // °C — batas atas zona nyaman ASHRAE 55
const ASHRAE_HUM_MIN = 30.0;    // % RH — batas bawah kelembaban ASHRAE 55
const ASHRAE_HUM_MAX = 60.0;    // % RH — batas atas kelembaban ASHRAE 55
const SNI_TEMP_MIN = 22.8;      // °C — batas bawah suhu efektif SNI 03-6572
const SNI_TEMP_MAX = 25.8;      // °C — batas atas suhu efektif SNI 03-6572
const OUTLIER_TEMP_MIN = -10.0; // °C — batas bawah wajar sensor suhu
const OUTLIER_TEMP_MAX = 80.0;  // °C — batas atas wajar sensor suhu
const OUTLIER_HUM_MIN = 0.0;    // % — batas bawah wajar sensor kelembaban
const OUTLIER_HUM_MAX = 100.0;  // % — batas atas wajar sensor kelembaban

// Hitung standar deviasi
function stdDev(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sqDiffs = values.map(v => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

// Hitung stabilitas dari coefficient of variation (CV)
// CV rendah = stabil, CV tinggi = fluktuatif
function calcStabilityPct(tempValues, humValues) {
    const avgT = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;
    const avgH = humValues.reduce((a, b) => a + b, 0) / humValues.length;
    const sdT = stdDev(tempValues);
    const sdH = stdDev(humValues);

    // Coefficient of Variation (%) — makin kecil makin stabil
    const cvT = avgT !== 0 ? (sdT / Math.abs(avgT)) * 100 : 0;
    const cvH = avgH !== 0 ? (sdH / Math.abs(avgH)) * 100 : 0;

    // Gabungan CV (suhu lebih penting: bobot 60:40)
    const combinedCV = (cvT * 0.6) + (cvH * 0.4);

    // Mapping: CV 0% → 100% stabil, CV ≥ 25% → 40% stabil
    const stability = Math.max(40, Math.min(100, Math.round(100 - (combinedCV * 2.4))));
    return stability;
}

// Filter outlier: hapus data sensor yang tidak masuk akal
function filterOutliers(rows) {
    const filtered = [];
    let outlierCount = 0;
    for (const r of rows) {
        const t = parseFloat(r.suhu);
        const h = parseFloat(r.kelembaban);
        if (isNaN(t) || isNaN(h)) { outlierCount++; continue; }
        if (t < OUTLIER_TEMP_MIN || t > OUTLIER_TEMP_MAX) { outlierCount++; continue; }
        if (h < OUTLIER_HUM_MIN || h > OUTLIER_HUM_MAX) { outlierCount++; continue; }
        filtered.push(r);
    }
    return { filtered, outlierCount };
}

// Deteksi anomali lokal rule-based berdasarkan ASHRAE 55 & SNI
function detectAnomalies(rows) {
    const anomalies = [];
    let ashraeTempViolations = 0;
    let ashraeHumViolations = 0;
    let sniViolations = 0;
    let criticalHighTemp = 0; // > 35°C
    let criticalHighHum = 0;  // > 90%

    for (const r of rows) {
        const t = parseFloat(r.suhu);
        const h = parseFloat(r.kelembaban);

        // ASHRAE 55 violations
        if (t < ASHRAE_TEMP_MIN || t > ASHRAE_TEMP_MAX) ashraeTempViolations++;
        if (h < ASHRAE_HUM_MIN || h > ASHRAE_HUM_MAX) ashraeHumViolations++;

        // SNI 03-6572 violations
        if (t < SNI_TEMP_MIN || t > SNI_TEMP_MAX) sniViolations++;

        // Critical thresholds
        if (t > 35) criticalHighTemp++;
        if (h > 90) criticalHighHum++;
    }

    const total = rows.length;
    const ashraeTempPct = Math.round((ashraeTempViolations / total) * 100);
    const ashraeHumPct = Math.round((ashraeHumViolations / total) * 100);
    const sniPct = Math.round((sniViolations / total) * 100);
    const ashraeCompliancePct = Math.round(((total - Math.max(ashraeTempViolations, ashraeHumViolations)) / total) * 100);

    if (criticalHighTemp > 0) {
        anomalies.push(`KRITIS: ${criticalHighTemp} dari ${total} pembacaan menunjukkan suhu > 35°C (zona bahaya termal)`);
    }
    if (criticalHighHum > 0) {
        anomalies.push(`PERINGATAN: ${criticalHighHum} dari ${total} pembacaan menunjukkan kelembaban > 90% RH (risiko kondensasi/jamur)`);
    }
    if (ashraeTempPct > 30) {
        anomalies.push(`${ashraeTempPct}% data suhu di luar zona nyaman ASHRAE 55 (${ASHRAE_TEMP_MIN}–${ASHRAE_TEMP_MAX}°C)`);
    }
    if (ashraeHumPct > 30) {
        anomalies.push(`${ashraeHumPct}% data kelembaban di luar zona nyaman ASHRAE 55 (${ASHRAE_HUM_MIN}–${ASHRAE_HUM_MAX}% RH)`);
    }
    if (sniPct > 40) {
        anomalies.push(`${sniPct}% data suhu tidak memenuhi standar SNI 03-6572 (${SNI_TEMP_MIN}–${SNI_TEMP_MAX}°C)`);
    }

    return {
        anomalies,
        ashraeTempViolations,
        ashraeHumViolations,
        sniViolations,
        criticalHighTemp,
        criticalHighHum,
        ashraeCompliancePct,
        ashraeTempPct,
        ashraeHumPct
    };
}

// Ambil sample time-series representatif untuk dikirim ke LLM
function sampleTimeSeries(rows, maxSamples = 24) {
    if (rows.length <= maxSamples) {
        return rows.map(r => ({
            waktu: new Date(r.waktu).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
            suhu: parseFloat(parseFloat(r.suhu).toFixed(1)),
            kelembaban: parseFloat(parseFloat(r.kelembaban).toFixed(1))
        }));
    }
    // Interval sampling: ambil titik-titik merata sepanjang dataset
    const step = Math.floor(rows.length / maxSamples);
    const samples = [];
    for (let i = 0; i < rows.length && samples.length < maxSamples; i += step) {
        const r = rows[i];
        samples.push({
            waktu: new Date(r.waktu).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }),
            suhu: parseFloat(parseFloat(r.suhu).toFixed(1)),
            kelembaban: parseFloat(parseFloat(r.kelembaban).toFixed(1))
        });
    }
    return samples;
}

// Evaluasi integritas sensor secara dinamis
function assessSensorIntegrity(rows, outlierCount, totalRawRows) {
    const issues = [];
    let integrityScore = 100;

    // Cek outlier rate
    if (outlierCount > 0) {
        const outlierRate = (outlierCount / totalRawRows) * 100;
        if (outlierRate > 5) {
            issues.push(`${outlierRate.toFixed(1)}% data sensor anomali (outlier)`);
            integrityScore -= Math.min(30, Math.round(outlierRate * 3));
        }
    }

    // Cek gap waktu (jika ada gap > 10 menit antara pembacaan berturut-turut)
    let gapCount = 0;
    for (let i = 1; i < rows.length; i++) {
        const dt = new Date(rows[i].waktu) - new Date(rows[i - 1].waktu);
        if (dt > 10 * 60 * 1000) gapCount++; // gap > 10 menit
    }
    if (gapCount > 3) {
        issues.push(`${gapCount} gap transmisi terdeteksi (>10 menit antar pembacaan)`);
        integrityScore -= Math.min(20, gapCount * 3);
    }

    // Cek data terlalu sedikit (< 30 titik dalam 24 jam)
    if (rows.length < 30) {
        issues.push(`Hanya ${rows.length} titik data tersedia (sampling terlalu rendah)`);
        integrityScore -= 15;
    }

    // Cek stuck sensor (nilai suhu/kelembaban identik berturut-turut > 10 kali)
    let stuckCount = 0;
    for (let i = 1; i < rows.length; i++) {
        if (parseFloat(rows[i].suhu) === parseFloat(rows[i - 1].suhu) &&
            parseFloat(rows[i].kelembaban) === parseFloat(rows[i - 1].kelembaban)) {
            stuckCount++;
        }
    }
    if (stuckCount > 10 && rows.length > 20) {
        const stuckPct = Math.round((stuckCount / rows.length) * 100);
        issues.push(`${stuckPct}% pembacaan identik berturut-turut (kemungkinan sensor stuck)`);
        integrityScore -= Math.min(20, Math.round(stuckPct * 0.5));
    }

    integrityScore = Math.max(0, Math.min(100, integrityScore));

    let status, color;
    if (integrityScore >= 85) {
        status = 'Normal & Stabil';
        color = 'success';
    } else if (integrityScore >= 65) {
        status = 'Perlu Perhatian';
        color = 'warning';
    } else {
        status = 'Bermasalah';
        color = 'danger';
    }

    return { integrityScore, status, color, issues };
}

const analyzeTelemetry = async (req, res) => {
    const { sn, name, room, engine } = req.body;
    const isCloud = (engine === 'cloud');
    const localModel = process.env.LOCAL_AI_MODEL || 'qwen2.5:1.5b';
    const localLabel = localModel.includes('2.5') ? 'AI Lokal (Qwen 2.5)' : (localModel.includes('3') ? 'AI Lokal (Qwen3)' : `AI Lokal (${localModel})`);
    const engineName = isCloud ? 'AI Cloud (Groq)' : localLabel;

    if (!sn) {
        return res.status(400).json({ success: false, message: 'Serial Number (SN) perangkat diperlukan.' });
    }

    try {
        // 1. Ambil data telemetri riil dari database (prioritas 24 jam terakhir)
        let rows = await queryAsync(
            'SELECT waktu, suhu, kelembaban FROM histori_sensor WHERE sn = ? AND waktu >= NOW() - INTERVAL 24 HOUR ORDER BY waktu ASC',
            [sn]
        );

        // Jika data 24 jam terakhir masih sedikit (< 5 baris), ambil histori terbaru hingga 1440 titik
        if (!rows || rows.length < 5) {
            rows = await queryAsync(
                'SELECT waktu, suhu, kelembaban FROM histori_sensor WHERE sn = ? ORDER BY waktu DESC LIMIT 1440',
                [sn]
            );
            if (rows && rows.length > 0) {
                rows = rows.reverse();
            }
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Gagal analisis: Tidak ditemukan data sensor di database untuk perangkat ${name || sn}. Pastikan simulator/perangkat aktif mengirim data.`
            });
        }

        const totalRawRows = rows.length;

        // 2. Filter outlier — hapus data tidak masuk akal
        const { filtered, outlierCount } = filterOutliers(rows);
        if (filtered.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Gagal analisis: Semua ${totalRawRows} titik data sensor untuk ${name || sn} terdeteksi sebagai outlier. Periksa kalibrasi sensor.`
            });
        }
        rows = filtered;

        // 3. Kalkulasi metrik telemetri riil
        const tempValues = [];
        const humValues = [];
        let sumTemp = 0, sumHum = 0;
        let minTemp = Infinity, maxTemp = -Infinity;
        let minHum = Infinity, maxHum = -Infinity;
        let peakHour = 12;

        const buckets = {};
        for (let h = 0; h < 24; h++) {
            const hStr = String(h).padStart(2, '0') + ':00';
            buckets[hStr] = { sumT: 0, sumH: 0, count: 0 };
        }

        rows.forEach(r => {
            const t = parseFloat(r.suhu);
            const h = parseFloat(r.kelembaban);
            tempValues.push(t);
            humValues.push(h);
            sumTemp += t;
            sumHum += h;
            if (t < minTemp) minTemp = t;
            if (t > maxTemp) {
                maxTemp = t;
                const d = new Date(r.waktu);
                peakHour = d.getHours();
            }
            if (h < minHum) minHum = h;
            if (h > maxHum) maxHum = h;

            const d = new Date(r.waktu);
            const hStr = String(d.getHours()).padStart(2, '0') + ':00';
            if (buckets[hStr]) {
                buckets[hStr].sumT += t;
                buckets[hStr].sumH += h;
                buckets[hStr].count += 1;
            }
        });

        const avgTemp = parseFloat((sumTemp / rows.length).toFixed(1));
        const avgHum = parseFloat((sumHum / rows.length).toFixed(1));
        minTemp = parseFloat(minTemp.toFixed(1));
        maxTemp = parseFloat(maxTemp.toFixed(1));
        minHum = parseFloat(minHum.toFixed(1));
        maxHum = parseFloat(maxHum.toFixed(1));

        // 4. Hitung stabilityPct dari standar deviasi riil
        const stabilityPct = calcStabilityPct(tempValues, humValues);
        const sdTemp = parseFloat(stdDev(tempValues).toFixed(2));
        const sdHum = parseFloat(stdDev(humValues).toFixed(2));

        // 5. Deteksi anomali lokal rule-based (ASHRAE 55 & SNI 03-6572)
        const anomalyResult = detectAnomalies(rows);

        // 6. Evaluasi integritas sensor secara dinamis
        const integrity = assessSensorIntegrity(rows, outlierCount, totalRawRows);

        // 7. Hourly chart data — gunakan null untuk jam tanpa data (bukan forward-fill)
        const labels = Object.keys(buckets);
        const tempData = [];
        const humData = [];

        labels.forEach(l => {
            const b = buckets[l];
            if (b.count > 0) {
                tempData.push(parseFloat((b.sumT / b.count).toFixed(1)));
                humData.push(parseFloat((b.sumH / b.count).toFixed(1)));
            } else {
                tempData.push(null); // null → chart menampilkan gap, bukan garis palsu
                humData.push(null);
            }
        });

        // 8. Ambil time-series sample untuk dikirim ke LLM
        const timeSeriesSamples = sampleTimeSeries(rows, 24);

        // 9. Susun prompt untuk LLM — diperkaya dengan konteks riil
        const systemPrompt = `Anda adalah asisten AI spesialis analisis telemetri IoT dan kenyamanan termal ruangan.
Standar referensi:
- ASHRAE 55: Zona nyaman suhu ${ASHRAE_TEMP_MIN}–${ASHRAE_TEMP_MAX}°C, kelembaban ${ASHRAE_HUM_MIN}–${ASHRAE_HUM_MAX}% RH
- SNI 03-6572: Suhu efektif nyaman ${SNI_TEMP_MIN}–${SNI_TEMP_MAX}°C
Anda mengevaluasi data sensor suhu dan kelembaban secara objektif dan ilmiah.
WAJIB: Berikan jawaban HANYA berupa objek JSON yang valid dan lengkap tanpa markdown backticks, tanpa teks pengantar, dan tanpa penutup.`;

        let anomalyContext = '';
        if (anomalyResult.anomalies.length > 0) {
            anomalyContext = `\n\nDETEKSI ANOMALI BACKEND (hasil analisis rule-based otomatis):\n${anomalyResult.anomalies.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
        }

        const userPrompt = `Analisis data telemetri 24 jam riil berikut:
- Nama Perangkat: ${name || 'Node IoT'}
- Serial Number (SN): ${sn}
- Lokasi Ruangan: ${room || 'Ruangan'}
- Total Sampel Sensor: ${rows.length} titik (${outlierCount} outlier dibuang)
- Suhu Udara (°C): Rata-rata ${avgTemp}°C, Min ${minTemp}°C, Max ${maxTemp}°C, StdDev ${sdTemp}°C
- Kelembaban Udara (RH): Rata-rata ${avgHum}%, Min ${minHum}%, Max ${maxHum}%, StdDev ${sdHum}%
- Periode Suhu Puncak: ${String(peakHour).padStart(2, '0')}:00 WIB (${maxTemp}°C)
- Kepatuhan ASHRAE 55: ${anomalyResult.ashraeCompliancePct}% data memenuhi zona nyaman
- Pelanggaran suhu ASHRAE: ${anomalyResult.ashraeTempPct}% di luar ${ASHRAE_TEMP_MIN}–${ASHRAE_TEMP_MAX}°C
- Pelanggaran kelembaban ASHRAE: ${anomalyResult.ashraeHumPct}% di luar ${ASHRAE_HUM_MIN}–${ASHRAE_HUM_MAX}% RH
- Integritas Sensor: ${integrity.status} (skor ${integrity.integrityScore}/100)
${anomalyContext}

DATA DERET WAKTU (sample ${timeSeriesSamples.length} titik):
${timeSeriesSamples.map(s => `[${s.waktu}] ${s.suhu}°C, ${s.kelembaban}%`).join('\n')}

Kembalikan persis JSON dengan format berikut:
{
  "score": <angka integer 0-100 indeks kenyamanan termal>,
  "status": <"Optimal" | "Perlu Penyesuaian" | "Anomali Termal">,
  "scoreDesc": <1 kalimat ringkas mengenai kenyamanan termal ruangan>,
  "diagnosis": <2-3 kalimat analisis teknis komprehensif mengenai pola fluktuasi suhu dan kelembaban serta dampaknya bagi ruangan, WAJIB sebutkan angka konkret dan standar ASHRAE/SNI>,
  "recommendations": [
    <rekomendasi operasional spesifik 1>,
    <rekomendasi operasional spesifik 2>,
    <rekomendasi operasional spesifik 3>
  ]
}`;

        // 10. Panggil model AI
        let aiRawContent = '';

        if (isCloud) {
            const apiKey = process.env.GROQ_API_KEY;
            const apiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
            const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

            if (!apiKey) {
                return res.status(500).json({
                    success: false,
                    message: 'Gagal analisis AI: GROQ_API_KEY belum dikonfigurasi di file .env backend.'
                });
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 25000);

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        response_format: { type: 'json_object' },
                        temperature: 0.2
                    })
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    const errorText = await response.text();
                    return res.status(502).json({
                        success: false,
                        message: `Gagal analisis AI Cloud (Groq HTTP ${response.status}): ${errorText}`
                    });
                }

                const data = await response.json();
                if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                    return res.status(502).json({
                        success: false,
                        message: 'Gagal analisis AI Cloud (Groq): Struktur respons dari Groq tidak sesuai.'
                    });
                }
                aiRawContent = data.choices[0].message.content;
            } catch (err) {
                clearTimeout(timeout);
                const isAbort = err.name === 'AbortError';
                return res.status(504).json({
                    success: false,
                    message: isAbort
                        ? 'Gagal analisis AI Cloud (Groq): Waktu permintaan habis (timeout 25 detik).'
                        : `Gagal analisis AI Cloud (Groq): ${err.message}`
                });
            }
        } else {
            // Local AI (Ollama)
            let localUrl = process.env.LOCAL_AI_URL || 'http://localhost:11434/api/chat';
            const model = localModel;

            // Normalisasi URL jika berupa host dasar saja
            if (localUrl.endsWith(':11434') || localUrl.endsWith(':11434/')) {
                localUrl = localUrl.replace(/\/+$/, '') + '/api/chat';
            }

            const isOpenAIFormat = localUrl.includes('/v1/chat/completions');

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout untuk inferensi lokal

            try {
                // Request body dioptimalkan untuk Ollama (think: false, format: json)
                const requestBody = isOpenAIFormat ? {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    response_format: { type: 'json_object' },
                    think: false,
                    options: {
                        num_predict: 500,
                        temperature: 0.2
                    }
                } : {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    format: 'json',
                    think: false,
                    options: {
                        num_predict: 500,
                        temperature: 0.2
                    }
                };

                const response = await fetch(localUrl, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    const errorText = await response.text();
                    return res.status(502).json({
                        success: false,
                        message: `Gagal analisis ${localLabel}: Server lokal mengembalikan HTTP ${response.status}: ${errorText}`
                    });
                }

                const data = await response.json();
                if (data.message && data.message.content) {
                    aiRawContent = data.message.content;
                } else if (data.choices && data.choices[0] && data.choices[0].message) {
                    aiRawContent = data.choices[0].message.content;
                } else {
                    return res.status(502).json({
                        success: false,
                        message: `Gagal analisis ${localLabel}: Format respons tidak dikenal dari Ollama.`
                    });
                }
            } catch (err) {
                clearTimeout(timeout);
                const isAbort = err.name === 'AbortError';
                return res.status(502).json({
                    success: false,
                    message: isAbort
                        ? `Gagal analisis ${localLabel}: Waktu inferensi lokal habis (timeout 120 detik). Silakan coba lagi.`
                        : `Gagal analisis ${localLabel}: Tidak dapat tersambung ke Ollama (${localUrl}). Pastikan Ollama berjalan dengan model ${model}.`
                });
            }
        }

        // 11. Ekstraksi dan Validasi JSON dari AI
        let parsed = null;
        try {
            parsed = extractJSON(aiRawContent);
        } catch (parseErr) {
            return res.status(502).json({
                success: false,
                message: `Gagal analisis: Respons AI tidak dapat diurai sebagai JSON valid. Detail: ${parseErr.message}`
            });
        }

        if (!parsed || typeof parsed.score === 'undefined' || !parsed.status || !parsed.diagnosis) {
            return res.status(502).json({
                success: false,
                message: 'Gagal analisis: Respons AI tidak memuat data evaluasi yang lengkap (score, status, diagnosis).'
            });
        }

        // Harmonize score & status agar konsisten secara ilmiah dan visual
        let finalScore = Math.max(0, Math.min(100, Math.round(parsed.score)));
        let finalStatus = parsed.status;

        // Jika status "Optimal" tetapi skor terlalu rendah (< 50), sesuaikan skor dengan bobot kepatuhan ASHRAE
        if ((finalStatus === 'Stabil & Normal' || finalStatus === 'Kondisi Optimal' || finalStatus === 'Optimal') && finalScore < 50) {
            finalScore = Math.max(finalScore, Math.min(85, Math.round(anomalyResult.ashraeCompliancePct * 0.8 + 20)));
        }

        // Sinkronisasi status dengan 3 kategori: Optimal, Perlu Penyesuaian, Anomali Termal
        const sLower = (finalStatus || '').toLowerCase();
        if (sLower.includes('anomali') || finalScore < 50) {
            finalStatus = 'Anomali Termal';
        } else if (sLower.includes('penyesuaian') || finalScore < 75) {
            finalStatus = 'Perlu Penyesuaian';
        } else {
            finalStatus = 'Optimal';
        }

        // 12. Return Data Sukses — diperkaya dengan data riil
        return res.json({
            success: true,
            engine: engineName,
            engineType: engine,
            device: { sn, name, room },
            data: {
                score: finalScore,
                status: finalStatus,
                scoreDesc: parsed.scoreDesc || `Evaluasi kenyamanan termal ruangan ${room}`,
                stabilityPct,    // dihitung dari standar deviasi riil, bukan asal-asalan
                sdTemp,
                sdHum,
                avgTemp,
                minTemp,
                maxTemp,
                avgHum,
                minHum,
                maxHum,
                peakHours: `${String(peakHour).padStart(2, '0')}:00 - ${String(peakHour + 1).padStart(2, '0')}:00`,
                peakDesc: `Suhu tertinggi mencapai ${maxTemp}°C pada periode beban puncak.`,
                diagnosis: parsed.diagnosis,
                recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [parsed.recommendations],
                // Data kepatuhan standar
                compliance: {
                    ashraeCompliancePct: anomalyResult.ashraeCompliancePct,
                    ashraeTempViolationPct: anomalyResult.ashraeTempPct,
                    ashraeHumViolationPct: anomalyResult.ashraeHumPct,
                    anomalies: anomalyResult.anomalies
                },
                // Integritas sensor dinamis
                sensorIntegrity: {
                    score: integrity.integrityScore,
                    status: integrity.status,
                    color: integrity.color,
                    issues: integrity.issues
                },
                // Data kualitas
                dataQuality: {
                    totalRawSamples: totalRawRows,
                    validSamples: rows.length,
                    outlierCount
                },
                hourlyData: {
                    labels,
                    tempData,
                    humData
                }
            }
        });

    } catch (dbOrSystemErr) {
        return res.status(500).json({
            success: false,
            message: `Gagal analisis sistem: ${dbOrSystemErr.message}`
        });
    }
};

module.exports = {
    analyzeTelemetry
};
