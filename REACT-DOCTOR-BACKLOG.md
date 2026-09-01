# react-doctor backlog

## Progresso atual

**Score: 46/100 | 89 issues | 230 files**

### Concluído

| Batch | Grupo | Qtd | Delta |
|---|---|---|---|
| 1 | a11y labels | 53 issues zeradas | 3 rules zeroed |
| 2 | createObjectURL + loading-finally + locale-format + array-index-key | 70 issues | 111→181→111 |
| 3 | deslop/unused-file + unused-export | 8 issues | 111→103 |
| 4 | use-lazy-motion + will-change + set-map-lookups + combine-iterations | 14 issues | 103→89 |

---

## Pendente (89 issues)

### Alta prioridade (bugs reais)

#### effect-needs-cleanup ×6
Leaks de memória — timers/subscriptions sem cleanup.

| Arquivo | Linha | Problema |
|---|---|---|
| `app/(app)/room/[slug]/page.tsx` | 161 | `on` subscription sem cleanup |
| `app/admin/auditoria/page.tsx` | 26 | `setTimeout` sem cleanup |
| `app/admin/watchtower/page.tsx` | 26 | `setTimeout` sem cleanup |
| `src/components/common/SyncedVideoPlayer.tsx` | 464 | `setInterval` sem cleanup |
| `src/components/common/VideoPlayer.tsx` | 347 | `setInterval` sem cleanup |
| `src/lib/smooth-scroll.tsx` | 39 | `on` subscription sem cleanup |

#### no-fetch-in-effect ×4
fetch dentro de useEffect — race conditions, double-fire, leaks.

| Arquivo | Linha |
|---|---|
| `src/components/common/SyncedVideoPlayer.tsx` | 142, 464 |
| `src/components/common/VideoPlayer.tsx` | 129, 347 |

#### no-effect-event-handler ×2
useEffect simulando event handler — render extra + atraso.

| Arquivo | Linha | Descrição |
|---|---|---|
| `src/components/common/SyncedVideoPlayer.tsx` | 142 | fetch em useEffect |
| `src/components/common/VideoPlayer.tsx` | 129 | fetch em useEffect |

#### nextjs-no-client-side-redirect ×1
| Arquivo | Linha | Descrição |
|---|---|---|
| `app/(app)/users/[userName]/page.tsx` | 99 | `router.replace()` em useEffect — flash antes do redirect |

#### no-set-state-after-await-in-effect ×1
| Arquivo | Linha | Descrição |
|---|---|---|
| `src/components/common/AnimeListButton.tsx` | 66 | setState após await — stale state em re-renders |

#### rendering-hydration-no-flicker ×1
| Arquivo | Linha | Descrição |
|---|---|---|
| `src/components/common/HomeHero.tsx` | 29 | useEffect setState — flash antes do paint |

---

### Média prioridade (manutenibilidade)

#### no-giant-component ×11
Componentes >300 linhas — refatorar em subcomponentes.

| Arquivo | Linha | Componente |
|---|---|---|
| `app/(app)/animes/[slug]/page.tsx` | 79 | AnimeDetailPage |
| `app/(app)/room/[slug]/page.tsx` | 32 | RoomPage |
| `app/(app)/users/[userName]/page.tsx` | 40 | PublicProfilePage |
| `app/admin/edit/[slug]/page.tsx` | 11 | AdminEditAnimePage |
| `app/admin/usuarios/page.tsx` | 43 | AdminUsersPage |
| `app/admin/watchtower/page.tsx` | 11 | AdminWatchtowerPage |
| `app/settings/page.tsx` | 21 | SettingsPage |
| `src/components/common/SiteNav.tsx` | 52 | SiteNav |
| `src/components/common/SyncedVideoPlayer.tsx` | 251 | NativeSyncedPlayer |
| `src/components/profile/ProfileHero.tsx` | 30 | ProfileHero |
| `src/components/social/FeedPost.tsx` | 20 | FeedPost |

#### prefer-useReducer ×3
Múltiplos useStates que mudam juntos — consolidar em useReducer.

| Arquivo | Linha | useStates |
|---|---|---|
| `app/(app)/users/[userName]/page.tsx` | 44 | 8 |
| `app/admin/edit/[slug]/page.tsx` | 15 | 12 |
| `app/admin/episode/[slug]/[number]/page.tsx` | 19 | 6 |

#### rerender-state-only-in-handlers ×14
State que só é usado em handlers (não no JSX) — usar ref.

| Arquivo | Linha | Variáveis |
|---|---|---|
| `app/(app)/users/[userName]/page.tsx` | 52,64,67,68,71,72,76,80,85 | listTotal, tab*Page, tab*Total (9 vars) |
| `app/(auth)/login/page.tsx` | 18 | token |
| `app/(auth)/register/page.tsx` | 20 | token |
| `src/components/common/CommentSection.tsx` | 23 | page |
| `src/components/profile/ProfileHero.tsx` | 44 | reportMsg |
| `src/components/social/FeedPost.tsx` | 37 | commentsPage |

#### only-export-components ×6
Arquivo de componente exporta não-componentes — quebra Fast Refresh.

| Arquivo | Linha | Export |
|---|---|---|
| `src/components/common/VideoPlayer.tsx` | 31, 41 | utils/helpers |
| `src/components/common/hero/HeroSlide.tsx` | 23, 51 | slideVariants, slideVariantsMobile |
| `src/components/profile/ProfileCollection.tsx` | 6 | tipo/helper |
| `src/components/profile/ProfileTaste.tsx` | 43 | helper |

#### jsx-no-constructed-context-values ×2
Context value recriado em todo render — re-renderiza todos os consumers.

| Arquivo | Linha |
|---|---|
| `src/components/common/ToastProvider.tsx` | 29 |
| `src/lib/auth-context.tsx` | 97 |

#### prefer-module-scope-pure-function ×1
| Arquivo | Linha | Descrição |
|---|---|---|
| `app/admin/generos/page.tsx` | 61 | `slugify` recriada em todo render |

#### rerender-lazy-state-init ×1
| Arquivo | Linha | Descrição |
|---|---|---|
| `src/components/blog/BlogForm.tsx` | 30 | `useState(toLocalDate())` roda em todo render |

---

### Baixa prioridade (acessibilidade)

#### click-events-have-key-events ×3

| Arquivo | Linha |
|---|---|
| `src/components/common/SiteNav.tsx` | 278 |
| `src/components/common/SyncedVideoPlayer.tsx` | 628 |
| `src/components/core/ClickSpark.tsx` | 168 |

#### no-static-element-interactions ×3

| Arquivo | Linha |
|---|---|
| `src/components/common/SiteNav.tsx` | 278 |
| `src/components/common/SyncedVideoPlayer.tsx` | 628 |
| `src/components/core/ClickSpark.tsx` | 168 |

#### anchor-is-valid ×2
| Arquivo | Linha |
|---|---|
| `src/components/admin/ScrapeImportPanel.tsx` | 116, 144 |

#### prefer-tag-over-role ×2
| Arquivo | Linha |
|---|---|
| `src/components/common/Header.tsx` | 116 |
| `src/components/common/Modal.tsx` | 86 |

#### media-has-caption ×2
| Arquivo | Linha |
|---|---|
| `src/components/common/SyncedVideoPlayer.tsx` | 635 |
| `src/components/common/VideoPlayer.tsx` | 447 |

#### html-label-has-single-control ×1
| Arquivo | Linha |
|---|---|
| `src/components/common/ProfileDashboard.tsx` | 187 |

#### no-interactive-element-to-noninteractive-role ×1
| Arquivo | Linha |
|---|---|
| `src/components/common/AuthButtons.tsx` | 46 |

#### prefer-html-dialog ×1
| Arquivo | Linha |
|---|---|
| `src/components/common/Modal.tsx` | 98 |

---

### Falsos positivos documentados (não mexer)

| Rule | Qtd | Razão |
|---|---|---|
| nextjs-no-img-element | 5 | `images.unoptimized: true` (config deliberada no next.config.ts); <img> ≈ next/image sem otimização. Room/CrystalMotion/Avatar/TiltedCard — decorativos ou CSS-animados. |
| no-create-object-url-without-revoke | 3 | .html estático com revoke imediato após click; settings tem cleanup no useEffect. Rule não rastreia. |
| no-loading-flag-reset-outside-finally | 2 | auditoria/watchtower — setLoading(false) em finally existe, rule não reconhece guardas de stale. |
| unused-dev-dependency | 3 | @semantic-release/* plugins configurados em .releaserc; rule não escaneia configs de runtime. |
| no-derived-useState | 1 | FeedPost — pai remonta com `key={post-${id}}`, estado sempre fresco. |
| no-array-index-as-key | 1 | BlurText — split de letras/palavras sem id estável; index é key correta pra animação. |
| no-fetch-response-used-without-status-check | 1 | .html estático, fora do React. |
| no-unguarded-browser-global-at-module-scope | 1 | .html estático, SSR não se aplica. |
| nextjs-no-a-element | 1 | global-error.tsx — erro global, navigação cliente não funciona. |

---

### Ordem recomendada de execução

1. **effect-needs-cleanup ×6** — bugs reais (leaks de memória)
2. **no-fetch-in-effect ×4** + **no-effect-event-handler ×2** — bugs reais (SyncedVideoPlayer + VideoPlayer)
3. **rerender-state-only-in-handlers ×14** — performance real (users/[userName] sozinho tem 9)
4. **prefer-useReducer ×3** — manutenibilidade (users/[userName], edit/[slug], episode/[slug]/[number])
5. **no-giant-component ×11** — manutenibilidade (componentes >300 linhas)
6. **jsx-no-constructed-context-values ×2** — performance (ToastProvider + auth-context)
7. **Acessibilidade restante ×13** — baixo risco, melhora score
8. **only-export-components ×6** — Fast Refresh
9. **Pequenos ×4** (client-side-redirect, set-state-after-await, hydration-flicker, lazy-state-init, module-scope-pure)