export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B0F19',
          950: '#030712',
          800: '#111827',
          700: '#1F2937',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
        }
      }
    },
  },
  plugins: [],
}
