// Pull-to-Refresh Utility for Mobile Lists
// Usage: initPullToRefresh(containerElement, onRefreshCallback)

export function initPullToRefresh(container, onRefresh) {
    if (!container || typeof onRefresh !== 'function') return;

    let startY = 0;
    let currentY = 0;
    let pulling = false;
    const threshold = 80; // Pull distance to trigger refresh

    // Create pull indicator
    const indicator = document.createElement('div');
    indicator.className = 'pull-refresh-indicator';
    indicator.innerHTML = `
    <div class="pull-refresh-spinner">
      <i data-feather="refresh-cw" class="w-5 h-5"></i>
    </div>
    <span class="pull-refresh-text">Puxe para atualizar</span>
  `;
    indicator.style.cssText = `
    position: absolute;
    top: -60px;
    left: 0;
    right: 0;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #6b7280;
    font-size: 14px;
    font-weight: 600;
    transition: transform 0.3s;
    z-index: 10;
  `;

    container.style.position = 'relative';
    container.insertBefore(indicator, container.firstChild);

    // Touch events
    container.addEventListener('touchstart', (e) => {
        if (container.scrollTop === 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!pulling) return;

        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (diff > 0 && container.scrollTop === 0) {
            const pullDistance = Math.min(diff, threshold * 1.5);
            indicator.style.transform = `translateY(${pullDistance}px)`;

            if (pullDistance >= threshold) {
                indicator.querySelector('.pull-refresh-text').textContent = 'Solte para atualizar';
                indicator.querySelector('.pull-refresh-spinner').style.transform = 'rotate(180deg)';
            } else {
                indicator.querySelector('.pull-refresh-text').textContent = 'Puxe para atualizar';
                indicator.querySelector('.pull-refresh-spinner').style.transform = 'rotate(0deg)';
            }
        }
    }, { passive: true });

    container.addEventListener('touchend', async () => {
        if (!pulling) return;

        const diff = currentY - startY;

        if (diff >= threshold) {
            // Trigger refresh
            indicator.querySelector('.pull-refresh-text').textContent = 'Atualizando...';
            indicator.querySelector('.pull-refresh-spinner').classList.add('spinning');

            try {
                await onRefresh();

                // Success feedback
                if (navigator.vibrate) {
                    navigator.vibrate(50); // Haptic feedback
                }
            } catch (error) {
                console.error('Pull-to-refresh error:', error);
            } finally {
                indicator.querySelector('.pull-refresh-spinner').classList.remove('spinning');
                indicator.style.transform = 'translateY(0)';
            }
        } else {
            indicator.style.transform = 'translateY(0)';
        }

        pulling = false;
        startY = 0;
        currentY = 0;
    });

    // Add CSS for spinning animation
    const style = document.createElement('style');
    style.textContent = `
    .pull-refresh-spinner.spinning {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .pull-refresh-spinner {
      transition: transform 0.3s;
    }
  `;
    document.head.appendChild(style);
}

// Auto-save utility for forms
export function initAutoSave(formElement, saveCallback, debounceMs = 500) {
    if (!formElement || typeof saveCallback !== 'function') return;

    let saveTimeout;
    let isSaving = false;

    // Create save indicator
    const indicator = document.createElement('div');
    indicator.className = 'autosave-indicator';
    indicator.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    padding: 8px 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 1000;
    pointer-events: none;
  `;
    document.body.appendChild(indicator);

    const showIndicator = (text, color = '#6b7280') => {
        indicator.textContent = text;
        indicator.style.color = color;
        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    };

    // Listen to all input changes
    formElement.addEventListener('input', (e) => {
        if (isSaving) return;

        clearTimeout(saveTimeout);
        showIndicator('Salvando...', '#f59e0b');

        saveTimeout = setTimeout(async () => {
            isSaving = true;

            try {
                const formData = new FormData(formElement);
                const data = Object.fromEntries(formData.entries());

                await saveCallback(data);

                showIndicator('✓ Salvo', '#10b981');

                // Haptic feedback
                if (navigator.vibrate) {
                    navigator.vibrate(30);
                }
            } catch (error) {
                console.error('Auto-save error:', error);
                showIndicator('✗ Erro ao salvar', '#ef4444');
            } finally {
                isSaving = false;
            }
        }, debounceMs);
    });

    return () => {
        clearTimeout(saveTimeout);
        indicator.remove();
    };
}
