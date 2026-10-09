/**
 * Plano causal do reveal. Este módulo não possui renderer.
 * Duração exponencial estimada até 5% da velocidade inicial.
 * @param {number} percurso Comprimento percorrido em px ou graus.
 * @param {number} velocidadeInicial Velocidade inicial nas mesmas unidades/s.
 */
function tempoDeAssentamento(percurso, velocidadeInicial) {
  return Number((-Math.log(0.05) * percurso / velocidadeInicial).toFixed(3));
}

export const PLANO_GACHA = Object.freeze({
  percursoCristal: 22,
  percursoCartaAlta: 28,
  invocacao: tempoDeAssentamento(22, 260),
  pausaMinima: 0.12,
  retirada: 0.12,
  // Mesma janela temporal, mecanismos diferentes: rotação ou translação.
  entrada: Math.max(
    tempoDeAssentamento(180, 1420),
    tempoDeAssentamento(28, 220),
  ),
  reflexo: 0.16,
  leitura: 0.20,
});

/** @param {number} indiceRaridade */
export function tipoDeEntrada(indiceRaridade) {
  return indiceRaridade >= 4 ? "ascensao" : "giro";
}

/**
 * Compatibilidade provisória com chamadas antigas de CrystalCanvas.
 * Um único recurso estático, sem THREE/PIXI/WebGL, ticker ou loop.
 * @param {HTMLElement} threeHost
 * @param {HTMLElement} _pixiHost
 */
export function mountCrystalScene(threeHost, _pixiHost) {
  const imagem = document.createElement("img");
  imagem.src = "/gacha/crystal.webp";
  imagem.alt = "";
  imagem.decoding = "async";
  imagem.draggable = false;
  imagem.setAttribute("aria-hidden", "true");
  imagem.style.width = "100%";
  imagem.style.height = "100%";
  imagem.style.objectFit = "contain";
  imagem.style.pointerEvents = "none";
  threeHost.appendChild(imagem);

  // ponytail: teto visual = WebP estático. Upgrade: refração só após
  // telemetria provar ganho sobre imagens em celulares de gama baixa.
  return () => imagem.remove();
}
