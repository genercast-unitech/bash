/**
 * Toast Notification Component
 * 
 * Reusable toast notification system for user feedback.
 * Follows design system and provides auto-dismiss functionality.
 * 
 * @module components/common/Toast
 */

export class Toast {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.init();
    }

    /**
     * Initialize toast container
     */
    init() {
        if (document.getElementById('toast-container')) return;

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'true');

        document.body.appendChild(this.container);
    }

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (0 = no auto-dismiss)
     * @returns {string} Toast ID
     */
    show(message, type = 'info', duration = 3000) {
        const id = 'toast-' + Math.random().toString(36).substr(2, 9);

        const variants = {
            success: {
                bg: 'bg-green-500',
                icon: 'check-circle',
                iconColor: 'text-white'
            },
            error: {
                bg: 'bg-red-500',
                icon: 'alert-circle',
                iconColor: 'text-white'
            },
            warning: {
                bg: 'bg-orange-500',
                icon: 'alert-triangle',
                iconColor: 'text-white'
            },
            info: {
                bg: 'bg-blue-500',
                icon: 'info',
                iconColor: 'text-white'
            }
        };

        const variant = variants[type] || variants.info;

        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `${variant.bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md pointer-events-auto transform transition-all animate-fade-in`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

        toast.innerHTML = `
            <i data-feather="${variant.icon}" class="w-5 h-5 ${variant.iconColor} flex-shrink-0"></i>
            <p class="flex-1 text-sm font-medium">${message}</p>
            <button 
                class="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
                onclick="window.toastService.dismiss('${id}')"
                aria-label="Close"
            >
                <i data-feather="x" class="w-4 h-4"></i>
            </button>
        `;

        this.container.appendChild(toast);
        this.toasts.set(id, toast);

        // Replace feather icons
        if (window.feather) window.feather.replace();

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    /**
     * Dismiss a toast
     * @param {string} id - Toast ID
     */
    dismiss(id) {
        const toast = this.toasts.get(id);
        if (toast) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
                this.toasts.delete(id);
            }, 300);
        }
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        this.toasts.forEach((_, id) => this.dismiss(id));
    }

    /**
     * Success toast (convenience method)
     * @param {string} message - Message
     * @param {number} duration - Duration in ms
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Error toast (convenience method)
     * @param {string} message - Message
     * @param {number} duration - Duration in ms (0 = sticky)
     */
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Warning toast (convenience method)
     * @param {string} message - Message
     * @param {number} duration - Duration in ms
     */
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Info toast (convenience method)
     * @param {string} message - Message
     * @param {number} duration - Duration in ms
     */
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
}

// Create singleton instance
const toastService = new Toast();

// Make globally available
window.toastService = toastService;
window.showToast = (message, type, duration) => toastService.show(message, type, duration);

export default toastService;
