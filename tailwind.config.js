/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#8c1c2e", // Burgundy
        secondary: "#d4af37", // Gold
        "text-main": "#f3e8eb",
        "text-muted": "#a8999d",
        bg: "#12080a",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
