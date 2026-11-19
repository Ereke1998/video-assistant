// Мини-сервер статики для превью и рендера (ES-модули не грузятся с file://).
// Запуск превью: node scripts/server.mjs → http://localhost:5173
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.css': 'text/css' };

export function serve(port = 0) {
  return new Promise((resolve) => {
    const srv = createServer(async (req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
      const file = join(ROOT, path || 'index.html');
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      try {
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
      } catch { res.writeHead(404).end(); }
    });
    srv.listen(port, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}/` }));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await serve(+(process.env.PORT || 5173));
  console.log(`Превью: ${url}  (добавь ?safe — безопасные зоны)`);
}
