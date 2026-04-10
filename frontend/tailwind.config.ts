import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
        logo: ["var(--font-logo)", "serif"],
        body: ["var(--font-source-serif)", "serif"],
        ui: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#1a1a1a",
          light: "#4a4a4a",
          muted: "#8a8a8a",
        },
        paper: {
          DEFAULT: "#faf9f6",
          warm: "#f5f0e8",
          cool: "#f0f2f5",
        },
        accent: {
          red: "#c41e3a",
          blue: "#1e3a5f",
          gold: "#c4a43e",
        },
        tint: {
          rose: "#f0ddd8",
          sage: "#dde8df",
          cream: "#f2ebe0",
          lavender: "#e4e0ed",
          sky: "#dce6ed",
          sand: "#ede8da",
          blush: "#f2e0e4",
          mint: "#d8ede6",
        },
        rule: {
          DEFAULT: "#1a1a1a",
          light: "#d4d4d4",
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
            "--tw-prose-body": "#1a1a1a",
            "--tw-prose-headings": "#1a1a1a",
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
