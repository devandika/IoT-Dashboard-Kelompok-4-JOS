-- ========================================================
-- Schema Database IoT Dashboard (Kelompok 4)
-- Compatible with MySQL 8.0, MariaDB, and TiDB Cloud Serverless
-- ========================================================

CREATE TABLE IF NOT EXISTS `devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sn` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) DEFAULT 'ESP32',
  `room` varchar(100) NOT NULL,
  `ip` varchar(50) DEFAULT '-',
  `status` enum('Online','Offline') DEFAULT 'Offline',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sn` (`sn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `histori_sensor` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `waktu` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `suhu` float NOT NULL,
  `kelembaban` float NOT NULL,
  `status_led` tinyint(1) NOT NULL DEFAULT 0,
  `sn` varchar(50) DEFAULT 'SN-ESP32-001',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','User') NOT NULL DEFAULT 'User',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- Seed Data Perangkat
-- ========================================================
INSERT INTO `devices` (`id`, `sn`, `name`, `type`, `room`, `ip`, `status`) VALUES
(1, 'SN-ESP32-001', 'ESP32 Main Controller', 'NodeMCU ESP32', 'Ruang Tamu', '192.168.1.101', 'Offline'),
(2, 'SN-ARD-002', 'Arduino Sensor Node', 'Arduino Uno R3', 'Kamar Tidur', '192.168.1.102', 'Offline'),
(3, 'SN-ESP82-003', 'ESP8266 Kitchen Node', 'Wemos D1 Mini', 'Dapur', '192.168.1.103', 'Offline'),
(4, 'SN-RPI-004', 'Raspberry Pi Gateway', 'Raspberry Pi 4', 'Teras Depan', '192.168.1.104', 'Offline'),
(48, 'SN-ESP32-005', 'Wemos Rayhan', 'Wemos D2 R32', 'Kamar Rayhan', '192.168.43.81', 'Offline')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `ip` = VALUES(`ip`);

-- ========================================================
-- Seed Data Akun Pengguna (Termasuk password hash default)
-- Password default 'admin123' untuk admin, '123456' untuk user
-- ========================================================
INSERT INTO `users` (`id`, `username`, `password`, `role`) VALUES
(1, 'admin', '$2b$10$7Y/ud20JwoLsFT3RO0IB7e08kVlENxpRDyNT.KkpkpHjaTDxIqeue', 'Admin'),
(6, 'albert', '$2b$10$krvXRtkEDvrGRWG/LUr5bOtltd5HMmYEZy4RRngg/LhTU4SXCT0ui', 'User'),
(7, 'abel', '$2b$10$GapMXtcDIshxCPXSpATB5Omc1TtnN/GQOtHV2o2HtlMfsKNs30jaO', 'User'),
(9, 'tatan', '$2b$10$G6OUPFALNvjtm1N7Qu0edebS.mLMFrdU58chhTuUk7UQ/2/0FDbh.', 'User'),
(11, 'triii', '$2b$10$hEvyzpLQRk78Kx0L2BeuSexer3dQZKp2loig9PZuXMjimSOfu3Jje', 'User'),
(13, 'tes', '$2b$10$9XvfONzoHEeBL8WgnRCz6.KjUTVcgY6khhgGG.ewJ7qNViU1vUpUy', 'User'),
(14, 'depan', '$2b$10$NtxDrHm7lI/52FtiCGNfo.CCyfZCbzYeN2Z/smTJLZMrHkhFicjCK', 'User'),
(15, 'petruk', '$2b$10$KqvpN8sS4wXR8sER.jThLu6TZ0Szx2OJEGOaSp0m1YPtk7eY9A1KO', 'User')
ON DUPLICATE KEY UPDATE `role` = VALUES(`role`);
