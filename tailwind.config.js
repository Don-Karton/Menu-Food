/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './assets/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-yellow': '#FFC72C',
        'brand-orange': '#DA291C',
        'brand-dark': '#121212',
        'brand-charcoal': '#1E1E1E',
        'brand-surface': '#2C2C2C',
      },
      fontFamily: {
        display: ['Archivo', 'sans-serif'],
        sans: ['Archivo', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px rgba(0,0,0,0.25)',
        hard: '0 4px 0 rgba(0,0,0,0.5)',
        glow: '0 0 15px rgba(255,199,44,0.3)',
        glass: '0 -10px 40px rgba(0,0,0,0.5)',
      },
      aspectRatio: {
        '16/9': '16 / 9',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
