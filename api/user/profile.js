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
    
    // Hitung sisa hari premium jika ada
    let premiumDaysLeft = 0;
    if (user.premium?.isPremium && user.premium?.expiresAt) {
      const expiryDate = new Date(user.premium.expiresAt);
      const today = new Date();
      const diffTime = expiryDate - today;
      premiumDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Hapus password dari response
    const { password, ...userWithoutPassword } = user;
    
    res.status(200).json({
      success: true,
      user: {
        ...userWithoutPassword,
        premiumDaysLeft: premiumDaysLeft > 0 ? premiumDaysLeft : 0
      }
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
};
