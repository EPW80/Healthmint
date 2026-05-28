/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        sm: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0" }],
        base: ["1rem", { lineHeight: "1.5rem", letterSpacing: "-0.005em" }],
        lg: ["1.125rem", { lineHeight: "1.625rem", letterSpacing: "-0.01em" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.015em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        "3xl": [
          "1.875rem",
          { lineHeight: "2.25rem", letterSpacing: "-0.025em" },
        ],
        "4xl": [
          "2.25rem",
          { lineHeight: "2.5rem", letterSpacing: "-0.03em" },
        ],
      },
      boxShadow: {
        "soft-sm": "var(--shadow-sm)",
        "soft-md": "var(--shadow-md)",
        "soft-lg": "var(--shadow-lg)",
      },
      borderRadius: {
        token: "var(--radius-md)",
        "token-sm": "var(--radius-sm)",
        "token-lg": "var(--radius-lg)",
      },
      colors: {
        // ----- Legacy Material palette (kept during migration, remove in Phase 6) -----
        primary: {
          DEFAULT: "#2196F3",
          dark: "#1976D2",
          light: "#64B5F6",
        },
        secondary: {
          DEFAULT: "#9c27b0",
          dark: "#7b1fa2",
          light: "#ba68c8",
        },
        blue: {
          100: "#BBDEFB",
          500: "#2196F3",
          600: "#1E88E5",
          700: "#1976D2",
          800: "#1565C0",
        },
        green: {
          100: "#C8E6C9",
          500: "#4CAF50",
          800: "#2E7D32",
        },
        purple: {
          100: "#E1BEE7",
          500: "#9C27B0",
          800: "#6A1B9A",
        },
        yellow: {
          100: "#FFF9C4",
          500: "#FFEB3B",
          800: "#F9A825",
        },
        indigo: {
          100: "#C5CAE9",
          500: "#3F51B5",
          800: "#283593",
        },
        gray: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#EEEEEE",
          300: "#E0E0E0",
          400: "#BDBDBD",
          500: "#9E9E9E",
          600: "#757575",
          700: "#616161",
          800: "#424242",
          900: "#212121",
        },

        // ----- Semantic tokens (Phase 0+). Resolve to CSS variables; theme-aware. -----
        page: "rgb(var(--color-bg) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          raised: "rgb(var(--color-surface-raised) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "rgb(var(--color-text) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
          subtle: "rgb(var(--color-text-subtle) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          strong: "rgb(var(--color-border-strong) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          hover: "rgb(var(--color-accent-hover) / <alpha-value>)",
          fg: "rgb(var(--color-accent-fg) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          soft: "rgb(var(--color-success-bg) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning) / <alpha-value>)",
          soft: "rgb(var(--color-warning-bg) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--color-danger) / <alpha-value>)",
          soft: "rgb(var(--color-danger-bg) / <alpha-value>)",
        },
        info: {
          DEFAULT: "rgb(var(--color-info) / <alpha-value>)",
          soft: "rgb(var(--color-info-bg) / <alpha-value>)",
        },
        "focus-ring": "rgb(var(--color-focus-ring) / <alpha-value>)",
      },
    },
  },
  plugins: [],
  important: true,
};
