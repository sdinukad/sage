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
        surface: "var(--surface)",
        'surface-bright': "var(--surface-bright)",
        'surface-container': "var(--surface-container)",
        'surface-container-high': "var(--surface-container-high)",
        'surface-container-highest': "var(--surface-container-highest)",
        'surface-container-low': "var(--surface-container-low)",
        'surface-container-lowest': "var(--surface-container-lowest)",
        'surface-dim': "var(--surface-dim)",
        'surface-tint': "var(--surface-tint)",
        'surface-variant': "var(--surface-variant)",
        
        'on-background': "var(--on-background)",
        'on-surface': "var(--on-surface)",
        'on-surface-variant': "var(--on-surface-variant)",
        
        outline: "var(--outline)",
        'outline-variant': "var(--outline-variant)",
        border: "var(--border)",
        negative: "#e53e3e",

        primary: "var(--primary)",
        'primary-container': "var(--primary-container)",
        'primary-dim': "var(--primary-dim)",
        'primary-fixed': "var(--primary-fixed)",
        'primary-fixed-dim': "var(--primary-fixed-dim)",
        
        'on-primary': "var(--on-primary)",
        'on-primary-container': "var(--on-primary-container)",
        'on-primary-fixed': "var(--on-primary-fixed)",
        'on-primary-fixed-variant': "var(--on-primary-fixed-variant)",
        
        secondary: "var(--secondary)",
        'secondary-container': "var(--secondary-container)",
        'secondary-dim': "var(--secondary-dim)",
        'secondary-fixed': "var(--secondary-fixed)",
        'secondary-fixed-dim': "var(--secondary-fixed-dim)",
        
        'on-secondary': "var(--on-secondary)",
        'on-secondary-container': "var(--on-secondary-container)",
        'on-secondary-fixed': "var(--on-secondary-fixed)",
        'on-secondary-fixed-variant': "var(--on-secondary-fixed-variant)",
        
        tertiary: "var(--tertiary)",
        'tertiary-container': "var(--tertiary-container)",
        'tertiary-dim': "var(--tertiary-dim)",
        'tertiary-fixed': "var(--tertiary-fixed)",
        'tertiary-fixed-dim': "var(--tertiary-fixed-dim)",
        
        'on-tertiary': "var(--on-tertiary)",
        'on-tertiary-container': "var(--on-tertiary-container)",
        'on-tertiary-fixed': "var(--on-tertiary-fixed)",
        'on-tertiary-fixed-variant': "var(--on-tertiary-fixed-variant)",
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
