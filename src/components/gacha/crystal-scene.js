/**
 * Plano causal do reveal, v2.
 *
 * Um relógio por propriedade: o loop do vídeo é dono do movimento interno do
 * cristal; aqui mora só a câmera, o tempo de cada resposta e a marcação de
 * raridade. Nada aqui anima a mesma coisa que o vídeo.
 *
 * Fundido preto: o WebM/MP4 não tem canal alpha (medido: `gbrp` e `yuv420p`,
 * canto `srgb(0,0,0)`). `mix-blend-screen` no próprio <video> dissolve o preto
 * no fundo `ink-deep` sem keying e sem artefato.
 */

const RARO = 4; // índice de LENDARIA em GACHA_TIERS

export const PLANO_GACHA = Object.freeze({
  // 01 Entrada: a câmera encontra um corpo que já se move.
  entradaY: -10,
  entradaEscala: 0.96,
  entradaCamera: 0.26,
  // 02 Dead zone: nada acontece no GSAP; a API decide quando seguir.
  pausaMinima: 0.12,
  // 03 Selo de raridade: o cristal muda de temperatura uma única vez.
  seloRaridade: 0.24,
  // 04 Retirada: o cristal se desintegra (uniform) enquanto a camada sai.
  retirada: 0.24,
  // Brilho que sobra no cristal depois da resposta única do beat 06.
  brilhoResidual: 0.12,
  // 05 Assentamento: placa subindo por atrito. Sem meia-volta.
  percursoCarta: 28,
  cartaEscala: 0.94,
  cartaTilt: -8,
  assentamento: 0.42,
  assentamentoRaro: 0.56,
  // 06 Resposta única: um reflexo, um pico.
  reflexo: 0.22,
  reflexoPico: 0.5,
  // 07 Leitura: só depois que o objeto parou.
  leitura: 0.2,
});

/** Raridade muda tempo e percurso, nunca quantidade de efeitos. */
export function duracaoDoAssentamento(indiceRaridade) {
  return indiceRaridade >= RARO
    ? PLANO_GACHA.assentamentoRaro
    : PLANO_GACHA.assentamento;
}

/**
 * Luz que o cristal assume quando a raridade é conhecida. Entra no shader,
 * não como filtro da camada: o brilho nasce no núcleo do sólido.
 * @param {number} indiceRaridade
 * @returns {[number, number, number]} RGB 0..1
 */
export function corDoSelo(indiceRaridade) {
  if (indiceRaridade >= 6) return [0.86, 0.62, 1.0]; // galáctica
  if (indiceRaridade >= 5) return [1.0, 0.45, 0.62]; // mítica
  if (indiceRaridade >= RARO) return [1.0, 0.78, 0.36]; // lendária
  if (indiceRaridade >= 3) return [0.55, 0.82, 1.0]; // épica
  if (indiceRaridade >= 1) return [0.4, 0.78, 0.95]; // incomum
  return [0.34, 0.62, 0.8]; // comum
}