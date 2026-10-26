/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#FFFCF9',
          raised: '#FFFFFF',
          muted: '#F5F0EB',
          column: '#EDE8E3',
        },
        ink: {
          DEFAULT: '#3D3835',
          muted: '#7A736E',
          faint: '#A8A29E',
        },
        accent: {
          DEFAULT: '#9B8AFB',
          hover: '#8576E8',
          soft: '#EDE9FE',
        },
        sage: {
          DEFAULT: '#8FAF7E',
          soft: '#E8F0E4',
        },
        peach: {
          DEFAULT: '#E8A598',
          soft: '#FCEEEA',
        },
        sky: {
          DEFAULT: '#7EB8D4',
          soft: '#E5F2F8',
        },
        rose: {
          DEFAULT: '#D4909A',
          soft: '#F8EAED',
        },
        sand: {
          DEFAULT: '#C4A882',
          soft: '#F5EDE0',
        },
        success: { DEFAULT: '#7CB08A', soft: '#E8F5EC' },
        warning: { DEFAULT: '#D4A843', soft: '#FDF6E3' },
        danger: { DEFAULT: '#D47373', soft: '#FCEAEA' },
      },
      boxShadow: {
        soft: '0 2px 16px -2px rgba(61, 56, 53, 0.08)',
        card: '0 1px 8px -1px rgba(61, 56, 53, 0.1)',
        lift: '0 12px 32px -12px rgba(61, 56, 53, 0.22)',
        modal: '0 24px 64px -16px rgba(61, 56, 53, 0.28)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(14px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'popover-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'drawer-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'drawer-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'modal-in': 'modal-in 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'popover-in': 'popover-in 140ms ease-out',
        'toast-in': 'toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'drawer-in': 'drawer-in 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        'drawer-in-left': 'drawer-in-left 260ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 180ms ease-out',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};
