const { extractToken, verifyToken } = require('../lib/jwt');
const { findUserById, deleteUser } = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'DELETE') {
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
    
    const { userId } = req.query;
    
    if (!userId) {
      res.status(400).json({ error: 'User ID wajib diisi' });
      return;
    }
    
    // Cek user target exist
    const targetUser = findUserById(userId);
    if (!targetUser) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }
    
    // Cegah admin delete diri sendiri
    if (userId === admin.id) {
      res.status(400).json({ error: 'Tidak dapat menghapus akun sendiri' });
      return;
    }
    
    // Delete user
    const deleted = deleteUser(userId);
    
    if (!deleted) {
      res.status(500).json({ error: 'Gagal menghapus user' });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'User berhasil dihapus'
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
};