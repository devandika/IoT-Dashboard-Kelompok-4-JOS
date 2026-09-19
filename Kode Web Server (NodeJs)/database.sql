CREATE DATABASE IF NOT EXISTS tugasiot_4;
USE tugasiot_4;

CREATE TABLE IF NOT EXISTS histori_sensor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  suhu FLOAT NOT NULL,
  kelembaban FLOAT NOT NULL,
  status_led TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'User') DEFAULT 'User'
);

-- Default admin account. Password is 'admin123'
INSERT INTO users (username, password, role) 
VALUES ('admin', '$2b$10$VtaPF2DHhjCBwM97Scaxxe/PfLSzV0BFNk8u51nMJYw53pynAw2c.', 'Admin') 
ON DUPLICATE KEY UPDATE username='admin';
