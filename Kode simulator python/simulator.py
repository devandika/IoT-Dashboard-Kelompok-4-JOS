import paho.mqtt.client as mqtt
import time
import random
import json
import sys

# Mengatasi masalah encoding di Windows Console (cp1252)
sys.stdout.reconfigure(encoding='utf-8')

broker = "broker.emqx.io"
port = 1883
topik_sensor = "tugasiot/sensor"
topik_led = "tugasiot/kontrol_led"

status_led = 0 # 0 mati, 1 nyala

def kirim_data_sensor():
    suhu_dummy = round(random.uniform(18.0, 35.0), 1)
    hum_dummy = round(random.uniform(50.0, 80.0), 1)
    
    data_sensor = {
        "suhu": suhu_dummy,
        "kelembaban": hum_dummy,
        "status_led": status_led,
        "sn": "SN-ESP32-001"
    }
    pesan_json = json.dumps(data_sensor)
    client.publish(topik_sensor, pesan_json)
    waktu_sekarang = time.strftime("%H:%M:%S")
    print(f"[{waktu_sekarang}] Mengirim data ke broker: {pesan_json}")

def on_connect(client, userdata, flags, rc, *args):
    if rc == 0:
        print("[SUCCESS] Terhubung ke Broker MQTT!")
        client.subscribe(topik_led)
    else:
        print(f"[FAILED] Gagal terhubung ke broker, kode: {rc}")

def on_message(client, userdata, message):
    global status_led
    pesan = message.payload.decode("utf-8")
    print(f"[MQTT] Perintah masuk dari HP/Server: {pesan}")
    
    if pesan == "ON":
        status_led = 1
        print("[ACTION] LED Dinyalakan!")
        kirim_data_sensor() 
    elif pesan == "OFF":
        status_led = 0
        print("[ACTION] LED Dimatikan!")
        kirim_data_sensor() 

try:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
except AttributeError:
    client = mqtt.Client()

client.on_connect = on_connect
client.on_message = on_message

# Menambahkan retry logic untuk mengatasi TimeoutError
max_retries = 5
for attempt in range(max_retries):
    try:
        print(f"[INFO] Mencoba terhubung ke {broker}:{port} (Percobaan {attempt + 1}/{max_retries})...")
        client.connect(broker, port, keepalive=60)
        break
    except TimeoutError:
        print("[WARN] Koneksi timeout, mencoba lagi dalam 5 detik...")
        time.sleep(5)
    except Exception as e:
        print(f"[ERROR] Kesalahan saat menghubungkan: {e}")
        time.sleep(5)
else:
    print("[ERROR] Gagal terhubung ke broker setelah beberapa percobaan. Keluar dari program.")
    sys.exit(1)

client.loop_start()

print("[START] Simulator ESP32 Berjalan...")

try:
    while True:
        kirim_data_sensor()
        time.sleep(2) 
except KeyboardInterrupt:
    print("[STOP] Berhenti.")
    client.loop_stop()