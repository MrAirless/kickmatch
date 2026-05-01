/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#E8F8F2',
          100: '#C0EDD9',
          200: '#95E0C0',
          400: '#45C49A',
          600: '#1D9E75',
          800: '#147554',
          900: '#0C4D38',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
