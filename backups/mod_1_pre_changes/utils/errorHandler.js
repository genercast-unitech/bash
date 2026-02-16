/**
 * Error Handling Utilities
 * 
 * Provides centralized error handling, logging, and user-friendly error messages.
 * 
 * @module utils/errorHandler
 */

import { audit } from '../services/audit.js';

/**
 * Custom error classes for different error types
 */
export class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
        this.userMessage = message;
    }
}

export class AuthenticationError extends Error {
    constructor(message = 'Falha na autenticação') {
        super(message);
        this.name = 'AuthenticationError';
        this.userMessage = 'Suas credenciais são inválidas. Por favor, tente novamente.';
    }
}

export class AuthorizationError extends Error {
    constructor(message = 'Acesso negado') {
        super(message);
        this.name = 'AuthorizationError';
        this.userMessage = 'Você não tem permissão para realizar esta ação.';
    }
}

export class DataIntegrityError extends Error {
    constructor(message, data) {
        super(message);
        this.name = 'DataIntegrityError';
        this.data = data;
        this.userMessage = 'Erro ao processar dados. Por favor, verifique as informações.';
    }
}

export class NetworkError extends Error {
    constructor(message = 'Erro de conexão') {
        super(message);
        this.name = 'NetworkError';
        this.userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
}

/**
 * ErrorHandler class for centralized error management
 */
export class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
        this.isDevelopment = window.location.hostname === 'localhost';
    }

    /**
     * Handle an error with appropriate logging and user notification
     * @param {Error} error - Error object
     * @param {Object} context - Additional context about the error
     * @returns {Object} Processed error information
     */
    handle(error, context = {}) {
        // Log to console in development
        if (this.isDevelopment) {
            console.error('Error occurred:', error);
            console.error('Context:', context);
        }

        // Create error entry
        const errorEntry = {
            timestamp: new Date().toISOString(),
            name: error.name || 'Error',
            message: error.message,
            stack: error.stack,
            context: context,
            userMessage: error.userMessage || 'Ocorreu um erro. Tente novamente.'
        };

        // Add to error log
        this.addToLog(errorEntry);

        // Audit log for critical errors
        if (this.isCriticalError(error)) {
            audit.log('ERROR_CRITICAL', context.module || 'System', context.id || 'N/A', {
                error: error.name,
                message: error.message,
                context: context
            });
        }

        return errorEntry;
    }

    /**
     * Handle and display error to user
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     */
    handleAndNotify(error, context = {}) {
        const errorEntry = this.handle(error, context);
        this.notifyUser(errorEntry);
        return errorEntry;
    }

    /**
     * Display error notification to user
     * @param {Object} errorEntry - Error entry object
     */
    notifyUser(errorEntry) {
        // Check if toast notification system exists
        if (window.toastService) {
            window.toastService.error(errorEntry.userMessage);
            return;
        }

        // Fallback to alert (will be replaced with toast system)
        alert(`❌ ${errorEntry.userMessage}`);
    }

    /**
     * Try-catch wrapper for async functions
     * @param {Function} fn - Async function to wrap
     * @param {Object} context - Error context
     * @returns {Function} Wrapped function
     */
    wrapAsync(fn, context = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleAndNotify(error, context);
                throw error; // Re-throw after handling
            }
        };
    }

    /**
     * Try-catch wrapper for sync functions
     * @param {Function} fn - Function to wrap
     * @param {Object} context - Error context
     * @returns {Function} Wrapped function
     */
    wrapSync(fn, context = {}) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handleAndNotify(error, context);
                throw error;
            }
        };
    }

    /**
     * Validate data with custom validation function
     * @param {*} data - Data to validate
     * @param {Function} validator - Validation function
     * @param {string} fieldName - Field name for error message
     * @throws {ValidationError} If validation fails
     */
    validate(data, validator, fieldName = 'field') {
        try {
            const result = validator(data);
            if (result !== true) {
                throw new ValidationError(
                    result || `${fieldName} é inválido`,
                    fieldName
                );
            }
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new ValidationError(
                `Erro ao validar ${fieldName}`,
                fieldName
            );
        }
    }

    /**
     * Check if error is critical (needs immediate attention)
     * @param {Error} error - Error object
     * @returns {boolean} True if critical
     */
    isCriticalError(error) {
        return error instanceof DataIntegrityError ||
            error instanceof AuthenticationError ||
            error.name === 'SecurityError';
    }

    /**
     * Add error to internal log
     * @private
     */
    addToLog(errorEntry) {
        this.errorLog.unshift(errorEntry);

        // Trim log to max size
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(0, this.maxLogSize);
        }

        // Persist to sessionStorage for debugging
        try {
            sessionStorage.setItem('unitech_error_log', JSON.stringify(this.errorLog.slice(0, 10)));
        } catch (e) {
            // Ignore storage errors
        }
    }

    /**
     * Get recent errors
     * @param {number} count - Number of errors to retrieve
     * @returns {Array} Recent errors
     */
    getRecentErrors(count = 10) {
        return this.errorLog.slice(0, count);
    }

    /**
     * Clear error log
     */
    clearLog() {
        this.errorLog = [];
        try {
            sessionStorage.removeItem('unitech_error_log');
        } catch (e) {
            // Ignore storage errors
        }
    }

    /**
     * Create error report for debugging
     * @returns {Object} Error report
     */
    generateReport() {
        const errorCounts = {};
        this.errorLog.forEach(entry => {
            errorCounts[entry.name] = (errorCounts[entry.name] || 0) + 1;
        });

        return {
            totalErrors: this.errorLog.length,
            errorTypes: errorCounts,
            recentErrors: this.getRecentErrors(5),
            timestamp: new Date().toISOString()
        };
    }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Global error handler
window.addEventListener('error', (event) => {
    errorHandler.handle(event.error || new Error(event.message), {
        module: 'Global',
        type: 'UncaughtError',
        filename: event.filename,
        line: event.lineno,
        column: event.colno
    });
});

// Promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
            module: 'Global',
            type: 'UnhandledPromiseRejection'
        }
    );
});
