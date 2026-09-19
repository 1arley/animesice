# SEO & Tráfego — Plano de Implementação

## Contexto
- **Frontend**: Next.js App Router (animesice-web)
- **Backend**: NestJS + Prisma + Postgres (animesice-back)
- **Site**: `www.animesice.app` (pt-BR)

## Decisões fechadas
| # | Decisão |
|---|---------|
| 1 | Conteúdo editorial via painel admin (CMS) |
| 2 | Criar página `/generos` (índice de todos os gêneros) |
| 3 | VideoObject com `estimatedIso8601Seconds` (segundos inteiros) |
| 4 | Seções extras derivadas de dados existentes + CTA "Assista no AnimesIce" com link direto para `/animes/{slug}` (sem redirect externo) |
| 5 | `hreflang` apenas `pt-BR` |

---

## Tarefas

### 1. CMS — Conteúdo editorial nos animes + Blog

#### 1a. Schema (Prisma)
Adicionar em `Anime`:
```prisma
editorialSynopsis String?   // sinopse própria editável pelo admin
editorialWhereToWatch String? // default: "Assista no AnimesIce"
editorialDubbingInfo String?  // info de dublagem customizada
editorialSeasonsInfo String?  // info de temporadas customizada
```

Adicionar model `BlogPost`:
```prisma
model BlogPost {
  id          String   @id @default(uuid())
  slug        String   @unique
  title       String
  description String
  content     String   // HTML
  category    String
  published   Boolean  @default(false)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Gerar migration Prisma e rodar `prisma migrate dev`.

#### 1b. Backend (NestJS)
- `Anime` DTO de update: aceitar os 4 novos campos editoriais
- Endpoint `PATCH /anime/:slug` — expor campos editoriais (admin)
- CRUD de `BlogPost`: `GET/POST /blog-posts`, `GET/PATCH /blog-posts/:id`, `DELETE /blog-posts/:id`
- Filtrar `published: true` na listagem pública de blog

#### 1c. Frontend
- **Página de anime** (`/animes/[slug]/page.tsx`):
  - Exibir `editorialSynopsis` quando existir; fallback para `anime.synopsis`
  - Nova seção "Onde assistir" → link `<a href=\`/animes/${slug}\`>Assista no AnimesIce</a>` + `editorialWhereToWatch` se admin customizar (opcional)
  - Nova seção "Temporadas" → `editorialSeasonsInfo` (ou derivado de `season`/`year`/`format`)
  - Nova seção "Dublagem" → `editorialDubbingInfo` (ou derivado de `audio`)
- **Blog**: migrar de `POSTS` hardcoded para fetch da API (`/blog-posts?published=true`)
- **Admin**: página de edição de anime com campos editoriais; CRUD de blog posts

#### 1d. Migração de dados
- Para animes existentes: `editorialWhereToWatch = null` (frontend renderiza link padrão para `/animes/{slug}`)
- `editorialDubbingInfo` e `editorialSeasonsInfo`: derivados automaticamente dos campos existentes no primeiro load

---

### 2. Página de índice `/generos`

**Backend**: endpoint `GET /genre` já existe e retorna `[{slug, name, _count:{animes}}]`.

**Frontend** — novo arquivo `app/(app)/generos/page.tsx`:
- Fetch `/api/genre` com cache (`force-cache`, revalidate 300)
- Grid de cards de gênero com nome + contagem de animes
- `generateMetadata` com title/description canonica para `/generos`
- Schema `CollectionPage` JSON-LD

**Sitemap**: remover `/generos` de `STATIC_ROUTES` (agora é dinâmico) e adicionar `/generos/[slug]` ao bloco de gêneros.

---

### 3. Schema VideoObject nos episódios

**Arquivo**: `app/(app)/animes/[slug]/[number]/page.tsx`

Adicionar segundo `<script type="application/ld+json">` com:
```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "<anime.title> — Episódio <number>",
  "description": "<anime.synopsis.slice(0, 200)>",
  "thumbnailUrl": "<episode.thumbnailUrl>",
  "uploadDate": "<episode.dateModified || episode.createdAt>",
  "estimatedIso8601Seconds": <parseDurationToSeconds(episode.duration)>,
  "contentUrl": "<episode.videoUrl || embedUrl>"
}
```

Função helper `parseDurationToSeconds("24:00") → 1440`:
- Formato esperado: `MM:SS` ou `HH:MM:SS`
- Retornar `null` se parse falhar (campo opcional no schema)

---

### 4. Gêneros no sitemap

**Arquivo**: `app/sitemap.ts`

- **Remover** `{ path: "/generos", priority: 0.7 }` de `STATIC_ROUTES`
- **Adicionar** bloco de gêneros dinâmicos:
  ```ts
  const genreEntries = await serverFetchJson<Genre[]>(`/genre`, { cache: "force-cache", next: { revalidate: 3600 } });
  genreEntries.forEach(g => sitemapUrls.push({
    url: `${SITE_URL}/generos/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6
  }));
  ```

---

### 5. hreflang `pt-BR`

**Arquivo**: `app/layout.tsx` — adicionar no `metadata`:
```ts
alternates: {
  canonical: SITE_URL,
  languages: {
    "pt-BR": SITE_URL
  }
}
```

Também garantir que `html lang="pt-BR"` já existe (existe na linha 91).

---

## Ordem de execução recomendada

1. Prisma migration (task 1a)
2. Backend endpoints (task 1b)
3. Página `/generos` (task 2) — desbloqueia sitemap
4. Sitemap gêneros (task 4)
5. VideoObject schema (task 3)
6. hreflang (task 5)
7. Frontend CMS + blog API (task 1c)
8. Migração de dados + default values (task 1d)

## Validação

- [ ] `prisma migrate dev` roda sem erro
- [ ] `npm run build` no web passa sem erro de type
- [ ] `GET /generos` retorna 200 com grid de gêneros
- [ ] `GET /sitemap.xml` inclui URLs `/generos/[slug]`
- [ ] Rich Results Test valida VideoObject em episódio publicado
- [ ] Admin consegue editar `editorialSynopsis` de um anime
- [ ] Admin consegue criar/editar blog post
- [ ] Blog lista posts da API (não mais hardcoded)
- [ ] `<link rel="alternate" hreflang="pt-BR">` presente no HTML de páginas públicas
