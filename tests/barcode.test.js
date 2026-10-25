const eanHelper = require('../src/utils/ean13');
const barcodeService = require('../src/modules/barcode/barcode.service');

describe('EAN-13 & Barcode Utility Tests', () => {
  test('calculateEan13CheckDigit computes correct check digit according to GS1 EAN-13 spec', () => {
    // 200000000042 -> 8
    const checkDigit1 = eanHelper.calculateEan13CheckDigit('200000000042');
    expect(checkDigit1).toBe(8);

    // 200000000001 -> 2*1 + 1*3 = 5 -> check digit 5
    expect(eanHelper.calculateEan13CheckDigit('200000000001')).toBe(5);

    // Standard EAN-13 test vector: 400638133393 -> check digit 1 (4006381333931)
    const checkDigit2 = eanHelper.calculateEan13CheckDigit('400638133393');
    expect(checkDigit2).toBe(1);

    // Zero remainder check: e.g. sum % 10 === 0 -> check digit 0
    expect(eanHelper.calculateEan13CheckDigit('000000000000')).toBe(0);
  });

  test('generateInternalEan13 creates 13-digit code starting with 200 with 9-digit padded ID', () => {
    const code42 = eanHelper.generateInternalEan13(42);
    expect(code42).toHaveLength(13);
    expect(code42.startsWith('200000000042')).toBe(true);
    expect(code42).toBe('2000000000428');
    expect(eanHelper.validateEan13(code42)).toBe(true);

    const code1 = eanHelper.generateInternalEan13(1);
    expect(code1).toBe('2000000000015');
    expect(eanHelper.validateEan13(code1)).toBe(true);
  });

  test('validateEan13 identifies valid and invalid barcodes', () => {
    expect(eanHelper.validateEan13('2000000000015')).toBe(true);
    expect(eanHelper.validateEan13('2000000000428')).toBe(true);
    expect(eanHelper.validateEan13('4006381333931')).toBe(true);
    // Bad check digit
    expect(eanHelper.validateEan13('2000000000018')).toBe(false);
    // Non-digit or wrong length
    expect(eanHelper.validateEan13('200000000001')).toBe(false);
    expect(eanHelper.validateEan13('200000000001A')).toBe(false);
  });

  test('validateEan8, validateUpcA, and validateCode128', () => {
    // EAN-8: 96385074
    expect(eanHelper.validateEan8('96385074')).toBe(true);
    expect(eanHelper.validateEan8('96385075')).toBe(false);

    // UPC-A: 012345678905
    expect(eanHelper.validateUpcA('012345678905')).toBe(true);

    // Code128
    expect(eanHelper.validateCode128('MKN-001')).toBe(true);
    expect(eanHelper.validateCode128('')).toBe(false);
  });

  test('detectBarcodeType detects supported formats correctly', () => {
    expect(eanHelper.detectBarcodeType('2000000000015')).toBe('ean13');
    expect(eanHelper.detectBarcodeType('96385074')).toBe('ean8');
    expect(eanHelper.detectBarcodeType('012345678905')).toBe('upca');
    expect(eanHelper.detectBarcodeType('MKN-001')).toBe('code128');
  });

  test('renderBarcode produces valid SVG and PNG outputs', async () => {
    // SVG test with valid EAN-13
    const svgResult = await barcodeService.renderBarcode({
      text: '2000000000015',
      type: 'ean13',
      format: 'svg',
    });
    expect(svgResult.contentType).toBe('image/svg+xml');
    expect(typeof svgResult.data).toBe('string');
    expect(svgResult.data).toContain('<svg');

    // PNG test with valid EAN-13
    const pngResult = await barcodeService.renderBarcode({
      text: '2000000000015',
      type: 'ean13',
      format: 'png',
    });
    expect(pngResult.contentType).toBe('image/png');
    expect(Buffer.isBuffer(pngResult.data)).toBe(true);
    expect(pngResult.data.length).toBeGreaterThan(100);
  });
});
