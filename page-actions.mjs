import {escapeHTML as esc} from './seo.mjs';
import {renderLineContact} from './line-contact.mjs';

// Each page leads to the task that follows its content.
export function renderPageAction({id,eyebrow,title,description,action,secondaryHref,secondaryLabel}){
 return `<section class="page-next-step" id="${esc(id)}" aria-labelledby="${esc(id)}-title"><div class="container"><div class="page-next-step-inner"><div><p class="eyebrow">${esc(eyebrow)}</p><h2 id="${esc(id)}-title">${esc(title)}</h2><p>${esc(description)}</p></div><div class="page-next-step-actions">${action}${secondaryHref?`<a class="text-link" href="${esc(secondaryHref)}">${esc(secondaryLabel)}</a>`:''}</div></div></div></section>`;
}

export function renderCatalogAction(lineURL){
 return `<section class="cta-section" id="catalog-help"><div class="container"><p class="eyebrow">เลือกให้ตรงกับเครื่องของคุณ</p><h2>ไม่แน่ใจรหัสตลับ?<br>ให้ทีม MAVO ช่วยตรวจรุ่น</h2><p class="lead">ส่งชื่อรุ่นหรือรูปป้ายเครื่อง<br>ทีมช่วยยืนยันตลับที่ใช้ได้ พร้อมราคาและเงื่อนไขก่อนซื้อ</p><div class="actions">${renderLineContact(lineURL,{label:'ส่งรุ่นเครื่องทาง LINE'})}<a class="text-link" href="/check.html">กรอกข้อมูลรุ่นเครื่อง</a></div></div></section>`;
}
