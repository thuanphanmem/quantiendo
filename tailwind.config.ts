import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f7f8fa",
        surface: "#ffffff",
        "surface-subtle": "#f3f4f6",
        "surface-muted": "#eceef2",
        primary: "#a63500",
        "primary-soft": "#fbe4d8",
        "primary-strong": "#c94b18",
        text: "#171c1f",
        "text-muted": "#5e656d",
        border: "#e6e7eb",
        success: "#1c7c54",
        "success-soft": "#def6e8",
        warning: "#b66a06",
        "warning-soft": "#fff1d6",
        danger: "#c3291f",
        "danger-soft": "#fde2df",
        info: "#48617a",
        "info-soft": "#e5edf7"
      },
      fontFamily: {
        headline: ["var(--font-manrope)"],
        body: ["var(--font-inter)"],
      },
      boxShadow: {
        panel: "0 16px 40px rgba(23, 28, 31, 0.06)",
        card: "0 8px 24px rgba(23, 28, 31, 0.05)",
      },
      borderRadius: {
        xl: "18px",
        "2xl": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
