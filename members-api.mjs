import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const PREFIX = '/api/members';
const COOKIE = 'mavo_member_session';
const SESSION_SECONDS = 8 * 60 * 60;
const MAX_BODY = 32 * 1024;
const MAX_QUANTITY = 1_000_000;

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const now = () => new Date().toISOString();
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const normalize = value => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value;

function text(value, label, {max = 500, required = false} = {}) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') fail(400, 'INVALID_INPUT', `${label}ต้องเป็นข้อความ`);
  value = value.trim();
  if (value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value)) {
    fail(400, 'INVALID_INPUT', `${label}ยาวเกินไปหรือมีอักขระที่ไม่รองรับ`);
  }
  if (required && !value) fail(400, 'INVALID_INPUT', `กรุณาระบุ${label}`);
  return value;
}

function integer(value, label, {min = 0, max = MAX_QUANTITY} = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(400, 'INVALID_QUANTITY', `${label}ต้องเป็นจำนวนเต็มตั้งแต่ ${min} ถึง ${max}`);
  }
  return value;
}

function credentials(body) {
  const username = text(body.username, 'ชื่อผู้ใช้', {required:true, max:100}).toLowerCase();
  if (!/^[\p{L}\p{N}_.@+-]{3,100}$/u.test(username)) {
    fail(400, 'INVALID_USERNAME', 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัว ใช้ตัวอักษร ตัวเลข หรือ _.@+-');
  }
  if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) {
    fail(400, 'INVALID_PASSWORD', 'รหัสผ่านต้องมี 12 ถึง 256 ตัวอักษร');
  }
  return {username, password:body.password};
}

async function readJSON(req) {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type'] || '')) {
    fail(415, 'JSON_REQUIRED', 'กรุณาส่งข้อมูลแบบ JSON');
  }
  if (Number(req.headers['content-length'] || 0) > MAX_BODY) {
    req.resume();
    fail(413, 'BODY_TOO_LARGE', 'ข้อมูลที่ส่งมีขนาดใหญ่เกินไป');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= MAX_BODY) chunks.push(chunk);
  }
  if (size > MAX_BODY) fail(413, 'BODY_TOO_LARGE', 'ข้อมูลที่ส่งมีขนาดใหญ่เกินไป');
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { fail(400, 'INVALID_JSON', 'ข้อมูล JSON ไม่ถูกต้อง'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'INVALID_JSON', 'ข้อมูลต้องเป็น JSON object');
  return body;
}

function protectRequest(req) {
  let host;
  try { host = new URL(`http://${req.headers.host || ''}`); }
  catch { fail(403, 'INVALID_HOST', 'เปิดระบบผ่านที่อยู่ในเครื่องเท่านั้น'); }
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host.hostname)
      || host.username || host.password || host.pathname !== '/' || host.search || host.hash) {
    fail(403, 'INVALID_HOST', 'เปิดระบบผ่านที่อยู่ในเครื่องเท่านั้น');
  }
  const origin = `${req.socket.encrypted ? 'https:' : 'http:'}//${req.headers.host}`;
  if (req.headers.origin && req.headers.origin !== origin) {
    fail(403, 'INVALID_ORIGIN', 'กรุณาทำรายการจากหน้าระบบสมาชิกนี้');
  }
  if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== origin) {
    fail(403, 'ORIGIN_REQUIRED', 'กรุณาทำรายการจากหน้าระบบสมาชิกนี้');
  }
  if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'INVALID_ORIGIN', 'ไม่รับรายการจากเว็บไซต์อื่น');
}

function reply(res, status, data) {
  res.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer'
  });
  res.end(JSON.stringify(data));
}

function cookie(req, res, token = '', clear = false) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${req.socket.encrypted ? '; Secure' : ''}`);
}

/** Local-only member service. Keep databasePath outside the static document root. */
export function createMembersApi({databasePath, productsPath}) {
  if (!databasePath || !productsPath) throw new TypeError('databasePath and productsPath are required');
  const source = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  if (!Array.isArray(source.records)) throw new Error('Invalid product catalogue');
  const products = source.records.map(record => ({
    sku:String(record.sku), model:String(record.model || ''), brand:String(record.brand || ''),
    color:String(record.color || ''), unit:String(record.unit || 'กล่อง'),
    salePriceIncVat:Number(record.salePriceIncVat)
  }));
  if (products.some(product => !product.sku || !Number.isFinite(product.salePriceIncVat) || product.salePriceIncVat < 0)) {
    throw new Error('Invalid public catalogue product');
  }
  const bySku = new Map(products.map(product => [product.sku, product]));
  if (bySku.size !== products.length) throw new Error('Duplicate catalogue SKU');
  fs.mkdirSync(path.dirname(databasePath), {recursive:true});
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 1) { db.close(); throw new Error('Unsupported member database version'); }
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','customer')),
      company_id TEXT REFERENCES companies(id), created_at TEXT NOT NULL,
      CHECK((role='admin' AND company_id IS NULL) OR (role='customer' AND company_id IS NOT NULL))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL, created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS stock_settings (
      company_id TEXT NOT NULL REFERENCES companies(id), sku TEXT NOT NULL,
      unit TEXT NOT NULL, min_stock INTEGER NOT NULL DEFAULT 0 CHECK(min_stock>=0),
      PRIMARY KEY(company_id, sku)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS restock_requests (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), sku TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity>0),
      status TEXT NOT NULL CHECK(status IN ('requested','reviewed','shipped','received','canceled')),
      note TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), sku TEXT NOT NULL,
      delta INTEGER NOT NULL CHECK(delta<>0), type TEXT NOT NULL CHECK(type IN ('receive','use','adjust','request_receive')),
      reason TEXT NOT NULL DEFAULT '', actor_id TEXT NOT NULL REFERENCES users(id),
      request_id TEXT UNIQUE REFERENCES restock_requests(id), created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS idempotency (
      actor_id TEXT NOT NULL REFERENCES users(id), mutation_id TEXT NOT NULL,
      method TEXT NOT NULL, route TEXT NOT NULL, payload_hash TEXT NOT NULL,
      response_json TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY(actor_id, mutation_id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY, actor_id TEXT REFERENCES users(id), company_id TEXT REFERENCES companies(id),
      action TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS stock_movements_company_sku ON stock_movements(company_id,sku);
    CREATE INDEX IF NOT EXISTS restock_requests_company ON restock_requests(company_id,created_at);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    PRAGMA user_version = 1;
  `);
  const failures = new Map();
  const publicUser = row => row ? {id:row.id, name:row.name, username:row.username, role:row.role, companyId:row.company_id} : null;
  const needsSetup = () => db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;
  const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
  const audit = (actor, action, details, companyId = null) => db.prepare(
    'INSERT INTO audit_events(id,actor_id,company_id,action,details,created_at) VALUES(?,?,?,?,?,?)'
  ).run(crypto.randomUUID(), actor?.id || null, companyId, action, JSON.stringify(details), now());

  function getSession(req) {
    const value = (req.headers.cookie || '').split(';').map(part => part.trim())
      .find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return {tokenHash:null, user:null};
    const tokenHash = digest(value);
    const row = db.prepare(`SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=?`).get(tokenHash);
    if (!row || row.expires_at <= Date.now()) {
      if (row) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash);
      return {tokenHash:null, user:null};
    }
    return {tokenHash, user:publicUser(row)};
  }
  function startSession(req, res, user) {
    const oldSession = getSession(req);
    if (oldSession.tokenHash) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(oldSession.tokenHash);
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
    const token = crypto.randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)')
      .run(digest(token), user.id, Date.now() + SESSION_SECONDS * 1000, now());
    cookie(req, res, token);
  }
  function requireUser(req) {
    const session = getSession(req);
    if (!session.user) fail(401, 'AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบสมาชิก');
    return session.user;
  }
  function requireAdmin(user) {
    if (user.role !== 'admin') fail(403, 'ADMIN_REQUIRED', 'รายการนี้สำหรับทีม MAVO เท่านั้น');
  }
  function companyFor(user, body) {
    let id;
    if (user.role === 'customer') {
      if (body.companyId !== undefined && body.companyId !== user.companyId) {
        fail(403, 'COMPANY_FORBIDDEN', 'ไม่สามารถทำรายการให้บริษัทอื่นได้');
      }
      id = user.companyId;
    } else {
      id = text(body.companyId, 'บริษัท', {required:true, max:100});
    }
    if (!db.prepare('SELECT id FROM companies WHERE id=?').get(id)) fail(404, 'COMPANY_NOT_FOUND', 'ไม่พบบริษัทที่เลือก');
    return id;
  }
  function productFor(body) {
    const sku = text(body.sku, 'รหัสสินค้า', {required:true, max:100});
    const product = bySku.get(sku);
    if (!product) fail(400, 'INVALID_SKU', 'รหัสสินค้าไม่อยู่ในรายการ MAVO');
    return product;
  }
  function ensureStock(companyId, product) {
    db.prepare('INSERT OR IGNORE INTO stock_settings(company_id,sku,unit,min_stock) VALUES(?,?,?,0)')
      .run(companyId, product.sku, product.unit);
  }
  function stock(companyId, sku) {
    const setting = db.prepare('SELECT company_id AS companyId,sku,unit,min_stock AS minStock FROM stock_settings WHERE company_id=? AND sku=?')
      .get(companyId, sku);
    if (!setting) return null;
    const quantity = db.prepare('SELECT COALESCE(SUM(delta),0) AS quantity FROM stock_movements WHERE company_id=? AND sku=?')
      .get(companyId, sku).quantity;
    return {...setting, quantity};
  }
  function movement(id) {
    return db.prepare(`SELECT m.id,m.company_id AS companyId,m.sku,m.delta,m.type,m.reason,
      m.created_at AS createdAt,u.name AS actorName FROM stock_movements m JOIN users u ON u.id=m.actor_id WHERE m.id=?`).get(id);
  }
  function request(id) {
    return db.prepare(`SELECT id,company_id AS companyId,sku,quantity,status,note,
      created_at AS createdAt,updated_at AS updatedAt FROM restock_requests WHERE id=?`).get(id);
  }
  function addMovement(user, companyId, product, delta, type, reason, requestId = null) {
    ensureStock(companyId, product);
    const before = stock(companyId, product.sku).quantity;
    if (before + delta < 0) fail(409, 'INSUFFICIENT_STOCK', 'จำนวนเบิกใช้เกินสต็อกคงเหลือ');
    if (!Number.isSafeInteger(before + delta) || before + delta > 1_000_000_000) {
      fail(400, 'STOCK_LIMIT', 'ยอดสต็อกมากเกินขอบเขตที่ระบบรองรับ');
    }
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO stock_movements(id,company_id,sku,delta,type,reason,actor_id,request_id,created_at)
      VALUES(?,?,?,?,?,?,?,?,?)`).run(id, companyId, product.sku, delta, type, reason, user.id, requestId, now());
    audit(user, 'stock.movement', {id, sku:product.sku, delta, type, reason, requestId}, companyId);
    return movement(id);
  }
  function transact(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function once(user, req, route, body, operation) {
    const mutationId = text(body.mutationId, 'รหัสรายการ', {required:true, max:100});
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(mutationId)) fail(400, 'INVALID_MUTATION_ID', 'รหัสรายการไม่ถูกต้อง กรุณาลองใหม่');
    const payloadHash = digest(JSON.stringify(normalize(body)));
    return transact(() => {
      const previous = db.prepare('SELECT * FROM idempotency WHERE actor_id=? AND mutation_id=?').get(user.id, mutationId);
      if (previous) {
        if (previous.method !== req.method || previous.route !== route || previous.payload_hash !== payloadHash) {
          fail(409, 'MUTATION_CONFLICT', 'รหัสรายการนี้เคยใช้กับข้อมูลอื่นแล้ว กรุณาสร้างรายการใหม่');
        }
        return {...JSON.parse(previous.response_json), replayed:true};
      }
      const result = operation();
      db.prepare(`INSERT INTO idempotency(actor_id,mutation_id,method,route,payload_hash,response_json,created_at)
        VALUES(?,?,?,?,?,?,?)`).run(user.id, mutationId, req.method, route, payloadHash, JSON.stringify(result), now());
      return {...result, replayed:false};
    });
  }

  async function handle(req, res, url) {
    const route = url.pathname;
    if (route !== PREFIX && !route.startsWith(`${PREFIX}/`)) return false;
    try {
      protectRequest(req);
      if (req.method === 'GET' && route === `${PREFIX}/bootstrap`) {
        reply(res, 200, {needsSetup:needsSetup(), user:getSession(req).user});
        return true;
      }
      if (req.method === 'POST' && route === `${PREFIX}/setup`) {
        if (!needsSetup()) fail(409, 'SETUP_COMPLETE', 'ตั้งค่าผู้ดูแลแล้ว กรุณาเข้าสู่ระบบ');
        const body = await readJSON(req);
        const {username, password} = credentials(body);
        const name = text(body.name, 'ชื่อผู้ดูแล', {required:true, max:150});
        const salt = crypto.randomBytes(32).toString('hex');
        const passwordHash = hashPassword(password, salt);
        const user = transact(() => {
          if (!needsSetup()) fail(409, 'SETUP_COMPLETE', 'ตั้งค่าผู้ดูแลแล้ว กรุณาเข้าสู่ระบบ');
          const id = crypto.randomUUID();
          db.prepare(`INSERT INTO users(id,name,username,password_hash,password_salt,role,company_id,created_at)
            VALUES(?,?,?,?,?,'admin',NULL,?)`).run(id, name, username, passwordHash, salt, now());
          const result = publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
          audit(result, 'admin.setup', {username});
          return result;
        });
        startSession(req, res, user);
        reply(res, 201, {user});
        return true;
      }
      if (req.method === 'POST' && route === `${PREFIX}/login`) {
        const body = await readJSON(req);
        const username = text(body.username, 'ชื่อผู้ใช้', {required:true, max:100}).toLowerCase();
        const password = typeof body.password === 'string' && body.password.length <= 256 ? body.password : '';
        const key = `${req.socket.remoteAddress}|${username}`;
        let attempt = failures.get(key);
        if (attempt && attempt.until <= Date.now()) { failures.delete(key); attempt = null; }
        if (attempt?.count >= 8) fail(429, 'LOGIN_RATE_LIMIT', 'ลองเข้าสู่ระบบหลายครั้งแล้ว กรุณารอ 15 นาที');
        const row = db.prepare('SELECT * FROM users WHERE username=?').get(username);
        const salt = row?.password_salt || 'mavo-nonexistent-user-comparison';
        const actual = Buffer.from(hashPassword(password, salt), 'hex');
        const expected = row ? Buffer.from(row.password_hash, 'hex') : Buffer.alloc(64);
        if (!row || !crypto.timingSafeEqual(actual, expected)) {
          failures.set(key, {count:(attempt?.count || 0) + 1, until:attempt?.until || Date.now() + 15 * 60 * 1000});
          if (failures.size > 1000) for (const [entry, value] of failures) if (value.until < Date.now()) failures.delete(entry);
          fail(401, 'INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
        failures.delete(key);
        const user = publicUser(row);
        startSession(req, res, user);
        audit(user, 'session.login', {});
        reply(res, 200, {user});
        return true;
      }
      if (req.method === 'POST' && route === `${PREFIX}/logout`) {
        await readJSON(req);
        const session = getSession(req);
        if (session.tokenHash) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.tokenHash);
        cookie(req, res, '', true);
        reply(res, 200, {ok:true});
        return true;
      }
      const user = requireUser(req);
      if (req.method === 'GET' && route === `${PREFIX}/catalog`) {
        reply(res, 200, {products});
        return true;
      }
      if (req.method === 'GET' && route === `${PREFIX}/state`) {
        const scope = user.role === 'admin' ? [] : [user.companyId];
        const companyWhere = user.role === 'admin' ? '' : ' WHERE id=?';
        const settingsWhere = user.role === 'admin' ? '' : ' WHERE s.company_id=?';
        const movementWhere = user.role === 'admin' ? '' : ' WHERE m.company_id=?';
        const requestWhere = user.role === 'admin' ? '' : ' WHERE company_id=?';
        const companies = db.prepare(`SELECT id,name FROM companies${companyWhere} ORDER BY name,id`).all(...scope);
        const stocks = db.prepare(`SELECT s.company_id AS companyId,s.sku,s.unit,s.min_stock AS minStock,
          COALESCE((SELECT SUM(m.delta) FROM stock_movements m WHERE m.company_id=s.company_id AND m.sku=s.sku),0) AS quantity
          FROM stock_settings s${settingsWhere} ORDER BY s.company_id,s.sku`).all(...scope);
        const movements = db.prepare(`SELECT m.id,m.company_id AS companyId,m.sku,m.delta,m.type,m.reason,
          m.created_at AS createdAt,u.name AS actorName FROM stock_movements m JOIN users u ON u.id=m.actor_id
          ${movementWhere} ORDER BY m.created_at DESC,m.rowid DESC`).all(...scope);
        const requests = db.prepare(`SELECT id,company_id AS companyId,sku,quantity,status,note,
          created_at AS createdAt,updated_at AS updatedAt FROM restock_requests${requestWhere}
          ORDER BY created_at DESC,rowid DESC`).all(...scope);
        reply(res, 200, {user, companies, stocks, movements, requests});
        return true;
      }
      if (req.method === 'POST' && route === `${PREFIX}/companies`) {
        requireAdmin(user);
        const body = await readJSON(req);
        const name = text(body.name, 'ชื่อบริษัท', {required:true, max:180});
        const company = transact(() => {
          const result = {id:crypto.randomUUID(), name};
          db.prepare('INSERT INTO companies(id,name,created_at) VALUES(?,?,?)').run(result.id, result.name, now());
          audit(user, 'company.create', {name}, result.id);
          return result;
        });
        reply(res, 201, {company});
        return true;
      }
      if (req.method === 'POST' && route === `${PREFIX}/users`) {
        requireAdmin(user);
        const body = await readJSON(req);
        const companyId = companyFor(user, body);
        const name = text(body.name, 'ชื่อสมาชิก', {required:true, max:150});
        const {username, password} = credentials(body);
        if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) fail(409, 'USERNAME_EXISTS', 'มีชื่อผู้ใช้นี้แล้ว');
        const salt = crypto.randomBytes(32).toString('hex');
        const passwordHash = hashPassword(password, salt);
        const newUser = transact(() => {
          const id = crypto.randomUUID();
          db.prepare(`INSERT INTO users(id,name,username,password_hash,password_salt,role,company_id,created_at)
            VALUES(?,?,?,?,?,'customer',?,?)`).run(id, name, username, passwordHash, salt, companyId, now());
          audit(user, 'customer.create', {id, username, name}, companyId);
          return publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
        });
        reply(res, 201, {user:newUser});
        return true;
      }
      if (req.method === 'POST' && route === `${PREFIX}/stock-settings`) {
        requireAdmin(user);
        const body = await readJSON(req);
        const companyId = companyFor(user, body);
        const product = productFor(body);
        const minStock = integer(body.minStock, 'จำนวนขั้นต่ำ');
        const result = transact(() => {
          ensureStock(companyId, product);
          db.prepare('UPDATE stock_settings SET min_stock=? WHERE company_id=? AND sku=?').run(minStock, companyId, product.sku);
          audit(user, 'stock.minimum', {sku:product.sku, minStock}, companyId);
          return stock(companyId, product.sku);
        });
        reply(res, 200, {stock:result});
        return true;
      }
      if (req.method === 'POST' && route === `${PREFIX}/movements`) {
        const body = await readJSON(req);
        const companyId = companyFor(user, body);
        const product = productFor(body);
        const type = text(body.type, 'ประเภทรายการ', {required:true, max:30});
        if (!['receive','use','adjust'].includes(type)) fail(400, 'INVALID_MOVEMENT_TYPE', 'ประเภทรายการไม่ถูกต้อง');
        if (user.role !== 'admin' && type !== 'use') fail(403, 'ADMIN_REQUIRED', 'ให้ทีม MAVO บันทึกรับเข้าหรือปรับยอด');
        const quantity = integer(body.quantity, 'จำนวน', {min:type === 'adjust' ? -MAX_QUANTITY : 1});
        if (quantity === 0) fail(400, 'INVALID_QUANTITY', 'จำนวนปรับยอดต้องไม่เป็นศูนย์');
        const reason = text(body.reason, 'เหตุผล', {required:type === 'adjust'});
        const result = once(user, req, route, body, () => ({
          movement:addMovement(user, companyId, product, type === 'use' ? -quantity : quantity, type, reason),
          stock:stock(companyId, product.sku)
        }));
        reply(res, 200, result);
        return true;
      }
      if (req.method === 'POST' && route === `${PREFIX}/requests`) {
        const body = await readJSON(req);
        const companyId = companyFor(user, body);
        const product = productFor(body);
        const quantity = integer(body.quantity, 'จำนวนที่ขอเติม', {min:1});
        const note = text(body.note, 'หมายเหตุ', {max:1000});
        const result = once(user, req, route, body, () => {
          ensureStock(companyId, product);
          const id = crypto.randomUUID();
          const timestamp = now();
          db.prepare(`INSERT INTO restock_requests(id,company_id,sku,quantity,status,note,created_by,created_at,updated_at)
            VALUES(?,?,?,?,'requested',?,?,?,?)`).run(id, companyId, product.sku, quantity, note, user.id, timestamp, timestamp);
          audit(user, 'request.create', {id, sku:product.sku, quantity, note}, companyId);
          return {request:request(id)};
        });
        reply(res, 200, result);
        return true;
      }
      const patch = route.match(/^\/api\/members\/requests\/([a-f0-9-]{36})$/);
      if (req.method === 'PATCH' && patch) {
        const body = await readJSON(req);
        const id = patch[1];
        const existing = request(id);
        if (!existing || (user.role !== 'admin' && existing.companyId !== user.companyId)) {
          fail(404, 'REQUEST_NOT_FOUND', 'ไม่พบคำขอเติมสินค้านี้');
        }
        if (body.companyId !== undefined && body.companyId !== existing.companyId) {
          fail(403, 'COMPANY_FORBIDDEN', 'บริษัทของคำขอไม่ตรงกับรายการ');
        }
        const status = text(body.status, 'สถานะ', {required:true, max:30});
        const note = body.note === undefined ? undefined : text(body.note, 'หมายเหตุ', {max:1000});
        const result = once(user, req, route, body, () => {
          const current = request(id);
          const next = {requested:['reviewed','canceled'], reviewed:['shipped','canceled'], shipped:['received','canceled'], received:[], canceled:[]};
          if (!next[current.status]?.includes(status)) fail(409, 'INVALID_TRANSITION', 'ไม่สามารถเปลี่ยนสถานะตามลำดับนี้ได้');
          if (user.role === 'customer' && !((current.status === 'requested' && status === 'canceled') || (current.status === 'shipped' && status === 'received'))) {
            fail(403, 'ADMIN_REQUIRED', 'สถานะนี้ต้องให้ทีม MAVO เป็นผู้บันทึก');
          }
          if (status === 'received' && user.role === 'admin' && !note) {
            fail(400, 'RECEIPT_REASON_REQUIRED', 'กรุณาระบุเหตุผลหรือหลักฐานที่ทีมใช้ยืนยันว่าลูกค้ารับสินค้าแล้ว');
          }
          db.prepare('UPDATE restock_requests SET status=?,note=?,updated_at=? WHERE id=?')
            .run(status, note === undefined ? current.note : note, now(), id);
          audit(user, 'request.status', {id, from:current.status, to:status, note:note || ''}, current.companyId);
          let receivedMovement;
          if (status === 'received') {
            const product = bySku.get(current.sku);
            if (!product) fail(409, 'INVALID_SKU', 'ไม่พบสินค้าในรายการปัจจุบัน กรุณาให้ทีมตรวจรหัสสินค้า');
            receivedMovement = addMovement(user, current.companyId, product, current.quantity, 'request_receive',
              note || 'ลูกค้ายืนยันรับสินค้าตามคำขอเติม', id);
          }
          return {request:request(id), ...(receivedMovement ? {movement:receivedMovement, stock:stock(current.companyId,current.sku)} : {})};
        });
        reply(res, 200, result);
        return true;
      }
      fail(404, 'NOT_FOUND', 'ไม่พบรายการที่เรียกใช้');
    } catch (error) {
      if (res.headersSent) { if (!res.writableEnded) res.end(); return true; }
      if (error instanceof ApiError) reply(res, error.status, {error:error.message, code:error.code});
      else if (String(error?.message).includes('UNIQUE constraint failed')) {
        reply(res, 409, {error:'ข้อมูลนี้มีอยู่แล้ว กรุณาตรวจสอบรายการ', code:'DUPLICATE_RECORD'});
      } else {
        reply(res, 500, {error:'ระบบบันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้งหรือติดต่อทีม MAVO', code:'INTERNAL_ERROR'});
      }
      return true;
    }
  }
  handle.close = () => db.close();
  return handle;
}
