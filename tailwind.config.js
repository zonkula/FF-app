/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        h1: ['40px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.5px' }],
        h2: ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        h3: ['20px', { lineHeight: '1.3', fontWeight: '600' }],
      },
      keyframes: {
        'bounce-once': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15%)' },
        },
      },
      animation: {
        'bounce-once': 'bounce-once 0.6s ease-in-out 1',
      },
    },
  },
  plugins: [],
}
