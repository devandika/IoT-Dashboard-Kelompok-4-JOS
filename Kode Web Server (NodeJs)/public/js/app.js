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
});
