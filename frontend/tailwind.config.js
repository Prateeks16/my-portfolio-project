/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cream-bg': '#ECEBE9', // Website ka main background color
        'dark-text': '#1A1A1A',
        'soft-text': '#5A5A5A',
      },
      fontFamily: {
        'sans': ['Manrope', 'sans-serif'],
        'serif': ['Playfair Display', 'serif'], // Heading ke liye
      },
    },
  },
  plugins: [],
}