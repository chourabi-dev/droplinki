/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      spacing: {
        4.5: "1.125rem",
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#0B1220",
          900: "#101828",
          700: "#344054",
          500: "#667085",
          300: "#D0D5DD",
          100: "#F2F4F7",
          50: "#F8FAFC",
        },
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#5B5FEF",
          600: "#4338EA",
          700: "#3730A3",
          900: "#1E1B4B",
        },
        go: {
          50: "#ECFDF3",
          500: "#17A34A",
          600: "#15803D",
        },
        warn: {
          50: "#FFFAEB",
          500: "#F59E0B",
          600: "#D97706",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px -4px rgba(16, 24, 40, 0.08)",
        card: "0 2px 4px -2px rgba(16,24,40,0.06), 0 4px 12px -2px rgba(16,24,40,0.08)",
        lift: "0 8px 24px -6px rgba(67, 56, 234, 0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "check-pop": {
          "0%": { transform: "scale(0)" },
          "70%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        "rise-in": "rise-in 0.5s ease-out both",
        "check-pop": "check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
      },
    },
  },
  plugins: [],
};
