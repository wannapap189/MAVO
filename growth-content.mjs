import {articleCard} from './article-page.mjs';
export function renderGrowthReading(modules,{dealer=false}={}){
 const selected=dealer?modules.filter(m=>['toner-dealer-first-customers','time-back-for-customers'].includes(m.id)):modules;
 return `<section class="section business-reading growth-reading" id="business-growth-reading"><div class="container"><div class="section-heading"><div><p class="eyebrow">เลือกคุ้ม แล้วต่อยอดให้เป็น</p><h2>${dealer?'เริ่มจากความรู้<br>ต่อยอดเป็นโอกาสขาย':'เงินที่เหลือ<br>ต่อยอดอะไรได้บ้าง'}</h2><p class="lead">${dealer?'รู้รุ่น คิดต้นทุนครบ และดูแลลูกค้าตามที่ตกลง':'เรื่องเงิน เวลา และโอกาสของบริษัท ร้านค้า และธุรกิจออนไลน์'}</p></div><a class="text-link" href="/knowledge.html#business-growth">อ่านชุดความรู้เพื่อธุรกิจ</a></div><div class="business-reading-grid">${selected.map(articleCard).join('')}</div></div></section>`;
}
