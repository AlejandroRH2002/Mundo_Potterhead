/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { brand: { burgundy: 'var(--brand-bg)', gold: 'var(--brand-gold)', cream: 'var(--brand-cream)', ink: 'var(--brand-ink)' } },
      fontFamily: {
        cinzel: ['var(--font-display)'],
        crimson: ['var(--font-display)'],
        sans: ['var(--font-body)'],
      },
      animation: {
        'shine': 'shine 3s infinite',
      },
      keyframes: {
        shine: {
          '0%': { transform: 'translateX(-100%) rotate(45deg)' },
          '100%': { transform: 'translateX(100%) rotate(45deg)' },
        },
      },
    },
  },
}
