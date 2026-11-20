import {attachArticleImage} from './article-images.mjs';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const money = value => Number(value).toLocaleString('th-TH', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

const httpsURL = value => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

const articleURL = id => `/articles/${encodeURIComponent(String(id))}.html`;
const compareURL = sku => `/compare.html?sku=${encodeURIComponent(String(sku))}`;
const moduleList = value => Array.isArray(value) ? value : (value?.modules ?? []);
const externalLink = (url, title) => `<a href="${escapeHTML(httpsURL(url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(title)}</a>`;

// Convert prices once, then perform every purchase-budget calculation in satang.
const toSatang = value => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const result = Math.round((value + Number.EPSILON) * 100);
  return Number.isSafeInteger(result) ? result : null;
};

const verifiedAvailableOffer = offer => Boolean(
  offer && offer.availability === 'available' && offer.stockDetail !== 'backorder' &&
  ['included', 'excluded'].includes(offer.vatBasis) &&
  toSatang(offer.priceIncVat) !== null &&
  Number.isFinite(offer.priceExVat) && offer.priceExVat > 0 &&
  httpsURL(offer.sourceUrl) && httpsURL(offer.vatEvidenceUrl)
);

const caseConfigs = [
  {
    id: 'shop-tn1000-budget', title: 'ร้านค้า / ธุรกิจส่วนตัว',
    sku: 'MAV-TN1000', model: 'TN1000', monthlyQuantity: 2,
    context: 'ตั้งงบซื้อ 2 ตลับต่อเดือน สำหรับเครื่องเลเซอร์รุ่นที่รองรับ'
  },
  {
    id: 'office-tn2560-budget', title: 'สำนักงาน / SME',
    sku: 'MAV-TN2560', model: 'TN2560', monthlyQuantity: 5,
    context: 'ตั้งงบซื้อ 5 ตลับต่อเดือน สำหรับเครื่องเลเซอร์รุ่นที่รองรับ'
  },
  {
    id: 'multisite-107a-budget', title: 'ห้าง / ธุรกิจหลายสาขา',
    sku: 'MAV-107A', model: '107A', monthlyQuantity: 20,
    context: 'ตั้งงบซื้อรวม 20 ตลับต่อเดือน สำหรับเครื่องเลเซอร์รุ่นที่รองรับ'
  }
];

function createExample(config, data) {
  const record = (data?.records ?? []).find(item => item.sku === config.sku);
  const offer = (record?.comparisons ?? []).find(verifiedAvailableOffer);
  const mavoCents = toSatang(record?.salePriceIncVat);
  const common = {
    ...config,
    model: record?.model ?? config.model,
    annualQuantity: config.monthlyQuantity * 12,
    months: 12,
    vatBasis: 'included',
    mavoIncludesStandardShipping: true,
    oemShippingBasis: 'product-price-only',
    hypothetical: true,
    assumesEqualYield: false
  };
  if (mavoCents === null || !offer) {
    return {
      ...common, available: false,
      mavoPrice: mavoCents === null ? null : mavoCents / 100,
      oemPrice: null, delta: null, percent: null,
      monthlyMavoCost: null, monthlyOemCost: null, monthlyDelta: null,
      annualMavoCost: null, annualOemCost: null, annualDelta: null,
      sourceUrl: '', sourceTitle: '', observedDate: '',
      missingReason: 'ยังไม่มีราคาอ้างอิงที่มีสินค้าและยืนยันฐาน VAT ครบ จึงยังไม่คำนวณส่วนต่าง'
    };
  }
  const oemCents = toSatang(offer.priceIncVat);
  const deltaCents = oemCents - mavoCents;
  const monthlyQuantity = config.monthlyQuantity;
  const annualQuantity = common.annualQuantity;
  return {
    ...common, available: true,
    mavoPrice: mavoCents / 100,
    oemPrice: oemCents / 100,
    delta: deltaCents / 100,
    percent: deltaCents / oemCents * 100,
    monthlyMavoCost: mavoCents * monthlyQuantity / 100,
    monthlyOemCost: oemCents * monthlyQuantity / 100,
    monthlyDelta: deltaCents * monthlyQuantity / 100,
    annualMavoCost: mavoCents * annualQuantity / 100,
    annualOemCost: oemCents * annualQuantity / 100,
    annualDelta: deltaCents * annualQuantity / 100,
    sourceUrl: httpsURL(offer.sourceUrl),
    sourceTitle: offer.sourceTitle || `${offer.oemBrand} ${offer.oemModel}`,
    observedDate: offer.observedDate || data.observedDate || '',
    vatEvidenceUrl: httpsURL(offer.vatEvidenceUrl),
    oemBrand: offer.oemBrand,
    oemModel: offer.oemModel,
    referenceAvailability: offer.availability,
    priceKind: offer.priceKind || 'retail'
  };
}

function exampleCard(example) {
  const link = `<a class="text-link" href="${escapeHTML(compareURL(example.sku))}">ดูราคาและตรวจความคุ้มค่ารุ่นนี้</a>`;
  if (!example.available) {
    return `<article class="business-case"><p class="eyebrow">ตัวอย่างสมมติ</p><h3>${escapeHTML(example.title)}</h3><p>${escapeHTML(example.context)}</p><p class="muted">${escapeHTML(example.missingReason)}</p>${link}</article>`;
  }
  const direction = example.annualDelta >= 0 ? 'งบซื้อตลับลดลง' : 'งบซื้อตลับเพิ่มขึ้น';
  const perCartridge = example.delta >= 0 ? 'ราคาซื้อต่อตลับลดลง' : 'ราคาซื้อต่อตลับเพิ่มขึ้น';
  return `<article class="business-case">
    <p class="eyebrow">ตัวอย่างสมมติ · ${escapeHTML(example.monthlyQuantity)} ตลับ / เดือน</p>
    <h3>${escapeHTML(example.title)}</h3>
    <p class="muted">${escapeHTML(example.sku)} · เทียบ ${escapeHTML(example.oemBrand)} ${escapeHTML(example.oemModel)}</p>
    <p class="small">${escapeHTML(direction)}ใน 12 เดือน</p>
    <p class="business-amount">${escapeHTML(money(Math.abs(example.annualDelta)))} <span>บาท</span></p>
    <dl class="business-price-list">
      <div><dt>MAVO / ตลับ</dt><dd>${escapeHTML(money(example.mavoPrice))} บาท</dd></div>
      <div><dt>ตลับแท้ / ตลับ</dt><dd>${escapeHTML(money(example.oemPrice))} บาท</dd></div>
    </dl>
    <p class="small">${escapeHTML(perCartridge)} ${escapeHTML(Math.abs(example.percent).toFixed(1))}% · ซื้อรวม ${escapeHTML(example.annualQuantity)} ตลับเท่ากัน</p>
    ${link}
    <p class="business-note">ราคาอ้างอิง ${externalLink(example.sourceUrl, example.sourceTitle)}<br>ตรวจเมื่อ ${escapeHTML(example.observedDate)}</p>
  </article>`;
}

const exampleScope = 'ตัวอย่างตั้งงบซื้อสมมติ: ซื้อจำนวนตลับเท่ากันทุกเดือนเป็นเวลา 12 เดือน โดยใช้ราคาอ้างอิงคงเดิม ไม่ใช่ผลของลูกค้าจริงหรือการรับรองว่าพิมพ์ได้เท่ากัน ราคาทั้งสองฝั่งรวม VAT 7% แล้ว ราคา MAVO รวมส่งปกติในประเทศ ส่วนตลับแท้เป็นราคาสินค้า ไม่รวมค่าส่งที่อาจมีเพิ่ม ราคาหรือสต็อกต้นทางอาจเปลี่ยนได้';

function examplesSection(examples, compact = false) {
  return `<section class="section business-examples" id="budget-examples"><div class="container">
    <div class="section-heading"><div><p class="eyebrow">เห็นตัวเลข ก่อนตัดสินใจ</p><h2>ซื้อจำนวนเท่ากัน<br>งบต่างกันได้เท่าไร</h2></div><p class="lead">ลองเริ่มจากจำนวนที่ธุรกิจคุณซื้อจริง แล้วดูว่าส่วนต่างช่วยจัดสรรงบให้เรื่องอื่นได้แค่ไหน</p></div>
    <div class="business-case-grid">${examples.map(exampleCard).join('')}</div>
    <p class="business-note">${escapeHTML(exampleScope)}</p>
    <div class="actions"><a class="button secondary" href="${escapeHTML(articleURL('office-toner-budget-examples'))}">ดูวิธีคิดและงบซื้อรายเดือน</a>${compact ? '<a class="text-link" href="/business.html">อ่านแนวคิดธุรกิจใช้คุ้ม</a>' : '<a class="text-link" href="/compare.html#calculator">คำนวณต้นทุนต่อหน้าที่ใช้ได้จริง</a>'}</div>
  </div></section>`;
}

function readingCard(module) {
  return `<a class="business-reading-card" href="${escapeHTML(articleURL(module.id))}">${articleThumbnail(module)}<span class="eyebrow">อ่านแล้วนำไปใช้ได้</span><h3>${escapeHTML(module.title)}</h3><p>${escapeHTML(module.summary)}</p><span class="text-link">อ่านบทความ</span></a>`;
}

function articleThumbnail(module){
  if(!module.image)return '';
  return `<span class="reading-image"><img src="${escapeHTML(module.image.src)}" ${module.image.srcset ? `srcset="${escapeHTML(module.image.srcset)}" sizes="(max-width:600px) 90vw, 600px"` : ''} alt="${escapeHTML(module.image.alt)}" width="${module.image.width}" height="${module.image.height}" loading="lazy" decoding="async"><span class="image-label">ภาพประกอบจำลอง</span></span>`;
}

function createCaseArticle(examples) {
  const available = examples.filter(example => example.available);
  const caseParagraphs = available.map(example => `${example.title}: สมมติซื้อ ${example.monthlyQuantity} ตลับต่อเดือน รวม ${example.annualQuantity} ตลับใน 12 เดือน รุ่น ${example.sku} ราคา ${money(example.mavoPrice)} บาทต่อตลับ เทียบตลับแท้ ${example.oemBrand} ${example.oemModel} ราคา ${money(example.oemPrice)} บาทต่อตลับ งบซื้อรายเดือนเป็น ${money(example.monthlyMavoCost)} และ ${money(example.monthlyOemCost)} บาทตามลำดับ ส่วนต่าง ${money(Math.abs(example.monthlyDelta))} บาทต่อเดือน ใน 12 เดือนงบซื้อเป็น ${money(example.annualMavoCost)} และ ${money(example.annualOemCost)} บาท โดย MAVO ${example.annualDelta >= 0 ? 'ใช้งบซื้อน้อยกว่า' : 'ใช้งบซื้อมากกว่า'} ${money(Math.abs(example.annualDelta))} บาท หรือ ${Math.abs(example.percent).toFixed(1)}% ของงบตลับแท้ อ้างอิง ${example.sourceTitle} ตรวจเมื่อ ${example.observedDate}`);
  const sources = Array.from(new Map(available.map(example => [example.sourceUrl, {
    title: `${example.sourceTitle} · ${example.oemBrand} ${example.oemModel} · ตรวจราคา ${example.observedDate}`,
    url: example.sourceUrl
  }])).values());
  return {
    id: 'office-toner-budget-examples',
    title: 'ลองตั้งงบซื้อตลับให้ธุรกิจ ด้วยราคาที่ตรวจสอบได้',
    summary: 'ตัวอย่างร้านค้า สำนักงาน และหลายสาขา ใช้ราคา MAVO กับตลับแท้รวม VAT เพื่อเห็นส่วนต่างงบซื้อรายเดือนและ 12 เดือน ก่อนทดลองกับงานจริง',
    paragraphs: [
      'ค่าใช้จ่ายที่เกิดซ้ำเป็นจุดเริ่มต้นที่ดีของการใช้งบอย่างคุ้มค่า เจ้าของธุรกิจส่วนตัว ร้านค้าออนไลน์ และทีมสำนักงานสามารถเริ่มจากใบซื้อเดิมของตัวเอง: ใช้รุ่นอะไร ซื้อครั้งละกี่ตลับ และมีค่าใช้จ่ายอื่นอีกเท่าไร ตัวอย่างต่อไปนี้ช่วยให้เห็นขนาดของงบซื้อ โดยไม่ต้องเริ่มจากการเปลี่ยนทุกเครื่องในครั้งเดียว',
      'ทุกตัวอย่างใช้ราคาขาย MAVO และราคาอ้างอิงตลับแท้จากหน้าสินค้าที่บันทึกไว้ โดยยืนยันฐาน VAT และสถานะมีสินค้าในวันที่ตรวจ คำนวณจากจำนวนเงินระดับสตางค์ก่อนแสดงผล ส่วนต่างต่อตลับ = ราคาตลับแท้ − ราคา MAVO; ส่วนต่างงบซื้อรายเดือน = ส่วนต่างต่อตลับ × จำนวนตลับที่สมมติซื้อ; ส่วนต่างใน 12 เดือน = ส่วนต่างรายเดือน × 12',
      ...caseParagraphs,
      'จำนวน 2, 5 และ 20 ตลับเป็นเพียงสมมติฐานให้เห็นวิธีวางงบ ไม่ใช่การบอกว่าธุรกิจแต่ละขนาดต้องใช้เท่านี้ และการซื้อจำนวนเท่ากันไม่ได้แปลว่าจะพิมพ์ได้เท่ากัน จึงยังไม่ใช่ผลประหยัดสุทธิจากการใช้งาน ต้นทุนจริงควรนับหน้าที่ใช้งานได้ งานเสีย เวลาแก้ปัญหา และค่าบริการที่เกิดขึ้นด้วย',
      'เริ่มจากตรวจรุ่นเครื่อง เลือกเอกสารที่ใช้ประจำ แล้วทดลองกับเครื่องหนึ่งเครื่อง เก็บต้นทุนและผลพิมพ์ให้ครบหนึ่งรอบตลับ หากผลผ่านเกณฑ์ของธุรกิจ จึงค่อยปรับงบและจำนวนที่ซื้อ ส่วนต่างที่เกิดขึ้นจริงอาจนำไปดูแลลูกค้า เติมสินค้า หรือสนับสนุนงานสำคัญอื่นตามลำดับความจำเป็นของกิจการ'
    ],
    practical_steps: [
      'จดรหัสเครื่อง รหัสตลับ และยอดซื้อจริงรวม VAT จากรอบก่อน แล้วตรวจความเข้ากันได้ก่อนเลือกสินค้า',
      'ใช้จำนวนตลับที่คุณต้องการตั้งงบแทนตัวเลขสมมติ พร้อมตรวจราคาวันสั่งซื้อและค่าส่งทั้งสองฝั่ง',
      'แยกส่วนต่างงบซื้อออกจากต้นทุนต่อหน้าที่ใช้งานได้จริง และเก็บผลทดลองก่อนขยายการใช้งาน',
      'สอบถามเงื่อนไขรับประกันและวิธีส่งหลักฐานให้ MAVO Care Online ก่อนสั่งซื้อ เพื่อวางแผนการดูแลให้ตรงกับงาน'
    ],
    scope_note: exampleScope,
    sources,
    examples
  };
}

/** Build article data and escaped HTML fragments from public retail prices only. */
export function createBusinessContent(data, businessModules, audienceModules) {
  const examples = caseConfigs.map(config => createExample(config, data));
  const caseArticle = attachArticleImage(createCaseArticle(examples));
  const reading = [...moduleList(businessModules), caseArticle].map(attachArticleImage);
  const audienceOrder = ['small-shop-print-budget', 'online-shop-laser-print-budget', 'business-office-print-budget', 'multi-branch-print-budget'];
  const rank = module => {
    const position = audienceOrder.indexOf(module.id);
    return position === -1 ? audienceOrder.length : position;
  };
  const audiences = [...moduleList(audienceModules)].map(attachArticleImage).sort((left, right) => rank(left) - rank(right));
  const socialPosts = audiences.filter(module => module.share && typeof module.share === 'object')
    .map(module => ({ ...module.share, id: module.id }));
  const homeExamples = examplesSection(examples, true);
  const readingGrid = `<div class="business-reading-grid">${reading.map(readingCard).join('')}</div>`;
  const homeReading = `<section class="section business-reading"><div class="container"><div class="section-heading"><div><p class="eyebrow">เลือกของเป็น ใช้ให้คุ้ม</p><h2>ความรู้เล็ก ๆ<br>ช่วยตัดสินใจได้ดีขึ้น</h2></div><a class="text-link" href="/business.html">ธุรกิจใช้คุ้ม</a></div>${readingGrid}</div></section>`;
  const audienceCards = audiences.map(module => `<a class="audience-card" href="${escapeHTML(articleURL(module.id))}">${articleThumbnail(module)}<p class="eyebrow">เริ่มจากงานของคุณ</p><h3>${escapeHTML(module.title)}</h3><p>${escapeHTML(module.summary)}</p><span class="text-link">ดูแนวทางสำหรับธุรกิจนี้</span></a>`).join('');
  const hubContent = `<section class="intro"><div class="container"><p class="eyebrow">ธุรกิจใช้คุ้ม</p><h1 class="page-title">ทุกการเลือกที่คุ้มค่า<br>คือความใส่ใจในธุรกิจ</h1><p class="lead">เจ้าของธุรกิจส่วนตัว ร้านค้าออนไลน์ และ SME ต่างมีงบที่อยากใช้ให้เกิดประโยชน์ เริ่มจากสิ่งที่ใช้ทุกวันอย่างงานพิมพ์ เลือกให้ตรงกับงาน ตรวจคุณภาพได้ และรู้ว่ามีใครดูแลเมื่อเกิดปัญหา</p><p class="muted">สำหรับธุรกิจที่ใช้เครื่องพิมพ์เลเซอร์รุ่นที่รองรับ ตั้งแต่เครื่องเดียวในร้าน ไปจนถึงสำนักงาน ห้าง และหลายสาขา</p><div class="actions"><a class="button primary" href="/check.html">ส่งรุ่นเครื่องให้เราตรวจ</a><a class="button secondary" href="#budget-examples">ดูตัวอย่างงบซื้อ</a></div></div></section>
  <section class="section"><div class="container"><div class="section-heading"><div><p class="eyebrow">เริ่มจากเรื่องใกล้ตัว</p><h2>งานต่างกัน<br>วิธีเลือกก็ต่างกัน</h2></div><p class="lead">เลือกอ่านให้ตรงกับวิธีทำงานของคุณ แล้วนำไปใช้กับข้อมูลจริงของธุรกิจ</p></div><div class="audience-grid">${audienceCards}</div></div></section>
  <section class="section business-reading"><div class="container"><div class="section-heading"><div><p class="eyebrow">เข้าใจวิธีคิด แล้วค่อยเลือก</p><h2>เลือกเป็น ใช้เป็น<br>วัดความคุ้มค่าเป็น</h2></div><a class="text-link" href="/knowledge.html">ดูคลังความรู้ทั้งหมด</a></div>${readingGrid}</div></section>
  ${examplesSection(examples)}
  <section class="section"><div class="container"><div class="callout"><p class="eyebrow">มั่นใจก่อนเปลี่ยน</p><h2>เริ่มจากเครื่องเดียว<br>ให้ผลใช้งานช่วยตัดสินใจ</h2><p>เริ่มจากเครื่องที่ยืนยันรุ่นแล้ว เก็บตัวอย่างงานพิมพ์และจำนวนหน้าที่ใช้ได้ พร้อมเทียบค่าใช้จ่ายจริง ก่อนขยายการใช้ไปทั้งธุรกิจ</p><div class="actions"><a class="button primary" href="/check.html">ให้ทีมตรวจรุ่นเครื่อง</a><a class="button secondary" href="/care.html">อ่านเงื่อนไข MAVO Care</a></div></div></div></section>
  `;
  return { examples, caseArticle, homeExamples, homeReading, hubContent, socialPosts };
}
