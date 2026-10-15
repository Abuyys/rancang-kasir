const supplierRepository = require('./supplier.repository');

class SupplierService {
  async getAll(options) { return await supplierRepository.findAll(options); }
  async getAllActive() { return await supplierRepository.findAllActive(); }

  async getById(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) throw Object.assign(new Error('Supplier tidak ditemukan.'), { statusCode: 404 });
    return supplier;
  }

  async create(data) {
    const id = await supplierRepository.create(data);
    return await supplierRepository.findById(id);
  }

  async update(id, data) {
    await this.getById(id);
    await supplierRepository.update(id, data);
    return await supplierRepository.findById(id);
  }

  async toggleStatus(id) {
    const supplier = await this.getById(id);
    await supplierRepository.updateStatus(id, !supplier.is_active);
    return await supplierRepository.findById(id);
  }
}

module.exports = new SupplierService();
