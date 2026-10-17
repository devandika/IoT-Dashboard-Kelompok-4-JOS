# Dokumentasi Penambahan & Pembaruan Fitur Projek IoT (Kelompok 4)

Dokumen ini merangkum seluruh fitur baru, pembaruan arsitektur sistem, peningkatan algoritma AI, dan integrasi perangkat keras yang telah ditambahkan ke dalam projek IoT ini.

---

## 1. Integrasi Perangkat Keras Fisik (Wemos D1 R32 + Keyestudio Shield)
Program Arduino sketch telah dibuat dan disinkronkan secara penuh dengan Web Dashboard dan Backend MQTT.

* **Lokasi File:** 
  * [`arduino_iot_node/arduino_iot_node.ino`](arduino_iot_node/arduino_iot_node.ino)
  * [`arduino_iot_node/README.md`](arduino_iot_node/README.md)
* **Spesifikasi Hardware:**
  * **Mikrokontroler:** Wemos D1 R32 (ESP32 dalam form-factor Arduino Uno).
  * **Shield:** Keyestudio Easy Module Shield V1.
* **Pemetaan Pin Hardware:**
  * **Sensor Suhu & Kelembaban (DHT11):** Pin Shield **D4** $\rightarrow$ **GPIO 17** ESP32.
  * **LED Aktuator 1 (Led3 Biru):** Pin Shield **D13** $\rightarrow$ **GPIO 18** ESP32.
  * **LED Aktuator 2 (Led4 Merah):** Pin Shield **D12** $\rightarrow$ **GPIO 19** ESP32.
  * **LED Onboard ESP32:** **GPIO 2** (Aktif bersamaan saat sakelar web ON).
  * **Buzzer:** Pin Shield **D5** $\rightarrow$ **GPIO 16** (Alarm saat kondisi termal melebihi batas).
  * **RGB LED:** Pin Shield **D9 (R=13), D10 (G=5), D11 (B=23)**.
* **Fitur Utama Firmware:**
  * **WiFiManager:** Portal konfigurasi Wi-Fi mandiri (Access Point: `ESP32-Kelompok4`) tanpa perlu *hardcode* SSID/Password.
  * **Dual Core Multitasking (FreeRTOS):** Task MQTT berjalan terpisah di Core 0 agar loop sensor di Core 1 tidak terganggu latency jaringan.
  * **ArduinoOTA:** Kemampuan upload dan update firmware secara nirkabel via jaringan Wi-Fi.
  * **Clean Code:** Seluruh baris komentar `//` dan `/* */` dibersihkan.

---

## 2. Manajemen Perangkat Baru ke Database (Device Management)
Sistem kini mendukung penambahan perangkat baru yang tersimpan secara permanen ke database MySQL.

* **Tabel Database:** `devices` (Dibuat otomatis jika belum ada).
  * Kolom: `id`, `sn` (UNIQUE), `name`, `type`, `room`, `ip`, `status`, `created_at`, `updated_at`.
* **Perangkat Bawaan (Seed Otomatis):**
  1. `SN-ESP32-001` — ESP32 Main Controller (Ruang Tamu)
  2. `SN-ARD-002` — Arduino Sensor Node (Kamar Tidur)
  3. `SN-ESP82-003` — ESP8266 Kitchen Node (Dapur)
  4. `SN-RPI-004` — Raspberry Pi Gateway (Teras Depan)
* **REST API Endpoints:**
  * `GET /api/devices` : Mengambil seluruh daftar perangkat terdaftar.
  * `POST /api/devices` : Menambahkan perangkat baru (Validasi serial number unik).
  * `PUT /api/devices/:id` : Mengedit informasi perangkat.
  * `DELETE /api/devices/:id` : Menghapus perangkat dari database.
* **Fitur di Web Dashboard:**
  * Modal interaktif **"Tambah Perangkat Baru"** (Nama, Tipe, SN, Ruangan, IP).
  * Status **Online / Offline** realtime berdasarkan waktu terakhir data diterima via MQTT.
  * Counter status aktif: *"x / y Online"*.
  * Filter otomatis grafik dan metrik saat baris perangkat diklik.

---

## 3. Simulator Lingkungan Ekstrem Dapur (Wemos D1 Mini)
Ditambahkan script simulator baru untuk merepresentasikan kondisi lingkungan dapur dengan fluktuasi ekstrem.

* **File:** [`simulator3.py`](simulator3.py)
* **Identitas:** `SN-ESP82-003` (ESP8266 Kitchen Node di Ruang Dapur).
* **Karakteristik Data Dummy:**
  * Suhu sangat tinggi: **42.0°C – 58.5°C** (akibat panas kompor/oven).
  * Kelembaban tinggi: **82.0% – 96.5%** (akibat uap masakan).
  * **Interaktivitas Sakelar:** Ketika sakelar LED / Exhaust Dapur dinyalakan melalui dashboard web (topik `tugasiot/kontrol_led_3`), suhu dan kelembaban akan berangsur turun secara otomatis sebagai simulasi sistem ventilasi pendingin.

---

## 4. Pembaruan Layanan MQTT Dinamis (Smart Routing)
Peningkatan pada modul backend MQTT agar perangkat fisik kustom dapat langsung dikontrol tanpa mengubah kode backend.

* **File:** [`backend/services/mqttService.js`](backend/services/mqttService.js)
* **Fungsi `publishLedControl(status, sn)`:**
  * Mendukung rute perangkat bawaan (`tugasiot/kontrol_led`, `_2`, `_3`, `_4`).
  * **Pembaruan:** Secara otomatis mempublikasikan perintah sakelar ke topik spesifik perangkat baru:
    * `tugasiot/kontrol_led_<SN>`
    * `tugasiot/kontrol_led/<SN>`
  * Format payload sakelar: `"ON"` dan `"OFF"` (mendukung fallback `"1"` dan `"0"`).

---

## 5. Peningkatan Algoritma Analisis AI 24 Jam
Penyempurnaan signifikan pada engine analitik telemetri untuk menghasilkan laporan berbasis data ilmiah.

* **File:** [`backend/controllers/aiController.js`](backend/controllers/aiController.js)
* **Fitur & Peningkatan:**
  * **Perhitungan Stabilitas Nyata (Dynamic Stability Index):** Mengganti nilai statis *94%* lama dengan perhitungan **Coefficient of Variation (CV)** dari standar deviasi fluktuasi suhu dan kelembaban 24 jam terakhir.
  * **Evaluasi Kenyamanan Berstandar Industri:**
    * Standar Internasional: **ASHRAE 55** (Suhu 20–26°C, Kelembaban 30–60%).
    * Standar Nasional Indonesia: **SNI 03-6572** (Suhu Nyaman 22.8–25.8°C).
  * **Penyaringan Outlier (Outlier Filter):** Mengeliminasi lonjakan angka yang mustahil secara fisik sebelum diolah oleh model AI.
  * **Penilaian Integritas Sensor (Sensor Health Check):** Mengukur stabilitas hardware berdasarkan rate kelengkapan data transmisi MQTT.
  * **Perbaikan Grafik Deret Waktu:** Menghindari garis interpolasi palsu pada jam tanpa data dengan menyisipkan nilai `null` terstruktur.

---

## 6. Desain Antarmuka (UI/UX) Impeccable Modal AI
Pembaruan menyeluruh pada tampilan visual popup modal analisis AI agar rapi, modern, dan seimbang.

* **File:** [`frontend/index.html`](frontend/index.html) & [`frontend/css/style.css`](frontend/css/style.css)
* **Kerapian Layout (Single-Screen Fit):**
  * Ukuran modal terkunci pas 1 layar (`max-height: calc(100vh - 28px)`), menghilangkan scrollbar ganda.
  * Lebar dialog diperbaiki menjadi **880px** simetris (menghilangkan sisa ruang kosong di sisi kiri/kanan).
* **Kartu Pilihan Arsitektur AI (Dual Engine):**
  * **AI Lokal (Qwen 2.5):** Aksen garis atas biru langit (`#0284c7`), badge hijau *"100% Privat & Offline"*, dan tombol aksi gradien biru laut.
  * **AI Cloud (Groq):** Aksen garis atas indigo (`#6366f1`), badge ungu *"Groq LPU Super Cepat"*, dan tombol aksi gradien royal indigo.
  * Dilengkapi daftar fitur bertanda centang bersih dan tag subtitle informatif.
* **Header Konteks Perangkat:**
  * Menggunakan *metadata pill badge* modern: `ESP32 Main Controller • Ruang Tamu • SN-ESP32-001`.
  * Ikon AI Brain dengan aksen radial biru lembut.
* **Tombol Tutup (X):**
  * **Tombol X di pojok kanan atas telah dihapus** agar tidak terjadi tombol ganda.
  * **Hanya 1 tombol X di bagian bawah tengah**: Berbentuk lingkaran biru muda (*soft light blue circle*, `#e0f2fe`) dengan ikon silang biru (`#0284c7`), border halus (`#bae6fd`), dan efek hover glow interaktif.
* **Status Badges & Micro-Chips:**
  * Mengganti badge lama yang kaku dengan *soft badge* modern: `badge-soft-optimal`, `badge-soft-normal`, `badge-soft-warning`, dan `badge-soft-danger`.
  * Penambahan micro-chip nilai Min & Max suhu dan kelembaban dengan panah indikator tren.

---

## 7. Penyelarasan UI Sidebar & Standardisasi Tabel Antarmuka
Penyempurnaan visual konsistensi antarmuka pengguna di seluruh halaman dashboard web.

* **File:** Seluruh file HTML di [`frontend/`](frontend/) & [`frontend/css/style.css`](frontend/css/style.css).
* **Penyelarasan Teks Menu Sidebar:**
  * Seluruh ikon navigasi samping diberikan constraint `min-width: 24px` dan utility `fa-fw` (Fixed Width), sehingga teks label menu (`Dashboard`, `Data Sensor`, `Data Aktuator`, `Daftar Perangkat`, `Riwayat Analisis AI`, `Pengguna`) rata lurus secara vertikal.
* **Pembaruan Ikon Menu Aktuator:**
  * Mengganti ikon menu **"Data Aktuator"** dari roda gigi (`fas fa-cog`) menjadi lampu bohlam (`fas fa-lightbulb`), lebih intuitif merepresentasikan kendali aktuator lampu/relay.
* **Standardisasi Format Tabel (Meniru Presisi Tabel Perangkat):**
  * Tabel pada halaman **Riwayat Analisis AI** ([`frontend/ai-history.html`](frontend/ai-history.html)) dan **Manajemen Pengguna** ([`frontend/users.html`](frontend/users.html)) distandarisasi 100% mengikuti referensi tabel pada [`frontend/devices.html`](frontend/devices.html):
    * Kartu pembungkus dengan lengkungan sudut modern: `rounded-4 border-0 shadow-sm`.
    * Header tabel konsisten: font size 13px, font weight semibold (600), teks uppercase berjarak, dan background abu-abu lembut (`#f8fafc`).
    * Badge status pill lembut: `rounded-pill px-3 py-2 font-monospace`.
    * Tombol aksi sirkular 32x32px presisi dengan transisi halus dan efek hover scale.

---

## 8. Arsitektur Database Fleksibel (XAMPP Lokal & Cloud Hybrid)
Sistem dikonfigurasi dengan arsitektur fleksibel yang mendukung database MySQL lokal (XAMPP/phpMyAdmin) sebagai mode utama, serta siap beralih ke Cloud MySQL (TiDB Cloud) kapan saja hanya melalui pengaturan variabel lingkungan.

* **Mode Aktif Saat Ini:** **MySQL Lokal (XAMPP / phpMyAdmin)**.
  * Host: `localhost`
  * Port: `3306`
  * Database: `tugasiot_4`
  * User: `root` (Password kosong)
  * SSL: Dinonaktifkan (`DB_SSL=false`)
* **Dukungan Cloud Ready:**
  * Driver pool di [`backend/config/db.js`](backend/config/db.js) dirancang otomatis mendeteksi apakah host berada di cloud (mengaktifkan SSL) atau lokal (tanpa SSL).
  * Kredensial TiDB Cloud Serverless tetap tersimpan sebagai cadangan jika sewaktu-waktu ingin beralih ke cloud.

---

## 9. Sistem Inisialisasi & Seeding Tabel Otomatis (Auto-Migration)
Penambahan modul migrasi otomatis agar database lokal maupun cloud langsung siap pakai tanpa perlu mengeksekusi script SQL manual.

* **File Baru:** [`backend/config/initDb.js`](backend/config/initDb.js)
* **Mekanisme Kerja:**
  * Saat server Node.js dijalankan (`npm start`), fungsi `initializeDatabase()` dieksekusi secara asinkron.
  * Memeriksa dan membuat tabel secara otomatis jika belum tersedia:
    1. `CREATE TABLE IF NOT EXISTS devices ...`
    2. `CREATE TABLE IF NOT EXISTS histori_sensor ...`
    3. `CREATE TABLE IF NOT EXISTS users ...`
  * Menyuntikkan data awal (*auto-seed*) dengan pengaman `ON DUPLICATE KEY UPDATE`:
    * 5 perangkat awal lengkap dengan serial number dan ruangan.
    * Akun pengguna lengkap (admin + user) dengan password terenkripsi bcrypt.

---

## 10. Kesiapan Deployment Cloud & Repositori GitHub
Struktur proyek diperbarui agar memenuhi standar deployment modern (*zero-config deployment*).

* **File:** [`package.json`](package.json) (Root) & [`database_schema.sql`](database_schema.sql).
* **Fitur Port Dinamis:**
  * File [`backend/server.js`](backend/server.js) telah disesuaikan menggunakan `process.env.PORT || 8080` untuk mendukung deteksi port otomatis penyedia hosting cloud (Render, Railway, Hugging Face, dsb).
* **Root Package Script:**
  * Root `package.json` menyatukan skrip eksekusi `npm start` $\rightarrow$ `node backend/server.js` untuk build otomatis.
* **Sinkronisasi Repositori GitHub:**
  * Repositori resmi tersinkronisasi di: **`https://github.com/devandika/IoT-Dashboard-Kelompok-4-JOS.git`** (Branch: `main`).
  * File credential rahasia [`.env`](backend/.env) dan file dump lokal besar secara ketat diabaikan oleh [`.gitignore`](.gitignore) demi menjaga keamanan kredensial.

---

## 11. Pelacakan Status Realtime & Heartbeat Timeout Perangkat
Pembaruan cerdas pada penanganan status perangkat (*Online / Offline*) baik di level basis data maupun antarmuka dashboard.

* **File:** [`backend/services/mqttService.js`](backend/services/mqttService.js) & [`backend/controllers/deviceController.js`](backend/controllers/deviceController.js).
* **Auto-Update `'Online'`:** Setiap kali ada data telemetri MQTT masuk dari ESP32 atau simulator, backend secara otomatis memperbarui kolom `status = 'Online'`, waktu `updated_at`, dan IP perangkat di tabel `devices`.
* **Mekanisme Heartbeat (Auto-Set `'Offline'`):**
  * Backend menjalankan interval pemantauan setiap 10 detik.
  * Jika perangkat tidak mengirimkan data selama lebih dari 30 detik (misal ESP32 dicabut atau simulator dihentikan), status perangkat di tabel `devices` akan otomatis diubah kembali menjadi `'Offline'`.
  * Endpoint REST API `GET /api/devices` juga menghitung status dinamis berdasarkan interval 30 detik terakhir secara konsisten.

---

*Dokumentasi ini dibuat otomatis sebagai referensi teknis integrasi sistem IoT Tugas Kelompok 4.*
