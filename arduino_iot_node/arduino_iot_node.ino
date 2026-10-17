#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <ArduinoOTA.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

#define DHTPIN 17       
#define DHTTYPE DHT11   
#define LED1_PIN 19     
#define LED2_PIN 18     
#define BUZZER_PIN 16   

#define RGB_R 13        
#define RGB_G 5         
#define RGB_B 23        

const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* topik_sensor = "tugasiot/sensor";
const char* topik_kontrol_led = "tugasiot/kontrol_led";
const char* device_sn = "SN-ESP32-005";

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient mqtt(espClient);

unsigned long lastDHTTime = 0;
unsigned long dhtDelay = 2000;  

unsigned long previousBlinkMillis = 0;
const long blinkInterval = 500; 
bool led2State = LOW;
bool isBuzzerOn = false; 

volatile float tempTerakhir = 28.0;
volatile float humTerakhir = 60.0;
volatile bool sensorValid = false; 
volatile int status_led = 0;

TaskHandle_t TaskMQTT;
void tugasMQTT(void * pvParameters);
void mqttCallback(char* topic, byte* payload, unsigned int length);

void setLedState(int state) {
  status_led = (state == 1) ? 1 : 0;
  if (status_led == 1) {
    digitalWrite(LED1_PIN, HIGH);
    digitalWrite(LED2_PIN, HIGH);
    analogWrite(RGB_R, 0);
    analogWrite(RGB_G, 255);
    analogWrite(RGB_B, 0);
  } else {
    digitalWrite(LED1_PIN, LOW);
    digitalWrite(LED2_PIN, LOW);
    analogWrite(RGB_R, 0);
    analogWrite(RGB_G, 0);
    analogWrite(RGB_B, 0);
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();

  Serial.print("[MQTT RX]: ");
  Serial.println(message);

  if (message.startsWith("{")) {
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    if (!error && doc.containsKey("r") && doc.containsKey("g") && doc.containsKey("b")) {
      int r = doc["r"];
      int g = doc["g"];
      int b = doc["b"];
      analogWrite(RGB_R, r);
      analogWrite(RGB_G, g);
      analogWrite(RGB_B, b);
      status_led = (r > 0 || g > 0 || b > 0) ? 1 : 0;
    }
  } else if (message.equalsIgnoreCase("ON") || message == "1") {
    setLedState(1);
  } else if (message.equalsIgnoreCase("OFF") || message == "0") {
    setLedState(0);
  }
}

void reconnectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Menghubungkan ke MQTT Broker...");
    String clientId = "ESP32-Kelompok4-" + String(random(0, 1000));
    
    if (mqtt.connect(clientId.c_str())) {
      Serial.println("Terhubung!");
      mqtt.subscribe(topik_kontrol_led);
      String altTopic = String("tugasiot/kontrol_led/") + String(device_sn);
      mqtt.subscribe(altTopic.c_str());
      String altTopic2 = String("tugasiot/kontrol_led_") + String(device_sn);
      mqtt.subscribe(altTopic2.c_str());
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(mqtt.state());
      Serial.println(" Coba lagi dalam 5 detik");
      vTaskDelay(5000 / portTICK_PERIOD_MS);
    }
  }
}

void tugasMQTT(void * pvParameters) {
  unsigned long lastPubTime = 0;
  for (;;) { 
    if (WiFi.status() == WL_CONNECTED) {
      if (!mqtt.connected()) {
        reconnectMQTT();
      }
      mqtt.loop();

      if (millis() - lastPubTime > 2000) {
        StaticJsonDocument<256> doc;
        doc["suhu"] = tempTerakhir;
        doc["kelembaban"] = humTerakhir;
        doc["status_led"] = status_led;
        doc["sn"] = device_sn;
        doc["ip"] = WiFi.localIP().toString();
        
        String jsonString;
        serializeJson(doc, jsonString);
        
        mqtt.publish(topik_sensor, jsonString.c_str());
        Serial.print("[MQTT TX]: ");
        Serial.println(jsonString);
        lastPubTime = millis();
      }
    }
    vTaskDelay(10 / portTICK_PERIOD_MS); 
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(RGB_R, OUTPUT);
  pinMode(RGB_G, OUTPUT);
  pinMode(RGB_B, OUTPUT);
  setLedState(0);
  
  dht.begin();

  WiFiManager wm;
  Serial.println("Menghubungkan ke WiFi...");
  if (!wm.autoConnect("ESP32-Kelompok4")) {
    ESP.restart();
  }
  Serial.println("Berhasil terhubung ke WiFi!");
  Serial.print("IP Address ESP32: ");
  Serial.println(WiFi.localIP());

  tone(BUZZER_PIN, 2000); 
  delay(200);             
  noTone(BUZZER_PIN);

  ArduinoOTA.setHostname("ESP32-TugasIoT");
  ArduinoOTA.begin();

  mqtt.setServer(mqtt_server, mqtt_port);
  mqtt.setCallback(mqttCallback);

  xTaskCreatePinnedToCore(
    tugasMQTT, "TaskMQTT", 10000, NULL, 1, &TaskMQTT, 0
  );
}

void loop() {
  ArduinoOTA.handle();

  unsigned long currentMillis = millis();
  if (currentMillis - previousBlinkMillis >= blinkInterval) {
    previousBlinkMillis = currentMillis;
    if (status_led == 0) {
      led2State = (led2State == LOW) ? HIGH : LOW;
      digitalWrite(LED2_PIN, led2State);
    } else {
      digitalWrite(LED2_PIN, HIGH);
    }

    if (tempTerakhir > 32.0 || humTerakhir > 70.0) {
      if (led2State == HIGH) {
        tone(BUZZER_PIN, 2000); 
        isBuzzerOn = true;      
      } else {
        if (isBuzzerOn) {
          noTone(BUZZER_PIN);   
          isBuzzerOn = false;   
        }
      }
    } else {
      if (isBuzzerOn) {
        noTone(BUZZER_PIN);
        isBuzzerOn = false;
      }
    }
  }

  if ((millis() - lastDHTTime) > dhtDelay) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    
    if (!isnan(t) && !isnan(h)) {
      tempTerakhir = t;
      humTerakhir = h;
      sensorValid = true; 

      Serial.print("[SENSOR] Suhu: ");
      Serial.print(t);
      Serial.print(" C | Hum: ");
      Serial.println(h);

      if (t > 32.0 || h > 70.0) {
        digitalWrite(LED1_PIN, HIGH);
      } else if (status_led == 0) {
        digitalWrite(LED1_PIN, LOW);
      }
    } else {
      sensorValid = false; 
      Serial.println("[ERROR] Gagal membaca sensor!");
      if (status_led == 0) {
        digitalWrite(LED1_PIN, LOW);
      }
      if (isBuzzerOn) {
        noTone(BUZZER_PIN);
        isBuzzerOn = false;
      }
    }
    lastDHTTime = millis();
  }
}
