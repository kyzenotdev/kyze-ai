// Simple JWT implementation tanpa library
// Untuk production, gunakan library jsonwebtoken

const SECRET_KEY = 'kyze-ai-super-secret-key-271110'; // Ganti dengan env variable di production

// Fungsi untuk encode base64url
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Fungsi untuk decode base64url
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString();
}

// Fungsi untuk generate JWT
function generateToken(payload, expiresIn = '7d') {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // Hitung expiry
  let exp;
  if (expiresIn.endsWith('d')) {
    const days = parseInt(expiresIn);
    exp = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
  } else if (expiresIn.endsWith('h')) {
    const hours = parseInt(expiresIn);
    exp = Math.floor(Date.now() / 1000) + (hours * 60 * 60);
  } else {
    exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // Default 7 hari
  }
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  
  // Signature sederhana (jangan digunakan di production)
  const signature = base64UrlEncode(
    require('crypto')
      .createHmac('sha256', SECRET_KEY)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
  );
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Fungsi untuk verify JWT
function verifyToken(token) {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = base64UrlEncode(
      require('crypto')
        .createHmac('sha256', SECRET_KEY)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
    );
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

// Fungsi untuk extract token dari header Authorization
function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

module.exports = {
  generateToken,
  verifyToken,
  extractToken
};