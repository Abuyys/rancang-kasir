/**
 * Hardware Scanner Helper (HID USB/Bluetooth)
 * Handles rapid keyboard input events typical of hardware barcode scanners.
 */

class HardwareScanner {
  constructor(options = {}) {
    this.targetInput = options.targetInput || null;
    this.onScan = options.onScan || (() => {});
    this.onError = options.onError || (() => {});
    this.minChars = options.minChars || 4;
    this.maxIntervalMs = options.maxIntervalMs || 50; // fast keystrokes characteristic of scanners

    this.buffer = '';
    this.lastKeyTime = 0;
    this.isListening = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  start() {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  stop() {
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.buffer = '';
  }

  handleKeyDown(e) {
    // If user is currently typing in an input other than targetInput, ignore
    const active = document.activeElement;
    if (active && active.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
      if (this.targetInput && active !== this.targetInput) {
        return;
      }
    }

    const now = Date.now();
    const interval = now - this.lastKeyTime;
    this.lastKeyTime = now;

    if (e.key === 'Enter') {
      if (this.buffer.length >= this.minChars) {
        e.preventDefault();
        const scannedCode = this.buffer.trim();
        this.buffer = '';
        this.onScan(scannedCode);
      } else {
        this.buffer = '';
      }
      return;
    }

    // Only collect printable characters
    if (e.key.length === 1) {
      if (interval > this.maxIntervalMs && this.buffer.length > 0) {
        // Reset if interval too long (manual typing)
        this.buffer = '';
      }
      this.buffer += e.key;
    }
  }
}

if (typeof window !== 'undefined') {
  window.HardwareScanner = HardwareScanner;
}
