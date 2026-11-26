import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderHomeComparisons} from './home-comparisons.mjs';
const data=JSON.parse(fs.readFileSync('dist/data/products.json'));
const {printers}=JSON.parse(fs.readFileSync('dist/data/printers.json'));
const printer=(brand,model)=>printers.find(p=>p.brand===brand&&p.model.toLowerCase()===model.toLowerCase());
test('printer map references known MAVO products and source URLs',()=>{
 assert.equal(new Set(printers.map(p=>p.id)).size,printers.length);
 for(const p of printers)for(const m of p.matches){
  const r=data.records.find(r=>r.sku===m.sku);assert.ok(r);assert.equal(r.brand,p.brand);assert.ok(m.oemModels.length);assert.ok(m.sourceUrls.every(u=>new URL(u).protocol==='https:'));
 }
});
test('Canon colour printers expose four colours, mono printers one compatible cartridge',()=>{
 assert.deepEqual(printer('CANON','LBP623Cdw').matches.map(m=>m.sku).sort(),['MAV-CRG054-BK','MAV-CRG054-C','MAV-CRG054-M','MAV-CRG054-Y']);
 assert.deepEqual(printer('CANON','LBP6030w').matches.map(m=>m.sku),['MAV-CRG325']);
 assert.equal(printer('CANON','LBP623'),undefined);
});
test('a shared MAVO SKU only compares the OEM code for the selected printer',()=>{
 assert.deepEqual(printer('HP','LaserJet P1005').matches[0].oemModels,['CB435A']);
 assert.deepEqual(printer('HP','LaserJet P1505').matches[0].oemModels,['CB436A']);
 assert.deepEqual(printer('HP','LaserJet P2035').matches[0].oemModels,['CE505A']);
 assert.deepEqual(printer('HP','LaserJet M401dw').matches[0].oemModels,['CF280A']);
 assert.equal(printer('HP','Laser 107w').matches[0].sku,'MAV-107A');
});
test('homepage examples recalculate from product data and retain warranty terms',()=>{
 const h=renderHomeComparisons(data,'LINE');
 for(const text of ['2,430.25 บาท','75.8%','1,274.75 บาท','67.4%','รับประกันคุณภาพตลับ 1 ปี','MAVO Care Online','/care.html#care-terms','ไม่ใช่ SRP'])assert.ok(h.includes(text),text);
 const changed=structuredClone(data);changed.records.find(r=>r.sku==='MAV-107A').salePriceIncVat=1000;
 assert.ok(renderHomeComparisons(changed,'LINE').includes('890.00 บาท'));
});
