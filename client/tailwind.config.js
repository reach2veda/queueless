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
          bg: '#FFFFFF',
          primary: '#16834A',
          dark: '#11643A',
          light: '#EAF6EE',
          mint: '#F3FAF5',
          text: '#17231C',
          muted: '#66736B',
          border: '#E3EAE5',
        },
        primary: {
          50: '#F3FAF5',
          100: '#EAF6EE',
          200: '#C7E8D3',
          300: '#94D3AE',
          400: '#4EBA7C',
          500: '#16834A',
          600: '#11643A',
          700: '#0E522F',
          800: '#0B4024',
          900: '#08301B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 1px 2px 0 rgba(17, 35, 28, 0.05)',
        'soft': '0 4px 20px -2px rgba(17, 35, 28, 0.06), 0 2px 6px -1px rgba(17, 35, 28, 0.03)',
        'soft-lg': '0 10px 30px -4px rgba(17, 35, 28, 0.08), 0 4px 10px -2px rgba(17, 35, 28, 0.03)',
        'card': '0 1px 3px 0 rgba(17, 35, 28, 0.06), 0 1px 2px -1px rgba(17, 35, 28, 0.04)',
      },
    },
  },
  plugins: [],
}
