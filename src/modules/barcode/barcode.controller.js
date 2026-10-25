const barcodeService = require('./barcode.service');
const barcodeRepo = require('./barcode.repository');
const settingRepo = require('../settings/setting.repository');

class BarcodeController {
  /**
   * GET /api/products/barcode/:code
   * Find active product by barcode for POS scanning
   */
  async apiSearch(req, res) {
    try {
      const code = req.params.code;
      const product = await barcodeService.searchByBarcodeForPos(code);
      return res.json({
        success: true,
        data: {
          id: product.id,
          sku: product.sku,
          barcode: product.barcode,
          barcode_type: product.barcode_type,
          name: product.name,
          category_name: product.category_name,
          selling_price: parseFloat(product.selling_price),
          stock: parseFloat(product.stock),
          unit: product.unit,
        },
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/barcode/next-internal
   * Get predicted next internal EAN-13 barcode
   */
  async apiNextInternalBarcode(req, res) {
    try {
      const data = await barcodeService.previewNextInternalBarcode();
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/products/:id/barcode/generate
   * Generate internal EAN-13 barcode for a product
   */
  async apiGenerate(req, res) {
    try {
      const id = req.params.id;
      const product = await barcodeService.generateInternalBarcode(
        id,
        req.session?.user?.id,
        req.ip
      );
      return res.json({
        success: true,
        message: `Barcode internal EAN-13 (${product.barcode}) berhasil dibuat.`,
        data: product,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * POST /api/products/barcode/generate-bulk
   * Bulk generate internal barcodes for products without barcode
   */
  async apiGenerateBulk(req, res) {
    try {
      const result = await barcodeService.generateBulkBarcodes(
        req.session?.user?.id,
        req.ip
      );
      return res.json({
        success: true,
        message: `Berhasil membuat ${result.generatedCount} barcode baru dari ${result.totalFound} produk.`,
        data: result,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * PUT /api/products/:id/barcode
   * Update barcode manually
   */
  async apiUpdate(req, res) {
    try {
      const id = req.params.id;
      const { barcode } = req.body;
      const product = await barcodeService.setManualBarcode(
        id,
        barcode,
        req.session?.user?.id,
        req.ip
      );
      return res.json({
        success: true,
        message: 'Barcode produk berhasil diperbarui.',
        data: product,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/products/:id/barcode/image
   * Render barcode image for a specific product
   */
  async apiProductBarcodeImage(req, res) {
    try {
      const id = req.params.id;
      const format = (req.query.format || 'svg').toLowerCase();
      const scale = parseInt(req.query.scale, 10) || 2;
      const height = parseInt(req.query.height, 10) || 10;
      const includetext = req.query.includetext !== 'false';

      const product = await barcodeRepo.findById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      }

      if (!product.barcode) {
        return res.status(404).json({ success: false, message: 'Produk belum memiliki barcode.' });
      }

      const rendered = await barcodeService.renderBarcode({
        text: product.barcode,
        type: product.barcode_type,
        format,
        scale,
        height,
        includetext,
      });

      res.setHeader('Content-Type', rendered.contentType);
      if (req.query.download === '1') {
        const ext = format === 'png' ? 'png' : 'svg';
        res.setHeader('Content-Disposition', `attachment; filename="barcode-${product.sku}.${ext}"`);
      }
      return res.send(rendered.data);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/barcode/render
   * Render dynamic barcode image preview
   */
  async apiRenderDynamic(req, res) {
    try {
      const text = req.query.text;
      if (!text) {
        return res.status(400).json({ success: false, message: 'Teks barcode wajib disertakan.' });
      }

      const format = (req.query.format || 'svg').toLowerCase();
      const type = req.query.type || null;
      const scale = parseInt(req.query.scale, 10) || 2;
      const height = parseInt(req.query.height, 10) || 10;
      const includetext = req.query.includetext !== 'false';

      const rendered = await barcodeService.renderBarcode({
        text,
        type,
        format,
        scale,
        height,
        includetext,
      });

      res.setHeader('Content-Type', rendered.contentType);
      return res.send(rendered.data);
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /labels/print
   * Render printable labels page
   */
  async printLabelsPage(req, res, next) {
    try {
      const hasExplicitQuery = req.query.ids !== undefined || req.query.id !== undefined;
      const rawIds = req.query.ids !== undefined ? req.query.ids : (req.query.id !== undefined ? req.query.id : '');
      const ids = rawIds && rawIds !== 'all' ? String(rawIds).split(',').map(s => s.trim()).filter(Boolean) : [];
      const copies = Math.max(1, parseInt(req.query.copies, 10) || 1);
      const size = req.query.size || '38x25'; // '38x25', '50x30', 'a4_3x8'
      const showPrice = req.query.showPrice !== 'false' && req.query.showPrice !== '0';
      const showStoreName = req.query.showStoreName !== 'false' && req.query.showStoreName !== '0';

      let products = [];
      if (hasExplicitQuery && rawIds !== 'all') {
        if (ids.length > 0) {
          products = await barcodeService.getProductsForLabelPrint(ids);
        }
      } else {
        // Default when visiting /labels/print directly (e.g. from sidebar) or with ids=all:
        // Load all active products that have a barcode
        products = await barcodeService.getAllProductsWithBarcode();
      }

      // Filter only products that have barcode
      const validProducts = products.filter(p => p.barcode && p.barcode.trim() !== '');

      const [allStoreProducts, categories, settings] = await Promise.all([
        barcodeRepo.findAllForPicker(),
        barcodeRepo.findAllCategories(),
        settingRepo.getAll(),
      ]);

      const totalStoreProductsWithBarcode = allStoreProducts.filter(p => p.barcode && p.barcode.trim() !== '').length;

      res.render('labels/print', {
        title: 'Cetak Label Barcode',
        products: validProducts,
        allStoreProducts,
        categories,
        totalStoreProductsWithBarcode,
        totalRequested: hasExplicitQuery ? ids.length : validProducts.length,
        hasExplicitQuery,
        size,
        copies,
        showPrice,
        showStoreName,
        settings,
        layout: false,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BarcodeController();
