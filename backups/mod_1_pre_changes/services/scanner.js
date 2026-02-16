
/**
 * Global Scanner Service
 * Detects hardware barcode scanner input and dispatches a global event.
 */
class ScannerService {
    constructor() {
        this.buffer = '';
        this.timeout = null;
        this.listeners = [];
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;

        window.addEventListener('keydown', (e) => {
            // Ignore if in an input field (unless it's a known scanner target)
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

            // Scanners usually send characters very fast. We buffer them.
            if (e.key.length === 1) {
                this.buffer += e.key;

                clearTimeout(this.timeout);
                this.timeout = setTimeout(() => {
                    this.buffer = '';
                }, 100); // Scanners are fast, humans are slow. 100ms is a safe gap.
            } else if (e.key === 'Enter') {
                if (this.buffer.length >= 3) {
                    console.log(`[ScannerService] Barcode detected: ${this.buffer}`);
                    const code = this.buffer;
                    this.buffer = ''; // Clear immediately

                    // Dispatch a custom event
                    window.dispatchEvent(new CustomEvent('barcode-scanned', { detail: { code } }));
                }
            }
        });

        this.isInitialized = true;
        console.log('[ScannerService] Initialized globally.');
    }

    onScan(callback) {
        window.addEventListener('barcode-scanned', (e) => callback(e.detail.code));
    }
}

export const scannerService = new ScannerService();
