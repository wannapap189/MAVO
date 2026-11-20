import {escapeHTML} from './seo.mjs';

function socialURL(value,hosts){
 try{
  const url=new URL(String(value??'').trim());
  if(url.protocol!=='https:'||!hosts.includes(url.hostname)||url.username||url.password||url.port)return '';
  return url.href;
 }catch{return '';}
}

const channelIcons={
 email:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
 phone:'<path d="M8 3H5a2 2 0 0 0-2 2c0 9 7 16 16 16a2 2 0 0 0 2-2v-3l-5-2-2 3a14 14 0 0 1-7-7l3-2-2-5Z"/>',
 facebook:'<path d="M14.5 21v-8h3l.5-4h-3.5V7c0-1.2.5-2 2-2H18V1.5A18 18 0 0 0 15 1c-3 0-5 2-5 5v3H7v4h3v8"/>',
 youtube:'<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 6 3-6 3Z"/>'
};
function channelIcon(key,enabled){return enabled?`<span class="contact-channel-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${channelIcons[key]}</svg></span>`:'';}

export function renderContactChannels(config,{icons=false}={}){
 const contact=config?.contact??{};
 const items=[];
 const email=String(contact.email??'').trim();
 if(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)){
  const address=encodeURIComponent(email).replace('%40','@');
  items.push(`<li data-channel="email">${channelIcon('email',icons)}<span class="contact-channel-label">อีเมลฝ่ายขาย</span><a href="mailto:${escapeHTML(address)}">${escapeHTML(email)}</a></li>`);
 }
 const phones=(Array.isArray(contact.phones)?contact.phones:[]).filter(phone=>phone&&/^tel:\+?\d{6,15}$/.test(String(phone.href??''))&&String(phone.label??'').trim());
 if(phones.length){
  items.push('<li data-channel="phone">'+channelIcon('phone',icons)+'<span class="contact-channel-label">โทรคุยกับทีม MAVO</span><span class="contact-channel-links">'+phones.map(phone=>`<a href="${escapeHTML(phone.href)}">${escapeHTML(phone.label)}</a>`).join('')+'</span></li>');
 }
 for(const [key,label,hosts] of [
  ['facebook','Facebook',['facebook.com','www.facebook.com','m.facebook.com']],
  ['youtube','YouTube',['youtube.com','www.youtube.com','m.youtube.com']],
 ]){
  const channel=contact[key];
  const url=socialURL(channel?.url,hosts);
  if(!url||!String(channel?.name??'').trim())continue;
  items.push(`<li data-channel="${key}">${channelIcon(key,icons)}<span class="contact-channel-label">${label}</span><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(label+' '+channel.name+' (เปิดในแท็บใหม่)')}">${escapeHTML(channel.name)}</a></li>`);
 }
 return items.length?'<ul class="contact-channels" aria-label="ช่องทางติดต่อ MAVO">'+items.join('')+'</ul>':'';
}
