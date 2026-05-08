/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "node_modules/@windmill/react-ui/lib/defaultTheme.js",
    "node_modules/@windmill/react-ui/dist/index.js",
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          50: "#e6f6f2",
          100: "#ccece6",
          200: "#99d9cd",
          300: "#66c6b4",
          400: "#33b39b",
          500: "#01A982",
          600: "#01A982",
          700: "#018768",
          800: "#01765b",
          900: "#01654e",
        },
        indigo: {
          500: "#01A982",
          600: "#01A982",
          700: "#018768",
        },
      },
    },
  },
  plugins: [],
};
