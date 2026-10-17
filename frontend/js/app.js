// Set Axios baseURL if IP is configured
const savedServerIp = localStorage.getItem('serverIP');
if (savedServerIp && window.axios) {
    axios.defaults.baseURL = `http://${savedServerIp}:8080`;
}

if (window.axios) {
    axios.interceptors.response.use((response) => {
        if (response.data && response.data.server_id) {
            if (!window.currentServerId) window.currentServerId = response.data.server_id;
            else if (window.currentServerId !== response.data.server_id) {
                logout(); // Server direstart, web browser dipaksa login ulang
            }
        }
        return response;
    }, (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            logout();
        }
        return Promise.reject(error);
    });
}

// Cek status login
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
    return token;
}

// Cek apakah user adalah admin
function isAdmin() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && user.role === 'Admin';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Set UI berdasar role
document.addEventListener('DOMContentLoaded', () => {
    // Sembunyikan menu Pengguna jika bukan Admin
    const userMenu = document.getElementById('menu-pengguna');
    if (userMenu && !isAdmin()) {
        userMenu.style.display = 'none';
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Tampilkan nama user di navbar
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            usernameDisplay.innerText = user.username + ' (' + user.role + ')';
        }
    }

    // Handle Change Password Form
    const cpForm = document.getElementById('changePasswordForm');
    if (cpForm) {
        // Reset error messages on input change
        const clearErrors = () => {
            const errDivs = ['err_cp_current', 'err_cp_new', 'err_cp_confirm'];
            errDivs.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('d-none');
                    el.innerText = '';
                }
            });
        };

        const showError = (id, message) => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = message;
                el.classList.remove('d-none');
            }
        };

        ['cp_current', 'cp_new', 'cp_confirm'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.addEventListener('input', clearErrors);
        });

        cpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors();
            const current = document.getElementById('cp_current').value;
            const newPwd = document.getElementById('cp_new').value;
            const confirmPwd = document.getElementById('cp_confirm').value;

            if (newPwd !== confirmPwd) {
                showError('err_cp_confirm', 'Konfirmasi kata sandi baru tidak cocok!');
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const res = await axios.post('/api/auth/change-password', 
                    { currentPassword: current, newPassword: newPwd },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (!res.data.success) {
                    throw new Error(res.data.message || 'Gagal mengubah password');
                }

                alert(res.data.message);
                const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                if (modal) modal.hide();
                cpForm.reset();
            } catch (err) {
                let msg = 'Kata sandi salah atau terjadi kesalahan.';
                if (err.response && err.response.data && err.response.data.message) {
                    msg = err.response.data.message;
                } else if (err.response && err.response.status === 400) {
                    msg = 'Kata sandi saat ini salah.';
                } else if (err.message) {
                    msg = err.message;
                }

                // Tentukan lokasi error berdasarkan pesan
                if (msg.toLowerCase().includes('saat ini')) {
                    showError('err_cp_current', msg);
                } else if (msg.toLowerCase().includes('sama') || msg.toLowerCase().includes('karakter')) {
                    showError('err_cp_new', msg);
                } else {
                    showError('err_cp_current', msg);
                }
            }
        });
    }
});
