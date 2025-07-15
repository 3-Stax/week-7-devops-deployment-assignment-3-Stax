// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Ensure this 'content' array correctly points to your source files
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // This tells Tailwind to scan all JS, JSX, TS, TSX files in the src directory
    "./public/index.html" // Also include your public HTML file for any classes used there
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}