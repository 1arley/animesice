# Plano: CMS de Blog (CRUD admin + ações nas páginas públicas + deshardcode do RSS/Sitemap)

## Contexto
O blog hoje é 100% hardcoded em 4 pontos que duplicam os mesmos ~6 artigos: listagem, detalhe, feed RSS e sitemap. O objetivo é torná-lo editável via painel admin, expor ações de editar/excluir nas páginas públicas para admins, e migrar RSS/sitemap para a API. O backend (`animesice-back`) **não está neste workspace** — o frontend dependerá de endpoints que precisam existir (ver Fase 0).

> Tudo que estiver sob **"Decisões em aberto"** ou **"Riscos"** é espaço deliberado para o agente avaliar e decidir (ou propor melhoria) no momento da execução.

---

## Fase 0 — Contrato de backend (repo separado)
**Objetivo:** expor CRUD de posts de blog, com lista pública filtrada por `published`.

- Modelo sugerido (não engessado): `BlogPost` com `id`, `slug` (unique), `title`, `description`, `content` (HTML), `category`, `published` (bool), `publishedAt?`, timestamps.
- Endpoints esperados pelo frontend (nomes/Swagger a confirmar com o backend):
  - `GET /blog-posts?published=true&page=&limit=` (público)
  - `GET /blog-posts/slug/:slug` (público)
  - `GET /blog-posts` + filtro de status (admin)
  - `GET /blog-posts/:id` (admin)
  - `POST /blog-posts`, `PATCH /blog-posts/:id`, `DELETE /blog-posts/:id` (admin)
- `RolesGuard` nos endpoints admin.

**Decisões em aberto:**
- Campos extras que talvez façam sentido: `coverImage`, `authorId/authorName`, `tags`, `seoTitle`/`seoDescription` separados. O agente pode propor o mínimo viável ou estender.
- Formato do `content`: HTML cru (como hoje) vs Markdown. Depende do editor que o admin usar.

**Riscos:**
- Se o backend ainda não tiver seed dos posts atuais, o site pode ficar **vazio** após a migração (ver Fase 3 — fallback).

---

## Fase 1 — Tipos + cliente de API (frontend)
**Arquivos:** `src/types/index.ts`, `src/lib/api.ts`, `src/lib/api-server.ts`

**Objetivo:**
- Tipar `BlogPost` e um DTO de escrita (`BlogPostInput`).
- Adicionar em `api` (padrão `request<T>`, espelhando `adminCreateAnime`): `listBlogPosts`, `getBlogPost(slug)`, `adminListBlogPosts`, `adminGetBlogPost(id)`, `adminCreateBlogPost`, `adminUpdateBlogPost`, `adminDeleteBlogPost`.
- Adicionar `serverListBlogPosts` (ou similar) em `api-server.ts` para SSR das páginas públicas.

**Decisões em aberto:**
- Tipagem exata do retorno paginado (`Paginated<BlogPost>` vs array simples) — alinhar com o que o backend realmente devolver.
- Onde colocar os tipos (arquivo único de blog vs espalhar).

---

## Fase 2 — CRUD no painel admin
**Arquivos:** `app/admin/layout.tsx` (nav), `app/admin/blog/page.tsx`, `app/admin/blog/novo/page.tsx`, possivelmente um componente de formulário compartilhado.

**Objetivo:**
- Nav "Blog" no sidebar do admin (seguindo `NAV_ITEMS` de `app/admin/layout.tsx`, respeitando o token de design: `border-hairline`, `bg-panel`, `text-ice/snow/mist`).
- Lista com título, slug, categoria, status (Publicado/Rascunho), data e ações Editar/Excluir.
- Tela de criação e edição (título, slug — auto via `slugify` porém editável, descrição, categoria, conteúdo, toggle publicado + data).
- Exclusão com confirmação.

**Decisões em aberto (importantes — deixe o agente pensar):**
- **Extrair `BlogForm` compartilhado** entre novo/editar, ou manter telas separadas como `create`/`edit` de anime fazem hoje? Pesar reuso vs simplicidade.
- Editor de `content`: textarea simples de HTML, ou algo mais amigável? O agente pode escolher a menor risco.
- Ordem/ícone do item no menu admin.
- Paginação da lista admin vs lista simples (6–N poucos posts no começo).

**Riscos:**
- Garantir que `slug` único seja validado (backend e/ou frontend) para não colidir com posts existentes.

---

## Fase 3 — Migrar páginas públicas para a API (deshardcode)
**Arquivos:** `app/(app)/blog/page.tsx`, `app/(app)/blog/[slug]/page.tsx`, `app/sitemap.ts`, `app/(app)/blog/rss/route.ts`

**Objetivo:**
- `/blog` busca `published=true` via server fetch (manter grid/cards atuais).
- `/blog/[slug]` busca por slug; `notFound()` se inexistente; manter JSON-LD, `generateMetadata` dinâmico e render de `content` via `dangerouslySetInnerHTML`.
- Sitemap e RSS passam a derivar dos slugs/posts da API.

**Decisões em aberto (críticas — avaliar antes de mexer):**
- **Fallback em produção:** se a API ainda não tiver os posts seedados, a home do blog e o RSS ficam vazios. O agente deve decidir se mantém os arrays hardcoded *como fallback temporário* até o seed existir, ou migra seco. Recomenda-se fortemente não quebrar o que já está no ar.
- **Slugs existentes:** os 6 slugs atuais (`melhores-animes-2026`, etc.) precisam continuar válidos pós-migração (SEO/índice do Google). O agente deve confirmar que o seed preserva esses slugs ou fazer redirect/alias.
- **Comportamento de cache/revalidate:** hoje as páginas usam `revalidate = 3600`. Decidir se mantém ISR ou vai para `force-cache` + `tags` (como o sitemap faz), para que edições do admin apareçam num tempo razoável.
- **Sanitização de HTML:** `content` é HTML cru. O agente deve avaliar se precisa de sanitização no backend e/ou no frontend antes do `dangerouslySetInnerHTML` (risco de XSS se algum admin mal-intencionado ou conteúdo quebrado).

**Riscos de produção:**
- Mudar roteamento estático → dinâmico pode alterar o comportamento de build/ISR e gerar 404 temporário.
- RSS com lista vazia pode quebrar leitores/SEO se não houver fallback.
- Perda de slugs = queda de tráfego orgânico já conquistado.

---

## Fase 4 — Ações de admin nas páginas públicas
**Arquivos:** novo componente client (ex.: `components/blog/BlogAdminActions.tsx`), usado em `app/(app)/blog/page.tsx` e `app/(app)/blog/[slug]/page.tsx`.

**Objetivo:**
- Botões **Editar** (link p/ `/admin/blog/[id]`) e **Excluir** visíveis **somente** para `ADMIN`/`SUPERADMIN` (via `useAuth()` + `isPrivileged`).
- Excluir da página pública → chama API e atualiza (refresh/redirect).
- Estética seguindo o site (`text-ice`, `border-hairline`, `bg-panel`, `badge-dot bg-signal`, padrão `admin-tab`).

**Decisões em aberto:**
- Posicionamento exato nas páginas (overlay no card, barra no topo, ícone discreto) — o agente deve casar com o design existente sem poluir a UX de visitante comum.
- Como obter o `id` do post na página pública (já disponível após a Fase 3, que trará `id` do backend).

**Riscos:**
- Não vazar esses controles para usuários comuns (o `isPrivileged` é client-side; o backend `RolesGuard` é a verdadeira trava — não depender só do UX).

---

## Fase 5 — Validação
- `npm run build` sem erro de tipo.
- Criar no admin → aparece em `/blog`, no `/admin/blog` e no RSS/sitemap.
- Editar → reflete nas páginas públicas.
- Excluir (painel **e** página pública) → some de tudo.
- `RolesGuard` bloqueia não-admin.
- Slugs antigos continuam acessíveis (sem queda de SEO).

---

## Ordem sugerida (pode ser reavaliada pelo agente)
Backend (Fase 0) → Tipos/API (1) → Admin list (2 parcial) → Migrar públicas + RSS/sitemap (3, com fallback) → Ações nas páginas (4) → Admin novo/editar completo (2) → Validar (5).

**Nota geral:** onde houver conflito entre "fazer do jeito planejado" e "não quebrar produção / fazer melhor", o agente deve priorizar não quebrar o que está no ar e propor a variação (ex.: manter fallback hardcoded até o seed existir, ou ajustar sanitização). O plano é intenção, não lei.
