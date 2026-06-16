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
          orange: '#F97316',
          'orange-dark': '#EA6C0A',
          'orange-light': '#FED7AA',
          navy: '#0F172A',
          'navy-light': '#1E293B',
          'navy-lighter': '#334155',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
