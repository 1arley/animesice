# Spec da animação de invocação (gacha roll)

Documento derivado do código. Serve como referência para reimplementar a animação em
outra ferramenta (anime.js, Remotion, CSS puro) sem ler as ~460 linhas de timeline.

## Fontes

| Arquivo | Papel |
|---|---|
| `src/components/gacha/RollStage.tsx` | timeline, partículas, áudio, tilt |
| `src/components/gacha/GachaCard.tsx` | moldura, badges, foils, condição |
| `src/lib/roll-anim-config.ts` | constantes de tempo + parser |
| `src/lib/roll-tease.ts` | sorteio dos tiers do tease |
| `scripts/check-roll-tier-motifs.mjs` | trava a escalada das faixas e a sincronia do rótulo |
| `src/lib/gacha-rarity-colors.ts` | paleta por raridade |
| `src/components/core/CountUp.tsx` | contador de pontos (spring do `motion`) |

Engine atual: **anime.js 4.5** (`animejs`). O componente foi portado de GSAP 3.15
em 2026-10-15; a tabela abaixo é o mapa da migração.

| GSAP | anime.js | Nota |
|---|---|---|
| `gsap.set(el, p)` | `utils.set(el, p)` | |
| `gsap.to(el, {…})` | `animate(el, {…})` | |
| `gsap.timeline()` | `createTimeline()` | |
| `tl.to(el, p, at)` | `tl.add(el, p, at)` | |
| `tl.fromTo(el, f, t, at)` | `tl.add(el, ft(f, t), at)` | helper `ft` virou `[de, para]` |
| `tl.call(fn, [], at)` | `tl.call(fn, at)` | sem o array de params |
| `tl.add(childTl, at)` | `tl.sync(childTl, at)` | **`add` aceita a posição mas não ancora** |
| `tl.set` / `tl.kill` | `tl.set` / `tl.cancel` | |
| `{ repeat: -1 }` | `{ loop: true }` | `loop: 2` = `repeat: 2` + 3 passagens |
| `{ yoyo: true }` | `{ alternate: true }` | |
| `{ timeScale: n }` | `.speed = n` | setter, **não** é propriedade animável |
| `{ stagger: n }` | `{ delay: stagger(n) }` | número cru não faz nada, sem erro |
| `gsap.ticker.add` | `requestAnimationFrame` próprio | anime não expõe ticker de callback |
| `transformOrigin` (param) | `style.transformOrigin` | só existe no adapter do three |
| `power1.out` … `power3.inOut` | `eases.outQuad` … `eases.inOutQuart` | mapa `EASE` |
| `back.out(s)` | `backOut(s)` local | fórmula invertida, ver abaixo |

**`back.out` não tem par direto.** O `eases.outBack` do anime é fixo em 1.70158 e
o reveal usa três overshoots. A fórmula `t*t*((s+1)*t - s)` é a de `back.IN` —
aplicada direto ela dá **negativo** no meio (−0,0875 com s=1.7) e nunca estoura.
A `out` é a `in` invertida: `1 - in(1 - t)`, cujo pico com s=1.7 vai a 1.0998 em
t≈0.58. O erro compila e roda; só não faz o que o nome promete.

**`transform-origin` do tilt saiu do CSS.** O anime reescreve a propriedade
`transform` inteira, então um `transform: rotateX(var(--tilt-x))…` vindo do
stylesheet seria apagado. `applyTilt` passou a escrever o transform inline.

---

## 1. Retrato geral

- **Container:** `<dialog>` modal, `100dvh`, fundo `ink-deep/95`.
- **Palco:** elemento 3:4, largura `min(70vw, 420px)`, `perspective: 1000px`.
- **Carta:** contentor `transform-style: preserve-3d` com frente (cristal) e verso
  (carta real, `rotateY(180deg)`), ambos `backface-visibility: hidden`.
- **Duração total:** ~3,6 s (COMUM) a ~5,5 s (MITICA/GALACTICA). Ver §4.
- **Salto da API:** a timeline toca sozinha até `invocationEnd` e **pausa**. O `GachaPull`
  chega depois (append em `invocationEnd`); se já tiver chegou, segue direto. É por isso que
  `waiting` existe como fase separada de `tease`.

---

## 2. Fases

`press → invocation → tease → title → impact → reveal → showcase`
(`waiting` substitui `tease` enquanto o resultado não chegou).

| Fase | Entra em | O que faz |
|---|---|---|
| `press` | 0 | vinheta e palco entram |
| `invocation` | 0,15 s | carga de áudio, órbitas aceleram, cristal gira |
| `tease` | `invocationEnd` | aura troca de cor; pausa se o pull não chegou |
| `title` | `teaseDur` | nome da raridade (só LENDÁRIA+) |
| `impact` | `impactAt` | flash, anéis, partículas explodem, shake |
| `reveal` | `revealAt` | carta vira, brilho varre, badges entram |
| `showcase` | `continueAt` | flutuação + tilt liberated, botão habilitado |

---

## 3. Paleta e tabelas por raridade

`GACHA_RARITY_COLORS` (usada como `currentColor` do palco, cor das auras e do tint):

| Raridade | Cor | Índice |
|---|---|---|
| COMUM | `#38E8DA` | 0 |
| INCOMUM | `#34D399` | 1 |
| RARA | `#38BDF8` | 2 |
| EPICA | `#A78BFA` | 3 |
| LENDARIA | `#FCD34D` | 4 |
| MITICA | `#FB7185` | 5 |
| GALACTICA | `#C084FC` | 6 |

Tabelas de duração e intensidade (todas em segundos / px / opacidade):

| Raridade | `TEASE_DURATION` | `TIER_PARTICLES` | `TIER_FLASH` | `TIER_TREMBLE` | `TIER_SHAKE` | `TIER_HOLO` | `TIER_HANG` |
|---|---|---|---|---|---|---|---|
| COMUM | 0,60 | 20 | 0,45 | 0 | 0 | 0 | 0 |
| INCOMUM | 0,72 | 34 | 0,50 | 0 | 0 | 0 | 0 |
| RARA | 0,90 | 52 | 0,60 | 1 | 3 | 0,22 | 0 |
| EPICA | 1,15 | 80 | 0,80 | 2 | 5 | 0,42 | 0 |
| LENDARIA | 1,50 | 120 | 1,00 | 3 | 8 | 0,55 | 0,18 |
| MITICA | 2,00 | 165 | 1,00 | 4 | 11 | 0,64 | 0,28 |
| GALACTICA | 2,35 | 220 | 1,00 | 5 | 14 | 0,75 | 0,42 |

**Derivação dos timings** (tudo relativo a `invocationEnd`, exceto onde indicado):

```
impactDur      = compact ? 0.18 : min(0.32, max(0.2, crystalOutDuration))   → 0.25
revealAt       = impactAt + impactDur
flipDur        = min(1, max(compact ? 0.35 : 0.4, flipDuration))            → 0.42
cardRevealedAt = revealAt + flipDur
cardArtReadyAt = cardRevealedAt + 0.16
cardDetailsAt  = cardArtReadyAt  + 0.24
lock           = max(0.3, teaseDur - 0.35)        ← janela da troca de cor
waves          = compact ? 1 : índice ≥ 4 ? 3 : índice ≥ 2 ? 2 : 1
```

Absolutos com `invocationEnd = 1.25` (config padrão, carta nova):

| Raridade | `teaseDur` | `impactAt` | `revealAt` | `cardRevealedAt` | `cardDetailsAt` | total |
|---|---|---|---|---|---|---|
| COMUM | 0,60 | 0,60 | 0,85 | 1,27 | 1,67 | ~3,63 s |
| INCOMUM | 0,72 | 0,72 | 0,97 | 1,39 | 1,79 | ~3,75 s |
| RARA | 0,90 | 0,90 | 1,15 | 1,57 | 1,97 | ~3,93 s |
| EPICA | 1,15 | 1,15 | 1,40 | 1,82 | 2,22 | ~4,18 s |
| LENDARIA | 1,50 | 2,15 | 2,40 | 2,82 | 3,22 | ~5,18 s |
| MITICA | 1,80 | 2,45 | 2,70 | 3,12 | 3,52 | ~5,48 s |
| GALACTICA | 1,80 | 2,45 | 2,70 | 3,12 | 3,52 | ~5,48 s |

`LENDARIA` e acima somam `titleHold = 0.65` antes do `impactAt`.
Carta repetida (`compact`): total ~3,3 s, sem shake, sem tremor, 1 onda só.

Com as tabelas novas acima, a duração total ficou: COMUM ~3,63 s, INCOMUM ~3,75 s,
RARA ~3,93 s, EPICA ~4,18 s, LENDARIA ~5,18 s, MITICA ~5,48 s, GALACTICA ~5,81 s
(o afterglow de GALACTICA é o que empurra a cauda).

### Motivos das três faixas acima de LENDARIA

Antes, MITICA e GALACTICA eram quase idênticas: mesmo tease, mesmo tremor, mesmo
shake, mesmo número de ondas. Só as partículas e o holo diferiam, e pouco. Agora
cada uma tem uma assinatura própria — escalada em quatro eixos, não só em volume.

| | LENDARIA (luz) | MITICA (fratura) | GALACTICA (nebulosa) |
|---|---|---|---|
| Ondas | 3 anéis | 3 anéis | 2 anéis + 1 afterglow |
| Afterglow | — | — | 3.º anel em `impactAt+0.34`, escala 4,2, duração 1,4× |
| Flash | 1 pico | 1 pico | 1 pico + 2.º clarão (0,5) em `+0.18` |
| Lasca radial | — | 14 raios em `data-cracks` | idem |
| Shake | 6 toques | 6 toques + 2 rajadas | 6 toques + 3 rajadas |
| Hang | 0,18 s | 0,28 s | 0,42 s |
| Nebulosa | — | — | `data-nebula`, conic + blur 60px, `screen` |

- **Rajada de shake**: fração de `TIER_SHAKE` aplicada como um segundo tween que
  volta a zero em 0,16 s, espaçado 0,07 s. MITICA `[0.36, -0.24]`,
  GALACTICA `[0.44, -0.3, 0.17]`.
- **Hang**: as órbitas caem de `SPIN_TOP` (2.6) até `SPIN_HANG` (0.45) com
  `cubicIn` e voltam a 1x no impacto. Começa em `impactAt − TIER_HANG`, sempre
  depois de `lock` — se começasse antes, roubaria a entrega da cor real.
- **`effectsEnd`** foi estendido para cobrir afterglow, rajadas e lascas; senão o
  canvas e os loops eram liberados com a animação ainda rodando.

**Configuração base** (`DEFAULT_ROLL_ANIM_CONFIG`): `enterDuration 0.15`,
`crystalSpinAt 0.2`, `crystalSpinDuration 0.9`, `revealAt 1.2`, `teaseMode "random"`,
`maxDrop 2`, `crystalOutDuration 0.25`, `ringSlots 3`, `ringDuration 0.55`,
`ringStagger 0.12`, `particleSlots 24`, `particleDuration 0.55`,
`particleReach {x:180, y:230}`, `effectsGap 0.18`, `flipDuration 0.42`,
`sweepDuration 0.6`, `badgeDuration 0.3`.

Com a config padrão: `invocationEnd = max(1.1, revealAt 1.2, spinEnd 1.1 + 0.15) = 1.25 s`
(1,10 s se a carta for repetida).

---

## 4. Beats absolutos

### Fase press + invocation (relógio absoluto, em segundos)

| t | Alvo | Mudança | Dur | Easing |
|---|---|---|---|---|
| 0 | vinheta | opacity 0 → 0,72 | 0,15 | `power1.out` |
| 0 | frame | scale 0,985 → 1 | 0,30 | `power3.out` |
| 0 | palco | scale 0,94 → 1, opacity 0 → 1 | 0,23 | `power3.out` |
| 0,15 | — | fase → `invocation`, áudio `charge(1.2s)` | | |
| 0,15 | órbitas ×3 | `timeScale` → 2,6 | 1,10 | `power2.in` |
| 0,15 | pulso do glow | `play` + `timeScale` → 1,25 | 1,25 | `none` |
| 0,20 | cristal | rotation 720°, scale 0,88 | 0,90 | `power2.inOut` |
| 0,20 | rótulo | letterSpacing 0,02 → 0,16 em | `(invocationEnd − 0,20) / 3` ×3 (yoyo) | `inOutSine` |
| 1,25 | — | fase → `tease`, ou `waiting` + pausa | | |

> **Sincronia do rótulo:** a duração do passo é `(invocationEnd − 0,20) / 3`, com
> piso de 0,12 s, e as três passagens fecham exatamente em `invocationEnd`. Antes
> a duração era fixa (0,6 × 3) e o rótulo estourava até 2,00 s — continuava
> respirando dentro da janela de tensão e depois congelava no meio durante ~1,7 s
> no tease das raridades altas. Trava isso `scripts/check-roll-tier-motifs.mjs`.

### Janela de tease (relativa a `invocationEnd`)

Troca de cor por cross-fade, `fade` em segundos:

```
sai aura atual   opacity → 0        dur = fade
entra aura nova   opacity → peak    dur = fade   sine.inOut
palco + tint      color → cor do tier          sine.inOut
áudio             tick(index)
```

- `compact`: uma vez só, `at = 0`, fade 0,15, peak 0,9.
- `teaseMode: "random"` (**padrão**): paradas em `0`, `0,36`, `0,821`, … com passo
  ×1,28 até `lock − 0,2`. Cada parada sorteia um tier (`fade 0,16`, `peak 0,8`), depois
  trava na raridade real em `at = lock` (fade 0,2, peak 1,0).
- `teaseMode: "climb"`: escada de `COMUM` até a raridade real, sem descer, intervalos com
  peso geométrico ×1,34 (primeiro degrau curto, topo longo). `peak` cresce por degrau:
  `0,7 + 0,3 × (i / último)`.
- `teaseMode: "ordered"`: determinístico, passo de 2, fora do fluxo.

Paradas efetivas com a config padrão: COMUM/RARA 1+lock, EPICA 2+lock,
LENDÁRIA+ 3+lock. **MITICA e GALACTICA têm as mesmas 4 paradas que LENDARIA** apesar do
tease 0,3 s mais longo — o passo de 1,28 satura antes de `lock`.

Concurrentes na janela, só se `índice ≥ 3` (EPICA+):
- `tint` opacity 0 → 0,55, dur `lock`, `power1.in`
- `palco` scale 1 → 1,05, dur `impactAt`, `power1.inOut`

Tremor (RARA+, não compact): amplitude `1 + (TIER_TREMBLE − 1) × p`, `p` 0→1 em
`impactAt` com `power2.in`; posição aleatória ±amp em x e y, zerada em `impactAt`.
É ruído puro por frame — em reimplementação com engine determinístico, usar PRNG com seed.

### Impacto

| t (rel.) | Alvo | Efeito |
|---|---|---|
| 0 | — | mata os loops de pre-impacto, `particleMode = burst`, `sfx.impact`, vibra (EPICA+: 35 ms; LENDÁRIA+: `[45,25,70]`) |
| 0 | órbita SVG | opacity → 0, 0,25 s, `power1.out` |
| 0 | glow | opacity → 0,3, scale 1,05, 0,4 s, `power2.out` |
| 0 | palco (EPICA+) | scale → 1, 0,35 s, `power3.out` |
| +0,05 | auras | opacity → 0, scale 1,5, 0,4 s, `power2.out` |
| 0 | cristal | scale 1,9, opacity → 0, 0,25 s, `power2.out` |
| 0 | flash | opacity → `TIER_FLASH` em 0,05 s, depois → 0 em 0,07 s, `power1.out` |
| +0,10 | tint (EPICA+) | opacity → 1 (0,1 s), depois → 0,35 (0,4 s) |
| 0 + i×0,12 | anéis | scale 0,15 → 3,1, opacity 0,85 → 0, 0,55 s, `power2.out` |
| 0 | raios (EPICA+) | opacity → 0,65/0,95, rot −10 → 0, scale 0,55 → 1, 0,25 s; depois rot 14, scale 1,3, opacity 0, 0,55 s |
| 0 + i×0,045 | frame | shake: `[1, −1, 0,7, −0,6, 0,3, 0] × TIER_SHAKE` em x, `y = −0,7 × x`, 0,045 s cada, `none` |

### Título (LENDÁRIA+, não compact) — em `teaseDur`

- Rótulo: scale 1,6 → 1, opacity 0 → 1, 0,34 s, `back.out(1.7)`.
- Some com opacity 0, scale 1,12, 0,16 s, `power1.in` em `impactAt − 0,16`.
- God rays: loop `rotation 360° / 26 s` (pausado até aqui); opacity 0 → 0,9 em 0,6 s
  (`power2.out`), → 0 em 0,4 s (`power1.inOut`) em `revealAt`.
- God rays só renderizam para `índice ≥ 4`. Rays radiais só para `índice ≥ 3`.

### Revelação

| t (rel.) | Alvo | Efeito |
|---|---|---|
| `revealAt` | carta | `rotationY` 0 → 180, 0,42 s, `power2.inOut` |
| `revealAt` | carta | scale → 1,1 (0,168 s, `power2.out`) → 1 (0,252 s, `power2.inOut`) |
| `revealAt` | — | `sfx.chime(power)` |
| `cardRevealedAt` | arte | opacity 0 → 1, 0,16 s, `power1.out` |
| `cardArtReadyAt` | — | `revealed = true` (destrava o tilt e o holo) |
| `cardArtReadyAt` | varredura | opacity 1, `xPercent` −150 → 150, 0,6 s, `power1.inOut`, depois opacity 0 |
| `cardDetailsAt` | bloco de texto | opacity 0 → 1, 0,2 s, `power1.out` |
| `cardDetailsAt` | rótulo de raridade | scale 2 → 1, opacity 0 → 1, 0,3 s, `back.out(2.4)` |
| `cardDetailsAt` + 0,08 | letras do nome | opacity 0 → 1, y 14 → 0, 0,28 s, stagger `min(0,03, 0,55 / n)`, `power2.out` |
| `cardDetailsAt` + 0,26 | tag nova/repetida | scale 0,4 → 1, y −6 → 0, opacity 0 → 1, 0,45 s, `back.out(2.6)` |
| `continueAt` | botão | opacity 0,35 → 1, scale 0,96 → 1, 0,4 s, `power2.out` |
| `effectsEnd` | — | limpa partículas, mata loops, libera o palco |

O contador de pontos (`CountUp`) não faz parte da timeline: entra por `useInView` +
`startWhen={revealed}` com spring do `motion` (`duration` 1,6 s, damping
`20 + 40/duration`, stiffness `100/duration`).

---

## 5. Partículas (canvas 2D, fora da timeline)

Loop próprio de rAF/GSAP-ticker, alimentado por `clock()` do mesmo `t0` da timeline.

**Distribuição** — FNV-1a do `pull.id`, `count` partículas:

```
count = clamp(round(TIER_PARTICLES[rarity] × (particleSlots / 24)), 12, mobile ? 120 : 180)
angle    = (i / count) × 2π + unit × 0,24
distance = 90 + unit × 300
size     = 1 + unit × 2,4
delay    = unit × 0,32
```

**Modo `gather`** (invocação → impacto), no máximo 90 partículas desktop / 60 mobile:

```
p      = clamp01(now / invocationEnd − delay)
radius = distance × (1 − p²) + orbitMin      // orbitMin = 16 + (i % 6) × 6
angle  = base + now × (0,6 + (i % 5) × 0,2) + p × 1,4
alpha  = 0,25 + 0,55 × p²
cor    = i % 3 === 1 ? #F1F5F9 : teaseColor     // quadrado, sem blur
```

**Modo `burst`** (impacto → fim), `lighter`, cauda de 0,06:

```
p      = clamp01((now − burstStart − delay × 0,3) / max(0,45, particleDuration))
eased  = 1 − (1 − p)³
tail   = 1 − (1 − max(0, p − 0,06))³
rx, ry = distance × (particleReach.{x,y} / {180, 230}) × (1 + tierIndex × 0,05)
alpha  = (1 − p) × 0,95
traço  = raio×tail → raio×eased, lineWidth = size
paleta = GALACTICA ? particleGalaxy + accent : [accent, #F1F5F9, accent]
```

O canvas é removido do DOM quando `effectsDone` vira `true`.

---

## 6. Áudio (sintetizado, opt-in)

`AudioContext` criado só após gesto do usuário; master gain 0,55 → compressor → destino.
Preferência em `localStorage["animesice:roll-sound"]`. `power = tierIndex / 6`.

| Evento | Síntese |
|---|---|
| `charge(1.2s)` | ruído bandpass 260 → 3400 Hz (Q 2,5, vol 0,22, attack 0,92) + triângulo 80 → 520 Hz (vol 0,10) |
| `tick(i)` | seno `440 × (1 + i × 0,12)` Hz, 0,07 s, vol 0,09 |
| `impact(p)` | `p = 0,55 + clamp01(p) × 0,45`; tom 170 → 36 Hz (0,6 s, vol 0,85p) + ruído lowpass 2200 → 180 Hz (0,45 s, vol 0,45p) |
| `chime(p)` | base 523,25 Hz; harmônicos `[1, 1.25, 1.5, 2, 2.5]` primeiros `3 + round(p×2)`, triangulares, atraso `i × 0,07`, vol 0,2; mais um tom em 4× base com vol 0,05 |

---

## 7. Vitrine (pós-revelação)

- **Flutuação:** `y → −7`, 2,4 s, yoyo, `sine.inOut`, infinito.
- **Deriva:** `p` 0,5 → 1 em 3,6 s, yoyo; alimenta o tilt só enquanto o usuário não mexe.
- **Tilt por ponteiro:** `rotateX(−y × 18°)` e `rotateY(x × 18°)`, `transition: transform 140ms ease-out`;
  a mesma posição alimenta `background-position` do overlay holo.
- **Giroscópio no mobile:** só com `pointer: coarse`; no iOS pede permissão no primeiro
  `pointerdown`. Escala de 30° para ±0,5.

---

## 8. Acessibilidade e saídas alternativas

- **`prefers-reduced-motion`** (`usePrefersReducedMotion`, resolve pós-mount para não
  quebrar a hidratação): não existe timeline. Vai direto a `showcase`, toca só o chime.
  Também remove canvas, órbitas, holo, varredura, shake, tremor, partículas e a
  perspectiva 3D (virada vira `none`).
- **Pular / Esc / Enter / Espaço / clique no fundo:** `showFinal()` cancela tudo e fixa os
  estados finais instantaneamente (palco em scale 1, carta virada se não-reduced,
  badges em opacity 1, efeitos em opacity 0).
- **Áudio nunca inicia sozinho:** sem gesto do usuário o `AudioContext` nem é construído.
- **`aria-live`** (`#roll-status`) anuncia fase de espera, carta revelada, raridade e
  se é nova ou repetida. O botão foco automaticamente quando `canContinue` vira `true`.
- **Focus trap:** `<dialog>.showModal()` nativo; foco anterior é restaurado no cleanup.
- **`?debugRarity=`** troca só o tier **apresentado** — o resultado da API e o pull
  guardado ficam intactos.

---

## 9. O que a carta (`GachaCard`) contribui

Dentro do palco só a arte renderiza (`showInfo={false}`), então o que aparece é:

- Proporção **3:4**, moldura por raridade (borda + glow estático) ou gradiente galáctico.
- **Badge de raridade** topo-esquerdo e **badge de foil** topo-direito (só se `foil !== NORMAL`).
- **Condição** embaixo-direita com glifo: `◆◆◆` MINT, `◆◆` NM, `◆` EX, `▽` PLAYED, `✕` POOR.
- **Foil** = overlay de borda + varredura de brilho contínua (`foil-shine`, 5 s, ease-in-out
  infinito). GOLD/INK/PRISM filtram ou sobrepõem a arte; HOLO usa `HoloTilt`.
- **Condição** desatura a arte em EX/PLAYED/POOR e adiciona riscos com ângulo determinístico
  derivado do hash de `pull.id`.
- **Holo no palco:** gradiente em `mix-blend-mode: color-dodge` com `background-size: 260%`,
  opacidade `TIER_HOLO × 1,3` (limitado a 0,75) quando há foil, `× 0,55` sem.

Gradientes de brilho no palco:
- `índice ≥ 4` (LENDÁRIA+) → arco-íris `115deg` (`#ff4d8d → #ffb347 → #fff275 → #5cffb0 → #4dd8ff → #9a7bff`).
- abaixo → banda branca na diagonal com a cor da raridade nas bordas.

---

## 10. Invariantes para a reimplementação

1. `lock` existe para o tier real **ocupar a tela antes do impacto** — o sorteio não
   garante a cor, a trava em `lock` é o que entrega.
2. O brilho de raridade só entra **depois** que o giro do cristal acabou de fato: o
   `spinEnd` que importa é `crystalSpinAt + max(0,75, crystalSpinDuration)`, não só
   `crystalSpinDuration`.
3. A timeline **não pode esperar pelo pull** no início; pausa em `invocationEnd`.
4. Tremor e partículas usam aleatoriedade por frame — seed determinística se o render
   precisar ser reproduzido.
5. Cor nunca carrega a semântica sozinha: o rótulo de texto (`RARITY_LABEL`) é o que
   informa, o brilho é decoração.
6. `TEASE_DURATION`, `TIER_*` são tabelas, não curvas — trocar por interpolação muda a
   duração total e o pico de cada tier.
7. `effectsEnd` precisa cobrir o fim de **todas** as camadas, não só das anéis
   originais: afterglow, rajadas de shake e lascas ramjam depois. Liberar o canvas
   e os loops antes disso corta a animação no meio.

## 11. Checks

```bash
npm run check:roll-tier-motifs   #escalada das faixas, sincronia do rótulo, curvas
npm run check:roll-anim-source   # o TSX colado compila com o shim de imports
```

O `check-roll-tier-motifs` extrai as tabelas do próprio `.tsx` em vez de copiar
os números: uma cópia manual não testa nada (mutar o componente deixava o script
verde). As fórmulas de easing e de rótulo são exercitadas aqui *e* conferidas
contra o texto do componente por `assertInComponent` — se as duas divergirem, o
check falha em vez de mentir.