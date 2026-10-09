"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { GachaCard, GACHA_TIERS } from "./GachaCard";
import { PLANO_GACHA, tipoDeEntrada } from "./crystal-scene";
import type { GachaPull } from "@/types";

type Fase = "invoking" | "waiting" | "revealing" | "settled";

type RollStageProps = {
  pull: GachaPull | null;
  reduceMotion: boolean;
  onClose: () => void;
  preview?: boolean;
};

function indiceDeRaridade(pull: GachaPull | null) {
  return pull
    ? GACHA_TIERS.indexOf(
        pull.card.rarity as (typeof GACHA_TIERS)[number],
      )
    : -1;
}

function tituloDoResultado(pull: GachaPull, preview: boolean) {
  const indice = indiceDeRaridade(pull);
  if (indice >= 6) return "GALÁCTICA!";
  if (indice >= 5) return "MÍTICA!";
  if (indice >= 4) return "LENDÁRIA!";
  if (indice === 3) return "ÉPICA!";
  return preview ? "Prévia revelada" : "Sua carta";
}

export function RollStage({
  pull,
  reduceMotion,
  onClose,
  preview = false,
}: RollStageProps) {
  const reduzirPeloSistema = usePrefersReducedMotion();
  const reduzir = reduceMotion || reduzirPeloSistema;

  const dialog = useRef<HTMLDialogElement>(null);
  // Timeline: único relógio do reveal. pullAtual: ponte da API para a pausa GSAP.
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const pullAtual = useRef<GachaPull | null>(pull);
  // transicaoAtiva impede duplo skip, não representa uma segunda fase.
  const transicaoAtiva = useRef(false);
  const [fase, setFase] = useState<Fase>("invoking");
  // Snapshot: esta abertura sempre revela a primeira resposta da API.
  // ponytail: teto = um pull por modal; reroll futuramente abre nova sessão.
  const [resultado, setResultado] = useState<GachaPull | null>(pull);
  const [puloPendente, setPuloPendente] = useState(false);
  const [focoAnterior] = useState<HTMLElement | null>(() =>
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement | null),
  );

  const pronto = Boolean(resultado && fase === "settled");
  const destaque = resultado?.card.rarity === "GALACTICA" ? "text-violet-400" : "text-ice";
  const bloqueado = fase === "invoking" || (puloPendente && !resultado);
  const titulo = pronto && resultado
    ? tituloDoResultado(resultado, preview)
    : puloPendente && !resultado
      ? "Aguardando carta…"
      : "Invocando sua carta…";

  useEffect(() => {
    if (pull && !resultado) setResultado(pull);
  }, [pull, resultado]);

  useEffect(() => {
    pullAtual.current = resultado;
  }, [resultado]);

  useEffect(() => {
    const elemento = dialog.current;
    if (!elemento) return;

    const overflowAnterior = document.body.style.overflow;
    if (!elemento.open) elemento.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      if (elemento.open) elemento.close();
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus();
    };
  }, [focoAnterior]);

  useGSAP(() => {
    if (reduzir) {
      timeline.current = null;
      return;
    }

    const plano = PLANO_GACHA;
    const retiradaEm = plano.invocacao + plano.pausaMinima;
    const cartaEm = retiradaEm + plano.retirada;
    const reflexoEm = cartaEm + plano.entrada;
    const leituraEm = reflexoEm + plano.reflexo;
    const finalEm = leituraEm + plano.leitura;
    const entradaAlta = () =>
      tipoDeEntrada(indiceDeRaridade(pullAtual.current)) === "ascensao";

    const tl = gsap.timeline({ paused: true });
    timeline.current = tl;

    tl.set("[data-cristal]", {
      y: -plano.percursoCristal,
      opacity: 1,
      willChange: "transform",
    }, 0)
      .set("[data-carta]", { opacity: 0, rotationY: 0, y: 0 }, 0)
      .set("[data-reflexo]", { opacity: 0 }, 0)
      .set("[data-resultado]", { opacity: 0 }, 0)
      .to("[data-cristal]", {
        y: 0,
        duration: plano.invocacao,
        ease: "expo.out",
      }, 0)
      .set("[data-cristal]", { clearProps: "willChange" }, plano.invocacao)
      .call(() => {
        if (!pullAtual.current) {
          setFase("waiting");
          tl.pause();
        } else {
          setFase("revealing");
        }
      }, [], retiradaEm)
      .set("[data-cristal]", { willChange: "opacity" }, retiradaEm)
      .to("[data-cristal]", {
        opacity: 0,
        duration: plano.retirada,
        ease: "power1.in",
      }, retiradaEm)
      .set("[data-cristal]", { clearProps: "willChange" }, cartaEm)
      .set("[data-carta]", { willChange: "transform, opacity" }, cartaEm)
      .fromTo("[data-carta]", {
        rotationY: () => (entradaAlta() ? 0 : 180),
        y: () => (entradaAlta() ? plano.percursoCartaAlta : 0),
        opacity: () => (entradaAlta() ? 0 : 1),
      }, {
        rotationY: 0,
        y: 0,
        opacity: 1,
        duration: plano.entrada,
        ease: "power3.out",
        immediateRender: false,
      }, cartaEm)
      .set("[data-carta]", { clearProps: "willChange" }, reflexoEm)
      .set("[data-reflexo]", { willChange: "opacity" }, reflexoEm)
      .fromTo("[data-reflexo]", { opacity: 0 }, {
        opacity: 0.68,
        duration: plano.reflexo / 2,
        ease: "power1.out",
        immediateRender: false,
      }, reflexoEm)
      .to("[data-reflexo]", {
        opacity: 0,
        duration: plano.reflexo / 2,
        ease: "power1.in",
      }, reflexoEm + plano.reflexo / 2)
      .set("[data-reflexo]", { clearProps: "willChange" }, leituraEm)
      .call(() => setFase("settled"), [], leituraEm)
      .set("[data-resultado]", { willChange: "opacity" }, leituraEm)
      .to("[data-resultado]", {
        opacity: 1,
        duration: plano.leitura,
        ease: "power2.out",
      }, leituraEm)
      .set("[data-resultado]", { clearProps: "willChange" }, finalEm);

    tl.play();
    return () => {
      timeline.current = null;
    };
  }, { scope: dialog, dependencies: [reduzir], revertOnUpdate: true });

  function concluirComDissolucao() {
    if (!pullAtual.current || transicaoAtiva.current) return;
    const raiz = dialog.current;
    const conteudo = raiz?.querySelector<HTMLElement>("[data-conteudo]");
    if (!raiz || !conteudo) return;

    transicaoAtiva.current = true;
    timeline.current?.pause();
    gsap.killTweensOf(conteudo);
    gsap.set(conteudo, { willChange: "opacity" });
    gsap.to(conteudo, {
      opacity: 0,
      duration: 0.13,
      ease: "power1.in",
      onComplete: () => {
        if (!dialog.current) return;
        const cristal = raiz.querySelector("[data-cristal]");
        const carta = raiz.querySelector("[data-carta]");
        const reflexo = raiz.querySelector("[data-reflexo]");
        const resultado = raiz.querySelector("[data-resultado]");
        if (cristal) gsap.set(cristal, { opacity: 0, y: 0 });
        if (carta) gsap.set(carta, { opacity: 1, rotationY: 0, y: 0 });
        if (reflexo) gsap.set(reflexo, { opacity: 0 });
        if (resultado) gsap.set(resultado, { opacity: 1 });
        setFase("settled");
        gsap.to(conteudo, {
          opacity: 1,
          duration: 0.14,
          ease: "power2.out",
          onComplete: () => {
            gsap.set(conteudo, { clearProps: "willChange" });
            transicaoAtiva.current = false;
          },
        });
      },
    });
  }

  useEffect(() => {
    if (!resultado || fase === "settled") return;
    if (reduzir) {
      setFase("settled");
      return;
    }
    if (puloPendente) {
      concluirComDissolucao();
      return;
    }
    const tl = timeline.current;
    if (fase === "waiting" && tl?.paused() && !transicaoAtiva.current) {
      setFase("revealing");
      tl.play();
    }
  // concluirComDissolucao usa apenas refs e o pull atual; não é um sinal reativo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado, fase, reduzir, puloPendente]);

  useEffect(() => {
    if (!reduzir || !pronto) return;
    const conteudo = dialog.current?.querySelector("[data-conteudo]");
    if (!conteudo) return;
    gsap.fromTo(conteudo, { opacity: 0 }, {
      opacity: 1,
      duration: 0.18,
      ease: "power1.out",
    });
  }, [reduzir, pronto]);

  useEffect(() => () => {
    const conteudo = dialog.current?.querySelector("[data-conteudo]");
    if (conteudo) gsap.killTweensOf(conteudo);
  }, []);

  function pularOuFechar() {
    if (pronto) {
      onClose();
      return;
    }
    if (bloqueado || transicaoAtiva.current) return;
    if (!pullAtual.current) {
      // A API ainda não forneceu a recompensa: nenhum frame pode inventá-la.
      timeline.current?.pause();
      setFase("waiting");
      setPuloPendente(true);
      return;
    }
    concluirComDissolucao();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="roll-title"
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto border-0 bg-ink-deep p-4 text-snow backdrop:bg-ink-deep"
      onCancel={(evento) => {
        evento.preventDefault();
        pularOuFechar();
      }}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget && pronto) onClose();
      }}
    >
      <div className="flex min-h-full flex-col items-center justify-center gap-5">
        <div data-conteudo className="flex w-full flex-col items-center gap-5">
          <h2
            id="roll-title"
            aria-live="polite"
            className="text-center font-display text-display-lg"
          >
            {titulo}
          </h2>

          <div
            data-palco
            className={`relative flex min-h-80 w-56 max-w-[72vw] items-center justify-center ${destaque}`}
            style={reduzir ? undefined : { perspective: 900 }}
          >
            {!pronto && (
              <div
                data-cristal
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <Image
                  src="/gacha/crystal.webp"
                  alt=""
                  width={360}
                  height={360}
                  draggable={false}
                  className="h-auto w-[min(85vw,20rem)] max-w-none object-contain"
                />
              </div>
            )}

            <div
              data-carta
              className="relative w-full"
              style={reduzir
                ? { opacity: resultado ? 1 : 0 }
                : { opacity: 0, transformStyle: "preserve-3d" }}
            >
              {!reduzir && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex min-h-80 items-center justify-center border border-ice/40 bg-ink-deep"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <span className="font-display text-3xl tracking-[0.18em] text-ice">
                    ANIMESICE
                  </span>
                </div>
              )}
              <div
                inert={!pronto}
                aria-hidden={!pronto}
                className={reduzir
                  ? "[&_*]:!animate-none [&_*]:!transition-none [&_*]:!transform-none"
                  : "[&_*]:!animate-none [&_*]:!transition-none"}
                style={reduzir ? undefined : { backfaceVisibility: "hidden" }}
              >
                {resultado && <GachaCard pull={resultado} preview={preview} />}
              </div>
              {!reduzir && (
                <div
                  data-reflexo
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0"
                  style={{
                    background: "linear-gradient(115deg, transparent 39%, rgba(212,245,255,.36) 49%, transparent 59%)",
                  }}
                />
              )}
            </div>
          </div>

          <div
            data-resultado
            aria-hidden={!pronto}
            className="text-center"
            style={reduzir ? undefined : { opacity: 0 }}
          >
            <p className={`font-mono text-sm tracking-[0.16em] ${destaque}`}>
              {resultado?.card.rarity}
            </p>
            {resultado && <p className="font-mono text-mist">{resultado.value} pts</p>}
          </div>
        </div>

        <button
          autoFocus
          type="button"
          onClick={pularOuFechar}
          aria-disabled={bloqueado}
          className={`min-h-11 px-6 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
            pronto ? "btn-ice" : "text-mist"
          }`}
        >
          {pronto ? "Continuar" : puloPendente ? "Aguardando carta…" : "Pular"}
        </button>
      </div>
    </dialog>
  );
}
