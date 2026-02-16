import { storage } from './storage.js';

export const ThemeService = {
    defaults: {
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
        const theme = settings.theme || this.defaults;
        this.applyTheme(theme);
    },

    applyTheme(theme) {
        const root = document.documentElement;

        // Apply Colors
        root.style.setProperty('--color-unitech-primary', theme.primary || this.defaults.primary);
        root.style.setProperty('--color-unitech-secondary', theme.secondary || this.defaults.secondary);

        // Optional: Apply other colors if editable
        if (theme.bg) root.style.setProperty('--color-unitech-bg', theme.bg);
        if (theme.surface) root.style.setProperty('--color-unitech-surface', theme.surface);

        // Apply Fonts
        this.loadFont(theme.fontHeading);
        this.loadFont(theme.fontBody);

        root.style.setProperty('--font-heading', `'${theme.fontHeading || 'Inter'}', sans-serif`);
        root.style.setProperty('--font-body', `'${theme.fontBody || 'Inter'}', sans-serif`);

        // Save to storage if part of a settings update flow (handled by SettingsModule usually, but good to have helper)
    },

    loadFont(fontName) {
        if (!fontName || fontName === 'Inter') return; // Inter is default already loaded

        const linkId = `font-${fontName.toLowerCase()}`;
        if (document.getElementById(linkId)) return;

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;700&display=swap`;
        document.head.appendChild(link);
    }
};
