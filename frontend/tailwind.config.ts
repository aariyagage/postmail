import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    borderRadius: {
      none: "0",
      DEFAULT: "0",
      sm: "0",
      md: "0",
      lg: "0",
      xl: "0",
      "2xl": "0",
      "3xl": "0",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        headline: ["var(--font-playfair)", "serif"],
        body: ["var(--font-source-serif)", "serif"],
        ui: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "var(--color-ink)",
          light: "var(--color-ink-light)",
          muted: "var(--color-ink-muted)",
        },
        paper: {
          DEFAULT: "var(--color-paper)",
          warm: "var(--color-paper-warm)",
          cool: "var(--color-paper-cool)",
        },
        accent: {
          red: "var(--color-accent-red)",
          blue: "var(--color-accent-blue)",
          gold: "var(--color-accent-gold)",
        },
        tint: {
          rose: "var(--color-tint-rose)",
          sage: "var(--color-tint-sage)",
          cream: "var(--color-tint-cream)",
          lavender: "var(--color-tint-lavender)",
          sky: "var(--color-tint-sky)",
          sand: "var(--color-tint-sand)",
          blush: "var(--color-tint-blush)",
          mint: "var(--color-tint-mint)",
        },
        rule: {
          DEFAULT: "var(--color-rule)",
          light: "var(--color-rule-light)",
        },
      },
      boxShadow: {
        none: "none",
        DEFAULT: "none",
        sm: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "var(--color-ink)",
            "--tw-prose-headings": "var(--color-ink)",
            maxWidth: "65ch",
          },
        },
      },
      spacing: {
        column: "1.5rem",
        gutter: "2rem",
      },
      borderWidth: {
        hairline: "0.5px",
        rule: "1px",
        thick: "3px",
      },
    },
  },
  plugins: [],
};

export default config;
