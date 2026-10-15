const productRepository = require('./product.repository');

class ProductService {
  async getAll(options) {
    return await productRepository.findAll(options);
  }

  async getById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw Object.assign(new Error('Produk tidak ditemukan.'), { statusCode: 404 });
    }
    return product;
  }

  async getByBarcode(barcode) {
    const product = await productRepository.findByBarcode(barcode);
    if (!product) {
      throw Object.assign(new Error('Produk dengan barcode tersebut tidak ditemukan.'), { statusCode: 404 });
    }
    return product;
  }

  async create(data) {
    const existingSku = await productRepository.findBySku(data.sku);
    if (existingSku) {
      throw Object.assign(new Error('SKU sudah digunakan.'), { statusCode: 409 });
    }
    if (data.barcode) {
      const existingBarcode = await productRepository.findByBarcode(data.barcode);
      if (existingBarcode) {
        throw Object.assign(new Error('Barcode sudah digunakan.'), { statusCode: 409 });
      }
    }
    if (parseFloat(data.selling_price) <= 0) {
      throw Object.assign(new Error('Harga jual harus lebih dari 0.'), { statusCode: 422 });
    }
    // Handle checkbox: is_active comes as '1' string or undefined
    data.is_active = data.is_active ? true : false;
    const id = await productRepository.create(data);
    return await productRepository.findById(id);
  }

  async update(id, data) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw Object.assign(new Error('Produk tidak ditemukan.'), { statusCode: 404 });
    }
    const existingSku = await productRepository.findBySku(data.sku);
    if (existingSku && existingSku.id !== parseInt(id)) {
      throw Object.assign(new Error('SKU sudah digunakan produk lain.'), { statusCode: 409 });
    }
    if (data.barcode) {
      const existingBarcode = await productRepository.findByBarcode(data.barcode);
      if (existingBarcode && existingBarcode.id !== parseInt(id)) {
        throw Object.assign(new Error('Barcode sudah digunakan produk lain.'), { statusCode: 409 });
      }
    }
    if (parseFloat(data.selling_price) <= 0) {
      throw Object.assign(new Error('Harga jual harus lebih dari 0.'), { statusCode: 422 });
    }
    data.is_active = data.is_active ? true : false;
    await productRepository.update(id, data);
    return await productRepository.findById(id);
  }

  async toggleStatus(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw Object.assign(new Error('Produk tidak ditemukan.'), { statusCode: 404 });
    }
    const newStatus = !product.is_active;
    await productRepository.updateStatus(id, newStatus);
    return await productRepository.findById(id);
  }
}

module.exports = new ProductService();
