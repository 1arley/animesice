"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { useRollAudio } from "@/lib/use-roll-audio";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { GACHA_RARITY_COLORS } from "@/lib/gacha-rarity-colors";
import { safeImageSrc } from "@/lib/url";
import {
  GachaCard,
  GACHA_TIERS,
  RARITY,
  RARITY_TEXT,
  GALAXY_TEXT,
  FOIL_TEXT,
  CONDITION_COLOR,
  CONDITION_GLYPH,
  gachaConditionLabel,
} from "./GachaCard";
import type {
  GachaPull,
  GachaOwnedSkinCopy,
  GachaTradeUpCardResult,
  GachaTradeUpSkinResult,
  SocialUser,
} from "@/types";

type RollRarity = (typeof GACHA_TIERS)[number];

const RARITY_COLORS: Record<RollRarity, string> = GACHA_RARITY_COLORS;

const RARITY_LABEL: Record<RollRarity, string> = {
  COMUM: "COMUM",
  INCOMUM: "INCOMUM",
  RARA: "RARA",
  EPICA: "ÉPICA",
  LENDARIA: "LENDÁRIA",
  MITICA: "MÍTICA",
  GALACTICA: "GALÁCTICA",
};

const RAINBOW_GRADIENT =
  "linear-gradient(115deg, #ff4d8d 0%, #ffb347 16%, #fff275 30%, #5cffb0 46%, #4dd8ff 62%, #9a7bff 78%, #ff4d8d 100%)";

const SWEEP_GRADIENT =
  "linear-gradient(105deg, transparent 28%, rgba(255,255,255,0.85) 50%, transparent 72%)";

/* Geometria da Matriz Alquímica do Forjamento (viewBox 400x400, centro 200,200) */
const FCX = 200;
const FCY = 200;

function forgePt(radius: number, deg: number) {
  const angle = (deg * Math.PI) / 180;
  return [FCX + radius * Math.cos(angle), FCY + radius * Math.sin(angle)] as const;
}

function forgeTicksPath(r1: number, r2: number, count: number) {
  let d = "";
  for (let i = 0; i < count; i += 1) {
    const [x1, y1] = forgePt(r1, (i * 360) / count);
    const [x2, y2] = forgePt(r2, (i * 360) / count);
    d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

function forgePolyPath(radius: number, start: number, sides: number) {
  let d = "";
  for (let i = 0; i < sides; i += 1) {
    const [x, y] = forgePt(radius, start + (i * 360) / sides);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

function forgeRunesPath(radius: number, count: number, size: number) {
  let d = "";
  for (let i = 0; i < count; i += 1) {
    const [x, y] = forgePt(radius, (i * 360) / count + 45);
    d += `M${x.toFixed(1)} ${(y - size).toFixed(1)}L${(x + size).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y + size).toFixed(1)}L${(x - size).toFixed(1)} ${y.toFixed(1)}Z`;
  }
  return d;
}

const FORGE_SIGIL = {
  ticks: forgeTicksPath(182, 192, 48),
  squareA: forgePolyPath(155, 45, 4),
  squareB: forgePolyPath(155, 0, 4),
  innerOcta: forgePolyPath(120, 22.5, 8),
  runes: forgeRunesPath(170, 8, 8),
  energySpokes: forgeTicksPath(35, 140, 8),
};

interface ParticleItem {
  angle: number;
  distance: number;
  size: number;
  speed: number;
  delay: number;
  vx: number;
  vy: number;
}

function createForgeBurstParticles(count: number, seed: string): ParticleItem[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }
  return Array.from({ length: count }, (_, index) => {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    const unit1 = (hash >>> 0) / 4294967295;
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    const unit2 = (hash >>> 0) / 4294967295;

    const angle = (index / Math.max(1, count)) * Math.PI * 2 + unit1 * 0.35;
    const distance = 80 + unit2 * 320;
    const size = 1.2 + unit1 * 2.8;
    const speed = 2.5 + unit2 * 4.5;
    return {
      angle,
      distance,
      size,
      speed,
      delay: unit1 * 0.15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  });
}

export interface GachaTradeUpForgeStageProps {
  mode: "cards" | "skins";
  sourceCards: GachaPull[];
  sourceSkins: GachaOwnedSkinCopy[];
  cardResult: GachaTradeUpCardResult | null;
  skinResult: GachaTradeUpSkinResult | null;
  error?: string | null;
  currentUser: {
    id: string;
    name: string | null;
    userName: string | null;
    avatar: string | null;
  } | null;
  onClose: () => void;
  onReset: () => void;
}

export function GachaTradeUpForgeStage({
  mode,
  sourceCards,
  sourceSkins,
  cardResult,
  skinResult,
  error,
  currentUser,
  onClose,
  onReset,
}: GachaTradeUpForgeStageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filterId = useId().replace(/:/g, "");

  const reduceMotion = usePrefersReducedMotion();
  const audio = useRollAudio();
  const sfxRef = useRef(audio.sfx);
  sfxRef.current = audio.sfx;

  const [phase, setPhase] = useState<
    "intro" | "gathering" | "singularity" | "explosion" | "revealed" | "error"
  >("intro");
  const [revealed, setRevealed] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Armazena resultado mais recente para timelines assíncronas
  const latestCardResult = useRef<GachaTradeUpCardResult | null>(cardResult);
  latestCardResult.current = cardResult;
  const latestSkinResult = useRef<GachaTradeUpSkinResult | null>(skinResult);
  latestSkinResult.current = skinResult;

  const sourceCount = mode === "cards" ? sourceCards.length : sourceSkins.length;
  const sourceRarity = useMemo<RollRarity>(() => {
    if (mode === "cards") {
      const raw = sourceCards[0]?.card.rarity;
      return GACHA_TIERS.includes(raw as RollRarity) ? (raw as RollRarity) : "RARA";
    }
    const raw = sourceSkins[0]?.rarity;
    return GACHA_TIERS.includes(raw as RollRarity) ? (raw as RollRarity) : "RARA";
  }, [mode, sourceCards, sourceSkins]);

  const targetRarity = useMemo<RollRarity>(() => {
    if (cardResult) {
      const r = cardResult.card.rarity;
      return GACHA_TIERS.includes(r as RollRarity) ? (r as RollRarity) : "EPICA";
    }
    if (skinResult) {
      const r = skinResult.rarity;
      return GACHA_TIERS.includes(r as RollRarity) ? (r as RollRarity) : "EPICA";
    }
    // Projeção baseada na raridade fonte
    const idx = GACHA_TIERS.indexOf(sourceRarity);
    const nextIdx = Math.min(GACHA_TIERS.length - 1, idx + 1);
    return GACHA_TIERS[nextIdx] ?? "EPICA";
  }, [cardResult, skinResult, sourceRarity]);

  const targetColor = RARITY_COLORS[targetRarity] ?? RARITY_COLORS.EPICA;
  const sourceColor = RARITY_COLORS[sourceRarity] ?? RARITY_COLORS.RARA;
  const targetIndex = GACHA_TIERS.indexOf(targetRarity);

  // Objeto Pull sintetizado para renderizar a carta forjada
  const synthesizedPull = useMemo<GachaPull | null>(() => {
    if (!cardResult || !currentUser) return null;
    const author: SocialUser = {
      id: currentUser.id,
      name: currentUser.name,
      userName: currentUser.userName,
      avatar: currentUser.avatar,
    };
    return {
      id: cardResult.id,
      condition: cardResult.condition,
      conditionLabel:
        cardResult.conditionLabel ?? gachaConditionLabel(cardResult.condition),
      foil: cardResult.foil,
      edition: cardResult.edition,
      value: cardResult.value,
      obtainedAt: new Date().toISOString(),
      user: author,
      card: {
        id: cardResult.card.id,
        name: cardResult.card.name,
        rarity: cardResult.card.rarity,
        image: cardResult.card.image ?? null,
        imageHidden: false,
        favourites: 0,
        animeId: cardResult.card.animeId,
        animeTitle: null,
        anime: null,
      },
    };
  }, [cardResult, currentUser]);

  // Modal dialog lifecycle
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const prevOverflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (el.open) el.close();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // 3D Tilt da Carta Forjada
  const applyTilt = useCallback((normX: number, normY: number) => {
    const el = containerRef.current?.querySelector<HTMLElement>("[data-forged-tilt]");
    if (!el) return;
    const maxRot = 16;
    el.style.setProperty("--tilt-x", `${(-normY * maxRot).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(normX * maxRot).toFixed(2)}deg`);
  }, []);

  // Pular animação (fast-forward acessível)
  const handleSkip = useCallback(() => {
    setSkipped(true);
    setRevealed(true);
    setPhase("revealed");
    sfxRef.current.silence();
    sfxRef.current.chime(1);
  }, []);

  // Teclado: Escape fecha se já revelado, ou pula se animando
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (revealed || phase === "error") {
          onClose();
        } else {
          handleSkip();
        }
      } else if (e.key === " " && !revealed && phase !== "error") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealed, phase, onClose, handleSkip]);

  // Se preferência por movimento reduzido estiver ativa, pular automaticamente
  useEffect(() => {
    if (reduceMotion) {
      handleSkip();
    }
  }, [reduceMotion, handleSkip]);

  // Se erro da API for passado
  useEffect(() => {
    if (error) {
      setPhase("error");
      sfxRef.current.dupe();
    }
  }, [error]);

  // =========================================================================
  // TIMELINE PRINCIPAL DE ANIMAÇÃO DO FORJAMENTO (GSAP)
  // =========================================================================
  useEffect(() => {
    if (skipped || reduceMotion) return;
    const root = dialogRef.current;
    if (!root) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    const shakeFrame = root.querySelector<HTMLElement>("[data-shake-frame]");
    const crucible = root.querySelector<HTMLElement>("[data-crucible]");
    const crucibleCore = root.querySelector<HTMLElement>("[data-crucible-core]");
    const crucibleHalo = root.querySelector<HTMLElement>("[data-crucible-halo]");
    const sigilOuter = root.querySelector<SVGElement>("[data-sigil-outer]");
    const sigilInner = root.querySelector<SVGElement>("[data-sigil-inner]");
    const sigilRunes = root.querySelector<SVGElement>("[data-sigil-runes]");
    const flashEl = root.querySelector<HTMLElement>("[data-flash]");
    const rings = Array.from(root.querySelectorAll<SVGCircleElement>("[data-blast-ring]"));
    const sourceCardEls = Array.from(
      root.querySelectorAll<HTMLElement>("[data-source-card]"),
    );
    const forgedCardStage = root.querySelector<HTMLElement>("[data-forged-stage]");
    const forgedFlip = root.querySelector<HTMLElement>("[data-forged-flip]");
    const forgedDetails = root.querySelector<HTMLElement>("[data-forged-details]");
    const forgedSweep = root.querySelector<HTMLElement>("[data-forged-sweep]");
    const godrays = root.querySelector<HTMLElement>("[data-godrays]");

    const particles = createForgeBurstParticles(
      Math.min(160, sourceCount * 38),
      cardResult?.id ?? skinResult?.id ?? "transmutation",
    );

    let particleMode: "vortex" | "burst" | "idle" = "vortex";
    let burstStartSec = 0;
    const t0 = performance.now();
    const clock = () => (performance.now() - t0) / 1000;

    // Dimensões do Canvas
    let width = 600;
    let height = 600;
    const updateCanvasSize = () => {
      if (!canvas || !root) return;
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    // Loop de renderização no Canvas
    const drawParticles = () => {
      if (!canvas || !ctx || particleMode === "idle") return;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const now = clock();

      if (particleMode === "vortex") {
        // Partículas em espiral sendo sugadas das cartas em direção ao centro
        ctx.globalCompositeOperation = "lighter";
        const count = Math.min(particles.length, 60);
        for (let i = 0; i < count; i += 1) {
          const p = particles[i]!;
          const progress = (now * 0.85 + p.delay * 2) % 1;
          const currentRadius = p.distance * (1 - progress) + 20;
          const currentAngle = p.angle + progress * Math.PI * 4;
          const px = cx + Math.cos(currentAngle) * currentRadius;
          const py = cy + Math.sin(currentAngle) * currentRadius;

          ctx.fillStyle = i % 2 === 0 ? sourceColor : "#ffffff";
          ctx.globalAlpha = 0.4 + 0.6 * progress;
          ctx.beginPath();
          ctx.arc(px, py, p.size * (0.8 + 0.4 * progress), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      } else if (particleMode === "burst") {
        // Explosão radial hiper-energética
        ctx.globalCompositeOperation = "lighter";
        const elapsed = now - burstStartSec;
        const dur = 1.4;
        const progress = Math.min(1, Math.max(0, elapsed / dur));
        const eased = 1 - (1 - progress) ** 3;
        const tailEased = 1 - (1 - Math.max(0, progress - 0.08)) ** 3;

        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i]!;
          const rx = p.distance * 1.5;
          const ry = p.distance * 1.5;
          const cos = Math.cos(p.angle);
          const sin = Math.sin(p.angle);

          const startX = cx + cos * rx * tailEased;
          const startY = cy + sin * ry * tailEased;
          const endX = cx + cos * rx * eased;
          const endY = cy + sin * ry * eased;

          ctx.globalAlpha = Math.max(0, (1 - progress) * 0.95);
          ctx.strokeStyle =
            targetRarity === "GALACTICA"
              ? ["#FF78C4", "#FFED78", "#78FFDA", "#9D78FF"][i % 4]!
              : i % 3 === 0
                ? "#FFFFFF"
                : targetColor;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        if (progress >= 1) {
          particleMode = "idle";
        }
      }
    };
    gsap.ticker.add(drawParticles);

    // Timeline GSAP
    const masterTl = gsap.timeline();

    // 1. Áudio de Carga inicial
    sfxRef.current.charge(2.4);

    // Rotação contínua dos anéis de runas
    if (sigilOuter) {
      gsap.to(sigilOuter, {
        rotation: 360,
        duration: 10,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });
    }
    if (sigilInner) {
      gsap.to(sigilInner, {
        rotation: -360,
        duration: 7,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });
    }
    if (sigilRunes) {
      gsap.to(sigilRunes, {
        rotation: 360,
        duration: 4.5,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });
    }

    // Leve pulsação inicial das 4 cartas
    sourceCardEls.forEach((card, index) => {
      gsap.to(card, {
        y: "+=6",
        rotationZ: index % 2 === 0 ? "+=1.5" : "-=1.5",
        duration: 1.2 + index * 0.1,
        yoyo: true,
        repeat: 2,
        ease: "sine.inOut",
      });
    });

    // 2. FASE: Gathering / Convergência (1.0s até 2.2s)
    masterTl.call(() => setPhase("gathering"), [], 0.8);

    // Efeito de aceleração dos giros do sigilo
    if (sigilOuter) {
      masterTl.to(sigilOuter, { scale: 1.15, duration: 1.2, ease: "power2.in" }, 1.0);
    }
    if (crucibleCore) {
      masterTl.to(
        crucibleCore,
        { scale: 1.5, opacity: 1, duration: 1.2, ease: "power2.in" },
        1.0,
      );
    }
    if (crucibleHalo) {
      masterTl.to(
        crucibleHalo,
        { scale: 1.8, opacity: 0.85, duration: 1.2, ease: "power2.in" },
        1.0,
      );
    }

    // Tremor inicial da tela enquanto a matéria converge
    if (shakeFrame) {
      const shakeTimeline = gsap.timeline({ repeat: 4 });
      shakeTimeline
        .to(shakeFrame, { x: 2, y: -2, duration: 0.05, ease: "none" })
        .to(shakeFrame, { x: -2, y: 2, duration: 0.05, ease: "none" })
        .to(shakeFrame, { x: 0, y: 0, duration: 0.04, ease: "none" });
      masterTl.add(shakeTimeline, 1.2);
    }

    // AS 4 CARTAS SE JUNTANDO NO CENTRO (IMPLOSÃO EM ESPIRAL)
    sourceCardEls.forEach((card, index) => {
      masterTl.to(
        card,
        {
          x: 0,
          y: 0,
          scale: 0.12,
          rotation: index % 2 === 0 ? "+=260" : "-=260",
          opacity: 0.85,
          duration: 1.1,
          ease: "power3.in",
        },
        1.2,
      );
    });

    // 3. FASE: Singularity / Colisão das Cartas (2.3s)
    masterTl.call(
      () => {
        setPhase("singularity");
        sfxRef.current.tick(3);
      },
      [],
      2.3,
    );

    // Cartas desaparecem no momento da colisão
    masterTl.set(sourceCardEls, { opacity: 0 }, 2.3);

    // O Núcleo engole as cartas e infla violentamente
    if (crucibleCore) {
      masterTl
        .to(
          crucibleCore,
          {
            scale: 2.2,
            backgroundColor: targetColor,
            boxShadow: `0 0 50px 20px ${targetColor}`,
            duration: 0.2,
            ease: "back.out(2)",
          },
          2.3,
        )
        // Compressão súbita ("segurar a respiração" antes da supernova)
        .to(
          crucibleCore,
          {
            scale: 0.35,
            duration: 0.35,
            ease: "power4.in",
          },
          2.55,
        );
    }

    // Tiques de tensão na fusão
    masterTl.call(() => sfxRef.current.tick(4), [], 2.5);
    masterTl.call(() => sfxRef.current.tick(5), [], 2.7);

    // 4. FASE: A EXPLOSÃO EXTRAVAGANTE (2.9s)
    masterTl.call(
      () => {
        setPhase("explosion");
        particleMode = "burst";
        burstStartSec = clock();
        sfxRef.current.impact(targetIndex / (GACHA_TIERS.length - 1));
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.vibrate === "function"
        ) {
          navigator.vibrate([45, 30, 85]);
        }
      },
      [],
      2.9,
    );

    // Flash na tela
    if (flashEl) {
      masterTl
        .fromTo(
          flashEl,
          { opacity: 0 },
          { opacity: 0.95, duration: 0.05, ease: "none" },
          2.9,
        )
        .to(flashEl, { opacity: 0, duration: 0.5, ease: "power2.out" }, 2.95);
    }

    // Terremoto na tela (Screen Shake violento)
    if (shakeFrame) {
      [14, -14, 10, -9, 6, -4, 2, 0].forEach((amp, i) => {
        masterTl.to(
          shakeFrame,
          {
            x: amp,
            y: -amp * 0.7,
            duration: 0.045,
            ease: "none",
          },
          2.9 + i * 0.045,
        );
      });
    }

    // Ondas de choque em anel expandindo
    rings.forEach((ring, i) => {
      masterTl.fromTo(
        ring,
        { scale: 0.1, opacity: 0.9, stroke: targetColor },
        {
          scale: 3.4,
          opacity: 0,
          duration: 0.75 + i * 0.15,
          ease: "power2.out",
          transformOrigin: "50% 50%",
        },
        2.9 + i * 0.08,
      );
    });

    // Desaparecimento do cadinho
    if (crucible) {
      masterTl.to(crucible, { opacity: 0, scale: 0.2, duration: 0.25 }, 2.9);
    }

    // Godrays para Lendária / Mítica / Galáctica
    if (godrays && targetIndex >= GACHA_TIERS.indexOf("LENDARIA")) {
      gsap.to(godrays, {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: "none",
      });
      masterTl
        .fromTo(
          godrays,
          { opacity: 0, scale: 0.5 },
          { opacity: 0.8, scale: 1, duration: 0.5, ease: "power2.out" },
          2.95,
        )
        .to(godrays, { opacity: 0.2, duration: 1.2 }, 3.5);
    }

    // 5. FASE: REVELAÇÃO DA CARTA FORJADA (3.3s)
    masterTl.call(
      () => {
        setRevealed(true);
        setPhase("revealed");
        if (targetRarity === "GALACTICA") {
          sfxRef.current.galacticChime();
        } else {
          sfxRef.current.chime(targetIndex / (GACHA_TIERS.length - 1));
        }
      },
      [],
      3.3,
    );

    // 3D Flip e subida da Carta Forjada
    if (forgedCardStage && forgedFlip) {
      masterTl
        .fromTo(
          forgedCardStage,
          { scale: 0.2, opacity: 0, y: 50 },
          { scale: 1, opacity: 1, y: 0, duration: 0.75, ease: "back.out(1.4)" },
          3.3,
        )
        .fromTo(
          forgedFlip,
          { rotationY: 180 },
          { rotationY: 0, duration: 0.8, ease: "power2.out" },
          3.3,
        );
    }

    // Sweep holográfico passando na carta
    if (forgedSweep) {
      masterTl.fromTo(
        forgedSweep,
        { x: "-100%", opacity: 0.8 },
        { x: "200%", opacity: 0, duration: 0.9, ease: "power1.inOut" },
        3.8,
      );
    }

    // Detalhes da carta e botões entram suavemente
    if (forgedDetails) {
      masterTl.fromTo(
        forgedDetails,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
        3.85,
      );
    }

    return () => {
      masterTl.kill();
      gsap.ticker.remove(drawParticles);
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [
    skipped,
    reduceMotion,
    sourceCount,
    sourceColor,
    targetColor,
    targetRarity,
    targetIndex,
    cardResult?.id,
    skinResult?.id,
  ]);

  // Layout das Cartas / Skins fontes em volta do cadinho
  const sourceSlots = useMemo(() => {
    const isMobile =
      typeof window !== "undefined" ? window.innerWidth < 640 : false;
    const radius = isMobile ? 120 : 185;

    if (mode === "cards") {
      // 4 posições cardeais (0°, 90°, 180°, 270°) rotacionadas 90° para começar no topo
      return sourceCards.map((card, index) => {
        const deg = (index * 360) / 4 - 90;
        const rad = (deg * Math.PI) / 180;
        const x = Math.round(Math.cos(rad) * radius);
        const y = Math.round(Math.sin(rad) * radius);
        return {
          id: card.id,
          name: card.card.name,
          image: safeImageSrc(card.card.image),
          rarity: card.card.rarity,
          cond: card.conditionLabel ?? gachaConditionLabel(card.condition),
          foil: card.foil,
          edition: card.edition,
          x,
          y,
          rotZ: index === 0 ? 0 : index === 1 ? 6 : index === 2 ? 0 : -6,
        };
      });
    }

    // 5 posições em pentágono para skins
    return sourceSkins.map((skin, index) => {
      const deg = (index * 360) / 5 - 90;
      const rad = (deg * Math.PI) / 180;
      const x = Math.round(Math.cos(rad) * radius);
      const y = Math.round(Math.sin(rad) * radius);
      return {
        id: skin.id,
        name: skin.name,
        image: safeImageSrc(skin.imageUrl),
        rarity: skin.rarity,
        cond: null,
        foil: "NORMAL",
        edition: 0,
        x,
        y,
        rotZ: (index - 2) * 5,
      };
    });
  }, [mode, sourceCards, sourceSkins]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 h-screen w-screen max-h-none max-w-none border-none bg-[#05070f]/95 p-0 text-snow backdrop-blur-xl"
      aria-labelledby="forge-stage-title"
      aria-describedby="forge-stage-status"
    >
      {/* Mensagem para Leitores de Tela */}
      <h2 id="forge-stage-title" className="sr-only">
        Cerimônia de Forjamento Trade-up
      </h2>
      <p id="forge-stage-status" className="sr-only" aria-live="polite">
        {phase === "intro" && "Iniciando processo de forjamento..."}
        {phase === "gathering" && "As 4 cartas estão convergindo para o centro alquímico..."}
        {phase === "singularity" && "Fusão de cartas em massa crítica!"}
        {phase === "explosion" && "Supernova de forjamento detonada!"}
        {phase === "revealed" &&
          (cardResult
            ? `Carta forjada: ${cardResult.card.name}, raridade ${cardResult.card.rarity}.`
            : skinResult
              ? `Skin forjada: ${skinResult.name}, raridade ${skinResult.rarity}.`
              : "Forjamento concluído!")}
        {phase === "error" && "Erro durante o forjamento."}
      </p>

      {/* Barra de Controles do Topo (Som, Pular, Fechar) */}
      <header className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={audio.toggle}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-hairline bg-panel/80 px-3 text-caption font-bold text-mist transition-colors hover:border-ice hover:text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
            aria-label={audio.enabled ? "Desativar áudio da forja" : "Ativar áudio da forja"}
          >
            {audio.enabled ? "🔊 Som: Ligado" : "🔇 Som: Desligado"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!revealed && phase !== "error" && (
            <button
              type="button"
              onClick={handleSkip}
              className="btn-ghost flex min-h-11 items-center rounded-full border border-hairline/80 bg-panel/70 px-4 text-caption font-bold text-mist transition-colors hover:text-snow focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
            >
              Pular Animação ⏭
            </button>
          )}

          {(revealed || phase === "error") && (
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-hairline bg-panel/80 text-mist transition-colors hover:bg-rose-500/20 hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              aria-label="Fechar janela de forjamento"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Frame de Tremor (Screen Shake Container) */}
      <div
        ref={containerRef}
        data-shake-frame
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
      >
        {/* Glow de Fundo e Luz Ambiente do Alvo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute h-[600px] w-[600px] rounded-full blur-[140px] transition-colors duration-700"
          style={{
            backgroundColor: phase === "revealed" ? targetColor : sourceColor,
            opacity: phase === "revealed" ? 0.22 : 0.12,
          }}
        />

        {/* Flash de Luz da Detonação */}
        <div
          data-flash
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 bg-white opacity-0"
        />

        {/* Canvas de Partículas (Vortex e Explosão) */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        />

        {/* Ondas de Choque Radiais em SVG */}
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          className="pointer-events-none absolute z-20 h-[520px] w-[520px] overflow-visible"
        >
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              data-blast-ring
              cx={FCX}
              cy={FCY}
              r="70"
              fill="none"
              strokeWidth="2.5"
              opacity="0"
            />
          ))}
        </svg>

        {/* Raios Divinos (Godrays) para Raridades Supremas */}
        {targetIndex >= GACHA_TIERS.indexOf("LENDARIA") && (
          <div
            data-godrays
            aria-hidden="true"
            className="pointer-events-none absolute z-10 h-[800px] w-[800px] opacity-0"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${targetColor}25 25deg, transparent 50deg, ${targetColor}30 75deg, transparent 100deg, ${targetColor}25 140deg, transparent 180deg, ${targetColor}30 220deg, transparent 260deg, ${targetColor}25 310deg, transparent 360deg)`,
            }}
          />
        )}

        {/* =============================================================== */}
        {/* FASE 1 & 2: CADINHO CENTRAL E CARTAS CONVERGINDO                */}
        {/* =============================================================== */}
        {!revealed && (
          <div className="relative flex items-center justify-center">
            {/* O CADINHO ALQUÍMICO (Crucible Center) */}
            <div
              data-crucible
              className="relative flex h-64 w-64 items-center justify-center"
            >
              {/* Sigilo Rúnico SVG */}
              <svg
                aria-hidden="true"
                viewBox="0 0 400 400"
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              >
                <defs>
                  <filter
                    id={`${filterId}-forge-glow`}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Anel Externo */}
                <g
                  data-sigil-outer
                  fill="none"
                  stroke={sourceColor}
                  strokeWidth="1.2"
                  opacity="0.65"
                  filter={`url(#${filterId}-forge-glow)`}
                >
                  <circle cx={FCX} cy={FCY} r="190" strokeDasharray="4 8" />
                  <path d={FORGE_SIGIL.ticks} strokeWidth="1" />
                </g>

                {/* Anel Intermediário: Quadrados alquímicos */}
                <g
                  data-sigil-inner
                  fill="none"
                  stroke={sourceColor}
                  strokeWidth="1.3"
                  opacity="0.8"
                >
                  <circle cx={FCX} cy={FCY} r="158" strokeDasharray="30 10 5 10" />
                  <path d={FORGE_SIGIL.squareA} />
                  <path d={FORGE_SIGIL.squareB} />
                  <path d={FORGE_SIGIL.innerOcta} strokeWidth="0.8" opacity="0.6" />
                </g>

                {/* Runas rotativas */}
                <g
                  data-sigil-runes
                  fill="none"
                  stroke={sourceColor}
                  strokeWidth="1.4"
                  opacity="0.9"
                >
                  <path d={FORGE_SIGIL.runes} />
                </g>
              </svg>

              {/* Halo Luminoso do Cadinho */}
              <div
                data-crucible-halo
                aria-hidden="true"
                className="absolute h-32 w-32 rounded-full opacity-40 blur-2xl transition-colors duration-500"
                style={{ backgroundColor: sourceColor }}
              />

              {/* Núcleo de Plasma Molten da Forja */}
              <div
                data-crucible-core
                aria-hidden="true"
                className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-white/60 shadow-[0_0_35px_rgba(255,255,255,0.7)]"
                style={{
                  background: `radial-gradient(circle, #FFFFFF 20%, ${sourceColor} 65%, transparent 100%)`,
                }}
              >
                <span className="text-xl font-bold text-ink" aria-hidden="true">
                  ✦
                </span>
              </div>
            </div>

            {/* AS 4 (OU 5) CARTAS DO TRADE-UP CONVERGINDO */}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              {sourceSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  data-source-card
                  className="absolute flex w-28 sm:w-36 flex-col overflow-hidden rounded-lg border bg-ink/80 p-2 shadow-2xl backdrop-blur-sm sm:p-2.5"
                  style={{
                    transform: `translate3d(${slot.x}px, ${slot.y}px, 0) rotateZ(${slot.rotZ}deg)`,
                    borderColor: `${sourceColor}80`,
                    boxShadow: `0 0 25px ${sourceColor}30`,
                    willChange: "transform, opacity",
                  }}
                >
                  {/* Arte da Carta Fonte */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-panel">
                    {slot.image ? (
                      <Image
                        src={slot.image}
                        alt={slot.name}
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-caption text-mist">
                        sem arte
                      </div>
                    )}
                    <div
                      className="absolute inset-0 border"
                      style={{ borderColor: `${sourceColor}60` }}
                    />
                  </div>

                  {/* Nome e Raridade */}
                  <div className="mt-1.5 text-center">
                    <p className="truncate font-display text-[11px] font-bold text-snow">
                      {slot.name}
                    </p>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: sourceColor }}
                    >
                      {slot.rarity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtítulo dinâmico da fase */}
            <div className="pointer-events-none absolute -bottom-24 text-center">
              <p className="font-mono text-caption uppercase tracking-[0.2em] text-mist animate-pulse">
                {phase === "gathering"
                  ? "Convergindo Matéria Alquímica…"
                  : phase === "singularity"
                    ? "Fusão em Massa Crítica…"
                    : "Iniciando Transmutação…"}
              </p>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* FASE 3: A REVELAÇÃO DA CARTA FORJADA                           */}
        {/* =============================================================== */}
        {revealed && (
          <div
            data-forged-stage
            className="relative z-20 flex max-h-full max-w-full flex-col items-center px-4 py-6 text-center"
          >
            {/* Título de Sucesso Superior */}
            <div className="mb-4">
              <span className="inline-block rounded-full border border-ice/40 bg-ice/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-ice">
                ✦ Forja Concluída com Sucesso ✦
              </span>
              <h3
                className={`mt-2 font-display text-display-md tracking-wider sm:text-display-lg ${
                  targetRarity === "GALACTICA"
                    ? GALAXY_TEXT
                    : RARITY_TEXT[targetRarity] ?? "text-snow"
                }`}
                style={{
                  filter: `drop-shadow(0 0 16px ${targetColor}80)`,
                }}
              >
                {RARITY_LABEL[targetRarity] ?? targetRarity}
              </h3>
            </div>

            {/* Stage 3D da Carta Revelada */}
            <div
              data-forged-tilt
              className="relative aspect-[3/4] w-[min(72vw,290px)] max-w-full transition-transform duration-150 ease-out"
              style={{
                perspective: 1000,
                transform:
                  "rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))",
              }}
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const normX = (e.clientX - rect.left) / rect.width - 0.5;
                const normY = (e.clientY - rect.top) / rect.height - 0.5;
                applyTilt(normX, normY);
              }}
              onPointerLeave={() => applyTilt(0, 0)}
            >
              {/* Glow ao redor da carta */}
              <div
                aria-hidden="true"
                className="absolute inset-[-6%] rounded-2xl opacity-40 blur-2xl"
                style={{ backgroundColor: targetColor }}
              />

              {/* Elemento de Flip 3D */}
              <div
                data-forged-flip
                className="relative h-full w-full"
                style={{
                  transformStyle: "preserve-3d",
                  transform: "rotateY(0deg)",
                }}
              >
                {mode === "cards" && synthesizedPull ? (
                  <div className="relative h-full w-full overflow-hidden rounded-lg shadow-2xl">
                    <GachaCard
                      pull={synthesizedPull}
                      preview={false}
                      linkAnime={false}
                      showInfo={false}
                    />

                    {/* Sweep Brilho Holográfico */}
                    <div
                      data-forged-sweep
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      style={{
                        backgroundImage: SWEEP_GRADIENT,
                        mixBlendMode: "color-dodge",
                      }}
                    />
                  </div>
                ) : skinResult ? (
                  <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-lg border-2 bg-ink/90 p-4 shadow-2xl"
                    style={{ borderColor: targetColor }}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded bg-panel">
                      {safeImageSrc(skinResult.imageUrl) ? (
                        <Image
                          src={safeImageSrc(skinResult.imageUrl)!}
                          alt={skinResult.name}
                          fill
                          sizes="280px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-caption text-mist">
                          sem arte
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <p className="font-display text-body-md font-bold text-snow">
                        {skinResult.name}
                      </p>
                      <span
                        className="font-mono text-caption font-bold uppercase"
                        style={{ color: targetColor }}
                      >
                        {skinResult.rarity}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Detalhes e Atributos da Carta Forjada */}
            <div data-forged-details className="mt-4 max-w-md">
              <h4 className="font-display text-body-lg font-bold text-snow">
                {cardResult?.card.name ?? skinResult?.name ?? "Item Forjado"}
              </h4>

              {cardResult && (
                <div className="mt-2.5 flex flex-wrap justify-center gap-2 font-mono text-caption">
                  <span className="border border-hairline bg-panel px-2.5 py-1 text-mist">
                    Condição:{" "}
                    <strong className="text-snow">
                      {cardResult.conditionLabel ??
                        gachaConditionLabel(cardResult.condition)}
                    </strong>
                  </span>
                  <span className="border border-hairline bg-panel px-2.5 py-1 text-mist">
                    Foil: <strong className="text-snow">{cardResult.foil}</strong>
                  </span>
                  <span className="border border-hairline bg-panel px-2.5 py-1 text-mist">
                    Edição:{" "}
                    <strong className="text-snow">#{cardResult.edition}</strong>
                  </span>
                  <span className="border border-hairline bg-panel px-2.5 py-1 text-ice">
                    {cardResult.value.toLocaleString("pt-BR")} crystals
                  </span>
                </div>
              )}

              <p className="mt-3 text-caption text-mist">
                O item forjado foi adicionado permanentemente à sua conta.
              </p>

              {/* Botões de Ação */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onReset}
                  className="btn-ice min-h-11 px-6 text-caption font-bold tracking-wider"
                >
                  Fazer outro Trade-up
                </button>
                <Link
                  href={mode === "cards" ? "/gacha/cartas" : "/gacha/colecao"}
                  className="btn-ghost inline-flex min-h-11 items-center rounded border border-hairline bg-panel/70 px-5 text-caption text-snow hover:border-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
                >
                  {mode === "cards" ? "Ver na Coleção" : "Ver Cosméticos"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* ESTADO DE ERRO (CASO A REQUISIÇÃO FALHE)                        */}
        {/* =============================================================== */}
        {phase === "error" && (
          <div className="relative z-30 max-w-md rounded-lg border border-rose-500/40 bg-panel/90 p-6 text-center shadow-2xl backdrop-blur-md">
            <span className="text-3xl text-rose-400" aria-hidden="true">
              ⚠️
            </span>
            <h3 className="mt-3 font-display text-body-lg font-bold text-snow">
              Falha na Forja
            </h3>
            <p className="mt-2 text-body-sm text-rose-200">
              {error ?? "Ocorreu um erro ao processar o Trade-up. Suas cartas continuam intactas."}
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="btn-ice min-h-11 px-6 text-caption font-bold"
              >
                Voltar à Seleção
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
