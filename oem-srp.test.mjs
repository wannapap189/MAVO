import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {applyBrandReferences} from './oem-srp.mjs';
const data=JSON.parse(await fs.readFile(new URL('./dist/data/products.json',import.meta.url)));
const app=await fs.readFile(new URL('./dist/app.js',import.meta.url),'utf8');
const validOffer=vm.runInNewContext('('+app.match(/function validOffer\(o\)\{[^\n]+/)[0]+')');
test('all 92 MAVO sale prices are unchanged by SRP migration',()=>{
  assert.equal(data.records.length,92);
  const prices=data.records.map(({sku,salePrice,salePriceIncVat})=>({sku,salePrice,salePriceIncVat}));
  assert.equal(createHash('sha256').update(JSON.stringify(prices)).digest('hex'),'b9e49c572b6318efcd85b9ece2c94bbae2f16dd761965c17c4069a44b6349655');
});
test('official references cover 71 SKUs / 76 exact model-and-colour offers',()=>{
  assert.equal(data.records.filter(r=>r.comparisons.length).length,71);
  const offers=data.records.flatMap(r=>r.comparisons);
  assert.equal(offers.length,76);
  for(const o of offers){
    assert.equal(o.priceKind,o.oemBrand==='BROTHER'?'brand-catalog':'brand-store');
    assert.equal(new URL(o.sourceUrl).hostname, {BROTHER:'www.brother.co.th',HP:'www.hp.com',CANON:'goto.canon.co.th'}[o.oemBrand]);
    assert.ok(o.vatEvidenceUrl);
    if(o.priceKind==='brand-store')assert.equal(o.priceLabel,'ราคาขายเว็บแบรนด์');
    assert.equal(o.vatBasis,'included');
    assert.ok(Math.abs(o.priceExVat*1.07-o.priceIncVat)<0.00001);
    assert.ok(validOffer(o));
    assert.equal(validOffer({...o,priceKind:'retail'}),false);
    assert.equal(validOffer({...o,vatBasis:'unknown'}),false);
  }
  const offer=sku=>data.records.find(r=>r.sku===sku).comparisons[0];
  assert.equal(offer('MAV-TN261-BK').priceIncVat,2880);
  assert.equal(offer('MAV-TN261-C').priceIncVat,2490);
  assert.equal(offer('MAV-TN2560').oemModel,'TN2560');
  assert.equal(offer('MAV-TN2560').priceIncVat,1290);
  assert.equal(offer('MAV-TN2355'),undefined);
});
test('unsupported brands stay pending and retailer fallbacks cannot reappear',()=>{
  const input=structuredClone(data);
  input.records.find(r=>r.brand==='HP').comparisons=[{priceKind:'retail',priceIncVat:9999}];
  const output=applyBrandReferences(input);
  for(const r of output.records.filter(r=>['SAMSUNG','PANTUM'].includes(r.brand))){
    assert.deepEqual(r.comparisons,[]);
    assert.equal(r.comparisonStatus,'pending-srp');
  }
  assert.deepEqual(applyBrandReferences(output),output);
});
test('homepage and budget examples use new references and include verified HP store totals',async()=>{
  const home=await fs.readFile(new URL('./dist/index.html',import.meta.url),'utf8');
  assert.ok(home.includes('1,022.25'));
  assert.ok(home.includes('74.6%'));
  assert.ok(home.includes('ราคาแค็ตตาล็อก'));
  assert.ok(!home.includes('Heresong'));
  const knowledge=JSON.parse(await fs.readFile(new URL('./dist/data/knowledge.json',import.meta.url)));
  const examples=knowledge.modules.find(m=>m.id==='office-toner-budget-examples').examples;
  assert.equal(examples.find(e=>e.sku==='MAV-TN1000').annualDelta,24534);
  assert.equal(examples.find(e=>e.sku==='MAV-TN2560').annualDelta,22188);
  const hp=examples.find(e=>e.sku==='MAV-107A');
  assert.equal(hp.available,true);
  assert.equal(hp.annualDelta,305940);
});

test('store references match exact codes, colours, capacity and preorder status',()=>{
  const get=sku=>data.records.find(r=>r.sku===sku).comparisons;
  assert.equal(get('MAV-CRG325')[0].priceIncVat,2537);
  assert.equal(get('MAV-CRG331-BK')[0].priceIncVat,3215);
  assert.equal(get('MAV-CRG331-C')[0].priceIncVat,3480);
  assert.equal(get('MAV-CRG054-BK')[0].stockDetail,'backorder');
  assert.equal(get('MAV-CRG337')[0].stockDetail,'backorder');
  assert.deepEqual(get('MAV-CB435-436A').map(o=>o.oemModel),['CB435A','CB436A']);
  assert.deepEqual(get('MAV-CE505A-CF280A').map(o=>o.priceIncVat),[4470,5170]);
  assert.equal(get('MAV-107A')[0].oemModel,'W1107A');
  assert.equal(get('MAV-107A')[0].priceIncVat,1890);
  assert.equal(data.records.filter(r=>!r.comparisons.length).length,21);
});
