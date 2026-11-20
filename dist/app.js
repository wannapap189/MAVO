const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const normalize=s=>String(s).toLowerCase().replace(/[^a-z0-9ก-๙]/g,'');
const safeURL=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:'#';}catch{return '#';}};
const external=(url,label)=>`<a href="${esc(safeURL(url))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const qs=new URLSearchParams(location.search);
const productPath = sku => '/products/' + encodeURIComponent(String(sku).toLowerCase()) + '.html';
const articlePath = id => '/articles/' + encodeURIComponent(String(id)) + '.html';
const icon=`<svg width="27" height="30" viewBox="0 0 27 30" fill="none" aria-hidden="true"><path d="M5 2h11l7 7v19H5zM16 2v8h7M9 15h10M9 20h10" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const menu=$('#menu-toggle');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));$('#site-nav').classList.toggle('is-open',open);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.setAttribute('aria-expanded','false');$('#site-nav').classList.remove('is-open');menu.focus();}});
const floatingLineContact=$('.line-contact-floating');
const visibleLineTargets=[$('#contact.footer-contact-panel'),$('.home-line-actions .line-contact')].filter(Boolean);
if(floatingLineContact&&visibleLineTargets.length&&'IntersectionObserver' in window){
  const contactVisibility=new Map();
  const contactVisibilityObserver=new IntersectionObserver(entries=>{
    for(const entry of entries)contactVisibility.set(entry.target,entry.isIntersecting);
    floatingLineContact.hidden=[...contactVisibility.values()].some(Boolean);
  },{threshold:0});
  for(const target of visibleLineTargets)contactVisibilityObserver.observe(target);
}
async function json(url){const r=await fetch(url);if(!r.ok)throw new Error('ไม่สามารถอ่านข้อมูลได้');return r.json();}
function productCard(r){
  const color=r.color&&r.color!=='ไม่ระบุ'?r.color:null;
  const ink=color?(/ดำ|BK/.test(color)?'#3a454e':/ฟ้า|\(C\)/.test(color)?'#45b8d3':/ม่วง|\(M\)/.test(color)?'#b95f96':/เหลือง|\(Y\)/.test(color)?'#d6b842':'#8798a2'):null;
  return `<article class="product-card"><a class="product-visual" href="${productPath(r.sku)}" tabindex="-1" aria-hidden="true"><span class="product-series">MAVO TONER COLLECTION</span><img class="product-thumb" src="/assets/mavo-box-navy-cool-blue-v3.png" alt="" loading="lazy" width="1536" height="1024">${color?`<span class="ink-label"><i style="--ink:${ink}"></i>${esc(color)}</span>`:''}</a><div class="product-content"><p class="product-brand">สำหรับเครื่อง ${esc(r.brand)}</p><h3><a href="${productPath(r.sku)}" style="text-decoration:none">${esc(r.model)}</a></h3><p class="product-sku">${esc(r.sku)}${color?' · '+esc(color):''}</p><p class="product-price">${money(r.salePriceIncVat)} <small>บาท</small></p><p class="small">รวม VAT 7% และจัดส่งปกติ</p><div class="actions"><a class="button primary" href="/check.html?sku=${encodeURIComponent(r.sku)}">ตรวจรุ่นก่อนซื้อ</a><a class="text-link small" href="${productPath(r.sku)}">รายละเอียด</a></div></div></article>`;
}
async function products(){const{records}=await json('/data/products.json');const brand=$('#product-brand'),search=$('#product-search'),sort=$('#product-sort');[...new Set(records.map(r=>r.brand))].forEach(b=>brand.add(new Option(b,b)));let page=1;const size=12;function render(){const q=normalize(search.value);let rows=records.filter(r=>(brand.value==='all'||r.brand===brand.value)&&(!q||normalize(`${r.sku} ${r.model} ${r.brand}`).includes(q)));if(sort.value!=='default')rows.sort((a,b)=>sort.value==='low'?a.salePriceIncVat-b.salePriceIncVat:b.salePriceIncVat-a.salePriceIncVat);const pages=Math.max(1,Math.ceil(rows.length/size));page=Math.min(page,pages);$('#product-count').textContent=`พบ ${rows.length} รุ่น จาก ${records.length} รุ่น`;$('#catalog').innerHTML=rows.length?rows.slice((page-1)*size,page*size).map(productCard).join(''):`<div class="empty-state"><h3>ยังไม่พบรหัสนี้ในรายการ</h3><p class="muted">ลองค้นหารหัสบนตลับ หรือส่งรุ่นเครื่องให้ทีมช่วยตรวจ</p><div class="actions" style="justify-content:center"><a class="button primary" href="/check.html">ให้เราช่วยตรวจรุ่น</a></div></div>`;$('#pagination').innerHTML=rows.length?`<button class="button secondary" id="prev-page" ${page===1?'disabled':''}>หน้าก่อน</button><span>หน้า ${page} / ${pages}</span><button class="button secondary" id="next-page" ${page===pages?'disabled':''}>หน้าถัดไป</button>`:'';$('#prev-page')?.addEventListener('click',()=>{page--;render();$('#catalog').scrollIntoView({block:'start'});});$('#next-page')?.addEventListener('click',()=>{page++;render();$('#catalog').scrollIntoView({block:'start'});});}search.addEventListener('input',()=>{page=1;render();});brand.addEventListener('change',()=>{page=1;render();});sort.addEventListener('change',()=>{page=1;render();});if(qs.has('brand'))brand.value=qs.get('brand');if(!brand.value)brand.value='all';if(qs.has('q'))search.value=qs.get('q');render();}
async function product() {
  const { records } = await json('/data/products.json');
  const record = records.find(item => item.sku === qs.get('sku'));
  if (!record) {
    $('#product-detail').innerHTML = '<div class="empty-state"><h1 class="page-title">ไม่พบรหัสตลับนี้</h1><div class="actions" style="justify-content:center"><a class="button primary" href="/products.html">กลับไปดูสินค้า</a></div></div>';
    return;
  }
  location.replace(productPath(record.sku));
}
function validOffer(o){return o&&Number.isFinite(o.priceIncVat)&&o.priceIncVat>0&&Number.isFinite(o.priceExVat)&&o.priceExVat>0;}
function difference(r,o){const delta=Math.round((o.priceIncVat-r.salePriceIncVat)*100)/100;const percent=(o.priceExVat-r.salePrice)/o.priceExVat*100;return {delta,percent};}
async function compare(){const{records,observedDate}=await json('/data/products.json');const brand=$('#compare-brand'),sku=$('#compare-sku'),oem=$('#compare-oem');[...new Set(records.map(r=>r.brand))].forEach(b=>brand.add(new Option(b,b)));const initial=records.find(r=>r.sku===qs.get('sku'))||records[0];brand.value=initial.brand;function table(){const rows=records.filter(r=>r.brand===brand.value);$('#comparison-table').innerHTML=rows.flatMap(r=>{const offers=r.comparisons.filter(validOffer);if(!offers.length)return [`<tr><td>${esc(r.model)}</td><td class="price">${money(r.salePriceIncVat)}</td><td colspan="3">ยังไม่มีราคาอ้างอิงที่ยืนยัน</td></tr>`];return offers.map(o=>{const d=difference(r,o);return `<tr><td><a href="${productPath(r.sku)}">${esc(r.model)}</a><br><small class="muted">เทียบ ${esc(o.oemModel)}</small></td><td class="price">${money(r.salePriceIncVat)}</td><td class="price">${money(o.priceIncVat)}</td><td class="price">${d.delta>=0?'ประหยัด':'MAVO สูงกว่า'} ${money(Math.abs(d.delta))}<br><small>${Math.abs(d.percent).toFixed(1)}%</small></td><td>${external(o.sourceUrl,o.sourceTitle)}<br><small class="muted">${esc(o.observedDate||observedDate)}</small></td></tr>`;});}).join('');}function paint(){const r=records.find(r=>r.sku===sku.value);const o=r.comparisons.filter(validOffer)[Number(oem.value)];$('#new-cost').value=r.salePriceIncVat.toFixed(2);$('#comparison').innerHTML=`<div class="comparison-grid"><div class="comparison-box"><p class="small muted">ตลับแท้ ราคาอ้างอิง</p><h3>${o?esc(o.oemBrand+' '+o.oemModel):'ยังไม่มีราคาที่ตรวจสอบครบ'}</h3><div class="amount">${o?money(o.priceIncVat):'—'}</div><p class="small muted">${o?'บาท / ตลับ รวม VAT 7%':'ไม่คำนวณส่วนต่างเมื่อข้อมูลไม่ครบ'}</p></div><div class="comparison-box mavo"><p class="small">MAVO ตลับผลิตใหม่</p><h3>${esc(r.sku)}</h3><div class="amount">${money(r.salePriceIncVat)}</div><p class="small muted">บาท / ตลับ รวม VAT 7% และส่งปกติ</p></div></div>${o?(()=>{const d=difference(r,o);return `<p class="comparison-delta">${d.delta>=0?'ประหยัดค่าซื้อต่อตลับ':'ราคาซื้อต่อตลับของ MAVO สูงกว่า'} ${money(Math.abs(d.delta))} บาท (${Math.abs(d.percent).toFixed(1)}%)</p><p class="source-note">อ้างอิง ${external(o.sourceUrl,o.sourceTitle)} ตรวจเมื่อ ${esc(o.observedDate||observedDate)}${o.availability==='unavailable'?' · ต้นทางระบุสินค้าหมดในวันที่ตรวจ':o.stockDetail==='backorder'?' · ต้นทางระบุต้องสั่งจอง':''}<br>เปรียบเทียบราคาซื้อต่อตลับ ไม่ได้ยืนยันคุณภาพหรือจำนวนหน้าที่เท่ากัน ราคาหรือสต็อกต้นทางอาจเปลี่ยนแปลง</p>`;})():`<p class="source-note">ยังไม่มีราคาตลับแท้ที่ยืนยันรุ่นและฐาน VAT ครบ จึงยังไม่แสดงส่วนต่าง ส่งราคาที่คุณซื้ออยู่ให้ทีมช่วยเทียบ หรือคำนวณจากค่าใช้จ่ายจริงด้านล่างได้</p>`}<div class="actions"><a href="/check.html?sku=${encodeURIComponent(r.sku)}" class="button primary">ให้ทีมตรวจรุ่นนี้</a><a href="#calculator" class="text-link">คำนวณต้นทุนต่อหน้า</a></div>`;calculate();}function offers(){const r=records.find(r=>r.sku===sku.value);oem.replaceChildren();const offers=r.comparisons.filter(validOffer);offers.forEach((o,i)=>oem.add(new Option(`${o.oemModel} · ${o.sourceTitle}`,String(i))));if(!offers.length)oem.add(new Option('ยังไม่มีราคาอ้างอิงที่ยืนยัน',''));oem.disabled=!offers.length;paint();}function models(preferred){sku.replaceChildren();records.filter(r=>r.brand===brand.value).forEach(r=>sku.add(new Option(`${r.model} · ${r.sku}`,r.sku)));if(preferred&&[...sku.options].some(o=>o.value===preferred))sku.value=preferred;offers();table();}brand.addEventListener('change',()=>models());sku.addEventListener('change',offers);oem.addEventListener('change',paint);models(initial.sku);for(const id of ['old-cost','old-pages','new-pages'])$('#'+id).addEventListener('input',calculate);}
function calculate(){const target=$('#calc-result');if(!target)return;const a=Number($('#old-cost').value),b=Number($('#old-pages').value),c=Number($('#new-cost').value),d=Number($('#new-pages').value);if(![a,b,c,d].every(n=>Number.isFinite(n)&&n>0)||!Number.isInteger(b)||!Number.isInteger(d)){target.textContent='กรอกราคาเดิมมากกว่า 0 และจำนวนหน้าเป็นจำนวนเต็มมากกว่า 0 ของทั้งสองฝั่งเพื่อคำนวณ';return;}const old=a/b,now=c/d,diff=old-now;target.innerHTML=`<div class="calc-numbers"><div>ตลับเดิม<strong>${old.toFixed(3)}</strong><span class="small">บาทต่อหน้าที่ใช้งานได้จริง</span></div><div>MAVO<strong>${now.toFixed(3)}</strong><span class="small">บาทต่อหน้าที่ใช้งานได้จริง</span></div></div><p style="margin-top:18px">MAVO ${diff>=0?'ต่ำกว่า':'สูงกว่า'} ${Math.abs(diff).toFixed(3)} บาทต่อหน้า (${(Math.abs(diff)/old*100).toFixed(1)}%) ตามข้อมูลที่กรอก</p>`;}
async function knowledge(){const data=await json('/data/knowledge.json');const articleList=$('#article-list');if(articleList&&articleList.dataset.prerendered!=='true'){articleList.innerHTML=data.modules.map(m=>`<a class="article-row" href="${articlePath(m.id)}">${m.image?`<span class="article-thumb"><img src="${esc(m.image.src)}" alt="${esc(m.image.alt)}" width="${m.image.width}" height="${m.image.height}" loading="lazy"><span class="image-label">ภาพประกอบจำลอง</span></span>`:`<span class="article-icon">${icon}</span>`}<div><h3>${esc(m.title)}</h3><p>${esc(m.summary)}</p></div><span class="article-action">อ่านบทความ</span></a>`).join('');}$('#standards-list').innerHTML=data.standards.map(s=>`<article class="standard"><h3>${esc(s.name.replace(/:\d{4}/g,''))}</h3><p><strong>${esc(s.label)}</strong></p><p>${esc(s.measures)}</p><p><strong>ไม่ได้ยืนยันว่า</strong><br>${esc(s.doesNotProve)}</p><p><strong>คำถามที่ควรถามผู้ขาย</strong><br>${esc(s.buyerQuestion)}</p>${external(s.officialUrl,'อ่านขอบเขตจากแหล่งมาตรฐาน')}</article>`).join('');}
async function article() {
  const data = await json('/data/knowledge.json');
  const item = data.modules.find(module => module.id === qs.get('id'));
  if (!item) {
    $('#article-detail').innerHTML = '<h1 class="page-title">ไม่พบบทความนี้</h1><p><a href="/knowledge.html">กลับคลังความรู้</a></p>';
    return;
  }
  location.replace(articlePath(item.id));
}

function articleStatic() {
  const summary = $('#article-share-text');
  const status = $('#article-share-status');
  const copyButton = $('#copy-article-summary');
  const shareButton = $('#share-article-link');
  const setStatus = message => {
    if (status) status.textContent = message;
  };

  copyButton?.addEventListener('click', async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.textContent.trim());
      setStatus('คัดลอกสรุปบทความแล้ว');
    } catch {
      const details = summary.closest('details');
      if (details) details.open = true;
      setStatus('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความสรุปที่เปิดอยู่แล้วคัดลอก');
    }
  });

  if (!shareButton) return;
  shareButton.hidden = true;

  // Local previews and reserved/example hosts must never produce share links.
  const publicHostname = value => {
    const host = String(value).toLowerCase().replace(/\.$/, '');
    return host.includes('.') &&
      !host.includes(':') &&
      !/^\d+(?:\.\d+){3}$/.test(host) &&
      !/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host) &&
      !/(^|\.)example\.(com|net|org)$/.test(host);
  };

  let articleURL;
  try {
    const value = $('meta[property="og:url"]')?.content;
    if (!value) return;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password ||
        !publicHostname(url.hostname) || !publicHostname(location.hostname)) return;
    articleURL = url.href;
  } catch {
    return;
  }
  shareButton.hidden = false;

  shareButton.addEventListener('click', async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: document.title, url: articleURL });
        setStatus('เปิดเมนูแชร์บทความแล้ว');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') {
          setStatus('ยกเลิกการแชร์บทความ');
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(articleURL);
      setStatus('คัดลอกลิงก์บทความแล้ว');
    } catch {
      setStatus('คัดลอกลิงก์อัตโนมัติไม่ได้ กรุณาคัดลอกลิงก์นี้: ' + articleURL);
    }
  });
}

async function business() {
  const buttons = document.querySelectorAll('.copy-social');
  if (!buttons.length) return;
  const posts = await json('/data/social-posts.json');
  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const post = posts.find(item => item.id === button.dataset.postId);
      const status = button.closest('.social-card')?.querySelector('[data-copy-status]');
      if (!post || !status) return;
      try {
        await navigator.clipboard.writeText(post.caption);
        status.textContent = 'คัดลอกข้อความแล้ว พร้อมนำไปวางในโพสต์ของคุณ';
      } catch {
        status.textContent = 'เลือกคัดลอกข้อความจาก “อ่านข้อความโพสต์” หรือดาวน์โหลดไฟล์ข้อความได้';
      }
    });
  }
}

function check() {
  const form = $('#request-form');
  const type = $('#request-type');
  const defaultTitle = document.title;
  const photo = $('#request-photo');
  const fields = {
    model: $('#request-model'),
    name: $('#request-name'),
    contact: $('#request-contact'),
    area: $('#request-area'),
    serial: $('#request-serial'),
    purchase: $('#request-purchase'),
    notes: $('#request-notes'),
  };
  const copyIds = [
    'check-eyebrow', 'check-title', 'check-lead', 'check-breadcrumb',
    'request-model-label', 'request-model-hint',
    'request-area-label', 'request-area-hint', 'request-notes-label', 'request-submit',
  ];
  const defaultCopy = new Map(copyIds.map(id => {
    const element = $('#' + id);
    return [id, element ? element.innerHTML : null];
  }));
  const dealerCopy = {
    'check-eyebrow': 'MAVO PARTNERS',
    'check-title': 'สนใจเป็นตัวแทนจำหน่าย MAVO',
    'check-breadcrumb': 'สนใจเป็นตัวแทนจำหน่าย',
    'check-lead': 'แจ้งประเภทร้าน พื้นที่จำหน่าย และสินค้าที่สนใจ เพื่อเตรียมข้อความสอบถามราคาและเงื่อนไขตัวแทนกับทีม MAVO',
    'request-model-label': 'สินค้า / รุ่นที่สนใจ (ไม่บังคับ)',
    'request-model-hint': 'ยังไม่ทราบรุ่น เว้นช่องนี้ได้ และบอกลักษณะลูกค้าหรือสินค้าที่ต้องการในรายละเอียด',
    'request-area-label': 'พื้นที่จำหน่าย *',
    'request-area-hint': 'จังหวัดหรือพื้นที่หลักที่คุณดูแลลูกค้า เพื่อคุยรูปแบบการจำหน่ายและการบริการ',
    'request-notes-label': 'ประเภทร้าน / ช่องทางขาย และรายละเอียดที่ต้องการสอบถาม *',
    'request-submit': 'เตรียมข้อความสอบถามตัวแทน',
  };
  let photoURL = null;
  let photoName = '';

  function clearDraft() {
    $('#request-result').hidden = true;
    $('#request-text').textContent = '';
    $('#copy-status').textContent = '';
  }

  function setType() {
    const dealer = type.value === 'dealer';
    const care = type.value === 'care';
    document.title = dealer ? 'สนใจเป็นตัวแทนจำหน่าย | MAVO' : care ? 'เตรียมข้อมูล MAVO Care Online | MAVO' : defaultTitle;
    $('#care-hint').hidden = !care;
    $('#request-serial-fields').hidden = !care;
    fields.serial.disabled = !care;
    fields.purchase.disabled = !care;
    const dealerHint = $('#dealer-hint');
    if (dealerHint) dealerHint.hidden = !dealer;
    const photoField = $('#request-photo-field');
    if (photoField) photoField.hidden = dealer;

    fields.model.required = !dealer;
    fields.area.required = dealer;
    fields.notes.required = dealer || care;

    for (const id of copyIds) {
      const element = $('#' + id);
      if (!element) continue;
      if (dealer) element.textContent = dealerCopy[id];
      else element.innerHTML = defaultCopy.get(id);
    }
    if(care){
      $('#check-eyebrow').textContent='MAVO CARE ONLINE';
      $('#check-title').textContent='เตรียมข้อมูลให้ทีมช่วยดูอาการ';
      $('#check-lead').textContent='รวบรวม Serial รุ่น อาการ และข้อมูลการซื้อ ให้ทีมช่วยตรวจสิทธิ์และประวัติ พร้อมดูอาการจากรูปหรือวิดีโอ';
      $('#check-breadcrumb').textContent='เตรียมข้อมูล MAVO Care Online';
      $('#request-notes-label').textContent='อาการ / วันที่รับสินค้า / ข้อมูลการซื้อ / เลขเคสเดิมถ้ามี';
      $('#request-submit').textContent='ตรวจทานข้อมูลแจ้งปัญหา';
    }
    if (!dealer && care) $('#request-notes-label').textContent += ' *';
    for (const element of form.elements) {
      if (typeof element.setCustomValidity === 'function') element.setCustomValidity('');
    }
    clearDraft();
  }

  if (['care', 'model', 'dealer'].includes(qs.get('type'))) {
    type.value = qs.get('type');
  } else if(qs.get('type') === 'area') { type.value = 'care'; }
  if (qs.has('sku')) fields.model.value = qs.get('sku').slice(0, 150);
  type.addEventListener('change', setType);
  setType();

  photo.addEventListener('change', () => {
    if (photoURL) URL.revokeObjectURL(photoURL);
    photoURL = null;
    photoName = '';
    $('#photo-preview').hidden = true;
    $('#photo-preview').replaceChildren();
    $('#photo-feedback').textContent = '';
    const file = photo.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      $('#photo-feedback').textContent = 'เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB';
      photo.value = '';
      return;
    }
    photoName = file.name;
    photoURL = URL.createObjectURL(file);
    const image = document.createElement('img');
    image.src = photoURL;
    image.alt = 'รูปป้ายรุ่นที่เลือก';
    const caption = document.createElement('p');
    caption.textContent = file.name + ' · แสดงในเครื่องนี้เท่านั้น';
    $('#photo-preview').append(image, caption);
    $('#photo-preview').hidden = false;
  });

  for (const element of Object.values(fields)) {
    element.addEventListener('input', () => element.setCustomValidity(''));
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const [key, element] of Object.entries(fields)) {
      const required = ['name', 'contact'].includes(key) || element.required;
      element.setCustomValidity(required && !element.value.trim() ? 'กรุณากรอกข้อมูล' : '');
    }
    if (!form.reportValidity()) return;

    const dealer = type.value === 'dealer';
    const values = new FormData(form);
    const value = key => String(values.get(key) ?? '').trim();
    const text = [
      'เรื่อง: ' + type.selectedOptions[0].text,
      (dealer ? 'สินค้า / รุ่นที่สนใจ: ' : 'รุ่นเครื่อง / รหัสตลับ: ') + (value('model') || 'ยังไม่ระบุ'),
      'ชื่อ: ' + value('name'),
      (dealer ? 'ร้านค้า / องค์กร: ' : 'บริษัท: ') + (value('company') || 'ไม่ระบุ'),
      'ติดต่อกลับ: ' + value('contact'),
      type.value === 'care' ? 'Serial ตลับ: ' + (value('serial') || 'ขอให้ทีมตรวจจากรูปฉลากหรือรายการซื้อ') : null,
      type.value === 'care' ? 'รายการซื้อ / ร้านที่ซื้อ: ' + (value('purchase') || 'เตรียมหลักฐานให้ทีมตรวจเพิ่มเติม') : null,
      (dealer ? 'พื้นที่จำหน่าย: ' : 'จังหวัดสำหรับจัดส่ง: ') + (value('area') || 'รอยืนยัน'),
      (dealer ? 'ประเภทร้าน / ช่องทางขาย และรายละเอียด: ' : 'รายละเอียด: ') + (value('notes') || 'ไม่ระบุ'),
      !dealer && photoName ? 'รูปที่เตรียมแนบ: ' + photoName + ' (ต้องแนบแยกในช่องทางจริง)' : null,
    ].filter(Boolean).join('\n');
    $('#request-text').textContent = text;
    $('#request-result').hidden = false;
    $('#copy-status').textContent = '';
    $('#request-result').scrollIntoView({ block: 'nearest' });
  });

  $('#copy-request').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#request-text').textContent);
      $('#copy-status').textContent = 'คัดลอกแล้ว ยังไม่ได้ส่งถึงทีม MAVO';
    } catch {
      $('#copy-status').textContent = 'เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ กรุณาเลือกข้อความด้านบนแล้วคัดลอก';
    }
  });

  $('#save-request').addEventListener('click', () => {
    const blob = new Blob([
      $('#request-text').textContent + '\n\nข้อความฉบับร่าง ยังไม่ได้ส่งถึงทีม MAVO',
    ], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'MAVO-request-draft.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    $('#copy-status').textContent = 'เตรียมไฟล์ข้อความแล้ว ยังไม่ได้ส่งถึงทีม MAVO';
  });
}
const handlers={products,product,compare,knowledge,article,check,business,'article-static':articleStatic,'buying-guide':async()=>{const {initBuyingGuide}=await import('/buying-guide.js');initBuyingGuide();}};
try{await handlers[document.body.dataset.page]?.();}catch(e){console.error(e);const error=document.createElement('div');error.className='container callout';error.setAttribute('role','alert');error.textContent='โหลดข้อมูลไม่สำเร็จ กรุณาลองรีเฟรชหน้าอีกครั้ง';$('#main').prepend(error);}
if(['127.0.0.1','localhost'].includes(location.hostname)){let revision;setInterval(async()=>{if(document.hidden)return;try{const state=await json('/__preview');if(revision&&revision!==state.revision)location.reload();revision=state.revision;}catch{}},2500);}
