const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'text/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // 1. Strip query string (?v=...) and hash (#...)
    const cleanUrl = req.url.split('?')[0].split('#')[0];
    const pathname = cleanUrl === '/' ? '/index.html' : cleanUrl;

    // 2. Normalize and prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, safePath);

    // 3. Determine MIME Type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 4. Read and Serve File
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.warn(`[404 NOT FOUND] ${req.method} ${cleanUrl}`);
                res.writeHead(404, { 
                    'Content-Type': 'text/html; charset=UTF-8',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(`<h1>404 Not Found</h1><p>File tidak ditemukan: ${cleanUrl}</p>`, 'utf-8');
            } else {
                console.error(`[500 ERROR] ${req.method} ${cleanUrl}: ${err.code}`);
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            console.log(`[200 OK] ${req.method} ${cleanUrl} (${contentType})`);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` GIVORA Server Berjalan di: http://localhost:${PORT}/`);
    console.log(` Support: HTML, CSS, JS, SVG, Images, Query Strings`);
    console.log(`====================================================`);
});
