/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark': {
          'bg': '#0f0f0f',
          'secondary': '#1a1a1a',
          'tertiary': '#2a2a2a',
        },
        'accent': {
          'cyan': '#00d4ff',
          'green': '#00ff66',
          'blue': '#0066ff',
        },
        'status': {
          'success': '#00ff66',
          'warning': '#ffcc00',
          'error': '#ff3333',
          'info': '#00d4ff',
        },
      },
    },
  },
  plugins: [],
}
