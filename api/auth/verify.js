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
      res.status(401).json({ 
        valid: false, 
        error: 'Token tidak ditemukan' 
      });
      return;
    }
    
    const decoded = verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({ 
        valid: false, 
        error: 'Token tidak valid atau expired' 
      });
      return;
    }
    
    // Ambil data user terbaru dari database
    const user = findUserById(decoded.id);
    
    if (!user) {
      res.status(401).json({ 
        valid: false, 
        error: 'User tidak ditemukan' 
      });
      return;
    }
    
    // Kirim response tanpa password
    const { password, ...userWithoutPassword } = user;
    
    res.status(200).json({
      valid: true,
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Terjadi kesalahan server' 
    });
  }
};
