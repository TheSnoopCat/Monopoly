'use strict';
// Estate Empire - local multiplayer server. Zero dependencies: `node server.js`
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const game = require('./game');

const PORT = +process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

const rooms = new Map(); // code -> { g, secrets: Map(pid->secret), conns: Map(pid->Set(res)), touched }

function newCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += letters[crypto.randomInt(letters.length)];
    if (!rooms.has(c)) return c;
  }
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 20000) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function broadcast(room) {
  room.touched = Date.now();
  for (const [pid, set] of room.conns) {
    const payload = `data: ${JSON.stringify(game.view(room.g, pid))}\n\n`;
    for (const res of set) res.write(payload);
  }
}

function auth(body) {
  const room = rooms.get(String(body.code || '').toUpperCase());
  if (!room) return { error: 'Room not found' };
  const pid = +body.pid;
  if (!room.secrets.has(pid) || room.secrets.get(pid) !== body.secret) return { error: 'Not authorised' };
  return { room, pid };
}

function setConnected(room, pid, val) {
  const p = game.P(room.g, pid);
  if (p && p.connected !== val) { p.connected = val; game.tick(room.g); broadcast(room); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && url.pathname === '/api/board') return send(res, 200, game.BOARD);

    if (req.method === 'GET' && url.pathname === '/api/events') {
      const room = rooms.get(String(url.searchParams.get('code') || '').toUpperCase());
      const pid = +url.searchParams.get('pid');
      if (!room || room.secrets.get(pid) !== url.searchParams.get('secret')) { res.writeHead(403); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 1500\n\n');
      if (!room.conns.has(pid)) room.conns.set(pid, new Set());
      room.conns.get(pid).add(res);
      setConnected(room, pid, true);
      res.write(`data: ${JSON.stringify(game.view(room.g, pid))}\n\n`);
      const hb = setInterval(() => res.write(': hb\n\n'), 15000);
      req.on('close', () => {
        clearInterval(hb);
        const set = room.conns.get(pid);
        if (set) { set.delete(res); if (!set.size) setConnected(room, pid, false); }
      });
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      const body = await readBody(req);
      if (url.pathname === '/api/create') {
        const code = newCode();
        const g = game.newGame(body.settings || {});
        const r = game.addPlayer(g, body.name);
        const secret = crypto.randomBytes(12).toString('hex');
        rooms.set(code, { g, secrets: new Map([[r.player.id, secret]]), conns: new Map(), touched: Date.now() });
        return send(res, 200, { code, pid: r.player.id, secret });
      }
      if (url.pathname === '/api/join') {
        const room = rooms.get(String(body.code || '').toUpperCase());
        if (!room) return send(res, 200, { error: 'Room not found - check the code' });
        const r = game.addPlayer(room.g, body.name);
        if (r.error) return send(res, 200, { error: r.error });
        const secret = crypto.randomBytes(12).toString('hex');
        room.secrets.set(r.player.id, secret);
        broadcast(room);
        return send(res, 200, { code: String(body.code).toUpperCase(), pid: r.player.id, secret });
      }
      if (url.pathname === '/api/act') {
        const a = auth(body);
        if (a.error) return send(res, 200, { error: a.error });
        const err = game.act(a.room.g, a.pid, body);
        broadcast(a.room);
        return send(res, 200, err ? { error: err } : { ok: true });
      }
    }

    // static files
    let file = url.pathname === '/' ? '/index.html' : url.pathname;
    const full = path.normalize(path.join(PUBLIC, file));
    if (!full.startsWith(PUBLIC + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.writeHead(404); return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(full).pipe(res);
  } catch (e) {
    if (!res.headersSent) send(res, 400, { error: 'Bad request' });
  }
});

// Clean up rooms nobody has touched for 12 hours
setInterval(() => {
  const cutoff = Date.now() - 12 * 3600 * 1000;
  for (const [code, room] of rooms) if (room.touched < cutoff) rooms.delete(code);
}, 600000).unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  🏠  ESTATE EMPIRE is running!\n');
  console.log(`  On this computer:   http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const n of nets[name]) {
      if (n.family === 'IPv4' && !n.internal) console.log(`  Friends on your Wi-Fi/LAN:  http://${n.address}:${PORT}`);
    }
  }
  console.log('\n  Press Ctrl+C to stop.\n');
});

module.exports = server;
