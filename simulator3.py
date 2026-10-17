import paho.mqtt.client as mqtt
import time
import random
import json
import sys

# Mengatasi masalah encoding karakter di Windows Console (cp1252)
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

broker = "broker.emqx.io"
port = 1883
topik_sensor = "tugasiot/sensor"
topik_led = "tugasiot/kontrol_led_3"

status_led = 0  # 0: Padam/OFF, 1: Menyala/ON
sn_perangkat = "SN-ESP82-003"
nama_perangkat = "ESP8266 Kitchen Node (Wemos D1 Mini)"
lokasi_ruangan = "Ruang Dapur"

def kirim_data_sensor():
    # Menghasilkan data ekstrem di Ruang Dapur:
    # Suhu sangat tinggi akibat kompor, oven, dan aktivitas memasak (42.0°C - 58.5°C)
    # Kelembaban sangat tinggi akibat uap air mendidih / steam masakan (82.0% - 96.5%)
    suhu_ekstrem = round(random.uniform(42.0, 58.5), 1)
    hum_ekstrem = round(random.uniform(82.0, 96.5), 1)

    # Efek jika exhaust fan / LED aktif: sedikit penurunan uap/suhu
    if status_led == 1:
        suhu_ekstrem = round(max(38.0, suhu_ekstrem - random.uniform(2.0, 4.0)), 1)
        hum_ekstrem = round(max(75.0, hum_ekstrem - random.uniform(3.0, 5.0)), 1)

    data_sensor = {
        "suhu": suhu_ekstrem,
        "kelembaban": hum_ekstrem,
        "status_led": status_led,
        "sn": sn_perangkat
    }

    pesan_json = json.dumps(data_sensor)
    client.publish(topik_sensor, pesan_json)
    waktu_sekarang = time.strftime("%H:%M:%S")
    print(f"[{waktu_sekarang}] [EKSTREM DAPUR] {sn_perangkat} -> Suhu: {suhu_ekstrem} C | Kelembaban: {hum_ekstrem}% | LED: {'ON' if status_led == 1 else 'OFF'}")

def on_connect(client, userdata, flags, rc, *args):
    if rc == 0:
        print(f"[SUCCESS] Terhubung ke Broker MQTT ({broker}:{port})!")
        print(f"[INFO] Perangkat: {nama_perangkat} ({sn_perangkat})")
        print(f"[INFO] Lokasi: {lokasi_ruangan} (Kondisi Termal Ekstrem)")
        print(f"[INFO] Subscribe topik kontrol: {topik_led}")
        client.subscribe(topik_led)
    else:
        print(f"[FAILED] Gagal terhubung ke broker, kode: {rc}")

def on_message(client, userdata, message):
    global status_led
    try:
        pesan = message.payload.decode("utf-8")
        print(f"[MQTT] Perintah kontrol diterima di Dapur: {pesan}")

        if pesan == "ON":
            status_led = 1
            print("[ACTION] LED / Exhaust Dapur Dinyalakan!")
            kirim_data_sensor()
        elif pesan == "OFF":
            status_led = 0
            print("[ACTION] LED / Exhaust Dapur Dimatikan!")
            kirim_data_sensor()
    except Exception as e:
        print(f"[ERROR] Gagal memproses pesan: {e}")

# Inisialisasi client MQTT dengan kompatibilitas versi paho-mqtt
try:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
except AttributeError:
    client = mqtt.Client()

client.on_connect = on_connect
client.on_message = on_message

# Mekanisme retry koneksi awal
max_retries = 5
for attempt in range(max_retries):
    try:
        print(f"[INFO] Menghubungkan {nama_perangkat} ke {broker}:{port} (Percobaan {attempt + 1}/{max_retries})...")
        client.connect(broker, port, keepalive=60)
        break
    except TimeoutError:
        print("[WARN] Koneksi timeout, mencoba lagi dalam 4 detik...")
        time.sleep(4)
    except Exception as e:
        print(f"[ERROR] Kesalahan koneksi: {e}")
        time.sleep(4)
else:
    print("[ERROR] Gagal terhubung ke broker setelah 5 percobaan.")
    sys.exit(1)

client.loop_start()

print(f"\n[START] Simulator {nama_perangkat} ({lokasi_ruangan}) Aktif!")
print("        Rentang Suhu: 42.0 C - 58.5 C | Rentang Kelembaban: 82.0% - 96.5%\n")

try:
    while True:
        kirim_data_sensor()
        time.sleep(2)
except KeyboardInterrupt:
    print("\n[STOP] Simulator Dapur dihentikan.")
    client.loop_stop()
