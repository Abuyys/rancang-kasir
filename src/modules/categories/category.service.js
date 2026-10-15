const categoryRepository = require('./category.repository');

class CategoryService {
  async getAll(options) {
    return await categoryRepository.findAll(options);
  }

  async getAllActive() {
    return await categoryRepository.findAllActive();
  }

  async getById(id) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw Object.assign(new Error('Kategori tidak ditemukan.'), { statusCode: 404 });
    }
    return category;
  }

  async create({ name, description }) {
    const existing = await categoryRepository.findByName(name);
    if (existing) {
      throw Object.assign(new Error('Nama kategori sudah digunakan.'), { statusCode: 409 });
    }
    const id = await categoryRepository.create({ name, description });
    return await categoryRepository.findById(id);
  }

  async update(id, { name, description }) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw Object.assign(new Error('Kategori tidak ditemukan.'), { statusCode: 404 });
    }
    const existing = await categoryRepository.findByName(name);
    if (existing && existing.id !== parseInt(id)) {
      throw Object.assign(new Error('Nama kategori sudah digunakan.'), { statusCode: 409 });
    }
    await categoryRepository.update(id, { name, description });
    return await categoryRepository.findById(id);
  }

  async toggleStatus(id) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw Object.assign(new Error('Kategori tidak ditemukan.'), { statusCode: 404 });
    }
    if (category.is_active) {
      const productCount = await categoryRepository.countProducts(id);
      if (productCount > 0) {
        throw Object.assign(
          new Error(`Kategori masih memiliki ${productCount} produk. Pindahkan atau nonaktifkan produk terlebih dahulu.`),
          { statusCode: 422 }
        );
      }
    }
    const newStatus = !category.is_active;
    await categoryRepository.updateStatus(id, newStatus);
    return await categoryRepository.findById(id);
  }
}

module.exports = new CategoryService();
