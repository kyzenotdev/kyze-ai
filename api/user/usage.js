const { extractToken, verifyToken } = require('../lib/jwt');
const { findUserById } = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
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
    
    const user = findUserById(decoded.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Hitung sisa chat untuk non-premium
    const today = new Date().toISOString().split('T')[0];
    let chatsRemaining = 0;
    
    if (user.premium?.unlimitedChat) {
      chatsRemaining = -1; // Unlimited
    } else {
      // Reset jika hari berbeda
      if (user.usage.lastReset !== today) {
        user.usage.chatCount = 0;
        user.usage.lastReset = today;
      }
      chatsRemaining = Math.max(0, 20 - user.usage.chatCount);
    }
    
    res.status(200).json({
      success: true,
      usage: {
        chatCount: user.usage.chatCount,
        imageCount: user.usage.imageCount,
        chatsRemaining,
        isPremium: user.premium?.isPremium || false,
        unlimitedChat: user.premium?.unlimitedChat || false,
        unlimitedImage: user.premium?.unlimitedImage || false,
        premiumExpiresAt: user.premium?.expiresAt || null,
        lastReset: user.usage.lastReset
      }
    });
    
  } catch (error) {
    console.error('Usage error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
};
