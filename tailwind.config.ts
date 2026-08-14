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
        // Paleta Cinematográfica Premium:
        // Grafite profundo / preto obsidiana para imersão total sem pretos 100% lavados
        ink: "#080C12", // ground principal da página
        "ink-deep": "#05070B", // fundo de vácuo / cinema
        panel: "#0E141D", // card / surface primária
        "panel-subtle": "#121A26", // elevated surface
        slate: "#16202F", // hover surface / menus interativos
        hairline: "#1F2B3E", // divisores refinados / bordas sutis
        "hairline-subtle": "rgba(255, 255, 255, 0.07)",

        // Assinatura Ice: azul/ciano cristalino de alta pureza e contraste
        ice: "#38E8DA", // accent principal - luminescência de gelo
        "ice-bright": "#60F6E9", // hover / specular highlight
        "ice-dim": "rgba(56, 232, 218, 0.12)", // background de badges/pills

        // Tipografia
        snow: "#F1F5F9", // texto primário: branco gelo cristalino
        mist: "#94A3B8", // texto secundário: titânio suave
        "mist-dim": "#64748B", // legendas, metadados discretos

        // Sinal / Nota quente
        signal: "#FF6B4A", // indicador de status no ar / badge quente
        "signal-dim": "rgba(255, 107, 74, 0.12)",

        // Tokens de Motion
        motion: {
          void: "#05080E",
          frost: "#E2F7F9",
          glacier: "#7CF5EB",
          cyan: "#00E5FF",
          azure: "#008CDA",
          teal: "#007A87",
        },
      },
      fontFamily: {
        display: ["var(--font-chakra)", "system-ui", "sans-serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-2xl": ["2.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-xl": ["2rem", { lineHeight: "1.1", letterSpacing: "-0.015em", fontWeight: "700" }],
        "display-lg": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.4" }],
      },
      boxShadow: {
        "cinematic": "0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.05)",
        "cinematic-hover": "0 24px 48px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(56, 232, 218, 0.35)",
        "glow-ice": "0 0 24px -4px rgba(56, 232, 218, 0.25)",
        "glow-subtle": "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
      },
      // Raio da identidade: o cristal é angular, não uma pílula. Escala curta
      // e seca (2–12px) — superfícies quase retas, acentos de gelo cortantes.
      // Cantos "molengas" (16–20px) foram removidos: a marca é aresta, não
      // forma orgânica.
      borderRadius: {
        "xs": "2px",
        "sm": "4px",
        "md": "6px",
        "lg": "8px",
        "xl": "10px",
        "2xl": "12px",
      },
      maxWidth: {
        shelf: "1340px",
      },
      spacing: {
        // Expandir a escala de espaçamento: gap 4.5 = 1.125rem (usado nas grades).
        "4.5": "1.125rem",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        fade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        blink: "blink 1.6s steps(1) infinite",
        fade: "fade 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
