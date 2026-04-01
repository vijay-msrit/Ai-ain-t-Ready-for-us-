/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0D1117",
        "navy-light": "#161B22",
        "navy-card": "#1C2333",
        "navy-border": "#30363D",
        cream: "#F5F0E8",
        "cream-dark": "#EDE8DF",
        yellow: "#F5C842",
        "yellow-dark": "#D4A820",
        "yellow-pale": "#FDF3C0",
        ink: "#1C1C2E",
        "ink-light": "#4A4A6A",
        muted: "#8B949E",
        success: "#3FB950",
        danger: "#F85149",
        warning: "#D29922",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 4px 32px rgba(0,0,0,0.35)",
        "card-light": "0 4px 24px rgba(0,0,0,0.08)",
        yellow: "0 0 28px rgba(245,200,66,0.35)",
        "yellow-sm": "0 0 12px rgba(245,200,66,0.2)",
      },
      backgroundImage: {
        "yellow-gradient": "linear-gradient(135deg, #F5C842 0%, #D4A820 100%)",
      },
    },
  },
  plugins: [],
};
