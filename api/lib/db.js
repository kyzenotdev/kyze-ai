// Simulasi database menggunakan array di memory
// Untuk production, gunakan database sungguhan seperti MongoDB, PostgreSQL, dll

let users = [
  {
    id: '1',
    username: 'kyze',
    password: 'ki271110', // Dalam production, hash password ini
    email: 'admin@kyze.ai',
    role: 'admin',
    premium: {
      isPremium: true,
      expiresAt: '2099-12-31T23:59:59.999Z', // Permanent untuk admin
      unlimitedChat: true,
      unlimitedImage: true
    },
    usage: {
      chatCount: 0,
      imageCount: 0,
      lastReset: new Date().toISOString().split('T')[0]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Fungsi untuk membaca users (simulasi)
function getUsers() {
  return users;
}

// Fungsi untuk mencari user berdasarkan username
function findUserByUsername(username) {
  return users.find(u => u.username === username);
}

// Fungsi untuk mencari user berdasarkan email
function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

// Fungsi untuk mencari user berdasarkan ID
function findUserById(id) {
  return users.find(u => u.id === id);
}

// Fungsi untuk menambah user baru
function addUser(userData) {
  const newUser = {
    id: String(users.length + 1),
    ...userData,
    role: 'user',
    premium: {
      isPremium: false,
      expiresAt: null,
      unlimitedChat: false,
      unlimitedImage: false
    },
    usage: {
      chatCount: 0,
      imageCount: 0,
      lastReset: new Date().toISOString().split('T')[0]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  users.push(newUser);
  return newUser;
}

// Fungsi untuk update user
function updateUser(id, updates) {
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  return users[index];
}

// Fungsi untuk delete user
function deleteUser(id) {
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return false;
  
  users.splice(index, 1);
  return true;
}

// Fungsi untuk reset usage harian (akan dipanggil otomatis)
function resetDailyUsage() {
  const today = new Date().toISOString().split('T')[0];
  
  users = users.map(user => {
    if (user.usage.lastReset !== today) {
      return {
        ...user,
        usage: {
          chatCount: 0,
          imageCount: 0,
          lastReset: today
        }
      };
    }
    return user;
  });
}

// Export semua fungsi
module.exports = {
  getUsers,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  addUser,
  updateUser,
  deleteUser,
  resetDailyUsage
};
