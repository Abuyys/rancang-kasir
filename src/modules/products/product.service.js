const productRepository = require('./product.repository');
const eanHelper = require('../../utils/ean13');
const { logActivity } = require('../../utils/audit-log');

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
    if (!barcode || typeof barcode !== 'string') {
      throw Object.assign(new Error('Barcode tidak boleh kosong.'), { statusCode: 400 });
    }
    const cleaned = barcode.trim();
    const product = await productRepository.findByBarcode(cleaned);
    if (!product) {
      throw Object.assign(new Error(`Produk dengan barcode "${cleaned}" tidak ditemukan.`), { statusCode: 404 });
    }
    return product;
  }

  async create(data, userId = null, ipAddress = null) {
    const existingSku = await productRepository.findBySku(data.sku);
    if (existingSku) {
      throw Object.assign(new Error('SKU sudah digunakan.'), { statusCode: 409 });
    }
    if (data.barcode && String(data.barcode).trim() !== '') {
      const cleanedBarcode = String(data.barcode).trim();
      const validation = eanHelper.validateBarcode(cleanedBarcode);
      if (!validation.valid) {
        throw Object.assign(new Error(validation.error || 'Format atau check-digit barcode tidak valid.'), { statusCode: 422 });
      }
      const existingBarcode = await productRepository.findByBarcode(cleanedBarcode);
      if (existingBarcode) {
        throw Object.assign(new Error(`Barcode "${cleanedBarcode}" sudah digunakan oleh produk "${existingBarcode.name}".`), { statusCode: 409 });
      }
      data.barcode = cleanedBarcode;
      data.barcode_type = validation.type;
      data.barcode_source = (cleanedBarcode.startsWith('200') && validation.type === 'ean13') ? 'internal' : 'manufacturer';
      if (data.barcode_source === 'internal') {
        data.barcode_generated_at = new Date();
      }
    } else {
      data.barcode = null;
      data.barcode_type = null;
      data.barcode_source = null;
      data.barcode_generated_at = null;
    }

    if (parseFloat(data.selling_price) <= 0) {
      throw Object.assign(new Error('Harga jual harus lebih dari 0.'), { statusCode: 422 });
    }
    // Handle checkbox: is_active comes as '1' string or undefined
    data.is_active = data.is_active ? true : false;
    const id = await productRepository.create(data);

    if (data.barcode) {
      await logActivity(
        userId,
        'barcode_create',
        'product',
        String(id),
        `Tambah barcode ${data.barcode} (${data.barcode_type}) pada produk baru "${data.name}"`,
        ipAddress
      );
    }

    return await productRepository.findById(id);
  }

  async update(id, data, userId = null, ipAddress = null) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw Object.assign(new Error('Produk tidak ditemukan.'), { statusCode: 404 });
    }
    const existingSku = await productRepository.findBySku(data.sku);
    if (existingSku && existingSku.id !== parseInt(id)) {
      throw Object.assign(new Error('SKU sudah digunakan produk lain.'), { statusCode: 409 });
    }

    const oldBarcode = product.barcode;
    let barcodeChanged = false;

    if (data.barcode && String(data.barcode).trim() !== '') {
      const cleanedBarcode = String(data.barcode).trim();
      const validation = eanHelper.validateBarcode(cleanedBarcode);
      if (!validation.valid) {
        throw Object.assign(new Error(validation.error || 'Format atau check-digit barcode tidak valid.'), { statusCode: 422 });
      }
      const existingBarcode = await productRepository.findByBarcode(cleanedBarcode);
      if (existingBarcode && existingBarcode.id !== parseInt(id)) {
        throw Object.assign(new Error(`Barcode "${cleanedBarcode}" sudah digunakan oleh produk "${existingBarcode.name}".`), { statusCode: 409 });
      }
      data.barcode = cleanedBarcode;
      data.barcode_type = validation.type;
      data.barcode_source = (cleanedBarcode.startsWith('200') && validation.type === 'ean13') ? 'internal' : 'manufacturer';
      if (oldBarcode !== cleanedBarcode) {
        barcodeChanged = true;
        if (data.barcode_source === 'internal' && !product.barcode_generated_at) {
          data.barcode_generated_at = new Date();
        }
      }
    } else {
      if (oldBarcode) {
        barcodeChanged = true;
      }
      data.barcode = null;
      data.barcode_type = null;
      data.barcode_source = null;
      data.barcode_generated_at = null;
    }

    if (parseFloat(data.selling_price) <= 0) {
      throw Object.assign(new Error('Harga jual harus lebih dari 0.'), { statusCode: 422 });
    }
    data.is_active = data.is_active ? true : false;
    await productRepository.update(id, data);

    if (barcodeChanged) {
      await logActivity(
        userId,
        'barcode_update',
        'product',
        String(id),
        `Perubahan barcode produk "${product.name}" dari "${oldBarcode || '-'}" menjadi "${data.barcode || '-'}"`,
        ipAddress
      );
    }

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
