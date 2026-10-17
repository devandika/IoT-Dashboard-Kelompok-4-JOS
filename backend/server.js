const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mqttService = require('./services/mqttService');

// Routes
const authRoutes = require('./routes/authRoutes');
const historyRoutes = require('./routes/historyRoutes');
const ledRoutes = require('./routes/ledRoutes');
const aiRoutes = require('./routes/aiRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

const app = express();

const initializeDatabase = require('./config/initDb');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Initialize Database schema (auto-create tables if not exists)
initializeDatabase();

// Initialize MQTT
mqttService.initMqtt();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/led', ledRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/devices', deviceRoutes);

// Fallback to index.html for unknown routes (SPA like behavior if needed)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
});
