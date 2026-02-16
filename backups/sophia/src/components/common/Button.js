/**
 * Button Component
 * 
 * Reusable button component with variants and states.
 * Follows design system and accessibility best practices.
 * 
 * @module components/common/Button
 */

export class Button {
    /**
     * Create a button element
     * @param {Object} options - Button options
     * @param {string} options.variant - Button variant: 'primary', 'secondary', 'danger', 'success', 'ghost'
     * @param {string} options.size - Button size: 'sm', 'md', 'lg'
     * @param {string} options.label - Button text
     * @param {string} options.icon - Feather icon name (optional)
     * @param {Function} options.onClick - Click handler
     * @param {boolean} options.disabled - Disabled state
     * @param {boolean} options.fullWidth - Full width button
     * @param {string} options.type - Button type: 'button', 'submit', 'reset'
     * @returns {string} Button HTML
     */
    static create(options = {}) {
        const {
            variant = 'primary',
            size = 'md',
            label = 'Button',
            icon = null,
            onClick = null,
            disabled = false,
            fullWidth = false,
            type = 'button',
            className = ''
        } = options;

        const variantClasses = {
            primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
            secondary: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
            danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
            success: 'bg-green-500 hover:bg-green-600 text-white shadow-sm',
            warning: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm',
            ghost: 'bg-transparent hover:bg-gray-100 text-gray-700'
        };

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base'
        };

        const classes = [
            'inline-flex items-center justify-center gap-2',
            'font-semibold rounded-lg transition-all',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'touch-target', // Design system class for mobile
            variantClasses[variant] || variantClasses.primary,
            sizeClasses[size] || sizeClasses.md,
            fullWidth ? 'w-full' : '',
            className
        ].filter(Boolean).join(' ');

        const id = `btn-${Math.random().toString(36).substr(2, 9)}`;

        return `
            <button 
                type="${type}"
                id="${id}"
                class="${classes}"
                ${disabled ? 'disabled' : ''}
                data-variant="${variant}"
                data-size="${size}"
            >
                ${icon ? `<i data-feather="${icon}" class="w-4 h-4"></i>` : ''}
                <span>${label}</span>
            </button>
        `;
    }

    /**
     * Create a button group
     * @param {Array<Object>} buttons - Array of button options
     * @returns {string} Button group HTML
     */
    static createGroup(buttons = []) {
        const buttonsHTML = buttons.map(btn => this.create(btn)).join('');
        return `<div class="inline-flex rounded-lg shadow-sm" role="group">${buttonsHTML}</div>`;
    }
}
