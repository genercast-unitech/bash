// ============================================
// MOBILE OPTIMIZATION UTILITIES
// Phases 3, 4, 5: Feedback, Cognitive Load, Performance
// ============================================

// ============================================
// PHASE 3: HAPTIC FEEDBACK
// ============================================

export const haptic = {
    // Light haptic for minor interactions
    light: () => {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    // Medium haptic for standard actions
    medium: () => {
        if (navigator.vibrate) {
            navigator.vibrate(20);
        }
    },

    // Heavy haptic for important actions
    heavy: () => {
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    },

    // Success pattern
    success: () => {
        if (navigator.vibrate) {
            navigator.vibrate([10, 50, 10]);
        }
    },

    // Error pattern
    error: () => {
        if (navigator.vibrate) {
            navigator.vibrate([20, 100, 20]);
        }
    },

    // Warning pattern
    warning: () => {
        if (navigator.vibrate) {
            navigator.vibrate([15, 75, 15]);
        }
    }
};

// ============================================
// PHASE 3: VISUAL FEEDBACK
// ============================================

// Add ripple effect to element
export function addRipple(element) {
    element.classList.add('ripple');
}

// Show loading state on button
export function setButtonLoading(button, loading = true) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Success flash animation
export function showSuccess(element) {
    element.classList.add('success-flash');
    haptic.success();
    setTimeout(() => {
        element.classList.remove('success-flash');
    }, 500);
}

// Error shake animation
export function showError(element) {
    element.classList.add('error-shake');
    haptic.error();
    setTimeout(() => {
        element.classList.remove('error-shake');
    }, 400);
}

// ============================================
// PHASE 4: MULTI-STEP FORMS
// ============================================

export class StepForm {
    constructor(formElement, steps) {
        this.form = formElement;
        this.steps = Array.from(steps);
        this.currentStep = 0;
        this.init();
    }

    init() {
        // Create progress bar
        const progress = document.createElement('div');
        progress.className = 'form-progress';
        progress.innerHTML = this.steps.map((_, i) =>
            `<div class="form-progress-step ${i === 0 ? 'active' : ''}"></div>`
        ).join('');
        this.form.insertBefore(progress, this.form.firstChild);
        this.progressSteps = progress.querySelectorAll('.form-progress-step');

        // Hide all steps except first
        this.render();

        // Add navigation
        this.addNavigation();
    }

    render() {
        this.steps.forEach((step, i) => {
            if (i === this.currentStep) {
                step.classList.add('active');
                step.style.display = 'block';
            } else {
                step.classList.remove('active');
                step.style.display = 'none';
            }
        });

        // Update progress
        this.progressSteps.forEach((step, i) => {
            step.classList.remove('active', 'completed');
            if (i < this.currentStep) {
                step.classList.add('completed');
            } else if (i === this.currentStep) {
                step.classList.add('active');
            }
        });
    }

    addNavigation() {
        const nav = document.createElement('div');
        nav.className = 'action-bar';
        nav.innerHTML = `
            <button type="button" class="btn btn-secondary" id="step-prev" style="display: none;">
                <i data-feather="arrow-left"></i> Anterior
            </button>
            <button type="button" class="btn btn-primary" id="step-next">
                Próximo <i data-feather="arrow-right"></i>
            </button>
        `;
        this.form.appendChild(nav);

        const prevBtn = nav.querySelector('#step-prev');
        const nextBtn = nav.querySelector('#step-next');

        prevBtn.addEventListener('click', () => this.prev());
        nextBtn.addEventListener('click', () => this.next());

        this.prevBtn = prevBtn;
        this.nextBtn = nextBtn;
        this.updateNavigation();
    }

    updateNavigation() {
        // Show/hide prev button
        this.prevBtn.style.display = this.currentStep > 0 ? 'block' : 'none';

        // Change next button text on last step
        if (this.currentStep === this.steps.length - 1) {
            this.nextBtn.textContent = 'Finalizar';
            this.nextBtn.type = 'submit';
        } else {
            this.nextBtn.innerHTML = 'Próximo <i data-feather="arrow-right"></i>';
            this.nextBtn.type = 'button';
        }

        // Re-render feather icons
        if (window.feather) {
            window.feather.replace();
        }
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.render();
            this.updateNavigation();
            haptic.light();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.render();
            this.updateNavigation();
            haptic.light();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

// ============================================
// PHASE 4: COLLAPSIBLE SECTIONS
// ============================================

export function initCollapsible(selector = '.section-header') {
    document.querySelectorAll(selector).forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.section');
            if (section) {
                section.classList.toggle('section-collapsed');
                haptic.light();
            }
        });
    });
}

// ============================================
// PHASE 4: SMART DEFAULTS
// ============================================

export const smartDefaults = {
    // Remember last used value
    remember: (key, value) => {
        if (value !== undefined) {
            localStorage.setItem(`smart_${key}`, value);
        }
        return localStorage.getItem(`smart_${key}`);
    },

    // Get last used client
    getLastClient: () => {
        return localStorage.getItem('smart_lastClient');
    },

    // Set last used client
    setLastClient: (clientId) => {
        localStorage.setItem('smart_lastClient', clientId);
    },

    // Get preferred payment method
    getPreferredPayment: () => {
        return localStorage.getItem('smart_preferredPayment') || 'cash';
    },

    // Set preferred payment method
    setPreferredPayment: (method) => {
        localStorage.setItem('smart_preferredPayment', method);
    },

    // Auto-calculate total
    calculateTotal: (items) => {
        return items.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const qty = parseInt(item.qty) || 0;
            return sum + (price * qty);
        }, 0);
    }
};

// ============================================
// PHASE 5: DEBOUNCED SEARCH
// ============================================

export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// PHASE 5: LAZY IMAGE LOADING
// ============================================

export function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('lazy-loaded');
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}

// ============================================
// PHASE 5: VIRTUAL SCROLLING
// ============================================

export class VirtualList {
    constructor(container, items, itemHeight, renderItem) {
        this.container = container;
        this.items = items;
        this.itemHeight = itemHeight;
        this.renderItem = renderItem;
        this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
        this.scrollTop = 0;
        this.init();
    }

    init() {
        // Set container height
        this.container.style.height = `${this.items.length * this.itemHeight}px`;
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';

        // Create viewport
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-scroll';
        this.viewport.style.height = '100%';
        this.container.appendChild(this.viewport);

        // Initial render
        this.render();

        // Listen to scroll
        this.viewport.addEventListener('scroll', () => {
            this.scrollTop = this.viewport.scrollTop;
            this.render();
        });
    }

    render() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleCount, this.items.length);

        // Clear viewport
        this.viewport.innerHTML = '';

        // Render visible items
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.renderItem(this.items[i], i);
            item.classList.add('virtual-scroll-item');
            item.style.top = `${i * this.itemHeight}px`;
            item.style.height = `${this.itemHeight}px`;
            this.viewport.appendChild(item);
        }
    }

    update(newItems) {
        this.items = newItems;
        this.container.style.height = `${this.items.length * this.itemHeight}px`;
        this.render();
    }
}

// ============================================
// INITIALIZATION
// ============================================

export function initMobileOptimizations() {
    // Add ripple to all buttons
    document.querySelectorAll('button, .btn').forEach(btn => {
        addRipple(btn);
    });

    // Init lazy loading
    initLazyLoading();

    // Init collapsible sections
    initCollapsible();

    // Add haptic feedback to buttons
    document.querySelectorAll('button, .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.classList.contains('no-haptic')) {
                haptic.medium();
            }
        });
    });

    console.log('✅ Mobile optimizations initialized');
}

// Auto-init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileOptimizations);
} else {
    initMobileOptimizations();
}
