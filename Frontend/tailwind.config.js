/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Caveat', 'cursive'],
        caveat: ['Caveat', 'cursive'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        accent: {
          DEFAULT: '#c9822f',
          hover: '#d99540',
          light: 'rgba(201, 130, 47, 0.15)',
          glow: 'rgba(201, 130, 47, 0.3)',
        }
      }
    },
  },
  plugins: [],
}
