// API wrapper untuk komunikasi dengan backend
class Api {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.token = localStorage.getItem('token');
    }

    // Set token setelah login
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    // Clear token saat logout
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    // Get headers dengan token
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Handle response
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            // Handle 401 Unauthorized (token expired)
            if (response.status === 401) {
                this.clearToken();
                window.location.href = '/';
                throw new Error('Sesi berakhir. Silakan login kembali.');
            }
            
            throw new Error(data.error || 'Terjadi kesalahan');
        }
        
        return data;
    }

    // GET request
    async get(endpoint, requireAuth = true) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: this.getHeaders(requireAuth)
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }

    // POST request
    async post(endpoint, body, requireAuth = true) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(requireAuth),
                body: JSON.stringify(body)
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }

    // PUT request
    async put(endpoint, body, requireAuth = true) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(requireAuth),
                body: JSON.stringify(body)
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API PUT Error:', error);
            throw error;
        }
    }

    // DELETE request
    async delete(endpoint, requireAuth = true) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders(requireAuth)
            });
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API DELETE Error:', error);
            throw error;
        }
    }

    // ============= AUTH ENDPOINTS =============
    async login(username, password) {
        const data = await this.post('/auth/login', { username, password }, false);
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async register(username, email, password) {
        const data = await this.post('/auth/register', { username, email, password }, false);
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async verifyToken() {
        return await this.get('/auth/verify');
    }

    // ============= CHAT ENDPOINTS =============
    async sendMessage(message, messages = [], image = null) {
        return await this.post('/chat/ai', { message, messages, image });
    }

    // ============= USER ENDPOINTS =============
    async getProfile() {
        return await this.get('/user/profile');
    }

    async getUsage() {
        return await this.get('/user/usage');
    }

    // ============= ADMIN ENDPOINTS =============
    async getUsers() {
        return await this.get('/admin/getUsers');
    }

    async updateUser(userId, updates) {
        return await this.put('/admin/updateUser', { userId, updates });
    }

    async deleteUser(userId) {
        return await this.delete(`/admin/deleteUser?userId=${userId}`);
    }
}

// Buat instance global
const api = new Api();
