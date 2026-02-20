const { findUserByUsername, findUserByEmail, addUser } = require('../lib/db');
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
        const { username, email, password } = req.body;

        // Validasi input
        if (!username || !email || !password) {
            res.status(400).json({ error: 'Username, email, dan password wajib diisi!' });
            return;
        }

        if (username.length < 3) {
            res.status(400).json({ error: 'Username minimal 3 karakter!' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password minimal 6 karakter!' });
            return;
        }

        // Validasi email (yang bener)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ error: 'Format email tidak valid!' });
            return;
        }

        // Cek username sudah terdaftar
        const existingUser = findUserByUsername(username);
        if (existingUser) {
            res.status(400).json({ error: 'Username sudah digunakan!' });
            return;
        }

        // Cek email sudah terdaftar
        const existingEmail = findUserByEmail(email);
        if (existingEmail) {
            res.status(400).json({ error: 'Email sudah terdaftar!' });
            return;
        }

        // Buat user baru
        const newUser = addUser({
            username,
            email,
            password
        });

        // Generate token (pake object yang bener)
        const token = generateToken({
            id: newUser.id,
            username: newUser.username,
            role: newUser.role
        });

        // Kirim response tanpa password
        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil!',
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server!' });
    }
};
