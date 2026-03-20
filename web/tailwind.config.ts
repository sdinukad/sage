import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: {
          DEFAULT: "var(--surface)",
          low: "var(--surface-container-low)",
          container: "var(--surface-container)",
          high: "var(--surface-container-high)",
          highest: "var(--surface-container-highest)",
          on: "var(--on-surface)",
          'on-variant': "var(--on-surface-variant)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          on: "var(--on-primary)",
          container: "var(--primary-container)",
          'on-container': "var(--on-primary-container)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          on: "var(--on-secondary)",
          container: "var(--secondary-container)",
        },
        tertiary: {
          container: "var(--tertiary-container)",
          on: "var(--on-tertiary)",
        },
        outline: {
          DEFAULT: "var(--outline)",
          variant: "var(--outline-variant)",
        },
        border: "var(--border)",
        negative: "#e53e3e",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;
