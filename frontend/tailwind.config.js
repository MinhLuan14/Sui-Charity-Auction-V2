/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      zIndex: {
        '100': '100', // Cho phép sử dụng class z-100
      },
      colors: {
        sui: {
          dark: "#050B15",
          primary: "#0066FF",
          cyan: "#00D1FF",
        }
      }
    },
  },
  plugins: [],
}