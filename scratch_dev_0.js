
        checkAuth();

        document.getElementById("menu-toggle").addEventListener("click", function (e) {
            e.preventDefault();
            document.getElementById("wrapper").classList.toggle("toggled");
            const sidebar = document.getElementById("sidebar-wrapper");
            if (sidebar.style.marginLeft === "-250px") sidebar.style.marginLeft = "0";
            else sidebar.style.marginLeft = "-250px";
        });

        // Dummy Devices Data
        let devices = [
            { name: 'ESP32 Main Controller', type: 'NodeMCU ESP32', sn: 'SN-ESP32-001', ip: '192.168.1.101', room: 'Ruang Tamu', status: 'Offline' },
            { name: 'Arduino Sensor Node', type: 'Arduino Uno R3', sn: 'SN-ARD-002', ip: '192.168.1.102', room: 'Kamar Tidur', status: 'Offline' },
            { name: 'ESP8266 Kitchen Node', type: 'Wemos D1 Mini', sn: 'SN-ESP82-003', ip: '192.168.1.103', room: 'Dapur', status: 'Offline' },
            { name: 'Raspberry Pi Gateway', type: 'Raspberry Pi 4', sn: 'SN-RPI-004', ip: '192.168.1.104', room: 'Teras Depan', status: 'Offline' }
        ];
        
        let deviceLastSeen = {};
        const deviceTimeoutMs = 5000;

        function renderDevices() {
            const tbody = document.getElementById('devices-tbody');
            tbody.innerHTML = '';
            devices.forEach((dev, index) => {
                const badgeClass = dev.status === 'Online' ? 'bg-success' : 'bg-danger';
                tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="fw-bold">${dev.name}</td>
                    <td>${dev.type}</td>
                    <td>${dev.sn}</td>
                    <td>${dev.ip}</td>
                    <td>${dev.room}</td>
                    <td><span class="badge ${badgeClass}">${dev.status}</span></td>
                </tr>
            `;
            });
        }

        let devModal;
        document.addEventListener('DOMContentLoaded', () => {
            devModal = new bootstrap.Modal(document.getElementById('deviceModal'));
            renderDevices();
        });

        function openAddDeviceModal() {
            document.getElementById('deviceForm').reset();
            devModal.show();
        }

        function addDummyDevice() {
            const name = document.getElementById('devName').value;
            const type = document.getElementById('devType').value;
            const sn = document.getElementById('devSN').value;
            const ip = document.getElementById('devIP').value;
            const room = document.getElementById('devRoom').value;

            if (!name || !type || !sn || !ip || !room) {
                alert('Semua data wajib diisi!');
                return;
            }

            devices.push({
                name, type, sn, ip, room, status: 'Offline' // Default dummy status
            });

            renderDevices();
            devModal.hide();
        }


        // === MQTT LOGIC ===
        const MQTT_HOST = 'broker.emqx.io';
        const MQTT_PORT = 8083;
        const clientID = "WebClient_Dev_" + parseInt(Math.random() * 1000, 10);
        let mqttClient = new Paho.MQTT.Client(MQTT_HOST, MQTT_PORT, "/mqtt", clientID);

        mqttClient.onMessageArrived = (msg) => {
            if (msg.destinationName === 'tugasiot/sensor') {
                const data = JSON.parse(msg.payloadString);
                const sn = data.sn || 'SN-ESP32-001';
                deviceLastSeen[sn] = Date.now();
                
                let statusChanged = false;
                devices.forEach(dev => {
                    if (dev.sn === sn && dev.status !== 'Online') {
                        dev.status = 'Online';
                        statusChanged = true;
                    }
                });
                if (statusChanged) renderDevices();
            }
        };

        mqttClient.connect({
            onSuccess: () => {
                console.log("MQTT Terhubung di Menu Perangkat");
                mqttClient.subscribe('tugasiot/sensor');
            }
        });

        setInterval(() => {
            const now = Date.now();
            let changed = false;
            devices.forEach(dev => {
                const lastSeen = deviceLastSeen[dev.sn] || 0;
                const isDevOnline = (now - lastSeen <= deviceTimeoutMs) && lastSeen > 0;
                const newStatus = isDevOnline ? 'Online' : 'Offline';
                if (dev.status !== newStatus) {
                    dev.status = newStatus;
                    changed = true;
                }
            });
            if (changed) renderDevices();
        }, 1000);
    