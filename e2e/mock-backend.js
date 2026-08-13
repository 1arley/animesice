const http = require('http');
const url = require('url');

// CORS real (como o backend Nest): o front roda em localhost:3000 e faz
// fetch com credentials. Sem ACAO o browser bloqueia requests que chegam
// ao servidor sem page.route — requests interceptados por route.fulfill
// do Playwright passam direto, então specs com override não dependem disso.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(res, obj, status = 200) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(s);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const p = parsed.pathname;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }
  // Catálogo paginado fake — usado pelo spec de paginação do /buscar.
  // Sem filtros retorna [] (comportamento anterior, outros specs dependem).
  const HAS_FILTER = ['search', 'genres', 'status', 'audio', 'format', 'year', 'season', 'sort'].some(
    (k) => parsed.query[k] !== undefined && parsed.query[k] !== '',
  );
  if (req.method === 'GET' && (p === '/api/anime' || p === '/anime')) {
    if (HAS_FILTER) {
      const page = parseInt(parsed.query.page || '1', 10);
      const limit = parseInt(parsed.query.limit || '24', 10);
      const total = 60;
      const start = (page - 1) * limit;
      const end = Math.min(start + limit, total);
      const data = [];
      for (let i = start; i < end; i++) {
        data.push({
          id: `e2e-anime-${i + 1}`,
          slug: `e2e-anime-${i + 1}`,
          title: `Anime E2E ${i + 1}`,
          coverImage: null,
          rating: 8.5,
          ageRating: null,
          status: 'FINALIZADO',
          audio: 'LEGENDADO',
        });
      }
      return json(res, { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    }
    return json(res, []);
  }
  // Gêneros fake — o /buscar lista checkboxes; usado pelo spec de filtros combinados.
  if (req.method === 'GET' && (p === '/api/genre' || p === '/genre')) {
    return json(res, [
      { id: 'g1', slug: 'acao', name: 'Ação', _count: { animes: 12 } },
      { id: 'g2', slug: 'comedia', name: 'Comédia', _count: { animes: 8 } },
      { id: 'g3', slug: 'drama', name: 'Drama', _count: { animes: 5 } },
    ]);
  }
  if (req.method === 'GET' && (p === '/api/episode/latest' || p === '/episode/latest')) return json(res, []);
  if (req.method === 'GET' && (p === '/api/anime/trending' || p === '/anime/trending')) return json(res, []);
  if (req.method === 'GET' && (p === '/api/recently-added' || p === '/anime/recently-added')) return json(res, []);

  // Perfil público — o frontend usa /users/:identifier (userName ou id).
  const userProfileMatch = p && (p.match(/^\/api\/users\/([^/]+)$/) || p.match(/^\/users\/([^/]+)$/));
  if (req.method === 'GET' && userProfileMatch) {
    const id = userProfileMatch[1];
    return json(res, { id, name: 'Mock', userName: 'mock', avatar: null, bio: 'Bio here', createdAt: new Date().toISOString(), _count: { comments: 0, ratings: 0, favorites: 0, watchHistories: 0, followers: 0, following: 0 } });
  }

  const emptyPage = (page = 1, limit = 20) => ({ data: [], meta: { total: 0, page, limit, totalPages: 0 } });
  const userCommentsMatch = p && (p.match(/^\/api\/users\/([^/]+)\/comments$/) || p.match(/^\/users\/([^/]+)\/comments$/));
  if (req.method === 'GET' && userCommentsMatch) return json(res, emptyPage());
  const userRatingsMatch = p && (p.match(/^\/api\/users\/([^/]+)\/ratings$/) || p.match(/^\/users\/([^/]+)\/ratings$/));
  if (req.method === 'GET' && userRatingsMatch) return json(res, emptyPage());
  const userFavsMatch = p && (p.match(/^\/api\/users\/([^/]+)\/favorites$/) || p.match(/^\/users\/([^/]+)\/favorites$/));
  if (req.method === 'GET' && userFavsMatch) return json(res, emptyPage(1, 24));
  const userAnimeListMatch = p && (p.match(/^\/api\/users\/([^/]+)\/anime-list$/) || p.match(/^\/users\/([^/]+)\/anime-list$/));
  if (req.method === 'GET' && userAnimeListMatch) return json(res, emptyPage(1, 24));
  const userActivityMatch = p && (p.match(/^\/api\/users\/([^/]+)\/activity$/) || p.match(/^\/users\/([^/]+)\/activity$/));
  if (req.method === 'GET' && userActivityMatch) return json(res, emptyPage());

  if (req.method === 'POST' && (p === '/api/report' || p === '/report')) {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => {
      try {
        const parsedBody = JSON.parse(body || '{}');
        return json(res, { id: 'r1', ...parsedBody });
      } catch (e) {
        res.writeHead(400); res.end('bad json');
      }
    });
    return;
  }

  // --- Social: feed ---
  // Sem sessão, scope=following responde 401 (como o backend real).
  // Os specs sobrescrevem com page.route quando precisam de dados controlados.
  if (req.method === 'GET' && (p === '/api/social/feed' || p === '/social/feed')) {
    if (parsed.query.scope === 'following') {
      return json(res, { statusCode: 401, message: 'Entre para ver o feed de quem você segue.' }, 401);
    }
    const now = Date.now();
    return json(res, {
      data: [
        {
          type: 'post',
          post: {
            id: 'p1', content: 'Terminando Frieren e não esperava gostar tanto.',
            animeId: null, anime: null, shareCount: 2, status: 'VISIBLE',
            createdAt: new Date(now - 2 * 3600e3).toISOString(),
            updatedAt: new Date().toISOString(),
            user: { id: 'u1', name: 'Ana Teste', userName: 'ana', avatar: null },
            _count: { likes: 1, comments: 1 }, hasLiked: false,
          },
        },
        {
          type: 'activity',
          event: {
            type: 'rating', score: 9,
            anime: { slug: 'frieren', title: 'Frieren', coverImage: null },
            createdAt: new Date(now - 5 * 3600e3).toISOString(),
          },
          user: { id: 'u1', name: 'Ana Teste', userName: 'ana', avatar: null },
        },
      ],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
  }

  // --- Social: diretório de usuários (GET /users?search=&sort=&page=&limit=) ---
  if (req.method === 'GET' && (p === '/api/users' || p === '/users')) {
    const search = (parsed.query.search || '').toLowerCase();
    const page = parseInt(parsed.query.page || '1', 10);
    const limit = parseInt(parsed.query.limit || '24', 10);
    const all = [
      { id: 'u1', name: 'Ana Teste', userName: 'ana', avatar: null, bio: 'Maratonando Frieren', createdAt: new Date(Date.now() - 86400e3).toISOString(), _count: { comments: 12, ratings: 9, favorites: 5, watchHistories: 40 }, isFollowing: false },
      { id: 'u2', name: 'Bruno Teste', userName: 'bruno', avatar: null, bio: null, createdAt: new Date(Date.now() - 3 * 86400e3).toISOString(), _count: { comments: 3, ratings: 2, favorites: 1, watchHistories: 10 }, isFollowing: false },
      { id: 'u3', name: 'Zoe Lima', userName: 'zoe', avatar: null, bio: 'Só mecha', createdAt: new Date(Date.now() - 5 * 86400e3).toISOString(), _count: { comments: 0, ratings: 0, favorites: 0, watchHistories: 2 }, isFollowing: false },
    ];
    const filtered = search
      ? all.filter((u) => (u.name || '').toLowerCase().includes(search) || (u.userName || '').toLowerCase().includes(search))
      : all;
    return json(res, {
      data: filtered.slice((page - 1) * limit, page * limit),
      meta: { total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) },
    });
  }

  // --- Social: listas públicas de follow do perfil ---
  // GET /social/followers/:userId e GET /social/following/:userId —
  // respostas default vazias; os specs sobrescrevem p/ dados controlados.
  const socialFollowersMatch =
    p && (p.match(/^\/api\/social\/followers\/([^/]+)$/) || p.match(/^\/social\/followers\/([^/]+)$/));
  if (req.method === 'GET' && socialFollowersMatch) return json(res, emptyPage());
  const socialFollowingMatch =
    p && (p.match(/^\/api\/social\/following\/([^/]+)$/) || p.match(/^\/social\/following\/([^/]+)$/));
  if (req.method === 'GET' && socialFollowingMatch) return json(res, emptyPage());

  // --- Sessão: /user/me (AuthProvider chama quando há cookie role) ---
  const userMeMatch = p && (p === '/api/user/me' || p === '/user/me');
  if (req.method === 'GET' && userMeMatch) {
    return json(res, {
      id: 'viewer-1', email: 'viewer@test.dev', name: 'Viewer', userName: 'viewer',
      avatar: null, bio: null, myAnimeList: null, role: 'USER',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }

  // --- Social: POST /social/posts (default echo — specs sobrescrevem p/ capturar) ---
  if (req.method === 'POST' && (p === '/api/social/posts' || p === '/social/posts')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const b = JSON.parse(body || '{}');
        return json(res, {
          id: 'new-post', content: b.content || '', animeId: b.animeId ?? null, anime: null,
          shareCount: 0, status: 'VISIBLE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          user: { id: 'viewer-1', name: 'Viewer', userName: 'viewer', avatar: null },
          _count: { likes: 0, comments: 0 }, hasLiked: false,
        });
      } catch (e) {
        res.writeHead(400);
        res.end('bad json');
      }
    });
    return;
  }

  // --- Social: ações em posts (like/share/delete/comments) e follow ---
  const postLike = p && (p.match(/^\/api\/social\/posts\/[^/]+\/like$/) || p.match(/^\/social\/posts\/[^/]+\/like$/));
  if (req.method === 'POST' && postLike) return json(res, { liked: true });

  const postShare = p && (p.match(/^\/api\/social\/posts\/[^/]+\/share$/) || p.match(/^\/social\/posts\/[^/]+\/share$/));
  if (req.method === 'POST' && postShare) return json(res, { shared: true, shareCount: 3 });

  // Grupo de captura ([^/]+) para extrair o postId do comentário.
  const postCommentsMatch =
    p && (p.match(/^\/api\/social\/posts\/([^/]+)\/comments$/) || p.match(/^\/social\/posts\/([^/]+)\/comments$/));
  if (req.method === 'GET' && postCommentsMatch) return json(res, emptyPage());
  if (req.method === 'POST' && postCommentsMatch) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const b = JSON.parse(body || '{}');
        return json(res, {
          id: 'pc-1', postId: postCommentsMatch[1] || '', content: b.content || '',
          createdAt: new Date().toISOString(),
          user: { id: 'viewer-1', name: 'Viewer', userName: 'viewer', avatar: null },
        });
      } catch (e) {
        res.writeHead(400);
        res.end('bad json');
      }
    });
    return;
  }

  const postDelete = p && (p.match(/^\/api\/social\/posts\/[^/]+$/) || p.match(/^\/social\/posts\/[^/]+$/));
  if (req.method === 'DELETE' && postDelete) return json(res, { message: 'Post removido.' });

  const follow = p && (p.match(/^\/api\/social\/follow\/[^/]+$/) || p.match(/^\/social\/follow\/[^/]+$/));
  if (req.method === 'POST' && follow) return json(res, { following: true });

  // fallback
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('[]');
});

const port = process.env.MOCK_BACKEND_PORT || 3001;
server.listen(port, () => console.log('mock-backend listening on', port));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
