const http = require('http');
const url = require('url');

function json(res, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(s);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const p = parsed.pathname;
  if (req.method === 'GET' && (p === '/api/anime' || p === '/anime')) return json(res, []);
  if (req.method === 'GET' && (p === '/api/episode/latest' || p === '/episode/latest')) return json(res, []);
  if (req.method === 'GET' && (p === '/api/anime/trending' || p === '/anime/trending')) return json(res, []);
  if (req.method === 'GET' && (p === '/api/recently-added' || p === '/anime/recently-added')) return json(res, []);

  const userProfileMatch = p && p.match(/^\/api\/user\/([^/]+)\/profile$/) || (p && p.match(/^\/user\/([^/]+)\/profile$/));
  if (req.method === 'GET' && userProfileMatch) {
    const id = userProfileMatch[1];
    return json(res, { id, name: 'Mock', userName: 'mock', avatar: null, bio: 'Bio here', createdAt: new Date().toISOString(), _count: { comments: 0, ratings: 0, favorites: 0, watchHistories: 0 } });
  }

  const userCommentsMatch = p && p.match(/^\/api\/user\/([^/]+)\/comments$/) || (p && p.match(/^\/user\/([^/]+)\/comments$/));
  if (req.method === 'GET' && userCommentsMatch) return json(res, []);
  const userRatingsMatch = p && p.match(/^\/api\/user\/([^/]+)\/ratings$/) || (p && p.match(/^\/user\/([^/]+)\/ratings$/));
  if (req.method === 'GET' && userRatingsMatch) return json(res, []);
  const userFavsMatch = p && p.match(/^\/api\/user\/([^/]+)\/favorites$/) || (p && p.match(/^\/user\/([^/]+)\/favorites$/));
  if (req.method === 'GET' && userFavsMatch) return json(res, { data: [] });

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

  // fallback
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('[]');
});

const port = process.env.MOCK_BACKEND_PORT || 3001;
server.listen(port, () => console.log('mock-backend listening on', port));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
