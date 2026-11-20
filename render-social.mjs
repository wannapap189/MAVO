import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.dirname(fileURLToPath(import.meta.url));
const asset=path.join(root,'dist/assets/social');
const output=path.resolve(root,'../outputs/mavo-business-content-20261119');
await fs.mkdir(output,{recursive:true});
const posts=JSON.parse(await fs.readFile(path.join(root,'dist/data/social-posts.json'),'utf8'));
const logo=(await fs.readFile(path.join(root,'dist/assets/mavo-logo.png'))).toString('base64');
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layouts={
 'small-shop-print-budget':{audience:'เจ้าของกิจการ · ธุรกิจส่วนตัว',lines:['ดูแลรายจ่าย','ได้ตั้งแต่','ตลับที่เลือก'],body:'งานเอกสารของร้าน เลือกให้ตรงงาน\nและคุ้มกับงบที่ใช้ทุกวัน'},
 'online-shop-laser-print-budget':{audience:'ร้านค้าออนไลน์',lines:['ขายออนไลน์','งานหลังร้าน','ก็เลือกคุ้มได้'],body:'สำหรับงานเอกสารที่พิมพ์ด้วยเครื่องเลเซอร์\nเริ่มจากตรวจรุ่นและค่าใช้จ่ายของร้าน'},
 'business-office-print-budget':{audience:'สำนักงาน SME',lines:['เลือกอย่างมั่นใจ','อธิบายความคุ้มค่า','ได้ด้วยข้อมูล'],body:'ดูงานพิมพ์จริง ต้นทุนต่อหน้า\nและการดูแลที่เหมาะกับสำนักงาน'},
 'multi-branch-print-budget':{audience:'ธุรกิจหลายสาขา',lines:['หลายสาขา','ก็จัดงบพิมพ์','ให้เป็นระบบได้'],body:'เริ่มจากรุ่นเครื่อง รหัสตลับ\nและข้อมูลที่ทีมใช้ร่วมกัน'},
};
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:1200},deviceScaleFactor:1});
const report=[];
try {
 for(const post of posts){
  const layout=layouts[post.id];if(!layout)throw new Error('Unknown post '+post.id);
  const html=`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escape(post.headline)}</title><style>
  *{box-sizing:border-box}html,body{width:1200px;height:1200px;margin:0;overflow:hidden}body{font-family:Tahoma,Arial,sans-serif;background:#09253d;color:white}.brand-bar{height:164px;background:white;padding:26px 65px;display:flex;align-items:center;justify-content:space-between;color:#09253d}.brand-bar img{width:275px;height:104px;object-fit:contain}.series{font-size:27px;letter-spacing:1px}.content{padding:52px 72px 0;position:relative}.audience{font-size:28px;color:#a5dfef;margin:0 0 30px}.audience:before{content:'';display:inline-block;width:16px;height:16px;background:#ff8a1f;margin-right:16px}h1{font-size:88px;line-height:1.33;letter-spacing:-2px;margin:0;font-weight:700;width:1056px}h1 span{display:block}h1 span:last-child{color:#5cc6e7}.description{font-size:33px;line-height:1.65;color:#d5e8f2;white-space:pre-line;margin:32px 0 0}.points{display:flex;gap:17px;margin-top:32px}.points span{padding:10px 18px;border:1px solid #46728b;border-radius:9px;font-size:25px;color:#e0f1f7}.bottom{position:absolute;left:72px;right:72px;bottom:42px;border-top:2px solid #31566e;padding-top:24px}.belief{font-size:33px;line-height:1.5;margin:0}.category{font-size:24px;line-height:1.5;color:#bdd6e3;margin:15px 0 0}
  </style></head><body><header class="brand-bar"><img src="data:image/png;base64,${logo}" alt="MAVO Confidence, every day."><span class="series">เลือกคุ้ม · ใช้เป็น</span></header><main class="content"><p class="audience">${escape(layout.audience)}</p><h1>${layout.lines.map(line=>'<span>'+escape(line)+'</span>').join('')}</h1><p class="description">${escape(layout.body)}</p><div class="points"><span>ตรวจรุ่นก่อนซื้อ</span><span>ดูผลงานจริง</span><span>รู้เงื่อนไขดูแล</span></div></main><footer class="bottom"><p class="belief">ทุกการเลือกที่คุ้มค่า คือความใส่ใจในธุรกิจ</p><p class="category">โทนเนอร์ทางเลือกแบบตลับผลิตใหม่ · สำหรับเครื่องรุ่นที่รองรับ</p></footer></body></html>`;
  await fs.writeFile(path.join(output,post.id+'.html'),html);
  await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
  const bounds=await page.evaluate(()=>({title:document.querySelector('h1').getBoundingClientRect().right,points:document.querySelector('.points').getBoundingClientRect().bottom,footer:document.querySelector('.bottom').getBoundingClientRect().top,overflow:[...document.querySelectorAll('h1 span,.belief,.category,.series')].some(el=>el.scrollWidth>el.clientWidth)}));
  if(bounds.title>1200||bounds.points>bounds.footer-20||bounds.overflow)throw new Error(JSON.stringify({id:post.id,bounds}));
  const png=path.join(asset,post.id+'.png');await page.screenshot({path:png});
  await fs.copyFile(png,path.join(output,post.id+'.png'));
  await fs.copyFile(path.join(asset,post.id+'.txt'),path.join(output,post.id+'.txt'));
  report.push({id:post.id,width:1200,height:1200,bounds});
 }
 await fs.writeFile(path.join(root,'qa/business-social-render.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({generated:report.length,output}));
} finally {await browser.close();}
