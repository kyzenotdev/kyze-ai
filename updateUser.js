const { extractToken, verifyToken } = require('../lib/jwt');
const { findUserById, updateUser } = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'PUT') {
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
    
    const { userId, updates } = req.body;
    
    if (!userId || !updates) {
      res.status(400).json({ error: 'User ID dan updates wajib diisi' });
      return;
    }
    
    // Cek user target exist
    const targetUser = findUserById(userId);
    if (!targetUser) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }
    
    // Proses updates berdasarkan tipe
    let processedUpdates = {};
    
    // Update premium status
    if (updates.premium !== undefined) {
      const premiumData = {
        isPremium: updates.premium.isPremium,
        expiresAt: updates.premium.expiresAt,
        unlimitedChat: updates.premium.unlimitedChat || updates.premium.isPremium,
        unlimitedImage: updates.premium.unlimitedImage || updates.premium.isPremium
      };
      processedUpdates.premium = premiumData;
    }
    
    // Update role
    if (updates.role && ['admin', 'user', 'premium'].includes(updates.role)) {
      processedUpdates.role = updates.role;
    }
    
    // Reset usage
    if (updates.resetUsage) {
      processedUpdates.usage = {
        chatCount: 0,
        imageCount: 0,
        lastReset: new Date().toISOString().split('T')[0]
      };
    }
    
    // Update user
    const updatedUser = updateUser(userId, processedUpdates);
    
    if (!updatedUser) {
      res.status(500).json({ error: 'Gagal update user' });
      return;
    }
    
    // Hapus password dari response
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.status(200).json({
      success: true,
      message: 'User berhasil diupdate',
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
};