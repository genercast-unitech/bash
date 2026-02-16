/**
 * Modal Component
 * 
 * Reusable modal dialog component with accessibility features.
 * Follows design system and mobile-friendly practices.
 * 
 * @module components/common/Modal
 */

export class Modal {
    /**
     * Create a modal dialog
     * @param {Object} options - Modal options
     * @param {string} options.id - Modal ID
     * @param {string} options.title - Modal title
     * @param {string} options.content - Modal content HTML
     * @param {string} options.size - Modal size: 'sm', 'md', 'lg', 'xl', 'full'
     * @param {Array<Object>} options.actions - Array of action buttons
     * @param {boolean} options.closeOnBackdrop - Close modal when clicking backdrop
     * @returns {string} Modal HTML
     */
    static create(options = {}) {
        const {
            id = 'modal-' + Math.random().toString(36).substr(2, 9),
            title = 'Modal',
            content = '',
            size = 'md',
            actions = [],
            closeOnBackdrop = true
        } = options;

        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-2xl',
            lg: 'max-w-4xl',
            xl: 'max-w-6xl',
            full: 'max-w-full mx-4'
        };

        const actionsHTML = actions.length > 0
            ? actions.map(action => {
                const variant = action.variant || 'secondary';
                const label = action.label || 'OK';
                const onClick = action.onClick ? `data-action="${action.action}"` : '';
                return `
                    <button 
                        class="btn-${variant}" 
                        ${onClick}
                        type="${action.type || 'button'}"
                    >
                        ${action.icon ? `<i data-feather="${action.icon}" class="w-4 h-4"></i>` : ''}
                        ${label}
                    </button>
                `;
            }).join('')
            : '';

        return `
            <div 
                id="${id}" 
                class="hidden fixed inset-0 z-[9999] flex items-center justify-center p-4"
                data-modal="true"
                role="dialog"
                aria-labelledby="${id}-title"
                aria-modal="true"
            >
                <!-- Backdrop -->
                <div 
                    class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
                    data-modal-backdrop
                    ${closeOnBackdrop ? `onclick="Modal.close('${id}')"` : ''}
                ></div>

                <!-- Modal Content -->
                <div 
                    class="relative bg-white rounded-lg shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
                    data-modal-content
                >
                    <!-- Header -->
                    <div class="flex justify-between items-center p-4 border-b border-gray-200">
                        <h3 id="${id}-title" class="text-lg font-bold text-gray-900">${title}</h3>
                        <button 
                            type="button"
                            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-target-sm"
                            onclick="Modal.close('${id}')"
                            aria-label="Close modal"
                        >
                            <i data-feather="x" class="w-5 h-5"></i>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="flex-1 overflow-y-auto p-6" data-modal-body>
                        ${content}
                    </div>

                    <!-- Footer -->
                    ${actions.length > 0 ? `
                        <div class="flex justify-end items-center gap-2 p-4 bg-gray-50 border-t border-gray-200">
                            ${actionsHTML}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Open a modal
     * @param {string} modalId - Modal ID
     */
    static open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            // Lock body scroll
            document.body.style.overflow = 'hidden';
            // Focus management
            const firstFocusable = modal.querySelector('button, input, select, textarea');
            if (firstFocusable) firstFocusable.focus();
        }
    }

    /**
     * Close a modal
     * @param {string} modalId - Modal ID
     */
    static close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            // Unlock body scroll
            document.body.style.overflow = '';
        }
    }

    /**
     * Update modal content
     * @param {string} modalId - Modal ID
     * @param {string} content - New content HTML
     */
    static updateContent(modalId, content) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const body = modal.querySelector('[data-modal-body]');
            if (body) body.innerHTML = content;
        }
    }

    /**
     * Set up modal event listeners
     * @param {string} modalId - Modal ID
     */
    static setupEventListeners(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                Modal.close(modalId);
            }
        });

        // Handle action buttons
        modal.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                // Emit custom event
                modal.dispatchEvent(new CustomEvent('modal-action', {
                    detail: { action, modalId }
                }));
            });
        });
    }
}

// Make Modal globally available
window.Modal = Modal;
