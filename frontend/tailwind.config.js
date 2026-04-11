/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        sand: {
          50: "#faf8f4",
          100: "#f5f0e8",
          200: "#ede4d0",
          300: "#dfd1b0",
          400: "#ccb68a",
          500: "#b89b6b",
          600: "#a07f52",
          700: "#856643",
          800: "#6e5239",
          900: "#5c4431",
        },
        ocean: {
          50: "#eff8ff",
          100: "#dbeffe",
          200: "#bfe3fe",
          300: "#93d0fd",
          400: "#60b5fa",
          500: "#3b93f6",
          600: "#2575eb",
          700: "#1d5fd8",
          800: "#1e4daf",
          900: "#1e4289",
        },
        forest: {
          500: "#2d6a4f",
          600: "#1b4332",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-soft": "pulseSoft 2s infinite",
        "typing": "typing 1.2s steps(3) infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulseSoft: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.6 } },
        typing: { "0%,100%": { content: "'●'" }, "33%": { content: "'● ●'" }, "66%": { content: "'● ● ●'" } },
      },
    },
  },
  plugins: [],
};
