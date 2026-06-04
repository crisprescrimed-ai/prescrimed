import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';

const port = process.env.PORT || 3000;
const distDir = path.resolve('dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.woff2': 'font/woff2'
};

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  try {
    // Simple healthcheck endpoint
    if (req.url === '/health' || req.url === '/_health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(distDir, urlPath);

    // If requested file exists, serve it
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      const indexContent = await readFile(indexFile);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexContent);
      return;
    }

    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  } catch (err) {
    // On any error, fallback to serving SPA index.html (if exists)
    try {
      const index = path.join(distDir, 'index.html');
      const indexContent = await readFile(index);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexContent);
    } catch (e) {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});

export default server;
