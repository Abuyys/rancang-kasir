const bcrypt = require('bcrypt');
const authRepository = require('./auth.repository');

class AuthService {
  /**
   * Authenticate user with username and password
   * @param {string} username
   * @param {string} password
   * @returns {Promise<object>} User data (without password_hash)
   * @throws {Error} If credentials are invalid or account is inactive
   */
  async login(username, password) {
    // Find user
    const user = await authRepository.findByUsername(username);

    if (!user) {
      throw Object.assign(new Error('Username atau password salah.'), { statusCode: 401 });
    }

    // Check if account is active
    if (!user.is_active) {
      throw Object.assign(new Error('Akun Anda telah dinonaktifkan. Hubungi admin.'), { statusCode: 403 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw Object.assign(new Error('Username atau password salah.'), { statusCode: 401 });
    }

    // Update last login
    await authRepository.updateLastLogin(user.id);

    // Return user data without password_hash
    const { password_hash, ...userData } = user;
    return userData;
  }

  /**
   * Get current user profile by ID
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async getProfile(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw Object.assign(new Error('User tidak ditemukan.'), { statusCode: 404 });
    }

    return user;
  }
}

module.exports = new AuthService();
