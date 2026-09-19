const mqttService = require('../services/mqttService');

const controlLed = (req, res) => {
    const { status } = req.body; 
    
    if (status === 'ON' || status === 'OFF') {
        const success = mqttService.publishLedControl(status);
        if (success) {
            res.json({ success: true, message: `Perintah LED ${status} terkirim!` });
        } else {
            res.status(500).json({ success: false, message: "MQTT Client tidak terhubung." });
        }
    } else {
        res.status(400).json({ success: false, message: "Status tidak valid. Gunakan 'ON' atau 'OFF'." });
    }
};

module.exports = {
    controlLed
};
