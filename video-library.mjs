import {escapeHTML as esc,articlePath} from './seo.mjs';

export const videoPath=id=>'/videos/'+encodeURIComponent(id)+'.html';
export function youtubeId(video){
 const url=new URL(video.url);
 if(!['youtube.com','www.youtube.com'].includes(url.hostname))throw new Error('Expected original YouTube source');
 const id=url.searchParams.get('v');
 if(!/^[\w-]{11}$/.test(id??''))throw new Error('Invalid YouTube video ID');
 return id;
}
const sourceLink=(url,label)=>{
 try{if(new URL(url).protocol!=='https:')return esc(label);}catch{return esc(label);}
 return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
};
export function videoPlayer(video){
 const src='https://www.youtube-nocookie.com/embed/'+youtubeId(video)+'?cc_load_policy=1&cc_lang_pref=th&hl=th&playsinline=1&rel=0';
 return `<div class="video-embed"><iframe src="${esc(src)}" title="${esc(video.thai_title+' — '+video.publisher)}" width="640" height="360" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
}
export function captionStatus(video){
 const c=video.guide?.captions;
 if(c?.thaiNative)return 'มีคำบรรยายภาษาไทยจากต้นทาง';
 if(c?.thaiAutoTranslate)return 'มีซับต้นทาง · เลือกแปลไทยได้เมื่อเครื่องเล่นรองรับ';
 if(c?.status==='none-found')return 'ยังไม่พบซับจากต้นทาง · อ่านสรุปภาษาไทยประกอบได้';
 return 'คำบรรยายขึ้นอยู่กับต้นทาง · มีสรุปภาษาไทยให้อ่านประกอบ';
}
export function captionHelp(){
 return `<details class="video-caption-help" id="thai-subtitles"><summary>วิธีเปิดคำบรรยายภาษาไทย</summary><div><p>กด CC เพื่อเปิดคำบรรยาย แล้วกด ⚙ ในวิดีโอ → คำบรรยาย → แปลอัตโนมัติ → ไทย หากมีภาษาไทยในรายการคำบรรยาย ให้เลือกไทยได้โดยตรง</p><p>เมนูแปลอัตโนมัติมีเฉพาะคลิปและเครื่องเล่นที่รองรับ หากไม่พบ ให้ลอง ${sourceLink('https://support.google.com/youtube/answer/100078?hl=th','วิธีตั้งค่าคำบรรยายของ YouTube')} หรือเปิดคลิปที่ YouTube ต้นฉบับ คำแปลอัตโนมัติอาจแปลศัพท์เทคนิคคลาดเคลื่อน</p></div></details>`;
}
export function renderVideoLibrary(videos){
 return captionHelp()+`<div class="video-learning-grid">${videos.map((v,index)=>{
  const g=v.guide;
  return `<article class="video-lesson" id="video-${esc(v.id)}">${videoPlayer(v)}<div class="video-lesson-body"><p class="eyebrow">คลิป ${String(index+1).padStart(2,'0')} · ${esc(v.publisher)}</p><h3>${esc(v.thai_title)}</h3><p class="video-cc-status">${esc(captionStatus(v))}</p><p>${esc(g.summaryParagraphs[0])}</p><ul class="video-takeaways">${g.takeaways.map(item=>`<li>${esc(item)}</li>`).join('')}</ul><p class="video-summary-basis">${esc(g.summaryLabel)}</p><div class="actions"><a class="button secondary" href="${videoPath(v.id)}">อ่านบทสรุปภาษาไทย</a>${sourceLink(v.url,'เปิดที่ YouTube')}</div></div></article>`;
 }).join('')}</div>`;
}
export function renderVideoArticle(video,modules){
 const g=video.guide;
 const related=(g.relatedArticleIds??[]).map(id=>modules.find(m=>m.id===id)).filter(Boolean);
 return `<section class="section video-article-section"><div class="container"><nav class="breadcrumb" aria-label="เส้นทางหน้าเว็บ"><a href="/">หน้าแรก</a> / <a href="/knowledge.html">คลังความรู้</a> / <a href="/knowledge.html#videos">วิดีโอและสรุปภาษาไทย</a></nav><article class="video-article"><header><p class="eyebrow">ดูคลิป เข้าใจหลักการ นำไปใช้กับงานจริง</p><h1 class="page-title">${esc(video.thai_title)}</h1><p class="lead">${esc(video.why_watch_th)}</p><p class="muted small">วิดีโอต้นฉบับโดย ${esc(video.publisher)}</p></header>${videoPlayer(video)}<div class="video-player-meta"><p class="video-cc-status">${esc(captionStatus(video))}</p>${sourceLink(video.url,'เปิดคลิปต้นฉบับที่ YouTube')}</div>${captionHelp()}<div class="prose video-article-copy"><p class="video-summary-basis">${esc(g.summaryLabel)}</p><h2>บทสรุปภาษาไทย</h2>${g.summaryParagraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<h2>ประเด็นสำคัญที่ควรรู้</h2><ul>${g.takeaways.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><h2>นำไปใช้กับธุรกิจของคุณ</h2><p class="small muted">แนวทางนำข้อมูลไปใช้ เรียบเรียงโดย MAVO</p><ol>${g.applyToBusiness.map(p=>`<li>${esc(p)}</li>`).join('')}</ol><div class="callout">${esc(g.limitations)}</div><h2>แหล่งข้อมูลประกอบ</h2><ul class="source-list">${g.sources.map(s=>`<li>${sourceLink(s.url,s.title)}</li>`).join('')}</ul><p class="source-note">ตรวจข้อมูลต้นทางวันที่ 19 พฤศจิกายน 2569 · คลิปเป็นสื่อความรู้ของผู้เผยแพร่ ไม่ใช่ผลทดสอบหรือการรับรองสินค้า MAVO</p>${related.length?`<section class="video-related"><h2>อ่านต่อให้เข้าใจครบขึ้น</h2><ul>${related.map(m=>`<li><a href="${articlePath(m.id)}">${esc(m.title)}</a></li>`).join('')}</ul></section>`:''}<div class="actions"><a class="button secondary" href="/knowledge.html#videos">ดูคลิปความรู้อื่น</a><a class="text-link" href="/check.html">ให้ทีมช่วยตรวจรุ่นเครื่อง</a></div></div></article></div></section>`;
}
