/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'dark-blue': {
          DEFAULT: '#1A2B3C',
          light: '#2C4257',
          dark: '#0A1B2C',
        },
        'black': {
          DEFAULT: '#000000',
          light: '#333333',
          dark: '#000000',
        },
        'brown': {
          DEFAULT: '#8B4513',
          light: '#A0522D',
          dark: '#6B370D',
        },
      },
    },
  },
  plugins: [],
}