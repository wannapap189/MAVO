import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createMembersApi} from './members-api.mjs';

const PASSWORD = 'Testing-MAVO-2026!';
const id = () => crypto.randomUUID();

async function serve(databasePath, productsPath) {
  const api = createMembersApi({databasePath, productsPath});
  const server = http.createServer(async (req, res) => {
    try {
      if (await api(req, res, new URL(req.url, `http://${req.headers.host}`))) return;
      res.writeHead(404); res.end('static fallback');
    } catch (error) {
      res.writeHead(500); res.end(String(error));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  function client(savedCookie = '') {
    const self = {
      cookie:savedCookie,
      async call(method, suffix, body, options = {}) {
        const headers = {Origin:origin, ...(self.cookie ? {Cookie:self.cookie} : {})};
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        Object.assign(headers, options.headers || {});
        if (options.omitOrigin) delete headers.Origin;
        const response = await fetch(`${origin}/api/members${suffix}`, {
          method, headers, body:body === undefined ? undefined : JSON.stringify(body)
        });
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) self.cookie = setCookie.split(';')[0];
        const json = await response.json();
        return {status:response.status, json, headers:response.headers};
      }
    };
    return self;
  }
  return {origin, client, async close() {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    api.close();
  }};
}

const noPrivateFields = value => {
  const forbidden = new Set(['password', 'password_hash', 'password_salt', 'token', 'token_hash', 'cost', 'costPrice', 'costExVat', 'purchasePrice']);
  if (Array.isArray(value)) value.forEach(noPrivateFields);
  else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    assert.equal(forbidden.has(key), false, `private field leaked: ${key}`);
    noPrivateFields(child);
  }
};

test('local member inventory: authorization, stock integrity, idempotency and persistence', async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'mavo-members-test-'));
  const databasePath = path.join(folder, 'private', 'members.sqlite');
  const productsPath = path.join(folder, 'products.json');
  fs.writeFileSync(productsPath, JSON.stringify({records:[
    {sku:'MAV-TN1000', model:'TN1000', brand:'BROTHER', color:'BK', salePriceIncVat:347.75, cost:130, costExVat:130},
    {sku:'MAV-PACK', model:'Test Pack', brand:'TEST', color:'BK', unit:'แพ็ก', salePriceIncVat:500, purchasePrice:100}
  ]}));
  let app = await serve(databasePath, productsPath);
  t.after(async () => { if (app) await app.close(); fs.rmSync(folder, {recursive:true, force:true}); });
  const guest = app.client();
  let admin = app.client();
  let alpha = app.client();
  const beta = app.client();
  let companyA;
  let companyB;
  let requestA;
  let requestB;

  await t.test('first-admin setup is explicit and guarded; guest cannot read inventory', async () => {
    assert.deepEqual((await guest.call('GET','/bootstrap')).json, {needsSetup:true, user:null});
    for (const route of ['/state','/catalog']) assert.equal((await guest.call('GET',route)).status, 401);
    const body = {name:'ผู้ดูแล MAVO', username:'admin', password:PASSWORD};
    assert.equal((await guest.call('POST','/setup',body,{omitOrigin:true})).status, 403);
    assert.equal((await guest.call('POST','/setup',body,{headers:{Origin:'https://other.example'}})).status, 403);
    assert.equal((await guest.call('POST','/setup',body,{headers:{'Content-Type':'text/plain'}})).status, 415);
    const badHostStatus = await new Promise((resolve, reject) => {
      const raw = http.get(`${app.origin}/api/members/bootstrap`, {headers:{Host:'evil.example'}}, response => {
        response.resume(); response.on('end', () => resolve(response.statusCode));
      });
      raw.on('error', reject);
    });
    assert.equal(badHostStatus,403);
    const result = await admin.call('POST','/setup',body);
    assert.equal(result.status, 201);
    assert.equal(result.json.user.role,'admin');
    assert.equal(result.json.user.companyId,null);
    assert.match(result.headers.get('set-cookie'), /HttpOnly/);
    assert.match(result.headers.get('set-cookie'), /SameSite=Strict/);
    assert.match(result.headers.get('set-cookie'), /Max-Age=28800/);
    assert.equal(result.headers.get('cache-control'),'no-store');
    noPrivateFields(result.json);
    assert.equal((await guest.call('POST','/setup',body)).status,409);
    assert.equal((await guest.call('GET','/bootstrap')).json.needsSetup,false);
  });

  await t.test('catalogue exports public fields only and preserves actual units', async () => {
    const result = await admin.call('GET','/catalog');
    assert.equal(result.status,200);
    assert.equal(result.json.products[0].unit,'กล่อง');
    assert.equal(result.json.products[1].unit,'แพ็ก');
    assert.equal(result.json.products[0].salePriceIncVat,347.75);
    noPrivateFields(result.json);
  });

  await t.test('admin creates company members and credentials cannot be exposed or duplicated', async () => {
    companyA = (await admin.call('POST','/companies',{name:'บริษัท Alpha'})).json.company;
    companyB = (await admin.call('POST','/companies',{name:'บริษัท Beta'})).json.company;
    assert.notEqual(companyA.id,companyB.id);
    for (const [company, username] of [[companyA,'alpha'],[companyB,'beta']]) {
      const result = await admin.call('POST','/users',{companyId:company.id,name:company.name,username,password:PASSWORD});
      assert.equal(result.status,201);
      assert.equal(result.json.user.role,'customer');
      assert.equal(result.json.user.companyId,company.id);
      noPrivateFields(result.json);
    }
    assert.equal((await admin.call('POST','/users',{companyId:companyA.id,name:'duplicate',username:'ALPHA',password:PASSWORD})).status,409);
    assert.equal((await alpha.call('POST','/login',{username:'alpha',password:'incorrect-pass'})).status,401);
    assert.equal((await alpha.call('POST','/login',{username:'ALPHA',password:PASSWORD})).status,200);
    assert.equal((await beta.call('POST','/login',{username:'beta',password:PASSWORD})).status,200);
  });

  await t.test('company inventory and activity are isolated; only admin can receive or adjust', async () => {
    for (const [company, quantity] of [[companyA,5],[companyB,9]]) {
      const settings = await admin.call('POST','/stock-settings',{companyId:company.id,sku:'MAV-TN1000',minStock:3});
      assert.equal(settings.status,200);
      assert.equal(settings.json.stock.quantity,0);
      const movement = await admin.call('POST','/movements',{companyId:company.id,sku:'MAV-TN1000',type:'receive',quantity,reason:'ยอดตั้งต้นที่ตรวจแล้ว',mutationId:id()});
      assert.equal(movement.status,200);
      assert.equal(movement.json.stock.quantity,quantity);
    }
    for (const body of [
      {companyId:companyA.id,sku:'MAV-TN1000',type:'receive',quantity:1,mutationId:id()},
      {companyId:companyA.id,sku:'MAV-TN1000',type:'adjust',quantity:1,reason:'test',mutationId:id()},
      {companyId:companyB.id,sku:'MAV-TN1000',type:'use',quantity:1,mutationId:id()}
    ]) assert.equal((await alpha.call('POST','/movements',body)).status,403);
    assert.equal((await alpha.call('POST','/companies',{name:'blocked'})).status,403);
    assert.equal((await alpha.call('POST','/users',{name:'blocked'})).status,403);
    assert.equal((await alpha.call('POST','/stock-settings',{companyId:companyA.id,sku:'MAV-TN1000',minStock:1})).status,403);
    const state = (await alpha.call('GET',`/state?companyId=${companyB.id}`)).json;
    assert.deepEqual(state.companies,[companyA]);
    assert.equal(state.stocks.length,1);
    assert.equal(state.stocks[0].quantity,5);
    assert.equal(state.stocks[0].minStock,3);
    assert.equal(state.movements.length,1);
    assert.ok(state.movements.every(row=>row.companyId===companyA.id));
    assert.equal(JSON.stringify(state).includes(companyB.id),false);
    noPrivateFields(state);
  });

  await t.test('stock cannot go negative; replay and concurrent requests are safe', async () => {
    const oversized = await alpha.call('POST','/movements',{sku:'MAV-TN1000',type:'use',quantity:6,mutationId:id()});
    assert.equal(oversized.status,409);
    const use = {sku:'MAV-TN1000',type:'use',quantity:2,reason:'ใช้งานออฟฟิศ',mutationId:id()};
    const first = await alpha.call('POST','/movements',use);
    assert.equal(first.status,200);
    assert.equal(first.json.stock.quantity,3);
    assert.equal(first.json.replayed,false);
    const replay = await alpha.call('POST','/movements',use);
    assert.equal(replay.status,200);
    assert.equal(replay.json.replayed,true);
    assert.equal(replay.json.movement.id,first.json.movement.id);
    assert.equal((await alpha.call('POST','/movements',{...use,quantity:1})).status,409);
    assert.equal((await alpha.call('POST','/requests',{sku:'MAV-TN1000',quantity:1,mutationId:use.mutationId})).status,409);
    const parallel = {sku:'MAV-TN1000',type:'use',quantity:1,mutationId:id()};
    const results = await Promise.all([alpha.call('POST','/movements',parallel),alpha.call('POST','/movements',parallel)]);
    assert.ok(results.every(result=>result.status===200));
    assert.equal(results.filter(result=>result.json.replayed).length,1);
    assert.equal((await alpha.call('GET','/state')).json.stocks[0].quantity,2);
    const competing = await Promise.all([1,2].map(()=>alpha.call('POST','/movements',{sku:'MAV-TN1000',type:'use',quantity:2,mutationId:id()})));
    assert.deepEqual(competing.map(result=>result.status).sort(),[200,409]);
    assert.equal((await alpha.call('GET','/state')).json.stocks[0].quantity,0);
    assert.equal((await admin.call('POST','/movements',{companyId:companyA.id,sku:'MAV-TN1000',type:'adjust',quantity:1,reason:'',mutationId:id()})).status,400);
    assert.equal((await alpha.call('POST','/movements',{sku:'MAV-TN1000',type:'use',quantity:1.5,mutationId:id()})).status,400);
    assert.equal((await alpha.call('POST','/movements',{sku:'UNKNOWN',type:'use',quantity:1,mutationId:id()})).status,400);
  });

  await t.test('replenishment requests stay in tenant scope and do not increase stock when requested', async () => {
    assert.equal((await alpha.call('POST','/requests',{companyId:companyB.id,sku:'MAV-TN1000',quantity:4,mutationId:id()})).status,403);
    const body = {sku:'MAV-TN1000',quantity:4,note:'ขอให้ทีมตรวจราคา',mutationId:id()};
    const created = await alpha.call('POST','/requests',body);
    assert.equal(created.status,200);
    requestA = created.json.request;
    assert.equal(requestA.companyId,companyA.id);
    assert.equal(requestA.status,'requested');
    const replay = await alpha.call('POST','/requests',body);
    assert.equal(replay.json.request.id,requestA.id);
    assert.equal(replay.json.replayed,true);
    requestB = (await beta.call('POST','/requests',{sku:'MAV-TN1000',quantity:6,mutationId:id()})).json.request;
    assert.equal((await alpha.call('GET','/state')).json.stocks[0].quantity,0);
    assert.equal((await alpha.call('GET','/state')).json.requests.length,1);
    assert.equal((await beta.call('GET','/state')).json.requests[0].id,requestB.id);
    assert.equal((await beta.call('PATCH',`/requests/${requestA.id}`,{status:'canceled',mutationId:id()})).status,404);
    assert.equal((await alpha.call('PATCH',`/requests/${requestA.id}`,{status:'reviewed',mutationId:id()})).status,403);
    assert.equal((await admin.call('PATCH',`/requests/${requestA.id}`,{status:'shipped',mutationId:id()})).status,409);
  });

  await t.test('receipt credits stock once and only after reviewed/shipped; admin receipt needs a reason', async () => {
    for (const req of [requestA,requestB]) {
      for (const status of ['reviewed','shipped']) {
        assert.equal((await admin.call('PATCH',`/requests/${req.id}`,{status,note:'ทีมตรวจแล้ว',mutationId:id()})).status,200);
      }
    }
    const receipt = {status:'received',note:'รับของครบแล้ว',mutationId:id()};
    const first = await alpha.call('PATCH',`/requests/${requestA.id}`,receipt);
    assert.equal(first.status,200);
    assert.equal(first.json.stock.quantity,4);
    assert.equal(first.json.movement.type,'request_receive');
    const again = await alpha.call('PATCH',`/requests/${requestA.id}`,receipt);
    assert.equal(again.status,200);
    assert.equal(again.json.replayed,true);
    assert.equal((await alpha.call('PATCH',`/requests/${requestA.id}`,{...receipt,mutationId:id()})).status,409);
    assert.equal((await admin.call('PATCH',`/requests/${requestA.id}`,{status:'canceled',mutationId:id()})).status,409);
    assert.equal((await admin.call('PATCH',`/requests/${requestB.id}`,{status:'received',mutationId:id()})).status,400);
    assert.equal((await beta.call('GET','/state')).json.stocks[0].quantity,9);
    const adminReceived = await admin.call('PATCH',`/requests/${requestB.id}`,{status:'received',note:'ลูกค้ายืนยันรับครบทางโทรศัพท์',mutationId:id()});
    assert.equal(adminReceived.status,200);
    assert.equal(adminReceived.json.stock.quantity,15);
    const alphaState = (await alpha.call('GET','/state')).json;
    assert.equal(alphaState.stocks[0].quantity,4);
    assert.equal(alphaState.movements.filter(row=>row.type==='request_receive').length,1);
    const another = (await alpha.call('POST','/requests',{sku:'MAV-TN1000',quantity:1,mutationId:id()})).json.request;
    assert.equal((await alpha.call('PATCH',`/requests/${another.id}`,{status:'canceled',mutationId:id()})).status,200);
    assert.equal((await admin.call('PATCH',`/requests/${another.id}`,{status:'reviewed',mutationId:id()})).status,409);
  });

  await t.test('logout revokes the session and wrong-origin authenticated writes fail', async () => {
    const stolen = app.client(alpha.cookie);
    assert.equal((await alpha.call('POST','/requests',{sku:'MAV-TN1000',quantity:1,mutationId:id()},{headers:{Origin:'https://untrusted.example'}})).status,403);
    assert.equal((await alpha.call('POST','/logout',{})).status,200);
    assert.equal((await alpha.call('GET','/state')).status,401);
    assert.equal((await stolen.call('GET','/state')).status,401);
    assert.equal((await alpha.call('POST','/login',{username:'alpha',password:PASSWORD})).status,200);
  });

  await t.test('database stores hashes, audit events, and a single linked receipt movement', () => {
    const stored = new DatabaseSync(databasePath, {readOnly:true});
    try {
      const users = stored.prepare('SELECT * FROM users').all();
      assert.equal(users.length,3);
      assert.equal(new Set(users.map(user=>user.password_salt)).size,3);
      assert.ok(users.every(user=>user.password_hash.length===128 && user.password_hash!==PASSWORD));
      assert.equal(stored.prepare('SELECT COUNT(*) AS n FROM stock_movements WHERE request_id=?').get(requestA.id).n,1);
      assert.ok(stored.prepare('SELECT COUNT(*) AS n FROM audit_events').get().n>10);
      const raw = JSON.stringify(stored.prepare('SELECT * FROM audit_events').all());
      assert.equal(raw.includes(PASSWORD),false);
      const sessions = stored.prepare('SELECT * FROM sessions').all();
      const adminToken = admin.cookie.split('=')[1];
      assert.ok(sessions.every(session=>session.token_hash!==adminToken));
      assert.ok(sessions.some(session=>session.token_hash===crypto.createHash('sha256').update(adminToken).digest('hex')));
    } finally { stored.close(); }
  });

  await t.test('restart preserves companies, stock, request history and unexpired sessions', async () => {
    const adminCookie = admin.cookie;
    const alphaCookie = alpha.cookie;
    await app.close();
    app = null;
    app = await serve(databasePath, productsPath);
    admin = app.client(adminCookie);
    alpha = app.client(alphaCookie);
    assert.equal((await alpha.call('GET','/bootstrap')).json.user.companyId,companyA.id);
    const state = (await admin.call('GET','/state')).json;
    assert.equal(state.companies.length,2);
    assert.equal(state.stocks.find(row=>row.companyId===companyA.id).quantity,4);
    assert.equal(state.stocks.find(row=>row.companyId===companyB.id).quantity,15);
    assert.equal(state.requests.find(row=>row.id===requestA.id).status,'received');
    noPrivateFields(state);
    const staticResult = await fetch(`${app.origin}/not-an-api`);
    assert.equal(await staticResult.text(),'static fallback');
  });
});
