/**
 * Camera Barcode Scanner Helper using Html5Qrcode
 * Provides modal handling, rear-camera preference, flashlight control, and anti-duplicate debounce.
 */

class CameraScanner {
  constructor(options = {}) {
    this.elementId = options.elementId || 'cameraReader';
    this.onScan = options.onScan || (() => {});
    this.onError = options.onError || (() => {});
    this.debounceMs = options.debounceMs || 1500;
    this.html5QrCode = null;
    this.isTorchOn = false;
    this.lastCode = null;
    this.lastTime = 0;
  }

  async start() {
    if (!window.Html5Qrcode) {
      throw new Error('Html5Qrcode library not loaded.');
    }

    if (!this.html5QrCode) {
      this.html5QrCode = new Html5Qrcode(this.elementId);
    }

    const config = {
      fps: 15,
      qrbox: { width: 260, height: 160 },
      aspectRatio: 1.0,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    };

    await this.html5QrCode.start(
      { facingMode: { ideal: 'environment' } },
      config,
      (decodedText) => {
        const cleaned = decodedText.trim();
        const now = Date.now();
        if (cleaned === this.lastCode && now - this.lastTime < this.debounceMs) {
          return;
        }
        this.lastCode = cleaned;
        this.lastTime = now;
        this.onScan(cleaned);
      },
      (error) => {
        // frame decode ignore
      }
    );
  }

  hasTorch() {
    try {
      if (!this.html5QrCode) return false;
      const capabilities = this.html5QrCode.getRunningTrackCapabilities();
      return Boolean(capabilities && capabilities.torch);
    } catch (e) {
      return false;
    }
  }

  async toggleTorch() {
    if (!this.html5QrCode) return false;
    this.isTorchOn = !this.isTorchOn;
    await this.html5QrCode.applyVideoConstraints({
      advanced: [{ torch: this.isTorchOn }],
    });
    return this.isTorchOn;
  }

  async stop() {
    if (this.html5QrCode) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (e) {}
      this.html5QrCode = null;
    }
    this.isTorchOn = false;
    this.lastCode = null;
    this.lastTime = 0;
  }
}

if (typeof window !== 'undefined') {
  window.CameraScanner = CameraScanner;
}
