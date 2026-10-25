/**
 * EAN-13 & Barcode Utility Helper
 * Spec: barcode.md - Section 5
 */

/**
 * Calculate EAN-13 check digit for a 12-digit string
 * @param {string} twelveDigits - 12 numeric digits
 * @returns {number} 0-9 check digit
 */
function calculateEan13CheckDigit(twelveDigits) {
  if (typeof twelveDigits !== 'string' || !/^\d{12}$/.test(twelveDigits)) {
    throw new Error('Input must be a 12-digit numeric string');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10);
    // Odd positions (1st, 3rd, 5th -> index 0, 2, 4...) multiplied by 1
    // Even positions (2nd, 4th, 6th -> index 1, 3, 5...) multiplied by 3
    sum += (i % 2 === 0) ? digit * 1 : digit * 3;
  }

  const remainder = sum % 10;
  return (remainder === 0) ? 0 : (10 - remainder);
}

/**
 * Generate in-store internal EAN-13 barcode using prefix 200 + 9-digit zero-padded product ID + check digit
 * @param {number|string} productId 
 * @returns {string} 13-digit internal EAN-13 barcode
 */
function generateInternalEan13(productId) {
  const numId = parseInt(productId, 10);
  if (isNaN(numId) || numId <= 0) {
    throw new Error('Product ID must be a positive integer');
  }

  const prefix = '200';
  const paddedId = String(numId).padStart(9, '0');
  const twelveDigits = prefix + paddedId;
  const checkDigit = calculateEan13CheckDigit(twelveDigits);

  return `${twelveDigits}${checkDigit}`;
}

/**
 * Validate EAN-13 barcode
 * @param {string} barcode 
 * @returns {boolean}
 */
function validateEan13(barcode) {
  if (!barcode || typeof barcode !== 'string') return false;
  const cleaned = barcode.trim();
  if (!/^\d{13}$/.test(cleaned)) return false;

  const twelveDigits = cleaned.substring(0, 12);
  const checkDigit = parseInt(cleaned[12], 10);
  return calculateEan13CheckDigit(twelveDigits) === checkDigit;
}

/**
 * Calculate EAN-8 check digit for a 7-digit string
 * @param {string} sevenDigits 
 * @returns {number}
 */
function calculateEan8CheckDigit(sevenDigits) {
  if (typeof sevenDigits !== 'string' || !/^\d{7}$/.test(sevenDigits)) {
    throw new Error('Input must be a 7-digit numeric string');
  }
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(sevenDigits[i], 10);
    sum += (i % 2 === 0) ? digit * 3 : digit * 1;
  }
  const remainder = sum % 10;
  return (remainder === 0) ? 0 : (10 - remainder);
}

/**
 * Validate EAN-8 barcode
 * @param {string} barcode 
 * @returns {boolean}
 */
function validateEan8(barcode) {
  if (!barcode || typeof barcode !== 'string') return false;
  const cleaned = barcode.trim();
  if (!/^\d{8}$/.test(cleaned)) return false;
  const seven = cleaned.substring(0, 7);
  const check = parseInt(cleaned[7], 10);
  return calculateEan8CheckDigit(seven) === check;
}

/**
 * Validate UPC-A barcode (12 digits)
 * @param {string} barcode 
 * @returns {boolean}
 */
function validateUpcA(barcode) {
  if (!barcode || typeof barcode !== 'string') return false;
  const cleaned = barcode.trim();
  if (!/^\d{12}$/.test(cleaned)) return false;
  // UPC-A is equivalent to EAN-13 with leading 0
  return validateEan13('0' + cleaned);
}

/**
 * Validate Code128 (ASCII 32 to 126, length 1 to 80)
 * @param {string} barcode 
 * @returns {boolean}
 */
function validateCode128(barcode) {
  if (!barcode || typeof barcode !== 'string') return false;
  const cleaned = barcode.trim();
  if (cleaned.length === 0 || cleaned.length > 80) return false;
  // printable ASCII characters
  return /^[\x20-\x7E]+$/.test(cleaned);
}

/**
 * Detect barcode type from string
 * @param {string} barcode 
 * @returns {'ean13'|'ean8'|'upca'|'code128'|null}
 */
function detectBarcodeType(barcode) {
  if (!barcode || typeof barcode !== 'string') return null;
  const cleaned = barcode.trim();

  if (/^\d{13}$/.test(cleaned) && validateEan13(cleaned)) {
    return 'ean13';
  }
  if (/^\d{8}$/.test(cleaned) && validateEan8(cleaned)) {
    return 'ean8';
  }
  if (/^\d{12}$/.test(cleaned) && validateUpcA(cleaned)) {
    return 'upca';
  }
  if (/^\d{6,8}$/.test(cleaned)) {
    return 'upce';
  }
  if (validateCode128(cleaned)) {
    return 'code128';
  }
  return null;
}

/**
 * Validate barcode format and check digit
 * @param {string} barcode 
 * @param {string|null} expectedType 
 * @returns {{ valid: boolean, type: string|null, error?: string }}
 */
function validateBarcode(barcode, expectedType = null) {
  if (!barcode || typeof barcode !== 'string') {
    return { valid: false, type: null, error: 'Barcode tidak boleh kosong.' };
  }

  const cleaned = barcode.trim();
  const detected = detectBarcodeType(cleaned);

  if (!detected) {
    return { valid: false, type: null, error: 'Format atau check-digit barcode tidak valid.' };
  }

  if (expectedType && expectedType !== detected && !(expectedType === 'code128' && detected)) {
    return {
      valid: false,
      type: detected,
      error: `Tipe barcode tidak cocok (terdeteksi: ${detected.toUpperCase()}, diharapkan: ${expectedType.toUpperCase()}).`
    };
  }

  return { valid: true, type: detected };
}

module.exports = {
  calculateEan13CheckDigit,
  generateInternalEan13,
  validateEan13,
  calculateEan8CheckDigit,
  validateEan8,
  validateUpcA,
  validateCode128,
  detectBarcodeType,
  validateBarcode,
};
