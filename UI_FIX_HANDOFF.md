# UI Fix Handoff — AnimesIce Frontend

## Status: ✅ Concluído

Todas as ~30 correções do audit de UI/UX foram aplicadas. Build (`rtk npm run build`) e lint (`rtk npm run lint`) passam sem erros.

## Resumo do que foi feito

### Global CSS (`app/globals.css`)
- `.btn-ice:disabled, .btn-ghost:disabled` (opacity 0.45, cursor not-allowed)
- `.btn-ice/.btn-ghost/.btn-danger` min-height 2.75rem (44px)
- `.admin-tab`/`.admin-nav-item` min-height 2.75rem

### Invisible Elements
- `RatingStars.tsx`, `Stars.tsx` — `text-hairline` → `text-mist/40`
- `error.tsx` — `bg-night` → `bg-ink`
- `biblioteca/page.tsx` — removido `opacity-0`, `aria-label`, touch target

### Touch Targets (44px+)
- `NotificationBell.tsx`, `ServiceNotice.tsx`, `Header.tsx` — `h-11 w-11`
- `biblioteca/page.tsx`, `RatingStars.tsx` — padding/min-height
- `FeedActivityItem.tsx`, `ProfileActivity.tsx`, `CommentSection.tsx` — like buttons `min-h-11 px-2 py-2`
- `FeedPost.tsx` — like/comment/share buttons `min-h-11 py-2`
- `ProfileHero.tsx` — menu "Mais ações" `h-9 w-9` → `h-11 w-11`
- `ContinueWatchingRail.tsx` — delete button `h-9 w-9` → `h-11 w-11`
- `KoFiLink.tsx` — header `h-11 w-11`; footer `min-h-11 py-2.5`
- `ProfileCollection.tsx` — filtros `min-h-11 py-2.5`
- `NotificationPreferencesSection.tsx`, `PrivacySection.tsx` — toggles `h-6` → `h-7` (+ knob `h-5`/`h-6`)
- `FeedView.tsx`, `comunidade/usuarios/page.tsx` — tabs `min-h-11 py-3`
- `YearFilter.tsx` — select `min-h-11`
- `CrystalVideoPreview.tsx` — toggle `min-h-11 py-2.5`

### Accessibility
- `RatingStars.tsx` — guard `!loading` no teclado
- `FeedActivityItem.tsx`, `ProfileActivity.tsx`, `CommentSection.tsx` — `aria-label` nos botões de curtir
- `ShareButtons.tsx` — `aria-label` nos links de compartilhamento
- `room/[slug]/page.tsx` — `aria-label="Enviar mensagem"` no botão `→`
- `AuthButtons.tsx` — span de erro de logout virou `<button>` (antes tinha `onClick` sem semântica de interação)

### Layout/Clipping
- `Modal.tsx` — `z-50` → `z-[100]` (garante que fique acima do header)
- `ProfileHero.tsx` — dropdown `z-30` → `z-50`
- `AnimeCard.tsx`, `EpisodeCard.tsx` — removido `overflow-hidden` do `<Link>` focável (o `.card-scan` interno já clipa a imagem), preservando o `focus-visible:outline-offset-4`
- `BroadcastCard.tsx` — `overflow-hidden` movido do `<Link>` para um wrapper `absolute inset-0` interno

### Interactive States
- `login/page.tsx`, `register/page.tsx`, `ScrapeImportPanel.tsx` — `hover:opacity-70` → `hover:text-snow hover:underline`
- `AuthButtons.tsx`, `settings/page.tsx` — logout agora tem estado `loggingOut`/`disabled` para evitar duplo-clique
- `FeedPost.tsx` — botão de compartilhar agora tem `shareBusy` guard, igual ao padrão de `likeBusy`
- `PrivacySection.tsx` — toggles agora têm `busy` guard (`disabled` durante a chamada à API)

### Text Visibility
- `ProfileFollowList.tsx`, `UserCard.tsx` — `text-mist/50`/`60` → `text-mist/70`
- `FeedActivityItem.tsx`, `ProfileActivity.tsx`, `FeedPost.tsx` — metadados e cor idle dos botões de curtir `text-mist/60` → `text-mist/70`
- `animes/[slug]/page.tsx` — episódios indisponíveis `opacity-40` → `opacity-60`

## Validação
```bash
rtk npm run build   # ✓ compilado com sucesso (erros ECONNREFUSED no prerender são de fetch à API externa, não relacionados)
rtk npm run lint    # ✓ No ESLint warnings or errors
```

## Branch
`dev` — mudanças aplicadas sobre o commit `0b33da0`.
