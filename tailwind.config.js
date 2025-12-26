/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/views/**/*.{erb,html,haml,slim}",
    "./app/helpers/**/*.rb",
    "./app/javascript/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Supercell brand colors
        'supercell': {
          'dark': '#191919',
          'medium': '#666666',
          'gray': '#CCCCCC',
          'light': '#F2F2F2',
        },
        // Clash Royale inspired colors
        'royale': {
          'blue': '#4A90E2',
          'gold': '#FFD700',
          'crown': '#FFA500',
          'victory': '#2285D0',
          'defeat': '#DC2828',
          'card-bg': '#1A1A2E',
        },
      },
      fontFamily: {
        'royale': ['Clash', 'sans-serif'],
        'display': ['Clash', 'sans-serif'],
      },
      boxShadow: {
        'royale': '0 4px 14px 0 rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'royale-lg': '0 8px 24px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}


