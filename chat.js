// Chat Management Class
class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.chats = this.loadChats();
        this.currentImage = null;
        this.isLoading = false;
        this.init();
    }

    // Initialize chat
    async init() {
        // Check if user is logged in
        if (!auth.isLoggedIn()) {
            window.location.href = '/';
            return;
        }

        // Update user info
        this.updateUserInfo();
        
        // Load usage stats
        await this.updateUsageStats();
        
        // Load chat history
        this.renderChatHistory();
        
        // Load last active chat
        const lastChatId = localStorage.getItem('lastChatId');
        if (lastChatId && this.chats[lastChatId]) {
            this.loadChat(lastChatId);
        }
        
        // Setup event listeners
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Auto-refresh usage stats every 30 seconds
        setInterval(() => this.updateUsageStats(), 30000);
    }

    // Update user info in sidebar
    async updateUserInfo() {
        try {
            const data = await api.getProfile();
            const user = data.user;
            
            document.getElementById('userName').textContent = user.username;
            document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
            
            const planEl = document.getElementById('userPlan');
            if (auth.isAdmin()) {
                planEl.textContent = 'Admin';
                planEl.style.color = 'var(--primary)';
            } else if (auth.isPremium()) {
                planEl.textContent = 'Premium';
                planEl.style.color = 'var(--success)';
            } else {
                planEl.textContent = 'Free Plan';
                planEl.style.color = 'var(--gray)';
            }
        } catch (error) {
            console.error('Failed to load user info:', error);
        }
    }

    // Update usage stats
    async updateUsageStats() {
        try {
            const data = await api.getUsage();
            const usage = data.usage;
            
            const remainingEl = document.getElementById('remainingChats');
            const progressEl = document.getElementById('chatProgress');
            
            if (usage.unlimitedChat) {
                remainingEl.textContent = 'Unlimited';
                progressEl.style.width = '0%';
            } else {
                const remaining = usage.chatsRemaining;
                const used = 20 - remaining;
                const percentage = (used / 20) * 100;
                
                remainingEl.textContent = `${remaining} / 20`;
                progressEl.style.width = `${percentage}%`;
            }
        } catch (error) {
            console.error('Failed to load usage stats:', error);
        }
    }

    // Load chats from localStorage
    loadChats() {
        const saved = localStorage.getItem('kyzeChats');
        return saved ? JSON.parse(saved) : {};
    }

    // Save chats to localStorage
    saveChats() {
        localStorage.setItem('kyzeChats', JSON.stringify(this.chats));
    }

    // Start new chat
    startNewChat() {
        const chatId = Date.now().toString();
        const chatName = `Chat ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
        
        this.chats[chatId] = {
            id: chatId,
            name: chatName,
            messages: [],
            createdAt: new Date().toISOString()
        };
        
        this.saveChats();
        this.renderChatHistory();
        this.loadChat(chatId);
    }

    // Load specific chat
    loadChat(chatId) {
        if (!this.chats[chatId]) return;
        
        this.currentChatId = chatId;
        localStorage.setItem('lastChatId', chatId);
        
        // Render messages
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';
        
        this.chats[chatId].messages.forEach(msg => {
            this.renderMessage(msg.role, msg.content, msg.timestamp);
        });
        
        // Update active state in history
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id === chatId) {
                item.classList.add('active');
            }
        });
    }

    // Render chat history
    renderChatHistory() {
        const historyEl = document.getElementById('chatHistory');
        historyEl.innerHTML = '';
        
        // Sort chats by createdAt descending
        const sortedChats = Object.values(this.chats).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        sortedChats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            item.dataset.id = chat.id;
            item.onclick = () => this.loadChat(chat.id);
            
            item.innerHTML = `
                <i class="fas fa-comment"></i>
                <span>${chat.name}</span>
            `;
            
            historyEl.appendChild(item);
        });
    }

    // Render a message
    renderMessage(role, content, timestamp) {
        const container = document.getElementById('messagesContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const time = timestamp ? new Date(timestamp).toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : new Date().toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${this.formatMessage(content)}
                </div>
                <div class="message-time">
                    ${time}
                </div>
            </div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    // Format message (handle code blocks, links, etc)
    formatMessage(content) {
        // Escape HTML
        let formatted = content.replace(/[&<>"]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            return m;
        });
        
        // Format code blocks
        formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, function(_, lang, code) {
            return `<pre><code class="language-${lang}">${code}</code></pre>`;
        });
        
        // Format inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Format links
        formatted = formatted.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Convert line breaks to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    // Show typing indicator
    showTypingIndicator() {
        const container = document.getElementById('messagesContainer');
        const indicator = document.createElement('div');
        indicator.className = 'message ai';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }

    // Hide typing indicator
    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Send message
    async sendMessage() {
        if (this.isLoading) return;
        
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message && !this.currentImage) return;
        
        // Check chat limit for free users
        if (!auth.isPremium() && !auth.isAdmin()) {
            const remaining = auth.getRemainingChats();
            if (remaining <= 0) {
                alert('Anda telah mencapai batas chat harian. Upgrade ke premium untuk unlimited chat.');
                return;
            }
        }
        
        try {
            this.isLoading = true;
            document.getElementById('sendBtn').disabled = true;
            
            // Save user message
            const userMessage = {
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            };
            
            if (!this.currentChatId) {
                this.startNewChat();
            }
            
            // Add to current chat
            if (!this.chats[this.currentChatId]) {
                this.startNewChat();
            }
            
            this.chats[this.currentChatId].messages.push(userMessage);
            this.saveChats();
            
            // Render user message
            this.renderMessage('user', message, userMessage.timestamp);
            
            // Clear input
            input.value = '';
            autoResize(input);
            
            // Show typing indicator
            this.showTypingIndicator();
            
            // Prepare messages for AI
            const messages = this.chats[this.currentChatId].messages.map(m => ({
                role: m.role,
                content: m.content
            }));
            
            // Send to API
            const response = await api.sendMessage(message, messages, this.currentImage);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Save AI response
            const aiMessage = {
                role: 'ai',
                content: response.response,
                timestamp: new Date().toISOString()
            };
            
            this.chats[this.currentChatId].messages.push(aiMessage);
            this.saveChats();
            
            // Render AI response
            this.renderMessage('ai', response.response, aiMessage.timestamp);
            
            // Clear image
            this.removeImage();
            
            // Update usage stats
            await this.updateUsageStats();
            
        } catch (error) {
            this.hideTypingIndicator();
            alert('Gagal mengirim pesan: ' + error.message);
        } finally {
            this.isLoading = false;
            document.getElementById('sendBtn').disabled = false;
        }
    }

    // Clear current chat
    clearChat() {
        if (!this.currentChatId || !confirm('Hapus semua pesan di chat ini?')) return;
        
        this.chats[this.currentChatId].messages = [];
        this.saveChats();
        
        document.getElementById('messagesContainer').innerHTML = '';
        
        // Add welcome message
        const welcomeMsg = {
            role: 'ai',
            content: 'Chat telah dibersihkan. Ada yang bisa saya bantu?',
            timestamp: new Date().toISOString()
        };
        
        this.chats[this.currentChatId].messages.push(welcomeMsg);
        this.renderMessage('ai', welcomeMsg.content, welcomeMsg.timestamp);
        this.saveChats();
    }

    // Handle image upload
    toggleImageUpload() {
        if (!auth.isPremium() && !auth.isAdmin()) {
            alert('Fitur upload gambar hanya untuk user premium');
            return;
        }
        document.getElementById('imageInput').click();
    }

    handleImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran gambar maksimal 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImage = e.target.result;
            
            const preview = document.getElementById('imagePreview');
            const img = document.getElementById('previewImg');
            img.src = e.target.result;
            preview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        this.currentImage = null;
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('imageInput').value = '';
    }
}

// Initialize chat manager
const chatManager = new ChatManager();

// Global functions
function startNewChat() {
    chatManager.startNewChat();
}

function sendMessage() {
    chatManager.sendMessage();
}

function clearChat() {
    chatManager.clearChat();
}

function toggleImageUpload() {
    chatManager.toggleImageUpload();
}

function handleImageSelect(event) {
    chatManager.handleImageSelect(event);
}

function removeImage() {
    chatManager.removeImage();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Load chat history from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    // Additional initialization if needed
});