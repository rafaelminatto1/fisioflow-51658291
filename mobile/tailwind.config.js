/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0EA5E9",
        secondary: "#6366F1",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
    },
  },
  plugins: [],
}
