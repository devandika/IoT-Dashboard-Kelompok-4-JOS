const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const SERVER_ID = Date.now().toString(); // ID unik setiap kali server jalan
const activeSessions = {}; // Simpan { username: timestamp } untuk melacak status online

const login = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan Password wajib diisi.' });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        try {
            const user = results[0];

            // Bandingkan password
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Username atau password salah.' });
            }

            // Generate JWT
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                message: 'Login berhasil',
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Error saat login:', error);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server saat login.' });
        }
    });
};

const getUsers = (req, res) => {
    const sql = 'SELECT id, username, role FROM users';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
        
        const now = Date.now();
        // Sisipkan status is_online untuk setiap user
        results.forEach(user => {
            const lastPing = activeSessions[user.username] || 0;
            // Anggap online jika ping terakhir kurang dari 5 detik yang lalu
            user.is_online = (now - lastPing) < 5000;
        });

        res.json({ success: true, data: results });
    });
};

const pingUser = (req, res) => {
    if (req.user && req.user.username) {
        activeSessions[req.user.username] = Date.now();
        return res.json({ success: true, server_id: SERVER_ID });
    }
    return res.status(401).json({ success: false });
};

const register = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username dan Password wajib diisi.' });
    }

    try {
        // Cek apakah username sudah ada
        const checkSql = 'SELECT * FROM users WHERE username = ?';
        db.query(checkSql, [username], async (err, results) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
            
            if (results.length > 0) {
                return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
            }

            // Hash password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Insert user baru dengan role 'User'
            const insertSql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
            db.query(insertSql, [username, hashedPassword, 'User'], (insertErr, result) => {
                if (insertErr) return res.status(500).json({ success: false, message: 'Gagal membuat user', error: insertErr.message });
                
                const newUserId = result.insertId;

                // Auto-login (generate JWT)
                const token = jwt.sign(
                    { id: newUserId, username: username, role: 'User' },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    success: true,
                    message: 'Registrasi berhasil',
                    token: token,
                    user: {
                        id: newUserId,
                        username: username,
                        role: 'User'
                    }
                });
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
};

module.exports = {
    login,
    register,
    getUsers,
    pingUser,
    changePassword: async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Password saat ini dan password baru wajib diisi.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password baru harus minimal 6 karakter.' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, message: 'Password baru tidak boleh sama dengan password lama.' });
        }

        try {
            const sql = 'SELECT * FROM users WHERE id = ?';
            db.query(sql, [userId], async (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
                if (results.length === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

                const user = results[0];
                
                // Jika password user kosong/bukan string, tolak
                if (!user.password || typeof user.password !== 'string') {
                    return res.status(400).json({ success: false, message: 'Data password tidak valid di database.' });
                }

                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) {
                    console.log(`[ChangePassword] Gagal: Password saat ini salah untuk user ${user.username}`);
                    return res.status(400).json({ success: false, message: 'Password saat ini salah.' });
                }

                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

                const updateSql = 'UPDATE users SET password = ? WHERE id = ?';
                db.query(updateSql, [hashedPassword, userId], (updateErr) => {
                    if (updateErr) return res.status(500).json({ success: false, message: 'Gagal mengubah password', error: updateErr.message });
                    console.log(`[ChangePassword] Sukses: Password diubah untuk user ${user.username}`);
                    res.json({ success: true, message: 'Password berhasil diubah.' });
                });
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
        }
    },
    createUser: async (req, res) => {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ success: false, message: 'Username, Password, dan Role wajib diisi.' });
        }
        try {
            const checkSql = 'SELECT * FROM users WHERE username = ?';
            db.query(checkSql, [username], async (err, results) => {
                if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
                if (results.length > 0) return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });

                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                const insertSql = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
                db.query(insertSql, [username, hashedPassword, role], (insertErr) => {
                    if (insertErr) return res.status(500).json({ success: false, message: 'Gagal membuat user', error: insertErr.message });
                    res.json({ success: true, message: 'Pengguna baru berhasil ditambahkan.' });
                });
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
        }
    },
    updateUser: async (req, res) => {
        const userId = req.params.id;
        const { username, role, password } = req.body;
        
        if (userId == 1 && role === 'User') {
            return res.status(403).json({ success: false, message: 'Tidak dapat mengubah role Super Admin' });
        }

        try {
            if (password) {
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);
                const sql = 'UPDATE users SET username = ?, role = ?, password = ? WHERE id = ?';
                db.query(sql, [username, role, hashedPassword, userId], (err) => {
                    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
                    res.json({ success: true, message: 'Pengguna berhasil diperbarui.' });
                });
            } else {
                const sql = 'UPDATE users SET username = ?, role = ? WHERE id = ?';
                db.query(sql, [username, role, userId], (err) => {
                    if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
                    res.json({ success: true, message: 'Pengguna berhasil diperbarui.' });
                });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
        }
    },
    deleteUser: (req, res) => {
        const userId = req.params.id;
        
        // Prevent deleting the main admin (id=1)
        if (userId == 1) {
            return res.status(403).json({ success: false, message: 'Tidak dapat menghapus Super Admin' });
        }

        const sql = 'DELETE FROM users WHERE id = ?';
        db.query(sql, [userId], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error', error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            res.json({ success: true, message: 'User berhasil dihapus' });
        });
    }
};
