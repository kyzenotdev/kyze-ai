// Auth management
class Auth {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Cek token di localStorage
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Verifikasi token
                const data = await api.verifyToken();
                if (data.valid) {
                    this.currentUser = data.user;
                    this.updateUIForUser();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Auth init error:', error);
                this.logout();
            }
        }
    }

    // Login
    async login(username, password) {
        try {
            const data = await api.login(username, password);
            this.currentUser = data.user;
            this.updateUIForUser();
            
            // Redirect based on role
            if (this.currentUser.role === 'admin') {
                window.location.href = '/admin/dashboard.html';
            } else {
                window.location.href = '/chat.html';
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Register
    async register(username, email, password) {
        try {
            const data = await api.register(username, email, password);
            this.currentUser = data.user;
            this.updateUIForUser();
            window.location.href = '/chat.html';
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Logout
    logout() {
        this.currentUser = null;
        api.clearToken();
        this.updateUIForUser();
        window.location.href = '/';
    }

    // Cek apakah user sudah login
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Cek apakah user admin
    isAdmin() {
        return this.currentUser?.role === 'admin';
    }

    // Cek apakah user premium
    isPremium() {
        if (this.isAdmin()) return true; // Admin otomatis premium
        
        if (!this.currentUser?.premium?.isPremium) return false;
        
        // Cek expired
        if (this.currentUser.premium.expiresAt) {
            const expiryDate = new Date(this.currentUser.premium.expiresAt);
            const today = new Date();
            if (expiryDate < today) {
                return false; // Sudah expired
            }
        }
        
        return true;
    }

    // Get sisa chat hari ini
    getRemainingChats() {
        if (this.isPremium() || this.currentUser?.premium?.unlimitedChat) {
            return -1; // Unlimited
        }
        
        // Hitung dari usage
        const today = new Date().toISOString().split('T')[0];
        if (this.currentUser?.usage?.lastReset !== today) {
            return 20; // Reset dulu
        }
        
        return Math.max(0, 20 - (this.currentUser?.usage?.chatCount || 0));
    }

    // Update UI berdasarkan status login
    updateUIForUser() {
        // Update elemen-elemen yang menunjukkan status login
        const loginButtons = document.querySelectorAll('.login-btn');
        const registerButtons = document.querySelectorAll('.register-btn');
        const logoutButtons = document.querySelectorAll('.logout-btn');
        const userMenus = document.querySelectorAll('.user-menu');
        const adminMenus = document.querySelectorAll('.admin-menu');
        
        if (this.isLoggedIn()) {
            // Sembunyikan tombol login/register
            loginButtons.forEach(btn => btn.style.display = 'none');
            registerButtons.forEach(btn => btn.style.display = 'none');
            
            // Tampilkan tombol logout
            logoutButtons.forEach(btn => btn.style.display = 'block');
            
            // Tampilkan user menu
            userMenus.forEach(menu => {
                menu.style.display = 'block';
                // Update username
                const usernameEl = menu.querySelector('.username');
                if (usernameEl) {
                    usernameEl.textContent = this.currentUser.username;
                }
            });
            
            // Tampilkan admin menu jika admin
            if (this.isAdmin()) {
                adminMenus.forEach(menu => menu.style.display = 'block');
            }
        } else {
            // Tampilkan tombol login/register
            loginButtons.forEach(btn => btn.style.display = 'block');
            registerButtons.forEach(btn => btn.style.display = 'block');
            
            // Sembunyikan tombol logout
            logoutButtons.forEach(btn => btn.style.display = 'none');
            
            // Sembunyikan menu
            userMenus.forEach(menu => menu.style.display = 'none');
            adminMenus.forEach(menu => menu.style.display = 'none');
        }
    }

    // Format remaining chats untuk display
    formatRemainingChats() {
        const remaining = this.getRemainingChats();
        if (remaining === -1) {
            return 'Unlimited';
        }
        return `${remaining} / 20 chats`;
    }
}

// Buat instance global
const auth = new Auth();
