const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const money = value => value.toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// All product-page destinations stay on this site; query values are encoded.
function internalHref(path, parameters = {}) {
  const origin = 'https://mavo.invalid';
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError('Product-page links must use an absolute site path.');
  }
  const url = new URL(path, origin);
  if (url.origin !== origin) {
    throw new TypeError('Product-page links must stay on this site.');
  }
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, String(value));
  }
  return escapeHTML(`${url.pathname}${url.search}${url.hash}`);
}

/** Render public product content; the caller supplies the page shell and SEO metadata. */
export function renderProductPage(record) {
  if (!record || typeof record !== 'object') {
    throw new TypeError('A public product record is required.');
  }
  for (const field of ['sku', 'brand', 'model']) {
    if (typeof record[field] !== 'string' || !record[field].trim()) {
      throw new TypeError(`Product record requires a non-empty ${field}.`);
    }
  }
  if (typeof record.salePriceIncVat !== 'number' ||
      !Number.isFinite(record.salePriceIncVat) || record.salePriceIncVat <= 0) {
    throw new TypeError(`Product ${record.sku} requires a valid public VAT-inclusive price.`);
  }

  const sku = escapeHTML(record.sku);
  const model = escapeHTML(record.model);
  const brand = escapeHTML(record.brand);
  const color = String(record.color ?? '').trim();
  const colorLabel = color && color !== 'ไม่ระบุ'
    ? escapeHTML(color)
    : 'ให้ทีมยืนยันก่อนสั่งซื้อ';
  const checkHref = internalHref('/check.html', { sku: record.sku });
  const compareHref = internalHref('/compare.html', { sku: record.sku });

  return `<section class="section">
  <div class="container">
    <p class="breadcrumb"><a href="${internalHref('/')}">หน้าแรก</a> / <a href="${internalHref('/products.html')}">สินค้าและราคา</a> / <span aria-current="page">MAVO ${model}</span></p>
    <div id="product-detail">
      <div class="detail-grid">
        <div class="detail-image">
          <img src="/assets/mavo-box-navy-cool-blue-v3.png" alt="ภาพคอนเซ็ปต์กล่องโทนเนอร์ MAVO สีน้ำเงินเข้มและฟ้า" width="1536" height="1024">
          <p class="source-note">ภาพคอนเซ็ปต์กล่องสีน้ำเงินเข้มและฟ้า สินค้าแยกรุ่นด้วยสติกเกอร์</p>
        </div>
        <div>
          <p class="eyebrow">สำหรับเครื่อง ${brand}</p>
          <h1 class="page-title">MAVO ${model}</h1>
          <p class="product-sku">${sku}</p>
          <p>โทนเนอร์ทดแทนแบบตลับผลิตใหม่ ไม่ใช้ตลับเก่ามาปรับสภาพ สำหรับรุ่นเครื่องที่ทีม MAVO ยืนยันก่อนสั่งซื้อ</p>
          <p class="detail-price">${money(record.salePriceIncVat)} <small>บาท / ตลับ</small></p>
          <p class="muted">รวม VAT 7% และจัดส่งปกติ Flash Express ในประเทศ</p>
          <div class="actions">
            <a class="button primary" href="${checkHref}">ส่งรุ่นเครื่องเพื่อตรวจตลับนี้</a>
            <a class="button secondary" href="${compareHref}">เปรียบเทียบราคา</a>
          </div>
          <dl class="spec-list">
            <div><dt>รหัสสินค้า MAVO</dt><dd>${sku}</dd></div>
            <div><dt>รหัสตลับอ้างอิง</dt><dd>${model}</dd></div>
            <div><dt>สี</dt><dd>${colorLabel}</dd></div>
            <div><dt>ชนิดตลับ</dt><dd>ตลับผลิตใหม่ทั้งหมด</dd></div>
            <div><dt>การรับประกัน</dt><dd>คุณภาพตลับ 1 ปีนับจากวันที่ได้รับสินค้า ตามเงื่อนไข MAVO Care</dd></div>
            <div><dt>การตรวจสอบสิทธิ์</dt><dd>ใช้ Serial ประจำตลับคู่กับรายการซื้อ <a href="/care.html#serial-warranty">ดูวิธีตรวจสอบ</a></dd></div>
            <div><dt>จำนวนหน้าที่พิมพ์ได้</dt><dd>ให้ทีมยืนยันจำนวนหน้าอ้างอิงและเงื่อนไขทดสอบก่อนสั่งซื้อ</dd></div>
          </dl>
          <div class="callout small">รหัสตลับอย่างเดียวอาจยังไม่ยืนยันว่าใช้กับเครื่องของคุณได้ ส่งชื่อรุ่นเครื่องหรือรูปป้ายรุ่นให้เราตรวจก่อน</div>
          <a class="text-link" href="${internalHref('/care.html')}">อ่านเงื่อนไข MAVO Care</a>
        </div>
      </div>
    </div>
  </div>
</section>
<section class="section">
  <div class="container">
    <p class="eyebrow">MAVO KNOWLEDGE</p>
    <h2>ข้อมูลที่ช่วยให้เลือกตลับอย่างมั่นใจ</h2>
    <ul class="source-list">
      <li><a href="${internalHref('/articles/toner-material-and-compatibility.html')}">ทำความเข้าใจผงหมึกและความเหมาะสมกับรุ่นเครื่อง</a></li>
      <li><a href="${internalHref('/articles/print-quality-check.html')}">วิธีตรวจคุณภาพงานพิมพ์และบันทึกอาการที่พบ</a></li>
      <li><a href="${internalHref('/articles/usable-page-cost.html')}">ประเมินความคุ้มค่าจากต้นทุนต่อหน้าที่ใช้งานได้จริง</a></li>
    </ul>
  </div>
</section>`;
}
