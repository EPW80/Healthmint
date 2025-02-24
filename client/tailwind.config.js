/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
      },
    },
  },
  plugins: [],
  important: true, // This will ensure Tailwind classes take precedence
};
