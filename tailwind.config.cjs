/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f7ff',
          100: '#e0efff',
          200: '#b9ddff',
          300: '#82c2ff',
          400: '#3da0ff',
          500: '#0a7fff',
          600: '#0063db',
          700: '#004dad',
          800: '#003f8a',
          900: '#00356f',
          950: '#001f41',
        },
      },
    },
  },
  plugins: [],
};
