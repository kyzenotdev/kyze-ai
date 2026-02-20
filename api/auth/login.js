const { findUserByUsername, findUserByEmail } = require('../lib/db');
const { generateToken } = require('../lib/jwt');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ error: 'Username dan password wajib diisi' });
            return;
        }

        // Cari user
        let user = findUserByUsername(username);
        if (!user) {
            user = findUserByEmail(username);
        }

        if (!user || user.password !== password) {
            res.status(401).json({ error: 'Username/email atau password salah' });
            return;
        }

        const token = generateToken({
            id: user.id,
            username: user.username,
            role: user.role
        });

        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            success: true,
            token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
