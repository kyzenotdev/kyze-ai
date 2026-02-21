const { findUserByUsername, findUserByEmail } = require('../lib/db');
const { generateToken } = require('../lib/jwt');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { username, password } = req.body;

        // Validasi input
        if (!username || !password) {
            res.status(400).json({ error: 'Username dan password wajib diisi!' });
            return;
        }

        // Cari user berdasarkan username atau email (TANPA await)
        let user = findUserByUsername(username);
        if (!user) {
            user = findUserByEmail(username);
        }

        // Cek user dan password
        if (!user || user.password !== password) {
            res.status(401).json({ error: 'Username/email atau password salah!' });
            return;
        }

        // Generate token
        const token = generateToken({
            id: user.id,
            username: user.username,
            role: user.role
        });

        // Hapus password dari response
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            success: true,
            message: 'Login berhasil!',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server!' });
    }
};