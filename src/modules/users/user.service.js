const bcrypt = require('bcrypt');
const userRepository = require('./user.repository');
const { logActivity } = require('../../utils/audit-log');

const SALT_ROUNDS = 10;

class UserService {
  async getAll(options) {
    return await userRepository.findAll(options);
  }

  async getById(id) {
    const user = await userRepository.findById(id);
    if (!user) throw Object.assign(new Error('Pengguna tidak ditemukan.'), { statusCode: 404 });
    return user;
  }

  async create({ name, username, password, role, is_active }, adminId = null, ipAddress = null) {
    const trimmedUsername = username.trim().toLowerCase();

    const existing = await userRepository.findByUsername(trimmedUsername);
    if (existing) {
      throw Object.assign(new Error(`Username "${trimmedUsername}" sudah digunakan.`), { statusCode: 422 });
    }

    if (!password || password.length < 6) {
      throw Object.assign(new Error('Password minimal 6 karakter.'), { statusCode: 422 });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const id = await userRepository.create({
      name: name.trim(),
      username: trimmedUsername,
      password_hash: passwordHash,
      role: role || 'cashier',
      is_active: is_active !== undefined ? is_active : 1,
    });

    await logActivity(
      adminId,
      'user_create',
      'user',
      id,
      `Buat akun pengguna baru: ${trimmedUsername} (${role || 'cashier'})`,
      ipAddress
    );

    return await userRepository.findById(id);
  }

  async update(id, { name, role, is_active }, adminId = null, ipAddress = null) {
    const targetUser = await this.getById(id);

    // Prevent admin from deactivating or demoting own account
    if (parseInt(adminId) === parseInt(id)) {
      if (!is_active || is_active === '0' || is_active === false) {
        throw Object.assign(new Error('Anda tidak dapat menonaktifkan akun Anda sendiri.'), { statusCode: 422 });
      }
      if (role && role !== 'admin') {
        throw Object.assign(new Error('Anda tidak dapat mengubah role akun Anda sendiri menjadi non-admin.'), { statusCode: 422 });
      }
    }

    await userRepository.update(id, {
      name: name.trim(),
      role: role || targetUser.role,
      is_active: is_active !== undefined ? !!is_active : targetUser.is_active,
    });

    await logActivity(
      adminId,
      'user_update',
      'user',
      id,
      `Ubah data akun: ${targetUser.username} (Role: ${role || targetUser.role}, Status: ${is_active ? 'Aktif' : 'Nonaktif'})`,
      ipAddress
    );

    return await userRepository.findById(id);
  }

  async resetPassword(id, newPassword, adminId = null, ipAddress = null) {
    const targetUser = await this.getById(id);

    if (!newPassword || newPassword.length < 6) {
      throw Object.assign(new Error('Password baru minimal 6 karakter.'), { statusCode: 422 });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userRepository.updatePassword(id, passwordHash);

    await logActivity(
      adminId,
      'user_reset_password',
      'user',
      id,
      `Reset password akun: ${targetUser.username}`,
      ipAddress
    );

    return { success: true, message: `Password akun ${targetUser.username} berhasil direset.` };
  }

  async toggleStatus(id, adminId = null, ipAddress = null) {
    const targetUser = await this.getById(id);

    if (parseInt(adminId) === parseInt(id)) {
      throw Object.assign(new Error('Anda tidak dapat menonaktifkan akun Anda sendiri.'), { statusCode: 422 });
    }

    const newStatus = !targetUser.is_active;
    await userRepository.toggleStatus(id, newStatus);

    await logActivity(
      adminId,
      'user_toggle_status',
      'user',
      id,
      `Ubah status akun ${targetUser.username} menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}`,
      ipAddress
    );

    return await userRepository.findById(id);
  }
}

module.exports = new UserService();
