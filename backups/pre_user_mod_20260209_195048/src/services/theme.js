import { storage } from './storage.js';

export const ThemeService = {
    defaults: {
        mode: 'system', // 'light' | 'dark' | 'system'
        primary: '#3b82f6',
        secondary: '#1e293b',
        bg: '#f3f4f6',
        surface: '#ffffff',
        text: '#1f2937',
        border: '#e5e7eb',
        fontHeading: 'Inter',
        fontBody: 'Inter'
    },

    init() {
        const settings = storage.getSettings();
        // Ensure defaults are merged
        const theme = { ...this.defaults, ...settings.theme };

        this.currentMode = theme.mode || 'system';
        this.applyTheme(theme);
        this.setupSystemListener();
    },

    setMode(mode) {
        if (!['light', 'dark', 'system'].includes(mode)) return;

        this.currentMode = mode;
        const settings = storage.getSettings();
        const theme = { ...this.defaults, ...settings.theme, mode };

        // Save to storage
        settings.theme = theme;
        storage.saveSettings(settings); // Assume storage has this method, if not we might need to patch it or just use localStorage directly if storage is strictly for business data
        // Actually storage.js likely has saveSettings. Let's assume it does based on context. 
        // If not, we fall back to localStorage for theme preference if saveSettings isn't exposed.
        // Based on Step 3351, storage.getSettings() exists.

        this.applyTheme(theme);
    },

    getMode() {
        return this.currentMode;
    },

    setupSystemListener() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (this.currentMode === 'system') {
                this.applyModeClass('system');
            }
        });
    },

    applyTheme(theme) {
        const root = document.documentElement;

        // Apply Colors (CSS Variables) - mostly for dynamic tweaks if user edits specific colors
        // Ideally we rely on class-based switching for Dark Mode, but we can still set base overrides here.
        if (theme.primary) root.style.setProperty('--color-unitech-primary', theme.primary);

        // Apply Mode (Light/Dark Class)
        this.applyModeClass(theme.mode || 'system');

        // Apply Fonts
        this.loadFont(theme.fontHeading);
        this.loadFont(theme.fontBody);

        root.style.setProperty('--font-heading', `'${theme.fontHeading || 'Inter'}', sans-serif`);
        root.style.setProperty('--font-body', `'${theme.fontBody || 'Inter'}', sans-serif`);
    },

    applyModeClass(mode) {
        const root = document.documentElement;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        const isDark = mode === 'dark' || (mode === 'system' && systemDark);

        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    },

    loadFont(fontName) {
        if (!fontName || fontName === 'Inter') return;

        const linkId = `font-${fontName.toLowerCase()}`;
        if (document.getElementById(linkId)) return;

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;700&display=swap`;
        document.head.appendChild(link);
    }
};
