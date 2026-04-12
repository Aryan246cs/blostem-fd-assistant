import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0B0F2A",
          800: "#0F1C4D",
          700: "#1A2A6C",
          600: "#1A1F3A",
        },
        accent: {
          blue: "#0072FF",
          cyan: "#00C6FF",
        },
        indigo: {
          glow: "#6C63FF",
        },
      },
      backgroundImage: {
        "app-gradient": "linear-gradient(135deg, #0B0F2A 0%, #0F1C4D 50%, #1A2A6C 100%)",
        "accent-gradient": "linear-gradient(90deg, #0072FF 0%, #00C6FF 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
      },
      boxShadow: {
        "glow-blue": "0 0 20px rgba(0,114,255,0.35)",
        "glow-cyan": "0 0 20px rgba(0,198,255,0.25)",
        "glow-card": "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
