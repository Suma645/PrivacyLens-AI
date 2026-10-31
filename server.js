// Unified Production Server for Render / Linux / Cloud Deployments
// Serves Vite React Frontend (frontend/dist) and proxies /api/* to Python Flask backend
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT, 10) || 10000;
const FLASK_PORT = parseInt(process.env.FLASK_PORT, 10) || 5000;
const DIST_DIR = path.join(__dirname, 'frontend', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

// 1. Launch Python Flask Backend
let pythonProcess = null;

function startFlaskBackend() {
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const backendScript = path.join(__dirname, 'backend', 'app.py');

  console.log(`[*] Spawning Python Flask backend (${pythonCmd} ${backendScript}) on internal port ${FLASK_PORT}...`);

  const env = Object.assign({}, process.env, {
    PORT: String(FLASK_PORT),
    FLASK_ENV: 'production',
    PYTHONUNBUFFERED: '1'
  });

  try {
    pythonProcess = spawn(pythonCmd, [backendScript], {
      cwd: path.join(__dirname, 'backend'),
      env,
      stdio: ['ignore', 'inherit', 'inherit']
    });

    pythonProcess.on('error', (err) => {
      console.warn(`[!] Failed to spawn ${pythonCmd}: ${err.message}. Trying 'python'...`);
      if (pythonCmd !== 'python') {
        pythonProcess = spawn('python', [backendScript], {
          cwd: path.join(__dirname, 'backend'),
          env,
          stdio: ['ignore', 'inherit', 'inherit']
        });
      }
    });

    pythonProcess.on('exit', (code, signal) => {
      console.warn(`[!] Flask backend exited with code ${code} signal ${signal}`);
    });
  } catch (err) {
    console.warn(`[!] Exception starting Python backend: ${err.message}`);
  }
}

// 2. Proxy request to Flask
function proxyToFlask(req, res, attempt = 1) {
  const options = {
    hostname: '127.0.0.1',
    port: FLASK_PORT,
    path: req.url,
    method: req.method,
    headers: Object.assign({}, req.headers, {
      host: `127.0.0.1:${FLASK_PORT}`
    })
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    // If Flask is still warming up during first 15 seconds, retry briefly
    if (attempt <= 10 && (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET')) {
      setTimeout(() => {
        proxyToFlask(req, res, attempt + 1);
      }, 1000);
      return;
    }

    console.warn(`[!] Flask Proxy Error (${req.method} ${req.url}): ${err.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Backend engine initializing or temporarily unreachable',
      status: 'offline',
      details: err.message
    }));
  });

  req.pipe(proxyReq);
}

// 3. Serve Static Files from frontend/dist
function serveStaticFile(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  let filePath = path.join(DIST_DIR, pathname);

  // Security check: ensure path is inside DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA fallback: Return index.html for client-side routing
    const indexPath = path.join(DIST_DIR, 'index.html');
    fs.readFile(indexPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('PrivacyLens-AI Frontend build not found. Run npm run build.');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
}

// 4. Main HTTP Server
const server = http.createServer((req, res) => {
  // Always enable CORS for API routes
  if (req.url.startsWith('/api/')) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }

    proxyToFlask(req, res);
    return;
  }

  // Serve static files / SPA
  serveStaticFile(req, res);
});

// Start Flask and HTTP Server
startFlaskBackend();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[+] PrivacyLens-AI unified server listening on http://0.0.0.0:${PORT}`);
  console.log(`[+] Frontend served from: ${DIST_DIR}`);
  console.log(`[+] Backend API proxied to: http://127.0.0.1:${FLASK_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill('SIGTERM');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill('SIGINT');
  server.close(() => process.exit(0));
});
