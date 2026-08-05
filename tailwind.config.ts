// @ts-check
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Breakpoints mobile-first: 480 / 768 / 1024 / 1280.
    screens: {
      sm: "480px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      colors: {
        ink: "#0B0E14", // page ground — preto-frio com undertone azul
        panel: "#11151F", // card / rec surface
        hairline: "#1E2433", // divisores / trilho da prateleira
        ice: "#45F0E0", // accent: cyan-aqua aquecido (a marca)
        mist: "#9AA7B5", // texto secundário
        signal: "#FF7847", // única nota quente (concluído-oposto / danger)
      },
      fontFamily: {
        // Display: Space Grotesk — headlines + números tabulares (ep nº).
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        // Body: Inter — sinopses, títulos de grid.
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Escala: display 40/32/24, body 16/14, caption 12.
        "display-2xl": ["2.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "600" }],
        "display-xl": ["2rem", { lineHeight: "1.1", letterSpacing: "-0.015em", fontWeight: "600" }],
        "display-lg": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.4" }],
      },
      maxWidth: {
        shelf: "1320px",
      },
    },
  },
  plugins: [],
};
