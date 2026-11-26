import {escapeHTML as esc} from './seo.mjs';

export function renderHomeComparisons(data, lineButton) {
  const money=n=>n.toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const examples=[['MAV-CRG054-BK','Canon 054 BK'],['MAV-107A','HP 107A']];
  const rows=examples.flatMap(([sku,title])=>{
    const r=data.records.find(r=>r.sku===sku);
    const o=r?.comparisons.find(o=>o.priceKind==='brand-store'&&o.vatBasis==='included'&&o.priceIncVat>0);
    if(!o)return [];
    const saving=Math.round((o.priceIncVat-r.salePriceIncVat)*100)/100;
    return [`<article class="home-brand-example" data-example-sku="${esc(sku)}">
      <h3>${esc(title)} <span>${r.color==='ไม่ระบุ'?'หมึกดำ':esc(r.color)}</span></h3>
      <dl class="home-brand-prices"><div><dt>ตลับแท้ · ราคาขายเว็บแบรนด์</dt><dd>${money(o.priceIncVat)} <small>บาท</small></dd></div><div><dt>MAVO · รวมส่งปกติ</dt><dd>${money(r.salePriceIncVat)} <small>บาท</small></dd></div></dl>
      <p class="home-brand-saving">${saving>=0?'ประหยัดค่าตลับ':'ค่าตลับสูงกว่า'} <strong>${money(Math.abs(saving))} บาท</strong><span>${Math.abs(saving/o.priceIncVat*100).toFixed(1)}%</span></p>
      <p class="source-note">เทียบราคาสินค้ารวม VAT 7% ต่อตลับ<br>อ้างอิง <a href="${esc(o.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(o.oemBrand)} เว็บแบรนด์</a> · ตรวจ ${esc(o.observedDate)}${o.stockDetail==='backorder'?'<br>ตลับแท้: ต้นทางระบุสั่งจองล่วงหน้า':''}</p>
      <a class="text-link" href="/compare.html?sku=${encodeURIComponent(sku)}">ดูรุ่นเครื่องและรายละเอียด ${esc(title)}</a>
    </article>`];
  });
  return `<div class="container home-brand-comparisons" id="brand-examples"><h2>ตัวอย่าง Canon และ HP<br>เห็นเงินที่เหลือ ก่อนตัดสินใจ</h2><p class="lead">เทียบค่าซื้อตลับ พร้อมรู้ว่าใครดูแลหลังเปลี่ยนมาใช้ MAVO</p><div class="home-brand-grid">${rows.join('')}</div><p class="source-note">ราคาอ้างอิงเป็นราคาขายเว็บแบรนด์ ไม่ใช่ SRP ราคาตามร้านและโปรโมชั่นอาจต่างกัน ส่วนต่างนี้ยังไม่ใช่ต้นทุนต่อหน้า หรือผลรับรองคุณภาพและจำนวนหน้าที่เท่ากัน</p><div class="home-brand-care"><div><h3>รับประกันคุณภาพตลับ 1 ปี</h3><p>MAVO Care Online · ส่ง Serial และรูปอาการทาง LINE<br>ทีมช่วยตรวจ แจ้งผล และติดตามการดูแลตามเงื่อนไข</p><a class="text-link" href="/care.html#care-terms">ดูความคุ้มครองและขั้นตอนรับบริการ</a></div><div>${lineButton}</div></div></div>`;
}
