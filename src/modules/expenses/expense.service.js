const expenseRepository = require('./expense.repository');
const { logActivity } = require('../../utils/audit-log');

class ExpenseService {
  async getAll(options) {
    return await expenseRepository.findAll(options);
  }

  async getById(id) {
    const expense = await expenseRepository.findById(id);
    if (!expense) throw Object.assign(new Error('Data pengeluaran tidak ditemukan.'), { statusCode: 404 });
    return expense;
  }

  async getCategories() {
    return await expenseRepository.getCategories();
  }

  async getSummary(options) {
    return await expenseRepository.getSummary(options);
  }

  async create({ user_id, category, amount, description, expense_date }, ipAddress = null) {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw Object.assign(new Error('Nominal pengeluaran harus lebih dari 0.'), { statusCode: 422 });
    }

    const id = await expenseRepository.create({
      user_id,
      category: category.trim(),
      amount: parsedAmount,
      description: description ? description.trim() : null,
      expense_date: expense_date || new Date(),
    });

    await logActivity(
      user_id,
      'expense_create',
      'expense',
      id,
      `Catat pengeluaran ${category}: Rp ${new Intl.NumberFormat('id-ID').format(parsedAmount)}`,
      ipAddress
    );

    return await expenseRepository.findById(id);
  }

  async update(id, { category, amount, description, expense_date }, userId = null, ipAddress = null) {
    await this.getById(id);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw Object.assign(new Error('Nominal pengeluaran harus lebih dari 0.'), { statusCode: 422 });
    }

    await expenseRepository.update(id, {
      category: category.trim(),
      amount: parsedAmount,
      description: description ? description.trim() : null,
      expense_date,
    });

    await logActivity(
      userId,
      'expense_update',
      'expense',
      id,
      `Ubah pengeluaran ID ${id}: ${category} (Rp ${new Intl.NumberFormat('id-ID').format(parsedAmount)})`,
      ipAddress
    );

    return await expenseRepository.findById(id);
  }

  async delete(id, userId = null, ipAddress = null) {
    const expense = await this.getById(id);
    await expenseRepository.delete(id);

    await logActivity(
      userId,
      'expense_delete',
      'expense',
      id,
      `Hapus pengeluaran ${expense.category}: Rp ${new Intl.NumberFormat('id-ID').format(expense.amount)}`,
      ipAddress
    );

    return expense;
  }
}

module.exports = new ExpenseService();
