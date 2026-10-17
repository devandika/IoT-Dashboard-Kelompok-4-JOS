const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_iot_dashboard_123'; 

// Middleware untuk memverifikasi token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(403).json({ success: false, message: 'Tidak ada token, akses ditolak.' });
    }

    // Ekstrak token (Format: "Bearer <token>")
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ success: false, message: 'Format token salah.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa.' });
    }
};

// Middleware khusus Admin
const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Akses ditolak. Memerlukan hak akses Admin.' });
    }
};

module.exports = {
    verifyToken,
    verifyAdmin,
    JWT_SECRET
};
