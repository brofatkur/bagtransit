/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Cyan / Sky Blue matching "Bali Luggage Pickup Delivery" logo
        brand: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#00AEEF', // Primary Logo Cyan
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49',
        },
        accent: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981', // Emerald confirmation
          600: '#059669',
        },
        whatsapp: {
          500: '#25D366',
          600: '#1EBE5D',
          700: '#128C7E',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'glow-brand': '0 0 25px -5px rgba(0, 174, 239, 0.45)',
        'glow-whatsapp': '0 0 25px -5px rgba(37, 211, 102, 0.45)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'card-hover': '0 20px 30px -10px rgba(0, 0, 0, 0.12), 0 10px 15px -5px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
}
