// @ts-check
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
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
        // "Sinal da madrugada": prateleira como canal de TV frio, noite adentro.
        // Ground profundo, quase o vácuo; panels em azul-nevado; uma única nota
        // quente (signal) para o oposto do ice.
        ink: "#070B12", // page ground — fundo do sinal
        panel: "#0E141D", // card / rec surface
        slate: "#141D29", // hover / dropdown surface
        hairline: "#1C2534", // divisores / trilho da prateleira
        ice: "#45F0E0", // accent: o gelo (a marca)
        mist: "#9FB0C1", // texto secundário
        signal: "#FF7847", // única nota quente (danger / oposto)
        snow: "#E9EFF5", // texto primário (títulos, valores, inputs)
      },
      fontFamily: {
        // Display: Chakra Petch — cristal de gelo em forma de tipo: arestas
        // frias, voz de painel de sinal, nada de grotesca neutra.
        display: ["var(--font-chakra)", "system-ui", "sans-serif"],
        // Body: IBM Plex Sans — industrial, sem ser o Inter de todo mundo.
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        // Mono: IBM Plex Mono — timecodes, nº de EP, dados. A voz de EPG.
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Escala: display 40/32/24, body 16/14, caption 12.
        "display-2xl": ["2.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-xl": ["2rem", { lineHeight: "1.1", letterSpacing: "-0.015em", fontWeight: "700" }],
        "display-lg": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.4" }],
      },
      maxWidth: {
        shelf: "1320px",
      },
      keyframes: {
        // Subida de página: prateleiras entram em cascata, como o sinal ligando.
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.15" },
        },
        // Crossfade do hero: slide entra suave, sem mover layout.
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        blink: "blink 1.6s steps(1) infinite",
        fade: "fade 600ms ease-out both",
      },
    },
  },
  plugins: [],
};
