
        const token = checkAuth();

        let selectedDeviceSN = 'SN-ESP32-001';
        let deviceLastSeen = {};

        // Menu Toggle
        document.getElementById("menu-toggle").addEventListener("click", function (e) {
            e.preventDefault();
            document.getElementById("wrapper").classList.toggle("toggled");
            const sidebar = document.getElementById("sidebar-wrapper");
            if (sidebar.style.marginLeft === "-250px") sidebar.style.marginLeft = "0";
            else sidebar.style.marginLeft = "-250px";
        });

        // === INISIALISASI CHART.JS ===
        const initialLabels = Array(10).fill('');
        const initialData = Array(10).fill(null);
        let isFilterActive = false;

        // Set tanggal hari ini sebagai default di filter kalender
        window.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            document.getElementById('chartFilterDate').value = `${yyyy}-${mm}-${dd}`;
        });

        function createChartConfig(color, bgColor, labelText, yUnit) {
            return {
                type: 'line',
                data: {
                    labels: [...initialLabels],
                    datasets: [{
                        label: labelText,
                        data: [...initialData],
                        borderColor: color,
                        backgroundColor: bgColor,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        spanGaps: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    spanGaps: true,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        x: { ticks: { maxTicksLimit: 12, maxRotation: 45, minRotation: 0 } },
                        y: {
                            min: 0,
                            max: 100,
                            title: { display: true, text: yUnit, align: 'end', color: color, font: { weight: 'bold' } }
                        }
                    },
                    plugins: { legend: { display: false } },
                    animation: false,
                    layout: { padding: 0 }
                }
            };
        }

        const chartSuhu = new Chart(document.getElementById('chartSuhu').getContext('2d'), createChartConfig('#ffc107', 'rgba(255, 193, 7, 0.2)', 'Suhu', '°C'));
        const chartKelembaban = new Chart(document.getElementById('chartKelembaban').getContext('2d'), createChartConfig('#0dcaf0', 'rgba(13, 202, 240, 0.2)', 'Kelembaban', '%'));

        function updateChartData(chart, label, data) {
            chart.data.labels.push(label);
            chart.data.labels.shift();
            chart.data.datasets[0].data.push(data);
            chart.data.datasets[0].data.shift();
            chart.update('none'); // No animation for realtime
        }

        function renderChartsRaw(chart, labels, data) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.update();
        }

        function fetchInitialData() {
            axios.get(`/api/history?limit=10&sn=${selectedDeviceSN}`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => {
                    if (!res.data.data || res.data.data.length === 0) return;
                    const dataChronological = [...res.data.data].reverse();

                    const labels = [];
                    const suhuData = [];
                    const kelembabanData = [];

                    dataChronological.forEach(item => {
                        labels.push(new Date(item.waktu).toLocaleTimeString('id-ID'));
                        suhuData.push(item.suhu);
                        kelembabanData.push(item.kelembaban);
                    });

                    while (labels.length < 10) { labels.unshift(''); suhuData.unshift(null); kelembabanData.unshift(null); }

                    chartSuhu.data.labels = labels; chartSuhu.data.datasets[0].data = suhuData; chartSuhu.update();
                    chartKelembaban.data.labels = labels; chartKelembaban.data.datasets[0].data = kelembabanData; chartKelembaban.update();

                    const latest = res.data.data[0];
                    document.getElementById('val-suhu').innerText = latest.suhu;
                    document.getElementById('val-kelembaban').innerText = latest.kelembaban;
                    document.getElementById('last-update').innerText = new Date(latest.waktu).toLocaleTimeString('id-ID');
                    updateLedUI(latest.status_led === 1 ? 'ON' : 'OFF');

                    // Hitung rata-rata awal
                    let sumSuhu = 0, sumHum = 0;
                    res.data.data.forEach(d => { sumSuhu += d.suhu; sumHum += d.kelembaban; });
                    document.getElementById('avgTempText').innerText = (sumSuhu / res.data.data.length).toFixed(1);
                    document.getElementById('avgHumText').innerText = (sumHum / res.data.data.length).toFixed(1);
                }).catch(err => console.error(err));
        }

        // Panggil saat pertama kali
        fetchInitialData();

        // === FILTER LOGIC ===
        function applyFilter() {
            const dateInput = document.getElementById('chartFilterDate').value;
            if (!dateInput) return;
            isFilterActive = true;

            axios.get(`/api/history/filter?date=${dateInput}&sn=${selectedDeviceSN}`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => {
                    const result = res.data;
                    const labels = result.data.map(d => d.time_label);
                    const temps = result.data.map(d => d.avg_suhu);
                    const hums = result.data.map(d => d.avg_hum);

                    // Auto-scale variabel y sesuai data (hapus batas min & max statis)
                    delete chartSuhu.options.scales.y.min;
                    delete chartSuhu.options.scales.y.max;
                    delete chartKelembaban.options.scales.y.min;
                    delete chartKelembaban.options.scales.y.max;

                    renderChartsRaw(chartSuhu, labels, temps);
                    renderChartsRaw(chartKelembaban, labels, hums);

                    document.getElementById('avgTempText').innerText = result.avgTemp;
                    document.getElementById('avgHumText').innerText = result.avgHum;
                    document.getElementById('avgTempLabel').innerText = `Tanggal: ${result.targetDate}`;
                    document.getElementById('avgHumLabel').innerText = `Tanggal: ${result.targetDate}`;
                }).catch(err => console.error(err));
        }

        function resetDateFilter() {
            isFilterActive = false;
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            document.getElementById('chartFilterDate').value = `${yyyy}-${mm}-${dd}`;
            document.getElementById('avgTempLabel').innerText = 'Realtime';
            document.getElementById('avgHumLabel').innerText = 'Realtime';

            // Kembalikan variabel y ke skala 0-100 untuk data realtime
            chartSuhu.options.scales.y.min = 0;
            chartSuhu.options.scales.y.max = 100;
            chartKelembaban.options.scales.y.min = 0;
            chartKelembaban.options.scales.y.max = 100;

            // Panggil kembali data 10 terakhir tanpa reload web
            fetchInitialData();
        }

        // === DEVICE STATUS LOGIC ===
        /* selectedDeviceSN was here */
        const deviceTimeoutMs = 5000; // 15 detik tanpa data = offline

        // Dummy devices array
        let dashboardDevices = [
            { name: 'ESP32 Main Controller', type: 'NodeMCU ESP32', sn: 'SN-ESP32-001', room: 'Ruang Tamu', status: 'Offline' },
            { name: 'Arduino Sensor Node', type: 'Arduino Uno R3', sn: 'SN-ARD-002', room: 'Kamar Tidur', status: 'Offline' },
            { name: 'ESP8266 Kitchen Node', type: 'Wemos D1 Mini', sn: 'SN-ESP82-003', room: 'Dapur', status: 'Online' },
            { name: 'Raspberry Pi Gateway', type: 'Raspberry Pi 4', sn: 'SN-RPI-004', room: 'Teras Depan', status: 'Online' }
        ];

        function renderDeviceTable() {
            const tbody = document.getElementById('device-status-tbody');
            const badge = document.getElementById('device-count-badge');
            const countOnline = document.getElementById('count-online');
            const countOffline = document.getElementById('count-offline');
            if (!tbody) return;

            let onlineCount = 0, offlineCount = 0;
            let html = '';
            dashboardDevices.forEach(dev => {
                const isOnline = dev.status === 'Online';
                if (isOnline) onlineCount++; else offlineCount++;
                const isSelected = dev.sn === selectedDeviceSN;
                const dot = isOnline
                    ? `<span class="badge rounded-pill bg-success d-inline-flex align-items-center gap-1"><i class="fas fa-circle" style="font-size:7px"></i> Online</span>`
                    : `<span class="badge rounded-pill bg-danger d-inline-flex align-items-center gap-1"><i class="fas fa-circle" style="font-size:7px"></i> Offline</span>`;

                html += `
                <tr onclick="selectDevice('${dev.sn}')" style="cursor:pointer;" class="${isSelected ? 'table-primary' : ''}">
                    <td class="ps-3">
                        <div class="fw-semibold text-dark" style="font-size:0.85rem;">${dev.name}</div>
                        <div class="text-muted" style="font-size:0.75rem;">${dev.sn}</div>
                    </td>
                    <td style="font-size:0.82rem;">${dev.room}</td>
                    <td class="text-center">${dot}</td>
                </tr>`;
            });

            tbody.innerHTML = html;
            if (badge) badge.textContent = `${dashboardDevices.length} Perangkat`;
            if (countOnline) countOnline.textContent = onlineCount;
            if (countOffline) countOffline.textContent = offlineCount;
        }

        // Initial render
        renderDeviceTable();

        
        function checkSelectedDeviceStatus() {
            const dev = dashboardDevices.find(d => d.sn === selectedDeviceSN);
            if (dev && dev.status === 'Offline') {
                document.getElementById('val-suhu').innerText = '--';
                document.getElementById('val-kelembaban').innerText = '--';
                document.getElementById('last-update').innerText = '--:--:--';
                
                chartSuhu.data.labels = initialLabels.slice();
                chartSuhu.data.datasets[0].data = initialData.slice();
                chartSuhu.update();
                
                chartKelembaban.data.labels = initialLabels.slice();
                chartKelembaban.data.datasets[0].data = initialData.slice();
                chartKelembaban.update();
                
                return false;
            }
            return true;
        }

        window.selectDevice = function(sn) {
            selectedDeviceSN = sn;
            renderDeviceTable();
            if (!checkSelectedDeviceStatus()) return; // Jika offline, sudah dikosongkan dan tidak perlu fetch
            
            if (isFilterActive) {
                applyFilter();
            } else {
                fetchInitialData();
            }
        };

                setInterval(() => {
            const now = Date.now();
            let changed = false;
            let selectedStatusChanged = false;
            dashboardDevices.forEach(dev => {
                const lastSeen = deviceLastSeen[dev.sn] || 0;
                const isDevOnline = (now - lastSeen <= deviceTimeoutMs) && lastSeen > 0;
                const newStatus = isDevOnline ? 'Online' : 'Offline';
                if (dev.status !== newStatus) {
                    dev.status = newStatus;
                    changed = true;
                    if (dev.sn === selectedDeviceSN) selectedStatusChanged = true;
                }
            });
            if (changed) renderDeviceTable();
            if (selectedStatusChanged) checkSelectedDeviceStatus();
        }, 1000);

        // === MQTT LOGIC ===
        const MQTT_HOST = 'broker.emqx.io';
        const MQTT_PORT = 8083;
        const clientID = "WebClient_" + parseInt(Math.random() * 1000, 10);
        let mqttClient = new Paho.MQTT.Client(MQTT_HOST, MQTT_PORT, "/mqtt", clientID);

        mqttClient.onConnectionLost = () => {
            document.getElementById('mqtt-status').innerText = 'Koneksi Terputus';
            document.getElementById('mqtt-status').className = 'fw-bold text-danger';
            document.getElementById('mqtt-icon').className = 'fas fa-circle text-danger';
        };

        mqttClient.onMessageArrived = (msg) => {
            if (msg.destinationName === 'tugasiot/sensor') {
                const data = JSON.parse(msg.payloadString);
                const sn = data.sn || 'SN-ESP32-001';
                deviceLastSeen[sn] = Date.now(); // Perbarui waktu terakhir terlihat
                
                // Instantly update status to Online to avoid delay
                let statusChanged = false;
                dashboardDevices.forEach(dev => {
                    if (dev.sn === sn && dev.status !== 'Online') {
                        dev.status = 'Online';
                        statusChanged = true;
                    }
                });
                if (statusChanged) renderDeviceTable();

                if (sn === selectedDeviceSN) {
                    document.getElementById('val-suhu').innerText = data.suhu;
                    document.getElementById('val-kelembaban').innerText = data.kelembaban;

                    const timeStr = new Date().toLocaleTimeString('id-ID');
                    document.getElementById('last-update').innerText = timeStr;

                    if (!isFilterActive) {
                        updateChartData(chartSuhu, timeStr, data.suhu);
                        updateChartData(chartKelembaban, timeStr, data.kelembaban);
                    }
                }
            } else if (msg.destinationName === 'tugasiot/kontrol_led') {
                updateLedUI(msg.payloadString);
            }
        };

        mqttClient.connect({
            onSuccess: () => {
                console.log("MQTT Terhubung");
                document.getElementById('mqtt-status').innerText = 'MQTT Terhubung';
                document.getElementById('mqtt-status').classList.remove('text-danger');
                document.getElementById('mqtt-status').classList.add('text-success');
                document.getElementById('mqtt-icon').className = 'fas fa-circle text-success';

                mqttClient.subscribe('tugasiot/sensor');
                mqttClient.subscribe('tugasiot/kontrol_led');
            }
        });

        // === REALTIME STATUS VIA HTTP PING ===
        const pingStatus = async () => {
            try {
                await axios.post('/api/auth/ping', {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) {
                if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                    logout(); // Logout and redirect to login
                }
                console.error("Gagal ping status online", e);
            }
        };
        pingStatus();
        setInterval(pingStatus, 2000);

        // === KENDALI LED ===
        function toggleLED() {
            const isChecked = document.getElementById('led-toggle').checked;
            const perintah = isChecked ? 'ON' : 'OFF';
            updateLedUI(perintah);

            axios.post('/api/led', { status: perintah }, { headers: { 'Authorization': `Bearer ${token}` } })
                .catch(err => console.error("Gagal mengirim perintah via API:", err));
        }

        function updateLedUI(status) {
            const toggle = document.getElementById('led-toggle');
            const icon = document.getElementById('led-icon');
            const text = document.getElementById('led-status-text');

            if (status === 'ON') {
                toggle.checked = true;
                icon.className = "fas fa-lightbulb text-warning fs-2";
                text.innerText = "Menyala / ON";
                text.className = "text-warning fw-bold";
            } else {
                toggle.checked = false;
                icon.className = "fas fa-lightbulb text-secondary fs-2";
                text.innerText = "Padam / OFF";
                text.className = "text-muted fw-bold";
            }
        }
    