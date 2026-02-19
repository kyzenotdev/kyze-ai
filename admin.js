// Admin Management Class
class AdminManager {
    constructor() {
        this.currentTab = 'dashboard';
        this.users = [];
        this.logs = [];
        this.init();
    }

    async init() {
        // Check if user is admin
        if (!auth.isLoggedIn()) {
            window.location.href = '/';
            return;
        }

        if (!auth.isAdmin()) {
            alert('Akses ditolak. Halaman ini hanya untuk admin.');
            window.location.href = '/chat.html';
            return;
        }

        // Update admin info
        this.updateAdminInfo();
        
        // Set current date
        this.updateCurrentDate();
        
        // Load initial data
        await this.loadDashboardData();
        
        // Auto refresh every 30 seconds
        setInterval(() => {
            if (this.currentTab === 'dashboard') {
                this.loadDashboardData();
            } else if (this.currentTab === 'users') {
                this.loadUsers();
            }
        }, 30000);
    }

    updateAdminInfo() {
        const adminName = document.getElementById('adminName');
        const adminAvatar = document.getElementById('adminAvatar');
        
        if (auth.currentUser) {
            adminName.textContent = auth.currentUser.username;
            adminAvatar.textContent = auth.currentUser.username.charAt(0).toUpperCase();
        }
    }

    updateCurrentDate() {
        const dateEl = document.getElementById('currentDate');
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        dateEl.textContent = new Date().toLocaleDateString('id-ID', options);
    }

    async loadDashboardData() {
        try {
            const data = await api.getUsers();
            this.users = data.users;
            
            // Calculate stats
            const totalUsers = this.users.length;
            const premiumUsers = this.users.filter(u => u.premium?.isPremium).length;
            const totalChats = this.users.reduce((sum, u) => sum + (u.usage?.chatCount || 0), 0);
            const totalImages = this.users.reduce((sum, u) => sum + (u.usage?.imageCount || 0), 0);
            
            // Update stats
            document.getElementById('totalUsers').textContent = totalUsers;
            document.getElementById('premiumUsers').textContent = premiumUsers;
            document.getElementById('totalChats').textContent = totalChats;
            document.getElementById('totalImages').textContent = totalImages;
            
            // Load recent users
            this.loadRecentUsers();
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    loadRecentUsers() {
        const tbody = document.getElementById('recentUsersBody');
        
        if (!this.users.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tidak ada data user</td></tr>';
            return;
        }
        
        // Get 5 most recent users
        const recentUsers = [...this.users]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        tbody.innerHTML = recentUsers.map(user => {
            const today = new Date().toISOString().split('T')[0];
            const chatCount = user.usage?.lastReset === today ? user.usage.chatCount : 0;
            
            return `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge ${user.role === 'admin' ? 'admin' : 'free'}">
                            ${user.role}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${user.premium?.isPremium ? 'premium' : 'free'}">
                            ${user.premium?.isPremium ? 'Premium' : 'Free'}
                        </span>
                    </td>
                    <td>${chatCount}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString('id-ID')}</td>
                </tr>
            `;
        }).join('');
    }

    async loadUsers(search = '') {
        try {
            const data = await api.getUsers();
            this.users = data.users;
            
            const tbody = document.getElementById('usersBody');
            const select = document.getElementById('premiumUser');
            
            // Filter users if search
            let filteredUsers = this.users;
            if (search) {
                const searchLower = search.toLowerCase();
                filteredUsers = this.users.filter(u => 
                    u.username.toLowerCase().includes(searchLower) ||
                    u.email.toLowerCase().includes(searchLower)
                );
            }
            
            // Update table
            tbody.innerHTML = filteredUsers.map(user => {
                const expiryDate = user.premium?.expiresAt 
                    ? new Date(user.premium.expiresAt).toLocaleDateString('id-ID')
                    : '-';
                
                const isExpired = user.premium?.expiresAt && 
                    new Date(user.premium.expiresAt) < new Date();
                
                return `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>
                            <span class="badge ${user.role === 'admin' ? 'admin' : 'free'}">
                                ${user.role}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${isExpired ? 'expired' : (user.premium?.isPremium ? 'premium' : 'free')}">
                                ${isExpired ? 'Expired' : (user.premium?.isPremium ? 'Premium' : 'Free')}
                            </span>
                        </td>
                        <td>${expiryDate}</td>
                        <td>${user.usage?.chatCount || 0}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn edit" onclick="adminManager.editUser('${user.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn premium" onclick="adminManager.setPremiumQuick('${user.id}')">
                                    <i class="fas fa-crown"></i>
                                </button>
                                <button class="action-btn delete" onclick="adminManager.deleteUser('${user.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // Update premium user select
            if (select) {
                select.innerHTML = '<option value="">-- Pilih User --</option>' + 
                    filteredUsers
                        .filter(u => u.role !== 'admin')
                        .map(u => `<option value="${u.id}">${u.username} (${u.email})</option>`)
                        .join('');
            }
            
        } catch (error) {
            console.error('Failed to load users:', error);
            document.getElementById('usersBody').innerHTML = 
                '<tr><td colspan="8" style="text-align: center; color: var(--danger);">Gagal memuat data</td></tr>';
        }
    }

    async editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editRole').value = user.role;
        document.getElementById('editPremium').checked = user.premium?.isPremium || false;
        
        if (user.premium?.expiresAt) {
            const expiryDate = new Date(user.premium.expiresAt);
            document.getElementById('editExpiry').value = expiryDate.toISOString().split('T')[0];
        } else {
            document.getElementById('editExpiry').value = '';
        }
        
        document.getElementById('editUserModal').style.display = 'block';
    }

    async saveUserEdit() {
        const userId = document.getElementById('editUserId').value;
        const role = document.getElementById('editRole').value;
        const isPremium = document.getElementById('editPremium').checked;
        const expiryDate = document.getElementById('editExpiry').value;
        
        try {
            const updates = {
                role: role,
                premium: {
                    isPremium: isPremium,
                    expiresAt: expiryDate ? new Date(expiryDate).toISOString() : null,
                    unlimitedChat: isPremium,
                    unlimitedImage: isPremium
                }
            };
            
            await api.updateUser(userId, updates);
            
            alert('User berhasil diupdate');
            closeModal('editUserModal');
            await this.loadUsers();
            
        } catch (error) {
            alert('Gagal update user: ' + error.message);
        }
    }

    async setPremium(event) {
        event.preventDefault();
        
        const userId = document.getElementById('premiumUser').value;
        const duration = parseInt(document.getElementById('premiumDuration').value);
        const unlimitedChat = document.getElementById('unlimitedChat').checked;
        const unlimitedImage = document.getElementById('unlimitedImage').checked;
        
        if (!userId) {
            alert('Pilih user terlebih dahulu');
            return;
        }
        
        // Calculate expiry date
        const expiryDate = new Date();
        if (duration === 9999) {
            expiryDate.setFullYear(expiryDate.getFullYear() + 100); // Permanent
        } else {
            expiryDate.setDate(expiryDate.getDate() + duration);
        }
        
        try {
            const updates = {
                premium: {
                    isPremium: true,
                    expiresAt: expiryDate.toISOString(),
                    unlimitedChat: unlimitedChat,
                    unlimitedImage: unlimitedImage
                }
            };
            
            await api.updateUser(userId, updates);
            
            alert('Premium berhasil diaktifkan');
            document.getElementById('premiumForm').reset();
            await this.loadUsers();
            
        } catch (error) {
            alert('Gagal mengaktifkan premium: ' + error.message);
        }
    }

    async setPremiumQuick(userId) {
        const duration = prompt('Masukkan durasi premium (hari):', '30');
        if (!duration) return;
        
        const days = parseInt(duration);
        if (isNaN(days) || days <= 0) {
            alert('Durasi tidak valid');
            return;
        }
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        
        try {
            const updates = {
                premium: {
                    isPremium: true,
                    expiresAt: expiryDate.toISOString(),
                    unlimitedChat: true,
                    unlimitedImage: true
                }
            };
            
            await api.updateUser(userId, updates);
            
            alert(`Premium diaktifkan selama ${days} hari`);
            await this.loadUsers();
            
        } catch (error) {
            alert('Gagal mengaktifkan premium: ' + error.message);
        }
    }

    async deleteUser(userId) {
        if (!confirm('Yakin ingin menghapus user ini? Aksi ini tidak dapat dibatalkan.')) {
            return;
        }
        
        try {
            await api.deleteUser(userId);
            
            alert('User berhasil dihapus');
            await this.loadUsers();
            await this.loadDashboardData();
            
        } catch (error) {
            alert('Gagal menghapus user: ' + error.message);
        }
    }

    async loadLogs() {
        // This would normally fetch from server
        // For now, we'll show mock data
        const tbody = document.getElementById('logsBody');
        
        const mockLogs = [
            { time: '2024-01-15 10:30', user: 'admin', action: 'Login', detail: 'Admin login' },
            { time: '2024-01-15 09:15', user: 'user1', action: 'Chat', detail: 'Sent 5 messages' },
            { time: '2024-01-14 23:45', user: 'user2', action: 'Premium', detail: 'Premium activated' },
        ];
        
        tbody.innerHTML = mockLogs.map(log => `
            <tr>
                <td>${log.time}</td>
                <td>${log.user}</td>
                <td>${log.action}</td>
                <td>${log.detail}</td>
            </tr>
        `).join('');
    }

    saveSettings(event) {
        event.preventDefault();
        
        const settings = {
            chatLimit: document.getElementById('chatLimit').value,
            maxImageSize: document.getElementById('maxImageSize').value,
            allowRegistration: document.getElementById('allowRegistration').checked,
            maintenanceMode: document.getElementById('maintenanceMode').checked
        };
        
        // Save to localStorage for now
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        
        alert('Pengaturan berhasil disimpan');
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.nav-item').classList.add('active');
        
        // Update title
        const titles = {
            dashboard: 'Dashboard',
            users: 'Manajemen Users',
            premium: 'Premium Settings',
            logs: 'Activity Logs',
            settings: 'Settings'
        };
        
        const descriptions = {
            dashboard: 'Selamat datang di panel admin KyzeAI',
            users: 'Kelola semua user terdaftar',
            premium: 'Atur status premium user',
            logs: 'Lihat aktivitas sistem',
            settings: 'Konfigurasi pengaturan sistem'
        };
        
        document.getElementById('pageTitle').textContent = titles[tab];
        document.getElementById('pageDescription').textContent = descriptions[tab];
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(el => {
            el.style.display = 'none';
        });
        
        // Show selected tab
        document.getElementById(tab + 'Tab').style.display = 'block';
        
        // Load tab data
        switch(tab) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'logs':
                this.loadLogs();
                break;
        }
    }
}

// Initialize admin manager
const adminManager = new AdminManager();

// Global functions
function switchTab(tab) {
    adminManager.switchTab(tab);
}

function loadUsers() {
    const search = document.getElementById('searchUser').value;
    adminManager.loadUsers(search);
}

function setPremium(event) {
    adminManager.setPremium(event);
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function saveUserEdit() {
    adminManager.saveUserEdit();
}

// Search on enter
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchUser');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadUsers();
            }
        });
    }
});