# Panduan Firmware Wemos D1 R32 + Keyestudio Easy Module Shield V1

Program Arduino pada [arduino_iot_node.ino](arduino_iot_node.ino) telah disesuaikan secara khusus untuk kombinasi hardware Anda:
1. **Board:** Wemos D1 R32 (ESP32 Uno form-factor)
2. **Shield:** Keyestudio Easy Module Shield V1

---

## Pemetaan Pin Hardware (Wemos D1 R32 ke Shield)

Berdasarkan pinout Wemos D1 R32 dan skema Keyestudio Shield:

| Komponen Shield | Pin Header Shield | Pin GPIO ESP32 (Wemos D1 R32) | Status / Konfigurasi di Kode |
| :--- | :--- | :--- | :--- |
| **Sensor DHT11** | **D4** | **GPIO 17** | Terbaca otomatis via `#define DHTPIN 17` |
| **Led3 (Biru)** | **D13** | **GPIO 18** | Aktif saat tombol Dashboard ON |
| **Led4 (Merah)** | **D12** | **GPIO 19** | Aktif saat tombol Dashboard ON |
| **Onboard LED** | - | **GPIO 2** | Aktif saat tombol Dashboard ON |

---

## Pengaturan di Arduino IDE

1. **Board:**
   - Pilih menu **Tools > Board > esp32 > WEMOS D1 MINI ESP32** (atau **ESP32 Dev Module**).
2. **Port:**
   - Pilih Port COM USB tempat Wemos D1 R32 terhubung.
3. **Upload Speed:**
   - `921600` atau `115200`.
4. **Library yang Dibutuhkan:**
   - `PubSubClient` (oleh Nick O'Leary)
   - `DHT sensor library` (oleh Adafruit)

---

## Konfigurasi Sebelum Upload

Cukup isi nama dan sandi Wi-Fi pada baris 5–6 di [arduino_iot_node.ino](arduino_iot_node.ino):
```cpp
const char* WIFI_SSID = "NAMA_WIFI_ANDA";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";
```

Setelah di-upload, buka **Serial Monitor** pada baud rate **115200**. Buka Web Dashboard untuk melihat data suhu & kelembaban realtime serta menguji sakelar kendali LED.
