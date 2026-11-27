const http = require('http');
const url = require('url');

// CORS real (como o backend Nest): o front roda em localhost:3000 e faz
// fetch com credentials. Sem ACAO o browser bloqueia requests que chegam
// ao servidor sem page.route — requests interceptados por route.fulfill
// do Playwright passam direto, então specs com override não dependem disso.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `http://localhost:${process.env.E2E_APP_PORT || 3000}`,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(res, obj, status = 200) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(s);
}

const delayedSourceResponses = new Map();
const delayedSourceTimeouts = new Map();

const BOX_PRICES = { COMMON: 500, RARE: 1000, PREMIUM: 2000 };
const KEY_PRICE = 100;
const DAILY_BONUS = 350;
const BOX_FIELD = {
  COMMON: 'commonBoxes',
  RARE: 'rareBoxes',
  PREMIUM: 'premiumBoxes',
};

function createInitialMockEconomy() {
  return {
    itemCatalog: [],
    essenciaComum: 0,
    essenciaIncomum: 0,
    essenciaRara: 0,
    essenciaEpica: 0,
    essenciaLendaria: 0,
    essenciaMitica: 0,
    essenciaGalactica: 0,
    commonBoxes: 8,
    rareBoxes: 3,
    premiumBoxes: 3,
    keys: 15,
    spinResets: 1,
    weeklyRewardReady: true,
    loyaltyDays: 4,
    loyaltyRarePlusReady: false,
    balance: 15000,
    reserved: 0,
    available: 15000,
    titanitaShards: 0,
    titanitaItems: 0,
    titanitaSombriaShards: 0,
    titanitaSombriaItems: 0,
    draconicaShards: 0,
    draconicaItems: 0,
    sombriaDraconicaShards: 0,
    sombriaDraconicaItems: 0,
    holoShards: 0,
    goldShards: 0,
    inkShards: 0,
    prismShards: 0,
    holoGems: 0,
    goldGems: 0,
    inkGems: 0,
    prismGems: 0,
    protecao: 0,
    itemConfig: {
      item_shop_price: { TITANITA: 0, TITANITA_SOMBRIA: 0, DRACONICA: 0, SOMBRIA_DRACONICA: 0, PROTECAO: 0 },
      item_convert_value: { TITANITA: 0, TITANITA_SOMBRIA: 0, DRACONICA: 0, SOMBRIA_DRACONICA: 0, PROTECAO: 0 },
      item_recipes: {},
      item_eligibility: {},
      item_condition_anchor: {},
      card_floors: {},
      base_value: {},
      foil_mult: {},
      reroll_cost_pct: 0.1,
    },
    dailyClaimedToday: false,
    watchEarnedToday: 0,
  };
}

let mockEconomy = createInitialMockEconomy();
let mockOpenIndex = 0;

const MOCK_BOX_REWARDS = [
  { category: 'CARD', name: 'Aeliana, Guardiã Glacial', rarity: 'LENDARIA', foil: 'HOLO', condition: 0.04, image: '/aeliana/Aeliana.png' },
  { category: 'CRYSTAL', amount: 450 },
  { category: 'KEY', amount: 2 },
  { category: 'ITEM', kind: 'TITANITA', quantity: 2, rarity: 'EPICA' },
  { category: 'SPIN_RESET', amount: 1 },
  { category: 'RARE_BOX', amount: 1, rarity: 'RARA' },
  { category: 'ESSENCE', name: 'Essência Épica', rarity: 'EPICA' },
  { category: 'CARD_BACK', name: 'Selo Cryo-Core', rarity: 'RARA', duplicate: false },
];

function readJsonBody(req, res, onParsed) {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    try {
      onParsed(JSON.parse(body || '{}'));
    } catch {
      res.writeHead(400);
      res.end('bad json');
    }
  });
}

function pickMockBoxReward() {
  const override = (process.env.MOCK_BOX_REWARD || '').trim().toUpperCase();
  if (override === 'ERROR') {
    return { errorStatus: 500, errorMessage: 'Falha simulada ao abrir caixa.' };
  }
  if (override === 'INVALID') {
    return { reward: {} };
  }
  if (override) {
    const matched = MOCK_BOX_REWARDS.find((entry) => entry.category === override);
    if (matched) return { reward: { ...matched } };
  }
  const reward = MOCK_BOX_REWARDS[mockOpenIndex % MOCK_BOX_REWARDS.length];
  mockOpenIndex += 1;
  return { reward: { ...reward } };
}

function isApiRoute(pathname, route) {
  return pathname === route || pathname === `/api${route}`;
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const p = parsed.pathname;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }
  if (req.method === 'GET' && p === '/__mock/login') {
    const rawNext = parsed.query.next;
    const nextPath =
      typeof rawNext === 'string' && rawNext.startsWith('/') && !rawNext.startsWith('//')
        ? rawNext
        : '/gacha/loja';
    const appPort = process.env.E2E_APP_PORT || 3000;
    res.writeHead(302, {
      'Set-Cookie': 'role=USER; Path=/; SameSite=Lax',
      Location: `http://localhost:${appPort}${nextPath}`,
      'Cache-Control': 'no-store',
    });
    res.end();
    return;
  }
  if (req.method === 'POST' && p === '/__mock/economy/reset') {
    mockEconomy = createInitialMockEconomy();
    mockOpenIndex = 0;
    return json(res, { ok: true, inventory: mockEconomy });
  }
  if (req.method === 'GET' && p === '/__e2e/pending-source') {
    return json(res, { pending: delayedSourceResponses.has(parsed.query.anime) });
  }
  if (req.method === 'GET' && p === '/__e2e/release-source') {
    const key = parsed.query.anime;
    const release = delayedSourceResponses.get(key);
    delayedSourceResponses.delete(key);
    clearTimeout(delayedSourceTimeouts.get(key));
    delayedSourceTimeouts.delete(key);
    release?.();
    return json(res, { released: Boolean(release) });
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
  if (req.method === 'GET' && (p === '/api/anime/trending' || p === '/anime/trending')) return json(res, [
    { id: 'home-1', slug: 'destaque-da-semana', title: 'Destaque da semana', coverImage: '/images/logo.png', status: 'LANCAMENTO', audio: 'LEGENDADO', rating: 8.5 },
    { id: 'home-2', slug: 'uma-historia-para-descobrir', title: 'Uma história para descobrir', coverImage: '/images/logo.png', status: 'FINALIZADO', audio: 'DUBLADO', rating: 9 },
  ]);
  if (req.method === 'GET' && (p === '/api/recently-added' || p === '/anime/recently-added')) return json(res, []);

  const episodeMatch = p && (p.match(/^\/api\/episode\/([^/]+)\/(\d+)$/) || p.match(/^\/episode\/([^/]+)\/(\d+)$/));
  if (req.method === 'GET' && episodeMatch) {
    const slug = episodeMatch[1];
    const number = Number(episodeMatch[2]);
    return json(res, {
      id: `episode-${slug}-${number}`,
      number,
      title: `Episódio ${number}`,
      thumbnailUrl: null,
      videoUrl: null,
      embedUrl: null,
      duration: '24 min',
      views: 10,
      dateModified: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      anime: {
        id: `anime-${slug}`,
        slug,
        title: slug === 'slow-stream' ? 'Anime com stream lento' : 'Anime E2E',
        synopsis: 'Sinopse de teste.',
        coverImage: null,
        bannerImage: null,
        rating: 8,
        ageRating: null,
        status: 'EM_EXIBICAO',
        audio: 'LEGENDADO',
        format: 'TV',
        year: 2026,
        season: 'WINTER',
        studios: [],
        themes: [],
        genres: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });
  }

  if (req.method === 'GET' && (p === '/api/stream/source/async' || p === '/stream/source/async')) {
    if (parsed.query.anime === 'cached-stream') {
      return json(res, {
        animeSlug: 'cached-stream', episodeNumber: 1,
        src: 'https://video.example/episode.m3u8', rawVideoUrl: null,
        embedUrl: null, reextracted: false, thumbnailUrl: null,
      });
    }
    if (parsed.query.anime.startsWith('server-selection-')) {
      const sourceId = parsed.query.sourceId || null;
      const sources = [
        { id: 'animesonline', label: 'Animes Online' },
        { id: 'topanimes', label: 'Top Animes' },
      ];
      const response = () => json(res, {
        animeSlug: 'server-selection', episodeNumber: 1,
        src: `http://localhost:${process.env.MOCK_BACKEND_PORT || 3001}/__e2e/video/${sourceId || 'auto'}.mp4`, rawVideoUrl: null,
        embedUrl: null, reextracted: false, thumbnailUrl: null,
        availableSources: sources, selectedSourceId: sourceId,
      });
      if (sourceId === 'animesonline') {
        const key = parsed.query.anime;
        delayedSourceResponses.set(key, response);
        delayedSourceTimeouts.set(key, setTimeout(() => {
          if (delayedSourceResponses.get(key) !== response) return;
          delayedSourceResponses.delete(key);
          delayedSourceTimeouts.delete(key);
          response();
        }, 30_000));
        return;
      }
      return response();
    }
    const response = () => json(res, { jobId: 'slow-job', status: 'pending' }, 202);
    if (parsed.query.anime === 'slow-stream') return setTimeout(response, 5_000);
    return response();
  }

  if (req.method === 'GET' && (p === '/api/stream/source' || p === '/stream/source')) {
    // Slug usado pelo spec de prefetch: fonte mp4 (o player não suporta HLS no
    // headless e o erro trocaria o <video> pelo painel de falha).
    if (parsed.query.anime === 'prefetch-next') {
      const episode = parsed.query.episode || '1';
      return json(res, {
        animeSlug: 'prefetch-next',
        episodeNumber: Number(episode) || 1,
        src: `http://localhost:${process.env.MOCK_BACKEND_PORT || 3001}/__e2e/video/${episode}.mp4`,
        rawVideoUrl: null, embedUrl: null, reextracted: false, thumbnailUrl: null,
      });
    }
    const hasAuth = (req.headers.cookie || '').includes('role=');
    if (parsed.query.refresh === '1' && !hasAuth) {
      return json(res, { message: 'Não autenticado.' }, 400);
    }
    if (parsed.query.anime === 'slow-stream') {
      return json(res, { jobId: 'slow-job', status: 'pending' }, 202);
    }
    return json(res, {
      animeSlug: parsed.query.anime || 'test', episodeNumber: Number(parsed.query.episode) || 1,
      src: 'https://video.example/episode.m3u8', rawVideoUrl: null,
      embedUrl: null, reextracted: false, thumbnailUrl: null,
    });
  }

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

  // --- Sessão: /user/me ---
  const userMeMatch = p && (p === '/api/user/me' || p === '/user/me');
  if (req.method === 'GET' && userMeMatch) {
    if (!req.headers.cookie?.includes('role='))
      return json(res, { message: 'Unauthorized' }, 401);
    return json(res, {
      id: 'viewer-1', email: 'viewer@test.dev', name: 'Viewer', userName: 'viewer',
      avatar: null, bio: null, myAnimeList: null, role: 'USER',
      isVerified: true,
      createdAt: '2020-01-01T00:00:00.000Z', updatedAt: new Date().toISOString(),
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

  // --- Gacha: respostas default vazias/liberadas; specs sobrescrevem p/ dados controlados ---
  if (req.method === 'GET' && (p === '/api/gacha/status' || p === '/gacha/status')) {
    return json(res, { canRoll: true, rollsLeft: 1, nextRollAt: null, pityDaysLeft: 30, pityDue: false, spinsLeft: 5, canSpin: true, nextSpinAt: null, canClaim: true, nextClaimAt: null, claimWarning: null, bypassPriceCents: null });
  }
  if (req.method === 'GET' && (p === '/api/gacha/spins' || p === '/gacha/spins')) return json(res, []);
  if (req.method === 'GET' && (p === '/api/gacha/recent' || p === '/gacha/recent')) return json(res, []);
  if (req.method === 'GET' && (p === '/api/gacha/ranking' || p === '/gacha/ranking')) return json(res, []);
  const gachaCollectionMatch = p && (p === '/api/gacha/collection' || p === '/gacha/collection');
  if (req.method === 'GET' && gachaCollectionMatch) {
    return json(res, { data: [], stats: { total: 0, totalValue: 0 }, meta: { total: 0, page: 1, limit: 24, totalPages: 0 } });
  }
  if (req.method === 'GET' && (p === '/api/gacha/featured' || p === '/gacha/featured')) return json(res, null);
  if (req.method === 'GET' && p && /^\/(api\/)?gacha\/featured\/.+/.test(p)) return json(res, null);
  if (req.method === 'GET' && (p === '/api/gacha/encyclopedia' || p === '/gacha/encyclopedia')) {
    return json(res, { view: "cards", cards: [], sets: [], meta: { total: 0, page: 1, limit: 24, totalPages: 0 } });
  }
  if (req.method === 'GET' && (p === '/api/gacha/trades/mine' || p === '/gacha/trades/mine')) {
    return json(res, []);
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/market/offers/mine')) {
    return json(res, []);
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/night-market/status')) {
    return json(res, { open: false, periodStart: null });
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/engagement-pilot')) {
    return json(res, { enabled: false, percent: 0 });
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/collections/progress')) {
    return json(res, []);
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/crystals')) {
    return json(res, {
      balance: mockEconomy.balance,
      dailyClaimedToday: mockEconomy.dailyClaimedToday,
      events: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy')) {
    return json(res, mockEconomy);
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/odds')) {
    return json(res, {
      versionId: 'mock-v1',
      version: 1,
      boxPrices: BOX_PRICES,
      keyPrice: KEY_PRICE,
      dailyBonus: DAILY_BONUS,
      categories: {
        COMMON: { CRYSTAL: 35, CARD: 30, KEY: 15, ITEM: 10, SPIN_RESET: 5, RARE_BOX: 5 },
        RARE: { CARD: 45, CRYSTAL: 25, ITEM: 15, KEY: 10, SKIN: 5 },
        PREMIUM: { CARD: 55, SKIN: 20, ITEM: 15, CRYSTAL: 10 },
      },
      qualities: {
        COMMON: { COMUM: 55, INCOMUM: 25, RARA: 12, EPICA: 6, LENDARIA: 2 },
        RARE: { RARA: 50, EPICA: 30, LENDARIA: 15, MITICA: 5 },
        PREMIUM: { EPICA: 45, LENDARIA: 35, MITICA: 15, GALACTICA: 5 },
      },
      foilWeights: { NORMAL: 75, HOLO: 15, GOLD: 7, INK: 2, PRISM: 1 },
      tierWeights: null,
      pityWeights: null,
      pityDays: 30,
      crystalPackages: [
        { id: 'BRL_490', cents: 490, crystals: 950 },
        { id: 'BRL_990', cents: 990, crystals: 2000 },
      ],
    });
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/shop')) {
    return json(res, []);
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/items/catalog')) {
    return json(res, []);
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/skins/mine')) {
    return json(res, []);
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/market/listings')) {
    return json(res, {
      items: [],
      page: Number(parsed.query.page || 1),
      limit: Number(parsed.query.limit || 24),
      total: 0,
    });
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/market/listings/mine')) {
    return json(res, {
      items: [],
      page: Number(parsed.query.page || 1),
      limit: Number(parsed.query.limit || 50),
      total: 0,
    });
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/market/orders/mine')) {
    return json(res, {
      items: [],
      page: Number(parsed.query.page || 1),
      limit: Number(parsed.query.limit || 50),
      total: 0,
    });
  }
  if (req.method === 'GET' && isApiRoute(p, '/gacha/economy/market/mission')) {
    return json(res, {
      periodStart: new Date().toISOString(),
      visits: 0,
      listingQualified: false,
      ready: false,
      claimedAt: null,
    });
  }
  if (req.method === 'POST' && isApiRoute(p, '/gacha/economy/market/visit')) {
    return json(res, {
      periodStart: new Date().toISOString(),
      visits: 1,
      listingQualified: false,
      ready: false,
      claimedAt: null,
    });
  }
  if (req.method === 'POST' && isApiRoute(p, '/gacha/economy/daily')) {
    mockEconomy.dailyClaimedToday = true;
    mockEconomy.balance += DAILY_BONUS;
    mockEconomy.available += DAILY_BONUS;
    return json(res, {
      claimed: DAILY_BONUS,
      day: new Date().toISOString().slice(0, 10),
    });
  }
  if (req.method === 'POST' && isApiRoute(p, '/gacha/economy/weekly')) {
    mockEconomy.weeklyRewardReady = false;
    mockEconomy.commonBoxes += 1;
    return json(res, { inventory: mockEconomy });
  }
  if (req.method === 'POST' && isApiRoute(p, '/gacha/economy/keys')) {
    if (mockEconomy.available < KEY_PRICE) {
      return json(res, { message: 'Cristais insuficientes.' }, 400);
    }
    mockEconomy.balance -= KEY_PRICE;
    mockEconomy.available -= KEY_PRICE;
    mockEconomy.keys += 1;
    return json(res, { inventory: mockEconomy });
  }
  if (req.method === 'POST' && isApiRoute(p, '/gacha/economy/boxes')) {
    readJsonBody(req, res, (body) => {
      const tier = body?.tier;
      if (!Object.prototype.hasOwnProperty.call(BOX_PRICES, tier)) {
        return json(res, { message: 'Tipo de caixa inválido.' }, 400);
      }
      const price = BOX_PRICES[tier];
      if (mockEconomy.available < price) {
        return json(res, { message: 'Cristais insuficientes.' }, 400);
      }
      mockEconomy.balance -= price;
      mockEconomy.available -= price;
      mockEconomy[BOX_FIELD[tier]] += 1;
      return json(res, { inventory: mockEconomy });
    });
    return;
  }
  if (req.method === 'POST' && isApiRoute(p, '/gacha/economy/boxes/open')) {
    readJsonBody(req, res, (body) => {
      const tier = body?.tier;
      if (!Object.prototype.hasOwnProperty.call(BOX_FIELD, tier)) {
        return json(res, { message: 'Tipo de caixa inválido.' }, 400);
      }
      const field = BOX_FIELD[tier];
      if (mockEconomy[field] < 1 || mockEconomy.keys < 1) {
        return json(
          res,
          { message: 'Você precisa de uma caixa e uma chave para abrir.' },
          400,
        );
      }
      const delayMs = Math.max(0, Number(process.env.MOCK_OPEN_DELAY_MS) || 0);
      const completeOpen = () => {
        const picked = pickMockBoxReward();
        if (picked.errorStatus) {
          return json(res, { message: picked.errorMessage }, picked.errorStatus);
        }
        mockEconomy[field] -= 1;
        mockEconomy.keys -= 1;
        const reward = picked.reward;
        if (reward && typeof reward === 'object') {
          const amount = Number(reward.amount);
          if (Number.isSafeInteger(amount) && amount > 0) {
            if (reward.category === 'CRYSTAL') {
              mockEconomy.balance += amount;
              mockEconomy.available += amount;
            } else if (reward.category === 'KEY') {
              mockEconomy.keys += amount;
            } else if (reward.category === 'SPIN_RESET') {
              mockEconomy.spinResets += amount;
            } else if (reward.category === 'RARE_BOX') {
              mockEconomy.rareBoxes += amount;
            }
          }
        }
        return json(res, { reward, inventory: mockEconomy });
      };
      if (delayMs > 0) {
        setTimeout(completeOpen, delayMs);
      } else {
        completeOpen();
      }
    });
    return;
  }
  if (req.method === 'POST' && isApiRoute(p, '/gacha/economy/spin-reset')) {
    if (mockEconomy.spinResets > 0) {
      mockEconomy.spinResets -= 1;
    }
    return json(res, { inventory: mockEconomy });
  }
  if (req.method === 'GET' && (p === '/api/gacha/shop' || p === '/gacha/shop')) {
    return json(res, { balance: 0, cosmetics: [], activeCardBack: null, spinPrice: 0 });
  }
  if (req.method === 'GET' && (p === '/api/gacha/loadout' || p === '/gacha/loadout')) {
    return json(res, { loadout: { FRAME: null, HIGHLIGHT: null }, cardBack: null });
  }
  if (req.method === 'PATCH' && (p === '/api/gacha/loadout' || p === '/gacha/loadout')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const b = JSON.parse(body || '{}');
        const slot = b.slot === 'FRAME' || b.slot === 'HIGHLIGHT' ? b.slot : 'FRAME';
        const key = typeof b.key === 'string' && b.key ? b.key : null;
        return json(res, { gachaLoadout: { FRAME: null, HIGHLIGHT: null, [slot]: key } });
      } catch (e) {
        res.writeHead(400);
        res.end('bad json');
      }
    });
    return;
  }
  if (req.method === 'PATCH' && (p === '/api/gacha/card-back' || p === '/gacha/card-back')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const b = JSON.parse(body || '{}');
        return json(res, { gachaCardBack: typeof b.key === 'string' && b.key ? b.key : null });
      } catch (e) {
        res.writeHead(400);
        res.end('bad json');
      }
    });
    return;
  }
  const gachaCardBackSvg = p && p.match(/^\/(api\/)?gacha\/card-backs\/([^/]+)$/);
  if (req.method === 'GET' && gachaCardBackSvg) {
    return json(res, { key: decodeURIComponent(gachaCardBackSvg[2]), name: '', svg: null, previewUrl: null });
  }
  if (req.method === 'GET' && p && /^\/(api\/)?gacha\/cards\/.+/.test(p)) return json(res, {
    id: p.split('/').pop(), condition: 0.04, foil: 'GOLD', edition: 1, value: 9500,
    obtainedAt: new Date().toISOString(), user: { id: 'viewer-1', name: 'Viewer', userName: 'viewer', avatar: null },
    card: { id: 'w-e2e', name: 'Waifu E2E', image: null, rarity: 'EPICA', favourites: 5000, animeId: null, animeTitle: 'Anime E2E', anime: null },
  });
  if (req.method === 'POST' && (p === '/api/gacha/spin' || p === '/gacha/spin')) {
    return json(res, {
      id: 'spin-e2e', hour: new Date().toISOString(), slot: 0, condition: 0.04, conditionLabel: 'MINT',
      foil: 'GOLD', value: 9500, claimedAt: null, expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(), pityDue: false,
      card: { id: 'w-e2e', name: 'Waifu E2E', image: null, rarity: 'EPICA', favourites: 5000, animeId: null, animeTitle: 'Anime E2E', anime: null },
    });
  }
  if (req.method === 'POST' && (p === '/api/gacha/claim' || p === '/gacha/claim')) {
    return json(res, {
      id: 'pull-e2e',
      condition: 0.04,
      conditionLabel: 'MINT',
      foil: 'GOLD',
      edition: 1,
      value: 9500,
      obtainedAt: new Date().toISOString(),
      user: { id: 'viewer-1', name: 'Viewer', userName: 'viewer', avatar: null },
      card: {
        id: 'w-e2e', name: 'Waifu E2E', image: null, rarity: 'EPICA',
        favourites: 5000, animeId: null, animeTitle: 'Anime E2E', anime: null,
      },
    });
  }
  if (req.method === 'POST' && (p === '/api/gacha/bypass' || p === '/gacha/bypass')) {
    return json(res, { reference: 'bypass-e2e', checkoutUrl: 'https://checkout.livepix.gg/bypass-e2e', amountCents: 299 });
  }
  const gachaBypassPoll = p && p.match(/^\/(api\/)?gacha\/bypass\/.+$/);
  if (req.method === 'GET' && gachaBypassPoll) return json(res, { status: 'PENDING' });

  // fallback
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('[]');
});

const port = process.env.MOCK_BACKEND_PORT || 3001;
server.listen(port, () => console.log('mock-backend listening on', port));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
