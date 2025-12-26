/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/views/**/*.{erb,html,haml,slim}",
    "./app/helpers/**/*.rb",
    "./app/javascript/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}


