/* Development-only static server. GitHub Pages serves the production artifact. */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};
const publicFiles = new Set([
  'index.html', '404.html', 'robots.txt', 'sitemap.xml',
  'manifest.webmanifest', '.nojekyll'
]);

function isPublic(relative) {
  if (publicFiles.has(relative)) return true;
  const parts = relative.split(path.sep);
  return (parts[0] === 'assets' || parts[0] === 'data') &&
    parts.length >= 2 && parts.every(part => part && part !== '..' && !part.startsWith('.'));
}

function createServer() {
  return http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch (_) { response.writeHead(400).end('Bad request'); return; }

    const target = path.resolve(root, pathname.replace(/^\/+/, '') || 'index.html');
    const relative = path.relative(root, target);
    if (!isPublic(relative)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    fs.stat(target, (error, stat) => {
      if (error || !stat.isFile()) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': contentTypes[path.extname(target)] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(target).pipe(response);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  createServer().listen(port, '127.0.0.1', () => {
    console.log('Property Lens development server: http://127.0.0.1:' + port);
  });
}

module.exports = { createServer };
