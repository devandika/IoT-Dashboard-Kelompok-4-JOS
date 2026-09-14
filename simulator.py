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
        "status_led": status_led
    }
    pesan_json = json.dumps(data_sensor)
    client.publish(topik_sensor, pesan_json)
    waktu_sekarang = time.strftime("%H:%M:%S")
    print(f"[{waktu_sekarang}] Mengirim data ke broker: {pesan_json}")

def on_connect(client, userdata, flags, rc, *args):
    print("[SUCCESS] Terhubung ke Broker MQTT!")
    client.subscribe(topik_led)

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
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
except AttributeError:
    client = mqtt.Client()

client.on_connect = on_connect
client.on_message = on_message
client.connect(broker, port)
client.loop_start()

print("[START] Simulator ESP32 Berjalan...")

try:
    while True:
        kirim_data_sensor()
        time.sleep(2) 
except KeyboardInterrupt:
    print("[STOP] Berhenti.")
    client.loop_stop()