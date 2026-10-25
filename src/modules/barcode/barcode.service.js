const bwipjs = require('bwip-js');
const barcodeRepo = require('./barcode.repository');
const eanHelper = require('../../utils/ean13');
const { logActivity } = require('../../utils/audit-log');

class BarcodeService {
  /**
   * Search active product by barcode for POS
   */
  async searchByBarcodeForPos(barcode) {
    if (!barcode || typeof barcode !== 'string') {
      throw Object.assign(new Error('Barcode tidak boleh kosong.'), { statusCode: 400 });
    }

    const cleaned = barcode.trim();
    const product = await barcodeRepo.findActiveByBarcode(cleaned);

    if (!product) {
      // Check if product exists but inactive
      const anyStatus = await barcodeRepo.findByBarcode(cleaned);
      if (anyStatus && !anyStatus.is_active) {
        throw Object.assign(new Error(`Produk "${anyStatus.name}" sedang nonaktif dan tidak dapat dijual.`), { statusCode: 404 });
      }
      throw Object.assign(new Error(`Produk dengan barcode "${cleaned}" tidak ditemukan.`), { statusCode: 404 });
    }

    return product;
  }

  /**
   * Preview next internal EAN-13 barcode for a new product
   */
  async previewNextInternalBarcode() {
    let nextId = await barcodeRepo.getNextProductId();
    let barcode = eanHelper.generateInternalEan13(nextId);
    let existing = await barcodeRepo.findByBarcode(barcode);
    while (existing) {
      nextId++;
      barcode = eanHelper.generateInternalEan13(nextId);
      existing = await barcodeRepo.findByBarcode(barcode);
    }
    return {
      suggestedId: nextId,
      barcode,
      type: 'ean13',
      source: 'internal',
    };
  }

  /**
   * Generate internal EAN-13 barcode for a single product
   */
  async generateInternalBarcode(productId, userId = null, ipAddress = null) {
    const product = await barcodeRepo.findById(productId);
    if (!product) {
      throw Object.assign(new Error('Produk tidak ditemukan.'), { statusCode: 404 });
    }

    // Generate EAN-13 internal barcode: 200 + 9-digit padded ID + check digit
    const generatedBarcode = eanHelper.generateInternalEan13(product.id);

    // Verify uniqueness
    const existing = await barcodeRepo.findByBarcode(generatedBarcode, product.id);
    if (existing) {
      throw Object.assign(
        new Error(`Barcode internal ${generatedBarcode} sudah digunakan oleh produk "${existing.name}".`),
        { statusCode: 409 }
      );
    }

    const oldBarcode = product.barcode;
    const now = new Date();

    await barcodeRepo.updateBarcode(product.id, {
      barcode: generatedBarcode,
      barcode_type: 'ean13',
      barcode_source: 'internal',
      barcode_generated_at: now,
    });

    // Record audit log
    await logActivity(
      userId,
      'barcode_generate',
      'product',
      String(product.id),
      `Generate barcode internal EAN-13: ${generatedBarcode} untuk produk "${product.name}"${oldBarcode ? ` (sebelumnya: ${oldBarcode})` : ''}`,
      ipAddress
    );

    return {
      ...product,
      barcode: generatedBarcode,
      barcode_type: 'ean13',
      barcode_source: 'internal',
      barcode_generated_at: now,
    };
  }

  /**
   * Generate internal barcode in bulk for all products without barcode
   */
  async generateBulkBarcodes(userId = null, ipAddress = null) {
    const productsWithoutBarcode = await barcodeRepo.findProductsWithoutBarcode();
    const results = [];
    const errors = [];

    for (const prod of productsWithoutBarcode) {
      try {
        const barcode = eanHelper.generateInternalEan13(prod.id);
        const existing = await barcodeRepo.findByBarcode(barcode, prod.id);

        if (existing) {
          errors.push({ id: prod.id, name: prod.name, reason: 'Collision with existing barcode' });
          continue;
        }

        await barcodeRepo.updateBarcode(prod.id, {
          barcode,
          barcode_type: 'ean13',
          barcode_source: 'internal',
          barcode_generated_at: new Date(),
        });

        results.push({ id: prod.id, name: prod.name, barcode });
      } catch (err) {
        errors.push({ id: prod.id, name: prod.name, reason: err.message });
      }
    }

    if (results.length > 0) {
      await logActivity(
        userId,
        'barcode_generate_bulk',
        'product',
        null,
        `Generate massal barcode internal untuk ${results.length} produk.`,
        ipAddress
      );
    }

    return {
      totalFound: productsWithoutBarcode.length,
      generatedCount: results.length,
      results,
      errors,
    };
  }

  /**
   * Set or update barcode manually
   */
  async setManualBarcode(productId, barcode, userId = null, ipAddress = null) {
    const product = await barcodeRepo.findById(productId);
    if (!product) {
      throw Object.assign(new Error('Produk tidak ditemukan.'), { statusCode: 404 });
    }

    if (!barcode || typeof barcode !== 'string' || barcode.trim() === '') {
      throw Object.assign(new Error('Barcode tidak boleh kosong.'), { statusCode: 400 });
    }

    const cleaned = barcode.trim();

    // Validate format & check digit
    const validation = eanHelper.validateBarcode(cleaned);
    if (!validation.valid) {
      throw Object.assign(
        new Error(validation.error || 'Format atau check digit barcode tidak valid.'),
        { statusCode: 422 }
      );
    }

    // Check uniqueness
    const existing = await barcodeRepo.findByBarcode(cleaned, product.id);
    if (existing) {
      throw Object.assign(
        new Error(`Barcode "${cleaned}" sudah digunakan oleh produk "${existing.name}".`),
        { statusCode: 409 }
      );
    }

    const oldBarcode = product.barcode;
    const barcodeSource = cleaned.startsWith('200') && validation.type === 'ean13' ? 'internal' : 'manufacturer';

    await barcodeRepo.updateBarcode(product.id, {
      barcode: cleaned,
      barcode_type: validation.type,
      barcode_source: barcodeSource,
      barcode_generated_at: barcodeSource === 'internal' ? new Date() : null,
    });

    // Record audit log
    await logActivity(
      userId,
      'barcode_update',
      'product',
      String(product.id),
      `Ubah barcode produk "${product.name}" dari "${oldBarcode || '-'}" menjadi "${cleaned}" (tipe: ${validation.type.toUpperCase()})`,
      ipAddress
    );

    return {
      ...product,
      barcode: cleaned,
      barcode_type: validation.type,
      barcode_source: barcodeSource,
    };
  }

  /**
   * Render barcode as SVG string or PNG Buffer using bwip-js
   */
  async renderBarcode({ text, type = null, format = 'svg', scale = 2, height = 10, includetext = true }) {
    if (!text || typeof text !== 'string') {
      throw Object.assign(new Error('Teks barcode wajib diisi.'), { statusCode: 400 });
    }

    const cleanedText = text.trim();
    const detectedType = type || eanHelper.detectBarcodeType(cleanedText) || 'code128';

    // Map to bwip-js bcid identifier
    let bcid = 'code128';
    switch (detectedType) {
      case 'ean13':
        bcid = 'ean13';
        break;
      case 'ean8':
        bcid = 'ean8';
        break;
      case 'upca':
        bcid = 'upca';
        break;
      case 'upce':
        bcid = 'upce';
        break;
      case 'code128':
      default:
        bcid = 'code128';
        break;
    }

    const options = {
      bcid,
      text: cleanedText,
      scale: parseInt(scale, 10) || 2,
      height: parseInt(height, 10) || 10,
      includetext: Boolean(includetext),
      textxalign: 'center',
    };

    if (format === 'png') {
      const buffer = await bwipjs.toBuffer(options);
      return {
        contentType: 'image/png',
        data: buffer,
      };
    } else {
      // Default SVG
      const svg = bwipjs.toSVG(options);
      return {
        contentType: 'image/svg+xml',
        data: svg,
      };
    }
  }

  /**
   * Get all active products with barcodes for label printing
   */
  async getAllProductsWithBarcode() {
    return await barcodeRepo.findAllWithBarcode();
  }

  /**
   * Get products for label printing
   */
  async getProductsForLabelPrint(productIds) {
    if (!productIds || productIds.length === 0) {
      return await barcodeRepo.findAllWithBarcode();
    }
    const products = await barcodeRepo.findByIds(productIds);
    return products;
  }
}

module.exports = new BarcodeService();
