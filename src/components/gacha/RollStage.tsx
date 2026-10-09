"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { GachaCard, GACHA_TIERS } from "./GachaCard";
import {
  PLANO_GACHA,
  corDoSelo,
  duracaoDoAssentamento,
} from "./crystal-scene";
import { CrystalLive, type CristalControle } from "@/components/animesice/CrystalLive";
import type { GachaPull } from "@/types";

type Fase = "invoking" | "waiting" | "revealing" | "settled";

type RollStageProps = {
  pull: GachaPull | null;
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
  if (indice >= 3) return "ÉPICA!";
  return preview ? "Prévia revelada" : "Sua carta";
}

export function RollStage({ pull, onClose, preview = false }: RollStageProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Objeto plano que o GSAP anima e o RAF do shader lê. Duas camadas, um relógio.
  const cristal = useRef<CristalControle>({ selo: 0, dissolver: 0 });
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
    const plano = PLANO_GACHA;
    const zonaMorta = plano.entradaCamera + plano.pausaMinima;
    const emSelo = zonaMorta;
    const emRetirada = emSelo + plano.seloRaridade;
    const emCarta = emRetirada + plano.retirada;

    const tl = gsap.timeline({ paused: true });
    timeline.current = tl;

    // 01 Entrada — a câmera encontra o cristal, que já gira sozinho no vídeo.
    tl.set("[data-cristal]", {
      y: plano.entradaY,
      scale: plano.entradaEscala,
      opacity: 1,
      willChange: "transform",
    }, 0)
      .to("[data-cristal]", {
        y: 0,
        scale: 1,
        duration: plano.entradaCamera,
        ease: "power3.out",
      }, 0)
      .set("[data-cristal]", { clearProps: "willChange" }, plano.entradaCamera)
      // 02 Dead zone — nada se move sem nova causa. A API decide.
      .call(() => {
        if (!pullAtual.current) {
          setFase("waiting");
          tl.pause();
        } else {
          setFase("revealing");
        }
      }, [], zonaMorta)
      // 03 Selo de raridade — o objeto em movimento anuncia antes do prêmio.
      .to(cristal.current, {
        selo: 1,
        duration: plano.seloRaridade,
        ease: "power1.inOut",
      }, emSelo)
      // 04 Retirada — o cristal se fragmenta; a camada só sai depois.
      .to(cristal.current, {
        dissolver: 1,
        duration: plano.retirada,
        ease: "power2.in",
      }, emRetirada)
      .to("[data-cristal]", {
        scale: 0.94,
        opacity: 0,
        duration: plano.retirada * 0.5,
        ease: "power2.in",
      }, emRetirada + plano.retirada * 0.5)
      .set("[data-cristal]", { clearProps: "willChange" }, emCarta)
      // 05 Assentamento — placa subindo por atrito. Sem meia-volta.
      .set("[data-carta]", { willChange: "transform, opacity" }, emCarta)
      .fromTo("[data-carta]", {
        y: plano.percursoCarta,
        scale: plano.cartaEscala,
        rotationX: plano.cartaTilt,
        opacity: 0,
      }, {
        y: 0,
        scale: 1,
        rotationX: 0,
        opacity: 1,
        duration: () => duracaoDoAssentamento(indiceDeRaridade(pullAtual.current)),
        ease: "power3.out",
        immediateRender: false,
      }, emCarta)
      // 06 Resposta única — um reflexo, um pico, sem mover a carta.
      .set("[data-reflexo]", { willChange: "opacity" }, "<0.08")
      .fromTo("[data-reflexo]", { opacity: 0 }, {
        opacity: plano.reflexoPico,
        duration: plano.reflexo / 2,
        ease: "power1.out",
        immediateRender: false,
      }, "<")
      .to("[data-reflexo]", {
        opacity: 0,
        duration: plano.reflexo / 2,
        ease: "power1.in",
      }, "<")
      // O cristal mantém um brilho residual enquanto a carta estática lê.
      .to(cristal.current, {
        selo: plano.brilhoResidual,
        duration: plano.reflexo,
        ease: "power2.out",
      }, "<")
      .set("[data-reflexo]", { clearProps: "willChange" })
      // 07 Leitura — só depois que o objeto parou.
      .call(() => setFase("settled"))
      .set("[data-resultado]", { willChange: "opacity" }, "<0.05")
      .to("[data-resultado]", {
        opacity: 1,
        duration: plano.leitura,
        ease: "power2.out",
      }, "<")
      .set("[data-resultado]", { clearProps: "willChange" });

    tl.play();
    return () => {
      timeline.current = null;
    };
  }, { scope: dialog, revertOnUpdate: true });

  function concluirComDissolucao() {
    if (!pullAtual.current || transicaoAtiva.current) return;
    const raiz = dialog.current;
    const conteudo = raiz?.querySelector<HTMLElement>("[data-conteudo]");
    if (!raiz || !conteudo) return;

    transicaoAtiva.current = true;
    timeline.current?.pause();
    gsap.killTweensOf(conteudo);
    gsap.killTweensOf(cristal.current);
    gsap.set(conteudo, { willChange: "opacity" });
    gsap.to(conteudo, {
      opacity: 0,
      duration: 0.13,
      ease: "power1.in",
      onComplete: () => {
        if (!dialog.current) return;
        const camada = raiz.querySelector("[data-cristal]");
        const carta = raiz.querySelector("[data-carta]");
        const reflexo = raiz.querySelector("[data-reflexo]");
        const leitura = raiz.querySelector("[data-resultado]");
        // Sem pull não existe estado final: nada de inventar prêmio. O cristal
        // fica dissolvido e o modal continua esperando a API.
        gsap.set(cristal.current, { selo: 0, dissolver: 1 });
        if (camada) gsap.set(camada, { opacity: 0, y: 0, scale: 1 });
        if (carta) gsap.set(carta, { opacity: 1, y: 0, scale: 1, rotationX: 0 });
        if (reflexo) gsap.set(reflexo, { opacity: 0 });
        if (leitura) gsap.set(leitura, { opacity: 1 });
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
  }, [resultado, fase, puloPendente]);

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
      gsap.killTweensOf(cristal.current);
      gsap.set(cristal.current, { selo: 0, dissolver: 1 });
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
            style={{ perspective: 900 }}
          >
            {!pronto && (
              <div
                data-cristal
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <CrystalLive
                  controle={cristal}
                  cor={corDoSelo(indiceDeRaridade(resultado))}
                  className="h-auto w-[min(85vw,22rem)] object-contain"
                />
              </div>
            )}

            <div
              data-carta
              className="relative w-full"
              style={{ opacity: 0, transformStyle: "preserve-3d" }}
            >
              <div
                data-reflexo
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 39%, rgba(212,245,255,.5) 49%, transparent 59%)",
                }}
              />
              <div
                inert={!pronto}
                aria-hidden={!pronto}
                className="relative"
                style={{ backfaceVisibility: "hidden" }}
              >
                {resultado && <GachaCard pull={resultado} preview={preview} />}
              </div>
            </div>
          </div>

          <div
            data-resultado
            aria-hidden={!pronto}
            className="text-center"
            style={{ opacity: 0 }}
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