const { extractToken, verifyToken } = require('../lib/jwt');
const { getUsers, findUserById } = require('../lib/db');

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
    
    // Cek apakah user adalah admin
    const admin = findUserById(decoded.id);
    if (!admin || admin.role !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin only.' });
      return;
    }
    
    // Ambil semua users
    const users = getUsers();
    
    // Hapus password dari response
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.status(200).json({
      success: true,
      users: usersWithoutPassword
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
};
