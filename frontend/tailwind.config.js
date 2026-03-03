/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#faf8f4',
          100: '#f4ede0',
          200: '#e8d9c2',
          300: '#d9c4a4',
        },
        bark: {
          300: '#c4a882',
          400: '#a07850',
          500: '#855f38',
          600: '#6b4a28',
          700: '#553a1f',
          800: '#3d2a14',
          900: '#281a0a',
        },
        moss: {
          400: '#8fa87a',
          500: '#6b7c5a',
          600: '#536048',
          700: '#3e4836',
        },
        rust: {
          300: '#d98a6e',
          400: '#c4674a',
          500: '#a84e34',
          600: '#8a3d26',
        },
        amber: {
          300: '#f0c060',
          400: '#e8a830',
          500: '#cc8c18',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px 0 rgba(40, 26, 10, 0.08), 0 1px 2px 0 rgba(40, 26, 10, 0.04)',
        'card-hover': '0 8px 24px 0 rgba(40, 26, 10, 0.14), 0 2px 6px 0 rgba(40, 26, 10, 0.08)',
        'modal': '0 24px 64px 0 rgba(40, 26, 10, 0.3)',
        'header': '0 1px 0 0 rgba(40, 26, 10, 0.15), 0 2px 12px 0 rgba(40, 26, 10, 0.12)',
      },
      backgroundImage: {
        'library-header': 'linear-gradient(135deg, #3d2a14 0%, #281a0a 60%, #1a1008 100%)',
        'shelf-wood': 'linear-gradient(180deg, #a07850 0%, #855f38 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    }
  },
  plugins: []
}
