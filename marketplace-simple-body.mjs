import {escapeHTML as esc,productPath,articlePath} from './seo.mjs';
const money=n=>Number(n).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const link=(url,label)=>url.startsWith('/')&&!url.startsWith('//')?`<a href="${esc(url)}">${esc(label)}</a>`:`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const checks=[
 {title:'ใช้กับเครื่องเราได้ไหม',body:'ส่งชื่อรุ่นหรือรูปป้ายเครื่อง ให้ผู้ขายยืนยันตลับที่ใช้ได้ก่อนซื้อ',mavo:'MAVO ช่วยตรวจรุ่นให้ก่อนสั่ง',href:'/check.html',action:'ส่งรุ่นเครื่องให้ตรวจ'},
 {title:'จ่ายทั้งหมดเท่าไร',body:'ดูราคา จำนวนตลับ ภาษี และค่าส่งให้ครบ แล้วค่อยเทียบยอดที่จ่ายจริง',mavo:'ราคา MAVO รวม VAT 7% และส่งปกติ',href:'/products.html',action:'ดูราคา MAVO'},
 {title:'มีปัญหา ใครดูแล',body:'ถามว่ารับประกันอะไร เปลี่ยนอย่างไร และใครจ่ายค่าส่งเคลม',mavo:'MAVO Care Online รับประกันคุณภาพตลับ 1 ปีนับจากวันที่ได้รับสินค้า ตรวจอาการออนไลน์ เมื่อเคลมผ่านส่งตลับใหม่ให้ฟรีตามเงื่อนไข',href:'/care.html',action:'ดูเงื่อนไข MAVO Care'},
];
const caseLabels=[
 {title:'ราคาต่ำสุด อาจเป็นคนละชิ้น',text:'ประกาศนี้มีทั้งตลับและดรัม ยังไม่ทราบว่าราคาไหนเป็นของตัวเลือกใด'},
 {title:'เห็นราคาแล้ว ต้องเช็กสต็อก',text:'หน้าสินค้าระบุว่าสินค้าหมด จึงยังใช้เป็นราคาที่พร้อมสั่งซื้อไม่ได้'},
 {title:'มีคำว่า XL ต้องตรวจความจุ',text:'ผู้ขายระบุรุ่น XL และ 3,000 แผ่น ยังไม่ใช่ผลทดสอบว่าพิมพ์ได้เท่ากับ MAVO'},
];
export function renderSimpleGuide(copy,examples,products,calculator){
 const prices=['MAV-TN1000','MAV-TN2560'].map(sku=>products.records.find(r=>r.sku===sku));
 if(prices.some(r=>!r))throw new Error('Guide price reference missing');
 return `
 <section class="intro buyer-simple-hero"><div class="container">
  <p class="breadcrumb"><a href="/">หน้าแรก</a> / <a href="/knowledge.html">คลังความรู้</a> / เลือกโทนเนอร์ให้คุ้ม</p>
  <p class="eyebrow">ความคุ้มค่าที่ธุรกิจเลือกได้</p><h1 class="page-title">เลือกโทนเนอร์ให้คุ้ม<br>ทั้งงานพิมพ์และการดูแล</h1>
  <p class="lead">เทียบคุณภาพงานพิมพ์ ค่าใช้จ่ายทั้งหมด และการดูแลหลังซื้อ เพื่อเลือกให้คุ้มกับธุรกิจของคุณ</p>
  <div class="actions"><a class="button primary" href="/check.html">ให้ MAVO ช่วยตรวจรุ่น</a><a class="text-link" href="#buyer-calculator">ลองคำนวณความคุ้มค่า</a></div>
 </div></section>
 <section class="section buyer-quick-section" id="buyer-checklist"><div class="container">
  <h2 class="visually-hidden">3 เรื่องที่ควรเช็กก่อนซื้อ</h2>
  <div class="buyer-quick-grid">${checks.map((c,i)=>`<article class="buyer-quick-card"><span class="quick-number">0${i+1}</span><h3>${c.title}</h3><p>${c.body}</p><div class="quick-mavo"><span>เมื่อเลือก MAVO</span><p>${c.mavo}</p><a href="${c.href}">${c.action} →</a></div></article>`).join('')}</div>
  <p class="buyer-visible-note"><strong>MAVO Care Online:</strong> ส่งรูปหรือวิดีโอให้ทีมตรวจ นัดวิดีโอคอลเมื่อจำเป็น พร้อมเลขเคสบันทึกผล เมื่อเคลมผ่านส่งตลับใหม่ให้ฟรีตามเงื่อนไข และติดตามผล <a href="/care.html">ดูขั้นตอนรับบริการ</a></p>
  <div class="buyer-print-tip"><strong>อีกเรื่องที่ต้องลอง: งานพิมพ์จริง</strong><p>ใช้ไฟล์ กระดาษ และการตั้งค่าเดียวกัน ดูว่าตัวหนังสือชัด ไม่มีรอยบังข้อมูล และนับเฉพาะหน้าที่นำไปใช้ได้</p><a href="${articlePath('print-quality-check')}">ดูวิธีตรวจแบบง่าย ๆ →</a></div>
  <details class="simple-disclosure" id="buyer-full-comparison"><summary>ดูตารางเทียบแบบละเอียด <span>7 เรื่องที่ควรถามผู้ขาย</span></summary><div class="disclosure-body"><div class="table-wrap buyer-comparison" tabindex="0" role="region" aria-label="ตารางเปรียบเทียบละเอียด เลื่อนแนวนอนได้"><table><thead><tr><th>เรื่องที่เทียบ</th><th>ถามผู้ขายทุกราย</th><th>ข้อมูล MAVO</th></tr></thead><tbody>${copy.comparisonTable.rows.map(r=>`<tr><th scope="row">${esc(r.topic)}</th><td>${esc(r.askSeller)}</td><td>${esc(r.mavo.replaceAll('tare','น้ำหนักตลับเปล่า'))}</td></tr>`).join('')}</tbody></table></div><p class="small">ข้อมูลที่ยังไม่ทราบควรถามเพิ่ม ราคาป้ายเพียงอย่างเดียวยังไม่ยืนยันคุณภาพ</p></div></details>
 </div></section>
 <section class="section value-band" id="listing-examples"><div class="container">
  <div class="simple-section-heading"><p class="eyebrow">ตัวอย่างจาก Shopee</p><h2>เห็นราคาแบบนี้<br>ควรเช็กอะไรต่อ</h2><p>ตัวอย่างประกาศที่ตรวจพบวันที่ 19 พฤศจิกายน 2569</p></div>
  <div class="market-listings">${examples.map((e,i)=>{const c=caseLabels[i];return `<article class="market-listing simple-market-card"><span class="eyebrow">ตัวอย่าง 0${i+1}</span><h3>${c.title}</h3><p class="market-listing-price">${esc(e.priceLabel)}</p><p class="simple-listing-name">${esc(e.title)}</p><p>${c.text}</p><details class="inline-disclosure"><summary>ดูประกาศและรายละเอียด</summary><div><p>${esc(e.observation)}</p><p>${esc(e.lesson)}</p>${link(e.url,'เปิดประกาศบน Shopee')}</div></details></article>`;}).join('')}</div>
  <p class="buyer-visible-note">ราคาข้างต้นยังไม่ยืนยันภาษีและค่าส่ง จึงยังไม่เทียบส่วนต่างกับ MAVO และยังไม่มีผลทดสอบคุณภาพสินค้าของร้านเหล่านี้</p>
 </div></section>
 <section class="section buyer-practice"><div class="container">
  <div class="simple-section-heading"><p class="eyebrow">เริ่มทีละเครื่อง</p><h2>ลองให้มั่นใจ<br>ก่อนเปลี่ยนทั้งออฟฟิศ</h2></div>
  <ol class="simple-trial-steps"><li><strong>ตรวจรุ่น</strong><span>ให้ผู้ขายยืนยันรหัสตลับและรุ่นเครื่อง</span></li><li><strong>ลองพิมพ์งานจริง</strong><span>ดูข้อความ ตัวเลข และรอยเปื้อนที่กระทบงาน</span></li><li><strong>จดผลที่ใช้ได้</strong><span>นับหน้าที่ใช้ได้ และบันทึกปัญหาถ้ามี</span></li></ol>
  <details class="simple-disclosure"><summary>อ่านเรื่องคุณภาพเพิ่ม <span>จำนวนหน้า น้ำหนัก และวิธีทดลอง</span></summary><div class="disclosure-body buyer-proof-grid">${copy.principles.map(p=>`<article><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join('')}</div></details>
 </div></section>
 <section class="section value-band buyer-calc-section" id="buyer-calculator"><div class="container"><details class="simple-disclosure" id="buyer-calculator-panel"><summary>อยากรู้ว่าคุ้มต่างกันเท่าไร <span>กดเพื่อกรอกยอดจ่ายและจำนวนหน้าที่ใช้ได้</span></summary><div class="disclosure-body">${calculator}</div></details></div></section>
 <section class="section"><div class="container buyer-help-band"><div><p class="eyebrow">MAVO ช่วยดูให้ก่อนซื้อ</p><h2>เริ่มจากรุ่นเครื่อง<br>ที่คุณใช้อยู่</h2><p>รู้รุ่น ราคา และสิทธิ์ดูแลก่อนตัดสินใจ</p></div><div class="actions"><a class="button primary" href="/check.html">ส่งรุ่นเครื่องให้เราตรวจ</a><a class="text-link" href="/care.html">ดูการรับประกันและขั้นตอนออนไลน์</a></div></div>
 <div class="container"><details class="simple-disclosure"><summary>ดูตัวอย่างราคาและบริการ MAVO <span>ราคารวมภาษีและส่งปกติ</span></summary><div class="disclosure-body buyer-care-grid"><div><p>${esc(copy.care.summary)}</p><div class="buyer-mavo-prices">${prices.map(r=>`<a href="${productPath(r.sku)}"><span>${esc(r.model)}</span><strong>${money(r.salePriceIncVat)} <small>บาท</small></strong><small>${esc(r.sku)}</small></a>`).join('')}</div><p class="small">รวม VAT 7% และจัดส่งปกติ Flash Express ในประเทศ</p></div><div class="buyer-care-zones"><p>${esc(copy.care.processIntro)}</p>${copy.care.steps.map(z=>`<div><h3>${esc(z.title)}</h3><p>${esc(z.text)}</p></div>`).join('')}<a href="/care.html">อ่านเงื่อนไขทั้งหมด</a></div></div></details>
 <details class="simple-disclosure"><summary>ดูแหล่งอ้างอิงและอ่านต่อ</summary><div class="disclosure-body"><ul class="source-list">${copy.sources.map(s=>`<li>${link(s.url,s.title)}</li>`).join('')}</ul><ul><li><a href="${articlePath('weight-and-new-cartridge')}">น้ำหนักตลับบอกอะไรได้บ้าง</a></li><li><a href="${articlePath('usable-page-cost')}">ต้นทุนต่อหน้าที่ใช้งานได้จริง</a></li><li><a href="/knowledge.html#videos">วิดีโอพร้อมสรุปภาษาไทย</a></li></ul></div></details></div></section>`;
}
