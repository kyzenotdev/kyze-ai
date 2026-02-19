// Konfigurasi API
const CONFIG = {
    // Ganti dengan URL Vercel kamu setelah deploy
    API_BASE_URL: 'https://kyze-ai-studio.vercel.app/api',
    
    // Konfigurasi AI (sama dengan di backend)
    AI_PROVIDER: 'gemini', // 'openai', 'gemini', 'claude', atau 'mock'
    
    // Default model
    DEFAULT_MODEL: 'gemini-3-flash-preview',
    
    // Limit untuk free user
    FREE_USER_LIMITS: {
        chatsPerDay: 20,
        canUploadImage: false
    },
    
    // Warna tema KyzeAI
    THEME: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        dark: '#0f172a',
        light: '#f8fafc',
        accent: '#06b6d4'
    }
};

// Jangan ubah kode di bawah ini
Object.freeze(CONFIG);
