const db = require('./config/db');
const bcrypt = require('bcrypt');

const updatePassword = async () => {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        db.query('UPDATE users SET password=? WHERE username=?', [hash, 'admin'], (err) => {
            if (err) console.error(err);
            else console.log('Successfully updated admin password to: admin123 (Hash: ' + hash + ')');
            process.exit(0);
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

updatePassword();
