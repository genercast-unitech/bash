/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        unitech: {
          bg: 'var(--color-unitech-bg)', // Light gray background for main content
          surface: 'var(--color-unitech-surface)', // White surface for cards
          primary: 'var(--color-unitech-primary)', // Brand Blue (inforOS)
          secondary: 'var(--color-unitech-secondary)', // Dark Slate
          text: 'var(--color-unitech-text)', // Gray 800 for text
          muted: '#6b7280', // Gray 500
          border: 'var(--color-unitech-border)', // Gray 200
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b',
          sidebar: '#1f2937' // Dark sidebar color - kept static for now or can be variabilized too
        }
      },
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        heading: ['var(--font-heading)', 'sans-serif'],
        inter: ['Inter', 'sans-serif'], // Keep original for reference
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out', // Faster, sharper
        'slide-in': 'slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)', // Mechanical slide
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
