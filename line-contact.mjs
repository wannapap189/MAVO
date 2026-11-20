import {escapeHTML} from './seo.mjs';

export function lineContactURL(config){
 const value=String(config.contact?.lineOAUrl??'').trim();
 if(!value)return '';
 const url=new URL(value);
 if(url.protocol!=='https:'||!['line.me','www.line.me','lin.ee','page.line.me'].includes(url.hostname)||url.username||url.password||url.port||url.pathname==='/')throw new Error('Use the official HTTPS LINE OA link in contact.lineOAUrl.');
 return url.href;
}

const icon='<svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true"><path d="M26 14.5c0 5-4.5 8.5-10 8.5h-2l-5 4v-5.5c-3-1.5-5-4-5-7C4 9.5 9.4 6 15 6s11 3.5 11 8.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 14h12M10 18h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function renderLineContact(url,{label='คุยกับ MAVO ทาง LINE',floating=false}={}){
 const classes='line-contact'+(floating?' line-contact-floating':'');
 if(!url)return `<button type="button" class="${classes} line-contact-pending" disabled aria-label="LINE OA MAVO กำลังเตรียมเปิดให้บริการ">${icon}<span><strong>LINE OA MAVO</strong><small>เร็ว ๆ นี้</small></span></button>`;
 return `<a class="${classes}" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(label)} (เปิด LINE ในแท็บใหม่)">${icon}<span><strong>${escapeHTML(label)}</strong></span></a>`;
}
