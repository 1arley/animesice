// Verificação temporária: mock do endpoint de episódio para testar VideoObject JSON-LD.
const http = require('http');

const EPISODE = {
  id: 'ep-1',
  number: 6,
  title: 'Episódio 6',
  thumbnailUrl: 'https://cdn.myanimelist.net/images/anime/1015/100212l.jpg',
  videoUrl: null,
  embedUrl: 'https://third-party.example/embed/slime-6',
  duration: '24 min',
  views: 1520,
  dateModified: '2024-01-15T00:00:00.000Z',
  createdAt: '2024-01-10T12:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  anime: {
    id: 'a-1',
    slug: 'tensei-shitara-slime-datta-ken',
    title: 'Tensei Shitara Slime Datta Ken',
    synopsis: 'Um salário preso em uma masmorra vira um slime com poderes incríveis.',
    coverImage: 'https://cdn.myanimelist.net/images/anime/1015/100212l.jpg',
    bannerImage: null,
    rating: 8.5,
    ageRating: null,
    status: 'FINALIZADO',
    audio: 'LEGENDADO',
    format: 'TV',
    year: 2018,
    season: 'FALL',
    studios: ['8bit'],
    themes: [],
    genres: [{ id: 'g1', slug: 'action', name: 'Action' }],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  const p = req.url.split('?')[0];
  if (req.method === 'GET' && (p === '/api/episode/latest' || p === '/episode/latest')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end('[]');
  }
  const match = p.match(/^\/api\/episode\/([^/]+)\/(\d+)$/) || p.match(/^\/episode\/([^/]+)\/(\d+)$/);
  if (req.method === 'GET' && match) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(EPISODE));
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('[]');
});

server.listen(3001, () => console.log('episode-mock listening on 3001'));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
