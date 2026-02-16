/**
 * Encryption Service
 * 
 * Provides secure encryption/decryption for sensitive data using Web Crypto API.
 * Used for encrypting passwords, tokens, and other sensitive information in localStorage.
 * 
 * @module services/encryption
 */

/**
 * EncryptionService class handles all encryption/decryption operations
 * using AES-GCM algorithm with Web Crypto API
 */
export class EncryptionService {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        // Derive encryption key from master password (in production, use proper key management)
        this.masterKey = null;
    }

    /**
     * Initialize the encryption service with a master key
     * @param {string} masterPassword - Master password for key derivation
     */
    async init(masterPassword = 'unitech-master-key-2024') {
        try {
            const encoder = new TextEncoder();
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(masterPassword),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            // Derive a key from the master password using PBKDF2
            this.masterKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('unitech-salt-v1'), // In production, use random salt per user
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: this.algorithm, length: this.keyLength },
                false,
                ['encrypt', 'decrypt']
            );

            return true;
        } catch (error) {
            console.error('Encryption service initialization failed:', error);
            return false;
        }
    }

    /**
     * Encrypt a string value
     * @param {string} plaintext - The text to encrypt
     * @returns {Promise<string>} Base64 encoded encrypted data
     */
    async encrypt(plaintext) {
        if (!this.masterKey) {
            await this.init();
        }

        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);

            // Generate random initialization vector
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                this.masterKey,
                data
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encryptedData), iv.length);

            // Convert to base64 for storage
            return this.arrayBufferToBase64(combined);
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt an encrypted string
     * @param {string} encryptedBase64 - Base64 encoded encrypted data
     * @returns {Promise<string>} Decrypted plaintext
     */
    async decrypt(encryptedBase64) {
        if (!this.masterKey) {
            await this.init();
        }

        try {
            const combined = this.base64ToArrayBuffer(encryptedBase64);

            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encryptedData = combined.slice(12);

            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                this.masterKey,
                encryptedData
            );

            const decoder = new TextDecoder();
            return decoder.decode(decryptedData);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Hash a password using SHA-256 (for storage comparison)
     * Note: In production, use bcrypt or argon2 on the backend
     * @param {string} password - Password to hash
     * @returns {Promise<string>} Hex encoded hash
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return this.arrayBufferToHex(hashBuffer);
    }

    /**
     * Verify a password against a hash
     * @param {string} password - Password to verify
     * @param {string} hash - Hash to compare against
     * @returns {Promise<boolean>} True if password matches hash
     */
    async verifyPassword(password, hash) {
        const passwordHash = await this.hashPassword(password);
        return passwordHash === hash;
    }

    /**
     * Generate a random token (for session tokens, CSRF tokens, etc.)
     * @param {number} length - Length of token in bytes
     * @returns {string} Hex encoded random token
     */
    generateToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return this.arrayBufferToHex(array);
    }

    /**
     * Convert ArrayBuffer to Base64 string
     * @private
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 string to ArrayBuffer
     * @private
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Convert ArrayBuffer to hex string
     * @private
     */
    arrayBufferToHex(buffer) {
        const bytes = new Uint8Array(buffer);
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

// Export singleton instance
export const encryption = new EncryptionService();

// Auto-initialize on import
encryption.init();
