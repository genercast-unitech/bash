/**
 * Input Sanitization Middleware
 * 
 * Provides utilities for sanitizing user input to prevent XSS, SQL injection,
 * and other security vulnerabilities.
 * 
 * @module middleware/sanitizer
 */

/**
 * SanitizerService class handles all input sanitization operations
 */
export class SanitizerService {
    constructor() {
        // Common XSS patterns to detect
        this.xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi, // Event handlers like onclick=
            /<iframe/gi,
            /<embed/gi,
            /<object/gi
        ];

        // SQL injection patterns (for future API integration)
        this.sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
            /(--|\|{2})/g,
            /[;'"]/g
        ];
    }

    /**
     * Sanitize HTML to prevent XSS attacks
     * @param {string} input - Raw HTML input
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(input) {
        if (typeof input !== 'string') return '';

        // Create a temporary element to leverage browser's built-in HTML parsing
        const temp = document.createElement('div');
        temp.textContent = input;
        return temp.innerHTML;
    }

    /**
     * Escape HTML entities
     * @param {string} input - Text with potential HTML entities
     * @returns {string} Escaped text
     */
    escapeHTML(input) {
        if (typeof input !== 'string') return '';

        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        return input.replace(/[&<>"'/]/g, (char) => map[char]);
    }

    /**
     * Detect potential XSS attempts
     * @param {string} input - Input to check
     * @returns {boolean} True if XSS detected
     */
    detectXSS(input) {
        if (typeof input !== 'string') return false;

        return this.xssPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Sanitize string for safe storage and display
     * @param {string} input - Input string
     * @param {Object} options - Sanitization options
     * @returns {string} Sanitized string
     */
    sanitizeString(input, options = {}) {
        if (typeof input !== 'string') return '';

        let sanitized = input;

        // Trim whitespace
        if (options.trim !== false) {
            sanitized = sanitized.trim();
        }

        // Remove control characters
        if (options.removeControlChars !== false) {
            sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
        }

        // Limit length
        if (options.maxLength) {
            sanitized = sanitized.substring(0, options.maxLength);
        }

        // Escape HTML if needed
        if (options.escapeHTML) {
            sanitized = this.escapeHTML(sanitized);
        }

        return sanitized;
    }

    /**
     * Sanitize email address
     * @param {string} email - Email to sanitize
     * @returns {string|null} Sanitized email or null if invalid
     */
    sanitizeEmail(email) {
        if (typeof email !== 'string') return null;

        const sanitized = email.trim().toLowerCase();

        // Basic email validation pattern
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        return emailPattern.test(sanitized) ? sanitized : null;
    }

    /**
     * Sanitize phone number (Brazilian format)
     * @param {string} phone - Phone number
     * @returns {string} Sanitized phone (digits only)
     */
    sanitizePhone(phone) {
        if (typeof phone !== 'string') return '';

        // Remove all non-digit characters
        return phone.replace(/\D/g, '');
    }

    /**
     * Sanitize document (CPF/CNPJ)
     * @param {string} document - Document number
     * @returns {string} Sanitized document (digits only)
     */
    sanitizeDocument(document) {
        if (typeof document !== 'string') return '';

        // Remove all non-digit characters
        return document.replace(/\D/g, '');
    }

    /**
     * Sanitize number input
     * @param {string|number} input - Number input
     * @returns {number} Sanitized number
     */
    sanitizeNumber(input) {
        const num = parseFloat(input);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Sanitize currency input (Brazilian Real)
     * @param {string|number} input - Currency input
     * @returns {number} Sanitized currency value
     */
    sanitizeCurrency(input) {
        if (typeof input === 'number') return input;
        if (typeof input !== 'string') return 0;

        // Remove currency symbols and convert comma to dot
        const cleaned = input
            .replace(/[R$\s]/g, '')
            .replace(/\./g, '')
            .replace(',', '.');

        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Sanitize object recursively
     * @param {Object} obj - Object to sanitize
     * @param {Object} schema - Schema defining how to sanitize each field
     * @returns {Object} Sanitized object
     */
    sanitizeObject(obj, schema) {
        if (!obj || typeof obj !== 'object') return {};

        const sanitized = {};

        for (const [key, value] of Object.entries(obj)) {
            const schemaRule = schema[key];

            if (!schemaRule) continue; // Skip fields not in schema

            switch (schemaRule.type) {
                case 'string':
                    sanitized[key] = this.sanitizeString(value, schemaRule.options || {});
                    break;
                case 'email':
                    sanitized[key] = this.sanitizeEmail(value);
                    break;
                case 'phone':
                    sanitized[key] = this.sanitizePhone(value);
                    break;
                case 'document':
                    sanitized[key] = this.sanitizeDocument(value);
                    break;
                case 'number':
                    sanitized[key] = this.sanitizeNumber(value);
                    break;
                case 'currency':
                    sanitized[key] = this.sanitizeCurrency(value);
                    break;
                case 'html':
                    sanitized[key] = this.sanitizeHTML(value);
                    break;
                default:
                    sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Validate and sanitize form data
     * @param {FormData|Object} formData - Form data to sanitize
     * @param {Object} schema - Validation schema
     * @returns {Object} Sanitized and validated data
     */
    validateForm(formData, schema) {
        const data = formData instanceof FormData
            ? Object.fromEntries(formData.entries())
            : formData;

        return this.sanitizeObject(data, schema);
    }

    /**
     * Create safe innerHTML content
     * @param {string} html - HTML content
     * @param {Array<string>} allowedTags - Tags to allow (default: none)
     * @returns {string} Safe HTML
     */
    createSafeHTML(html, allowedTags = []) {
        if (allowedTags.length === 0) {
            return this.escapeHTML(html);
        }

        // For allowed tags, we would need a proper HTML parser
        // For now, just escape everything
        // TODO: Implement proper HTML sanitization with DOMPurify or similar
        return this.escapeHTML(html);
    }

    /**
     * Prevent SQL injection in search queries
     * @param {string} query - Search query
     * @returns {string} Sanitized query
     */
    sanitizeSearchQuery(query) {
        if (typeof query !== 'string') return '';

        // Remove SQL keywords and special characters
        return query
            .trim()
            .replace(/[;'"\\]/g, '')
            .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b/gi, '')
            .substring(0, 100); // Limit length
    }
}

// Export singleton instance
export const sanitizer = new SanitizerService();
