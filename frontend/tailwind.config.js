/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "fx-bg":      "#0A0A0A",
        "fx-surface": "#141414",
        "fx-card":    "#1A1A1A",
        "fx-border":  "#252525",
        "fx-orange":  "#FF8C00",
        "fx-indigo":  "#6366F1",
        "fx-success": "#22C55E",
        "fx-danger":  "#EF4444",
        "fx-muted":   "#777777",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
