/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eaf4fd',
          100: '#d5e8fb',
          200: '#aad1f7',
          300: '#7ab9f2',
          400: '#4da2ed',
          500: '#2980b9',
          600: '#1a5276',
          700: '#154360',
          800: '#0f2f44',
          900: '#091c29',
        },
        success: {
          500: '#1e8449',
          600: '#196f3d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
