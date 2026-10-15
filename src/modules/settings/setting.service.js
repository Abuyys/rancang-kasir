const settingRepository = require('./setting.repository');
const { logActivity } = require('../../utils/audit-log');

class SettingService {
  async getSettings() {
    const settings = await settingRepository.getAll();
    return {
      store_name: settings.store_name || 'Minimarket Saya',
      store_address: settings.store_address || 'Jl. Contoh No. 123',
      store_phone: settings.store_phone || '08123456789',
      invoice_prefix: settings.invoice_prefix || 'INV',
      receipt_footer: settings.receipt_footer || 'Terima kasih atas kunjungan Anda!',
      max_cashier_discount: settings.max_cashier_discount || '10',
      default_min_stock: settings.default_min_stock || '5',
      timezone: settings.timezone || 'Asia/Jakarta',
      currency: settings.currency || 'IDR',
    };
  }

  async get(key, defaultValue = null) {
    const val = await settingRepository.get(key);
    return val !== null ? val : defaultValue;
  }

  async getMaxCashierDiscount() {
    const val = await this.get('max_cashier_discount', '10');
    return parseFloat(val) || 10;
  }

  async updateSettings(data, adminId = null, ipAddress = null) {
    const allowedKeys = [
      'store_name',
      'store_address',
      'store_phone',
      'invoice_prefix',
      'receipt_footer',
      'max_cashier_discount',
      'default_min_stock',
      'timezone',
      'currency',
    ];

    const toUpdate = {};
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        toUpdate[key] = data[key];
      }
    }

    // Validate max_cashier_discount
    if (toUpdate.max_cashier_discount !== undefined) {
      const disc = parseFloat(toUpdate.max_cashier_discount);
      if (isNaN(disc) || disc < 0 || disc > 100) {
        throw Object.assign(new Error('Batas diskon kasir harus antara 0% sampai 100%.'), { statusCode: 422 });
      }
    }

    await settingRepository.updateMany(toUpdate);

    await logActivity(
      adminId,
      'settings_update',
      'setting',
      null,
      `Memperbarui konfigurasi sistem dan toko (${Object.keys(toUpdate).join(', ')})`,
      ipAddress
    );

    return await this.getSettings();
  }

  async getAuditLogs(options) {
    return await settingRepository.getAuditLogs(options);
  }
}

module.exports = new SettingService();
