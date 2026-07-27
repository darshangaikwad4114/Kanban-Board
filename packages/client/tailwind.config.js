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
        modal: '0 8px 40px -4px rgba(61, 56, 53, 0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
