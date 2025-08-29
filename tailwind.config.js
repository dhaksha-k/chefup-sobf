/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          olive: '#254204',
          blue:  '#0a50a8',
          sky:   '#1d71c6',
          leaf:  '#2b8a22',
          lime:  '#9dc02a'
        }
      },
      boxShadow: {
        card: '0 10px 30px rgba(10,80,168,0.08)', // soft blue shadow
      },
      borderRadius: {
        xl2: '1.25rem',
      }
    },
  },
  plugins: [],
}
