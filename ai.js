const { extractToken, verifyToken } = require('../lib/jwt');
const { findUserById, updateUser } = require('../lib/db');

// Konfigurasi API AI (pilih salah satu)
const AI_CONFIG = {
  provider: 'gemini', // 'openai', 'gemini', 'claude'
  apiKey: process.env.AI_API_KEY || 'AIzaSyCvreCYZ2WmtnzujrRDMIf322559fS41pQ',
  model: 'gemini-3-flash-preview', // sesuaikan dengan provider
  maxTokens: 1000,
  temperature: 0.7
};

// Function untuk panggil API AI sesuai provider
async function callAIProvider(messages) {
  try {
    switch (AI_CONFIG.provider) {
      case 'openai':
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_CONFIG.apiKey}`
          },
          body: JSON.stringify({
            model: AI_CONFIG.model,
            messages: messages,
            max_tokens: AI_CONFIG.maxTokens,
            temperature: AI_CONFIG.temperature
          })
        });
        
        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.status}`);
        }
        
        const openaiData = await openaiResponse.json();
        return openaiData.choices[0].message.content;
        
      case 'gemini':
        // Untuk Google Gemini API
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${AI_CONFIG.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: messages.map(m => ({
              parts: [{ text: m.content }],
              role: m.role === 'assistant' ? 'model' : 'user'
            }))
          })
        });
        
        if (!geminiResponse.ok) {
          throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }
        
        const geminiData = await geminiResponse.json();
        return geminiData.candidates[0].content.parts[0].text;
        
      case 'claude':
        // Untuk Anthropic Claude API
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': AI_CONFIG.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: messages,
            max_tokens: AI_CONFIG.maxTokens
          })
        });
        
        if (!claudeResponse.ok) {
          throw new Error(`Claude API error: ${claudeResponse.status}`);
        }
        
        const claudeData = await claudeResponse.json();
        return claudeData.content[0].text;
        
      default:
        // Mock response untuk testing tanpa API key
        return `[MODE TEST] Ini adalah response dari AI untuk: "${messages[messages.length-1].content}"`;
    }
  } catch (error) {
    console.error('AI Provider error:', error);
    throw new Error('Gagal mendapatkan response dari AI');
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    // Verifikasi token
    const token = extractToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    
    // Ambil data user
    const user = findUserById(decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    const { message, messages, image } = req.body;
    
    // Cek limit untuk user non-premium
    if (!user.premium?.unlimitedChat) {
      const today = new Date().toISOString().split('T')[0];
      
      // Reset count jika hari berbeda
      if (user.usage.lastReset !== today) {
        user.usage.chatCount = 0;
        user.usage.lastReset = today;
        updateUser(user.id, { usage: user.usage });
      }
      
      // Cek limit (20 chat per hari)
      if (user.usage.chatCount >= 20) {
        res.status(429).json({ 
          error: 'Anda telah mencapai batas chat harian. Upgrade ke premium untuk unlimited chat.' 
        });
        return;
      }
    }
    
    // Proses image jika ada (untuk premium)
    if (image && !user.premium?.unlimitedImage) {
      res.status(403).json({ 
        error: 'Fitur upload gambar hanya untuk user premium' 
      });
      return;
    }
    
    // Format messages untuk AI
    let aiMessages = messages || [
      { role: 'system', content: 'Anda adalah KyzeAI, asisten AI yang membantu dan ramah. Dikembangkan oleh kyze official.' }
    ];
    
    if (message) {
      aiMessages.push({ role: 'user', content: message });
    }
    
    // Panggil AI
    const aiResponse = await callAIProvider(aiMessages);
    
    // Update usage count untuk non-premium
    if (!user.premium?.unlimitedChat) {
      user.usage.chatCount++;
      updateUser(user.id, { usage: user.usage });
    }
    
    res.status(200).json({
      success: true,
      response: aiResponse,
      usage: {
        chatCount: user.usage.chatCount,
        limit: user.premium?.unlimitedChat ? 'unlimited' : 20
      }
    });
    
  } catch (error) {
    console.error('Chat AI error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat memproses chat' });
  }
};