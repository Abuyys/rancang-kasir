const pool = require('../../config/database');
const shiftRepository = require('./shift.repository');

class ShiftService {
  async getAll(options) { return await shiftRepository.findAll(options); }

  async getById(id) {
    const shift = await shiftRepository.findById(id);
    if (!shift) throw Object.assign(new Error('Shift tidak ditemukan.'), { statusCode: 404 });
    return shift;
  }

  async getOpenShift(userId) {
    return await shiftRepository.findOpenShift(userId);
  }

  async openShift(userId, openingCash) {
    const existingShift = await shiftRepository.findOpenShift(userId);
    if (existingShift) {
      throw Object.assign(new Error('Anda sudah memiliki shift yang terbuka. Tutup shift terlebih dahulu.'), { statusCode: 422 });
    }
    const cash = parseFloat(openingCash);
    if (isNaN(cash) || cash < 0) {
      throw Object.assign(new Error('Uang modal awal tidak valid.'), { statusCode: 422 });
    }
    const id = await shiftRepository.create({ user_id: userId, opening_cash: cash });
    return await shiftRepository.findById(id);
  }

  async getShiftForClose(shiftId, userId) {
    const shift = await shiftRepository.findById(shiftId);
    if (!shift) throw Object.assign(new Error('Shift tidak ditemukan.'), { statusCode: 404 });
    if (shift.status !== 'open') throw Object.assign(new Error('Shift sudah ditutup.'), { statusCode: 422 });
    if (shift.user_id !== userId) throw Object.assign(new Error('Anda tidak bisa menutup shift milik orang lain.'), { statusCode: 403 });

    const conn = await pool.getConnection();
    try {
      const summary = await shiftRepository.getShiftSummary(conn, shiftId);
      const closingCashExpected = parseFloat(shift.opening_cash) + summary.totalCash;
      return { shift, summary, closingCashExpected };
    } finally {
      conn.release();
    }
  }

  async closeShift(shiftId, userId, closingCashActual, notes) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [shiftRows] = await conn.execute(
        'SELECT * FROM cashier_shifts WHERE id = ? FOR UPDATE', [shiftId]
      );
      if (shiftRows.length === 0) throw Object.assign(new Error('Shift tidak ditemukan.'), { statusCode: 404 });
      const shift = shiftRows[0];
      if (shift.status !== 'open') throw Object.assign(new Error('Shift sudah ditutup.'), { statusCode: 422 });
      if (shift.user_id !== userId) throw Object.assign(new Error('Anda tidak bisa menutup shift milik orang lain.'), { statusCode: 403 });

      const summary = await shiftRepository.getShiftSummary(conn, shiftId);
      const closingCashExpected = parseFloat(shift.opening_cash) + summary.totalCash;
      const actual = parseFloat(closingCashActual);
      const difference = actual - closingCashExpected;

      await shiftRepository.closeShift(conn, shiftId, {
        closing_cash_expected: closingCashExpected,
        closing_cash_actual: actual,
        cash_difference: difference,
        notes,
      });

      await conn.commit();
      return await shiftRepository.findById(shiftId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new ShiftService();
