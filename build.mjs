import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBusinessContent} from './business-content.mjs';
import {attachArticleImage} from './article-images.mjs';
import {pageHead,getOrigin,sitemapXML,escapeHTML,articlePath,productPath} from './seo.mjs';
import {renderArticlePage,renderKnowledgeIndex,clusters} from './article-page.mjs';
import {renderProductPage} from './product-page.mjs';
import {renderVideoLibrary,renderVideoArticle,videoPath,youtubeId} from './video-library.mjs';
import {renderMarketplaceGuide} from './marketplace-guide.mjs';
import {renderMavoBenefits} from './mavo-benefits.mjs';
import {renderGrowthReading} from './growth-content.mjs';
import {lineContactURL,renderLineContact} from './line-contact.mjs';
import {renderContactChannels} from './contact-channels.mjs';
import {buildCustomerChecklists} from './customer-checklists.mjs';
import {renderPageAction,renderCatalogAction} from './page-actions.mjs';
import {generateLlmsTxt} from './llms.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist');
await fs.mkdir(path.join(root,'qa'),{recursive:true});
const siteConfig=JSON.parse(await fs.readFile(path.join(root,'site.config.json'),'utf8'));
const lineURL=lineContactURL(siteConfig);
const lineButton=renderLineContact(lineURL);
const contactChannels=renderContactChannels(siteConfig);
const footerContactChannels=renderContactChannels(siteConfig,{icons:true});
const editorial=JSON.parse(await fs.readFile(path.join(root,'article-editorial-metadata.json'),'utf8'));
const builtPages=[];
const data=JSON.parse(await fs.readFile(path.join(dist,'data/products.json'),'utf8'));
const marketplaceCopy=JSON.parse(await fs.readFile(path.join(root,'marketplace-guide-copy.json'),'utf8'));
const marketplaceResearch=JSON.parse(await fs.readFile(path.join(root,'marketplace-research.json'),'utf8'));
const marketplaceExamples=marketplaceResearch.listings.map(item=>({
 title:item.label,priceLabel:item.price.displayText,url:item.sourceUrl,
 observation:item.model.note+(item.warranty.claimedMonths?' ชื่อประกาศระบุรับประกัน '+item.warranty.claimedMonths+' เดือน':'')+(item.price.searchResultConflict?' ผลค้นหาและหน้าสินค้าแสดงราคาไม่ตรงกัน':''),
 lesson:item.educationalPoint,
 limitation:'ยังไม่ยืนยันฐาน VAT และยอดรวมส่งตามปลายทาง รายละเอียดบริการต้องถามผู้ขาย ยังไม่ได้ทดสอบคุณภาพสินค้ารายการนี้'
}));
const example=data.records.find(r=>r.sku==='MAV-TN1000');
const offer=example.comparisons[0];
const money=n=>Number(n).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const delta=offer.priceIncVat-example.salePriceIncVat;
const businessModules=JSON.parse(await fs.readFile(path.join(root,'knowledge-business-additions.json'),'utf8')).modules;
const audienceModules=JSON.parse(await fs.readFile(path.join(root,'knowledge-audience-additions.json'),'utf8')).modules;
const business=createBusinessContent(data,businessModules,audienceModules);
const growthModules=JSON.parse(await fs.readFile(path.join(root,'knowledge-growth-additions.json'),'utf8')).modules;
const knowledgeFile=path.join(dist,'data/knowledge.json');
const knowledge=JSON.parse(await fs.readFile(knowledgeFile,'utf8'));
const videoResearch=(await Promise.all(['video-research-a.json','video-research-b.json'].map(async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'))))).flatMap(result=>result.videos);
knowledge.videos=knowledge.videos.map(video=>{
 const research=videoResearch.find(item=>item.id===video.id);
 if(!research||!research.summaryParagraphs?.length||!research.takeaways?.length)throw new Error('Missing verified video notes: '+video.id);
 if(research.videoId!==youtubeId(video))throw new Error('Video source mismatch: '+video.id);
 const captions=research.captions;
 const guide={summaryBasis:research.summaryBasis,summaryLabel:research.summaryLabel,summaryParagraphs:research.summaryParagraphs,takeaways:research.takeaways,applyToBusiness:research.applyToBusiness,limitations:research.limitations,relatedArticleIds:research.relatedArticleIds,sources:research.sources.map(({title,url})=>({title,url})),companionGuide:research.companionGuide,captions:{status:captions.status==='not-observed-in-player-metadata'?'none-found':captions.status,thaiNative:captions.nativeThaiTrackObserved===true||captions.hasNativeThai===true,thaiAutoTranslate:captions.thaiAutoTranslationListed===true||captions.thaiAutoTranslationAvailable===true},checkedOn:research.checkedOn};
 return {...video,guide};
});
const moduleMap=new Map(knowledge.modules.map(m=>[m.id,m]));
for(const module of [...businessModules,...audienceModules,...growthModules,business.caseArticle])moduleMap.set(module.id,module);
knowledge.modules=[...moduleMap.values()].map(m=>({...attachArticleImage(m),editorial:editorial[m.id]}));
await fs.writeFile(knowledgeFile,JSON.stringify(knowledge,null,2)+'\n');
await fs.writeFile(path.join(dist,'data/social-posts.json'),JSON.stringify(business.socialPosts,null,2)+'\n');
await fs.mkdir(path.join(dist,'assets/social'),{recursive:true});
for(const post of business.socialPosts)await fs.writeFile(path.join(dist,'assets/social',post.id+'.txt'),post.caption+'\n');
const nav=[['products.html','สินค้าและราคา'],['compare.html','เทียบความคุ้มค่า'],['business.html','ธุรกิจใช้คุ้ม'],['knowledge.html','คลังความรู้'],['care.html','MAVO Care'],['dealers.html','ตัวแทนจำหน่าย']];
const catalogAction=renderCatalogAction(lineURL);
const compareAction=renderPageAction({id:'compare-help',eyebrow:'เทียบให้ตรงกับงานของคุณ',title:'ให้ทีมช่วยเทียบรุ่นที่คุณใช้',description:'ส่งรุ่นเครื่องและราคาที่ซื้ออยู่ให้ทีมช่วยตรวจ แล้วเทียบค่าใช้จ่ายก่อนตัดสินใจ',action:renderLineContact(lineURL,{label:'ให้ทีมช่วยเทียบทาง LINE'}),secondaryHref:'/buying-guide.html',secondaryLabel:'อ่านคู่มือเลือกตลับให้คุ้ม'});
const knowledgeAction=renderPageAction({id:'knowledge-tools',eyebrow:'นำความรู้ไปใช้กับงานจริง',title:'มีเช็กลิสต์ให้ลองตรวจด้วยกัน',description:'เก็บรายการตรวจคุณภาพไว้ใช้กับทีม มีช่องติ๊กและพื้นที่บันทึกผล ใช้ควบคู่กับบทความที่อ่าน',action:'<a class="button primary" download href="/assets/article-guides/print-quality-check.pdf">ดาวน์โหลดเช็กลิสต์ PDF</a>',secondaryHref:'/articles/print-quality-check.html',secondaryLabel:'อ่านวิธีตรวจคุณภาพงานพิมพ์'});
const header=current=>`<a class="skip" href="#main">ข้ามไปเนื้อหา</a><div class="topbar"><div class="container"><span>ราคาสินค้ารวม VAT 7% และจัดส่งปกติในประเทศ</span><a class="member-entry" href="/members.html">สมาชิก / สต็อกบริษัท</a></div></div><header class="site-header"><div class="container header-inner"><a class="brand" href="/" aria-label="MAVO หน้าแรก"><img src="/assets/mavo-logo.png" width="832" height="314" alt="MAVO Confidence, every day."></a><button class="menu-toggle" id="menu-toggle" aria-expanded="false" aria-controls="site-nav">เมนู</button><nav class="nav" id="site-nav" aria-label="เมนูหลัก">${nav.map(([href,label])=>`<a href="/${href}" ${href===current?'aria-current="page"':''}>${label}</a>`).join('')}<a href="/check.html" class="button primary" ${current==='check.html'?'aria-current="page"':''}>ตรวจรุ่นเครื่อง</a></nav></div></header>`;
const footer=`
<footer class="site-footer site-footer-premium"><div class="container">
<section class="footer-contact-panel" id="contact" aria-labelledby="footer-contact-title">
 <div class="footer-contact-intro"><div><p class="footer-contact-kicker">ติดต่อทีม MAVO</p><h2 id="footer-contact-title"><span>พร้อมช่วยให้คุณ</span><span>เลือกได้มั่นใจ</span></h2><p><span>ตรวจรุ่น ขอใบเสนอราคา</span> <span>หรือปรึกษาการใช้งาน</span></p></div>${lineButton}</div>
 ${footerContactChannels}
</section>
<div class="footer-main">
 <div class="footer-brand-block"><a class="footer-brand" href="/" aria-label="MAVO หน้าแรก"><img src="/assets/mavo-logo.png" width="832" height="314" alt="MAVO Confidence, every day."></a><p class="footer-brand-signature">เลือกคุ้ม ใช้มั่นใจ</p><p class="footer-description">โทนเนอร์ทางเลือกสำหรับธุรกิจ<br>ช่วยเลือกก่อนซื้อ ดูแลต่อเมื่อใช้งาน</p><div class="footer-hours"><span>เวลาทำการ</span><p>จันทร์–ศุกร์ 09.00–17.00 น.<br>ยกเว้นวันหยุดนักขัตฤกษ์</p></div></div>
 <nav aria-label="เลือกสินค้าและบริการ"><p class="footer-heading">เลือกอย่างมั่นใจ</p><div class="footer-links"><a href="/products.html">สินค้าและราคา</a><a href="/compare.html">เทียบความคุ้มค่า</a><a href="/knowledge.html">คลังความรู้และวิดีโอ</a><a href="/care.html">บริการ MAVO Care</a><a href="/check.html">ตรวจรุ่นเครื่อง / ขอราคา</a></div></nav>
 <nav aria-label="ธุรกิจและตัวแทนจำหน่าย"><p class="footer-heading">เติบโตไปกับ MAVO</p><div class="footer-links"><a href="/members.html">สมาชิก / สต็อกบริษัท</a><a href="/business.html">แนวคิดธุรกิจใช้คุ้ม</a><a href="/dealers.html">ตัวแทนจำหน่าย</a><a href="/check.html?type=dealer">ติดต่อเรื่องตัวแทน</a><a href="/care.html#care-online">ขั้นตอนดูแลออนไลน์</a></div><p class="footer-service-note">มีหน้าร้านให้ติดต่อ<br>พร้อมดูแลผ่านช่องทางออนไลน์</p></nav>
</div>
<div class="footer-bottom"><span>© 2026 MAVO · Confidence, every day.</span><a href="/check.html#privacy">ข้อมูลที่ใช้ในการตรวจรุ่น</a></div>
</div></footer>`;
const descriptions={
 'index.html':'เหลือเงินให้ธุรกิจมากขึ้น พิมพ์งานได้มั่นใจกับ MAVO โทนเนอร์ตลับใหม่สำหรับธุรกิจ เทียบราคาที่จ่ายจริง ส่งรุ่นเครื่องทาง LINE ให้ทีมตรวจ พร้อมทีมดูแลและรับประกันคุณภาพตลับ 1 ปี',
 'business.html':'แนวคิดลดค่าใช้จ่ายงานพิมพ์สำหรับเจ้าของกิจการ SME และร้านออนไลน์ พร้อมตัวอย่างวางงบและบทความตามประเภทธุรกิจ เพื่อช่วยเลือกตลับให้ตรงกับงาน',
 'knowledge.html':'เรียนรู้วิธีเลือกโทนเนอร์ทางเลือก ตรวจคุณภาพงานพิมพ์ ชั่งน้ำหนัก คำนวณต้นทุนต่อหน้า และตั้งค่าเครื่อง พร้อมแหล่งข้อมูลประกอบ',
 'products.html':'ค้นหารุ่นตลับโทนเนอร์ MAVO ด้วยรหัสสินค้าและแบรนด์เครื่องพิมพ์ ดูราคาที่รวม VAT และจัดส่งปกติ พร้อมให้ทีมยืนยันรุ่นก่อนสั่งซื้อ',
 'compare.html':'เทียบราคาซื้อตลับ MAVO กับตลับแท้บนฐาน VAT เดียวกัน พร้อมแหล่งราคา วันที่ตรวจ และเครื่องมือคำนวณต้นทุนต่อหน้าจากผลใช้งานจริง',
 'care.html':'อ่านเงื่อนไข MAVO Care รับประกันคุณภาพตลับ 1 ปีนับจากวันที่ได้รับสินค้า ดูแลการเปลี่ยนตามเงื่อนไขเมื่อเคลมผ่าน ใช้ Serial ตรวจสอบรายการซื้อและประวัติเคลม พร้อมช่วยตรวจอาการออนไลน์',
 'dealers.html':'ข้อมูลสำหรับร้านค้าไอทีและผู้สนใจเป็นตัวแทนจำหน่าย MAVO เริ่มจากรุ่นสินค้า กลุ่มลูกค้า และข้อตกลงดูแลหลังขายที่ชัดเจน',
 'check.html':'เตรียมข้อมูลรุ่นเครื่อง อาการ และช่องทางติดต่อ เพื่อขอตรวจตลับ ขอข้อมูลตัวแทน หรือเตรียมแจ้งปัญหา MAVO',
};
async function page(file,title,body,options={}){
 const pathname=file==='index.html'?'/':'/'+file;
 const noindex=options.noindex??['check.html','article.html','product.html'].includes(file);
 let content=body.replace(/\/article\.html\?id=([a-z0-9-]+)/g,(_,id)=>articlePath(id));
 content=content.replaceAll('{{lineContact}}',lineButton);
 content=content.replaceAll('{{careLineContact}}',renderLineContact(lineURL,{label:'แจ้งปัญหาทาง LINE'}));
 content=content.replaceAll('{{dealerLineContact}}',renderLineContact(lineURL,{label:'คุยเงื่อนไขตัวแทนทาง LINE'}));
 if(file==='check.html'){
  content=content.replace('<div class="line-placeholder"><strong>LINE OA @MAVO</strong><span>ชื่อที่เตรียมใช้ ยังไม่ได้เปิดบัญชี</span></div>','<div class="line-contact-card">'+lineButton+(lineURL?'<p class="small muted">ส่งรูปป้ายรุ่นเครื่อง หรือสอบถามทีม MAVO ได้ทาง LINE</p>':'')+'</div>'+contactChannels);
  if(lineURL){
   content=content.replace('ขณะนี้เป็นเว็บไซต์ทดลอง แบบฟอร์มใช้เตรียมข้อความ ยังไม่ส่งคำขอถึงทีม MAVO','กรอกข้อมูลแล้วคัดลอกข้อความไปส่งทาง LINE ได้ หรือเปิด LINE เพื่อคุยกับทีมโดยตรง');
   content=content.replace('ยังไม่ได้ส่งข้อความ LINE OA @MAVO อยู่ระหว่างเตรียมเปิดให้บริการ','คัดลอกข้อความ แล้วเปิด LINE เพื่อวางและส่งให้ทีม MAVO รูปภาพต้องแนบใน LINE อีกครั้ง');
   content=content.replace('รูปต้องแนบอีกครั้งเมื่อมีช่องทางรับเรื่องจริง','คัดลอกข้อความแล้วส่งพร้อมแนบรูปทาง LINE OA @mavo');
   content=content.replace('<button type="button" id="save-request"',renderLineContact(lineURL,{label:'เปิด LINE เพื่อส่งข้อความ'})+'<button type="button" id="save-request"');
  }
 }
 if(file==='knowledge.html')content=content.replace('<div id="article-list" class="article-list"></div>','<div id="article-list" class="article-list" data-prerendered="true">'+renderKnowledgeIndex(knowledge.modules)+'</div>');
 if(file==='knowledge.html'){
  content=content.replace('<div id="video-list" class="video-grid"></div>','<div id="video-list" data-prerendered="true">'+renderVideoLibrary(knowledge.videos)+'</div>');
  content=content.replace('เห็นภาพการทำงานจริง','ดูคลิป เข้าใจง่าย<br>พร้อมสรุปภาษาไทย');
  content=content.replace('วิดีโอเปิดที่เว็บไซต์ต้นฉบับ การเล่นและคำบรรยายขึ้นกับผู้เผยแพร่และพื้นที่รับชม บางคลิปจัดทำโดยผู้ขายสินค้า จึงควรอ่านข้อจำกัดประกอบ','วิดีโอเล่นผ่าน YouTube ในหน้านี้ คำบรรยายและการแปลขึ้นกับคลิปและเครื่องเล่น สรุปแต่ละเรื่องระบุแหล่งข้อมูลที่ใช้ พร้อมลิงก์ต้นฉบับให้ตรวจอ่านต่อ');
 }
 if(file==='products.html'){
  const cards=data.records.slice(0,12).map(r=>'<article class="product-card"><a class="product-visual" href="'+productPath(r.sku)+'"><img class="product-thumb" src="/assets/mavo-box-navy-cool-blue-v3.png" alt="กล่องโทนเนอร์ MAVO" width="1536" height="1024" loading="lazy"></a><div class="product-content"><p class="product-brand">สำหรับเครื่อง '+escapeHTML(r.brand)+'</p><h3><a href="'+productPath(r.sku)+'">'+escapeHTML(r.model)+'</a></h3><p class="product-sku">'+escapeHTML(r.sku)+'</p><p class="product-price">'+money(r.salePriceIncVat)+' <small>บาท</small></p><p class="small">รวม VAT 7% และจัดส่งปกติ</p><a class="text-link" href="/check.html?sku='+encodeURIComponent(r.sku)+'">ตรวจรุ่นก่อนซื้อ</a></div></article>').join('');
  content=content.replace('<p class="loading">กำลังโหลดสินค้า</p>',cards);
  content=content.replace('กำลังอ่านรายการสินค้า','รายการสินค้า '+data.records.length+' รุ่น');
  const index='<details class="product-code-index"><summary>ดูรหัสสินค้าทั้งหมด '+data.records.length+' รุ่น</summary><div>'+data.records.map(r=>'<a href="'+productPath(r.sku)+'">'+escapeHTML(r.brand+' '+r.model+' · '+r.sku)+'</a>').join('')+'</div></details>';
  content=content.replace('<div class="pagination" id="pagination"></div>','<div class="pagination" id="pagination"></div>'+index);
 }
 const description=options.description??descriptions[file]??title;
 const head=pageHead(siteConfig,{...options,title,description,path:pathname,noindex});
 const dataPage=options.dataPage??file.replace('.html','');
 const html='<!doctype html><html lang="th"><head>'+head+'</head><body class="has-line-contact" data-page="'+escapeHTML(dataPage)+'">'+header(options.navCurrent??file)+'<main id="main">'+content+'</main>'+footer+renderLineContact(lineURL,{floating:true})+'</body></html>';
 await fs.mkdir(path.dirname(path.join(dist,file)),{recursive:true});
 await fs.writeFile(path.join(dist,file),html);
 builtPages.push({path:pathname,title,description,noindex});
}

let home=await fs.readFile(path.join(root,'home.content.html'),'utf8');
const homeValues={saving:money(delta),percent:(delta/offer.priceIncVat*100).toFixed(1),oemPrice:money(offer.priceIncVat),mavoPrice:money(example.salePriceIncVat),sourceUrl:offer.sourceUrl,businessExamples:business.homeExamples,businessReading:business.homeReading,mavoBenefits:renderMavoBenefits({lineURL}),modelLineButton:renderLineContact(lineURL,{label:'ส่งรุ่นเครื่องทาง LINE'}),growthReading:renderGrowthReading(knowledge.modules.filter(m=>m.editorial.cluster==='business-growth'&&m.id!=='toner-dealer-first-customers'))};
for(const [key,value] of Object.entries(homeValues))home=home.replaceAll('{{'+key+'}}',value);
await page('index.html','เหลือเงินให้ธุรกิจมากขึ้น พิมพ์งานได้มั่นใจ',home);
await page('business.html','ธุรกิจใช้คุ้ม สำหรับเจ้าของกิจการ SME และร้านออนไลน์',business.hubContent+renderGrowthReading(knowledge.modules.filter(m=>m.editorial.cluster==='business-growth')));
await page('buying-guide.html','เลือกโทนเนอร์ให้คุ้ม ทั้งงานพิมพ์และการดูแล',renderMarketplaceGuide(marketplaceCopy,marketplaceExamples,data),{description:'เลือกโทนเนอร์ให้คุ้มกับธุรกิจ เทียบคุณภาพงานพิมพ์ ค่าใช้จ่ายทั้งหมด การรับประกัน และบริการหลังซื้อ พร้อมตัวอย่างประกาศ Shopee และเครื่องคำนวณต้นทุนต่อหน้า',article:{title:'เลือกโทนเนอร์ให้คุ้ม ทั้งงานพิมพ์และการดูแล'},dataPage:'buying-guide',navCurrent:'knowledge.html',breadcrumbs:[{name:'หน้าแรก',path:'/'},{name:'คลังความรู้',path:'/knowledge.html'},{name:'เลือกโทนเนอร์ให้คุ้ม',path:'/buying-guide.html'}]});
await page('products.html','สินค้าและราคา',`<section class="intro"><div class="container"><p class="breadcrumb"><a href="/">หน้าแรก</a> / สินค้าและราคา</p><p class="eyebrow">MAVO TONER COLLECTION</p><h1 class="page-title">ค้นรุ่นที่ใช้ได้<br><span class="title-accent">ดูราคาจ่ายครบ</span></h1><p class="lead">ตลับโทนเนอร์ผลิตใหม่ ราคาแสดงรวม VAT 7% และค่าจัดส่งปกติ Flash Express ภายในประเทศ ตรวจรุ่นเครื่องก่อนสั่งซื้อทุกครั้ง</p><div class="filters"><div class="field"><label for="product-search">ค้นหารหัสตลับหรือ SKU</label><input type="search" id="product-search" placeholder="เช่น TN2560, CF283A หรือ MAV-TN1000" autocomplete="off"></div><div class="field"><label for="product-brand">แบรนด์เครื่องพิมพ์</label><select id="product-brand"><option value="all">ทุกแบรนด์</option></select></div><div class="field"><label for="product-sort">เรียงรายการ</label><select id="product-sort"><option value="default">ตามรุ่นตลับ</option><option value="low">ราคาต่ำไปสูง</option><option value="high">ราคาสูงไปต่ำ</option></select></div></div><div class="filter-count"><span id="product-count" role="status">กำลังอ่านรายการสินค้า</span><a class="text-link" href="/check.html">ไม่แน่ใจรหัสตลับ ให้เราตรวจ</a></div></div></section><section class="section" style="padding-top:0"><div class="container"><div id="catalog" class="catalog"><p class="loading">กำลังโหลดสินค้า</p></div><div class="pagination" id="pagination"></div><p class="source-note">ภาพเป็นคอนเซ็ปต์กล่องสีน้ำเงินเข้มและฟ้าของแบรนด์ กล่องใช้ร่วมกันและแยกรุ่นด้วยสติกเกอร์ รายการราคาไม่ใช่การยืนยันสต็อกหรือความเข้ากันได้กับเครื่องทุกรุ่น</p></div></section>${catalogAction}`);
await page('product.html','รายละเอียดตลับ',`<section class="section"><div class="container"><p class="breadcrumb"><a href="/">หน้าแรก</a> / <a href="/products.html">สินค้าและราคา</a> / รายละเอียดตลับ</p><div id="product-detail"><p class="loading">กำลังโหลดรายละเอียดรุ่น</p></div></div></section>`);
await page('compare.html','เปรียบเทียบราคาและความคุ้มค่า',`<section class="intro"><div class="container"><p class="breadcrumb"><a href="/">หน้าแรก</a> / เทียบความคุ้มค่า</p><p class="eyebrow">COMPARE WITH CLARITY</p><h1 class="page-title">ดูส่วนต่างราคา<br>พร้อมต้นทุนต่อหน้าที่ใช้ได้จริง</h1><p class="lead">เปรียบเทียบราคาบนฐาน VAT เดียวกัน แล้วใช้ผลพิมพ์ของคุณประเมินความคุ้มค่า ไม่มีการสมมติว่าทุกตลับพิมพ์ได้จำนวนหน้าเท่ากัน</p><div class="compare-panel"><div class="compare-controls"><div class="field"><label for="compare-brand">แบรนด์เครื่องพิมพ์</label><select id="compare-brand"></select></div><div class="field"><label for="compare-sku">ตลับ MAVO ที่ต้องการเปรียบเทียบ</label><select id="compare-sku"></select></div></div><div class="field" style="margin-top:20px"><label for="compare-oem">รุ่นตลับแท้อ้างอิง</label><select id="compare-oem"></select></div><div id="comparison"><p class="loading">กำลังอ่านราคา</p></div></div></div></section><section class="section"><div class="container"><div class="section-heading"><div><p class="eyebrow">ดูทุกรุ่นในแบรนด์เดียวกัน</p><h2>ตารางเทียบราคา</h2></div><p class="muted small">ราคาสินค้าทั้งสองฝั่งรวม VAT 7%<br>MAVO รวมส่งปกติ ราคาตลับแท้เป็นราคาสินค้าอ้างอิง</p></div><div class="table-wrap"><table><thead><tr><th>รุ่นตลับ</th><th>MAVO รวม VAT</th><th>ตลับแท้อ้างอิง</th><th>ส่วนต่างราคา</th><th>แหล่งอ้างอิง</th></tr></thead><tbody id="comparison-table"></tbody></table></div></div></section><section class="section value-band" id="calculator"><div class="container"><p class="eyebrow">คำนวณจากการใช้งานของคุณ</p><h2>ราคาต่อหน้าที่ใช้งานได้จริง</h2><p class="lead">กรอกจำนวนหน้าที่ใช้งานได้จริงจากการทดลอง หากยังไม่ทราบ ให้เก็บผลก่อน ไม่ใช้ตัวเลขคาดเดาเป็นคำรับรอง</p><div class="calculator"><fieldset><legend>ตลับที่ใช้อยู่</legend><div class="field"><label for="old-cost">ราคาสุทธิที่จ่าย รวม VAT และค่าส่ง (บาท)</label><input type="number" id="old-cost" min="0.01" step="0.01" placeholder="ราคาจากใบซื้อจริง"></div><div class="field"><label for="old-pages">จำนวนหน้าที่ใช้งานได้จริง</label><input type="number" id="old-pages" min="1" step="1" placeholder="กรอกจำนวนหน้า"></div></fieldset><fieldset><legend>ตลับ MAVO</legend><div class="field"><label for="new-cost">ราคาตามรุ่นที่เลือก รวม VAT และส่งปกติ (บาท)</label><input type="number" id="new-cost" min="0.01" step="0.01" readonly></div><div class="field"><label for="new-pages">จำนวนหน้าที่ใช้งานได้จริงจากการทดลอง</label><input type="number" id="new-pages" min="1" step="1" placeholder="กรอกเมื่อมีผลทดลอง"></div></fieldset></div><div class="calc-output" id="calc-result" role="status">กรอกราคาเดิมและจำนวนหน้าของทั้งสองฝั่งเพื่อเริ่มคำนวณ</div><p class="source-note">สูตร: (ราคาตลับรวม VAT และค่าส่ง) ÷ จำนวนหน้าที่ใช้งานได้จริง เป็นค่าตลับต่อหน้า ไม่รวมกระดาษ ค่าแรง การหยุดงาน และค่าบำรุงรักษาเครื่อง</p></div></section>${compareAction}`);
await page('knowledge.html','คลังความรู้และวิธีตรวจคุณภาพ',`<section class="intro"><div class="container"><p class="breadcrumb"><a href="/">หน้าแรก</a> / คลังความรู้</p><p class="eyebrow">เข้าใจ ก่อนเปลี่ยน</p><h1 class="page-title">เลือกคุ้ม ใช้เป็น<br>มีข้อมูลให้ตัดสินใจ</h1><p class="lead">จากการวางงบของเจ้าของกิจการและร้านค้า ไปจนถึงวิธีตรวจงานพิมพ์ การใช้เครื่อง วิดีโอ และความหมายของมาตรฐาน เลือกอ่านเรื่องที่นำไปใช้กับธุรกิจของคุณได้</p><nav class="library-nav" aria-label="หมวดความรู้"><a href="/buying-guide.html">คู่มือเลือกตลับให้คุ้ม</a><a href="#articles">บทความและวิธีตรวจ</a><a href="#videos">วิดีโอจากผู้เชี่ยวชาญ</a><a href="#standards">อ่านมาตรฐานให้เข้าใจ</a></nav></div></section><section class="section" id="articles"><div class="container"><div class="section-heading"><h2>สิ่งที่ควรรู้ก่อนเลือกตลับ</h2><p class="muted">บทความสั้น อ่านง่าย พร้อมแหล่งอ้างอิง</p></div><div id="article-list" class="article-list"></div></div></section><section class="section value-band" id="videos"><div class="container"><div class="section-heading"><div><p class="eyebrow">LEARN FROM GLOBAL SOURCES</p><h2>เห็นภาพการทำงานจริง</h2></div><p class="muted small">สื่อความรู้จากผู้ผลิตและผู้เชี่ยวชาญต่างประเทศ ไม่ใช่ผลทดสอบตลับ MAVO</p></div><div id="video-list" class="video-grid"></div><p class="source-note">วิดีโอเปิดที่เว็บไซต์ต้นฉบับ การเล่นและคำบรรยายขึ้นกับผู้เผยแพร่และพื้นที่รับชม บางคลิปจัดทำโดยผู้ขายสินค้า จึงควรอ่านข้อจำกัดประกอบ</p></div></section><section class="section" id="standards"><div class="container"><p class="eyebrow">มาตรฐานบอกอะไร และไม่บอกอะไร</p><h2>รู้ขอบเขต ก่อนเชื่อคำว่า “ผ่านมาตรฐาน”</h2><div class="callout">ข้อมูลด้านล่างอธิบายมาตรฐานทั่วไป ไม่ได้ระบุว่า MAVO หรือโรงงานได้รับการรับรอง ต้องตรวจรายงานและขอบข่ายของรุ่นที่จำหน่ายจริงก่อนกล่าวอ้าง</div><div id="standards-list" class="standards-list"></div></div></section>${knowledgeAction}`);
await page('article.html','บทความคุณภาพโทนเนอร์',`<section class="section"><div class="container"><p class="breadcrumb"><a href="/">หน้าแรก</a> / <a href="/knowledge.html">คลังความรู้</a> / บทความ</p><article class="prose" id="article-detail"><p class="loading">กำลังโหลดบทความ</p></article></div></section>`);
await page('care.html','MAVO Care Online รับประกันคุณภาพ 1 ปี',await fs.readFile(path.join(root,'care.content.html'),'utf8'));
await page('dealers.html','ตัวแทนจำหน่าย MAVO',(await fs.readFile(path.join(root,'dealers.content.html'),'utf8'))+renderGrowthReading(knowledge.modules.filter(m=>m.editorial.cluster==='business-growth'),{dealer:true}));
await page('check.html','ส่งรุ่นเครื่องให้เราตรวจ',`<section class="section"><div class="container"><p class="breadcrumb"><a href="/">หน้าแรก</a> / <span id="check-breadcrumb">ส่งรุ่นเครื่อง</span></p><div class="check-grid"><aside class="check-aside"><p class="eyebrow" id="check-eyebrow">เริ่มต้นอย่างมั่นใจ</p><h1 class="page-title" id="check-title">เริ่มจากรุ่นเครื่อง<br>ที่คุณใช้อยู่</h1><p class="lead" id="check-lead">ส่งชื่อรุ่นหรือรูปป้ายเครื่อง เพื่อเตรียมตรวจตลับที่ใช้ได้ ราคา และเงื่อนไข MAVO Care</p><div class="line-placeholder"><strong>LINE OA @MAVO</strong><span>ชื่อที่เตรียมใช้ ยังไม่ได้เปิดบัญชี</span></div><div class="service-hours"><p><strong>ทีม MAVO</strong><br>มีหน้าร้านให้ติดต่อ · ดูแลผ่านช่องทางออนไลน์</p><p class="small muted">เวลาทำการ<br>จันทร์–ศุกร์ 09.00–17.00 น.<br>ยกเว้นวันหยุดนักขัตฤกษ์</p></div></aside><div class="form-box"><p class="note-status">ขณะนี้เป็นเว็บไซต์ทดลอง แบบฟอร์มใช้เตรียมข้อความ ยังไม่ส่งคำขอถึงทีม MAVO</p><form id="request-form" style="margin-top:28px"><div class="field"><label for="request-type">เรื่องที่ต้องการให้ช่วย</label><select id="request-type" name="type"><option value="model">ตรวจรุ่น / ขอใบเสนอราคา</option><option value="care">MAVO Care Online / แจ้งปัญหาตลับ</option><option value="dealer">สนใจเป็นตัวแทนจำหน่าย</option></select></div><div id="dealer-hint" class="callout small" hidden>ระบุประเภทธุรกิจ พื้นที่จำหน่าย และสินค้าหรือรุ่นที่สนใจ เพื่อเตรียมคุยราคาและเงื่อนไขตัวแทน ส่งรายละเอียดทาง LINE เพื่อคุยเงื่อนไขกับทีม</div><div id="care-hint" class="callout small" hidden>เตรียม Serial หรือรูปฉลากตลับ อาการ รุ่นเครื่อง วันที่ได้รับสินค้า และข้อมูลรายการซื้อ ถ้ามีเลขเคสเดิมให้ระบุในรายละเอียด ทีมยืนยันนัดวิดีโอคอลเมื่อจำเป็น คัดลอกข้อมูลที่เตรียมแล้วส่งทาง LINE เพื่อให้ทีมรับเรื่อง</div><div class="field"><label for="request-model"><span id="request-model-label">รุ่นเครื่องหรือรหัสตลับ *</span></label><input id="request-model" name="model" required maxlength="150" placeholder="เช่น Brother HL-1110 หรือ TN1000"><span class="form-hint" id="request-model-hint">ดูจากป้ายหน้าเครื่องหรือรหัสบนตลับเดิม หากไม่ทราบให้ระบุ “ขอให้ช่วยดูจากรูป”</span></div><div id="request-serial-fields" hidden><div class="field"><label for="request-serial">Serial Number / S/N ของตลับ (ถ้ามี)</label><input id="request-serial" name="serial" maxlength="100" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="หมายเลขประจำตลับบนฉลาก"><span class="form-hint">Serial ต่างจากรุ่นหรือ SKU หากอ่านไม่ชัด เว้นช่องนี้และเตรียมรูปฉลากให้ทีมช่วยดูได้</span></div><div class="field"><label for="request-purchase">เลขคำสั่งซื้อ / ใบเสร็จ / ร้านที่ซื้อ (ถ้ามี)</label><input id="request-purchase" name="purchase" maxlength="180" autocomplete="off" placeholder="ข้อมูลสำหรับค้นหารายการซื้อ"><span class="form-hint">ทีมใช้ข้อมูลนี้ตรวจสอบคู่กับ Serial และติดต่อกลับในแชต</span></div></div><div class="field" id="request-photo-field"><label for="request-photo">รูปป้ายรุ่น ฉลาก Serial หรือรูปตลับ (ไม่บังคับ)</label><input id="request-photo" type="file" accept="image/jpeg,image/png,image/webp"><span class="form-hint">JPG, PNG หรือ WebP ไม่เกิน 10 MB แสดงตัวอย่างเฉพาะในเครื่องนี้</span><div id="photo-preview" class="file-preview" hidden></div><p id="photo-feedback" class="feedback" role="status"></p></div><div class="form-row"><div class="field"><label for="request-name">ชื่อผู้ติดต่อ *</label><input id="request-name" name="name" required maxlength="100" autocomplete="name" placeholder="ชื่อของคุณ"></div><div class="field"><label for="request-company">ร้านค้า / องค์กร</label><input id="request-company" name="company" maxlength="150" autocomplete="organization" placeholder="ชื่อร้านหรือองค์กร"></div></div><div class="field"><label for="request-contact">เบอร์โทร / LINE / อีเมลติดต่อกลับ *</label><input id="request-contact" name="contact" required maxlength="150" placeholder="ช่องทางที่สะดวกให้ติดต่อกลับ"></div><div class="field"><label for="request-area"><span id="request-area-label">จังหวัดสำหรับจัดส่ง (ไม่บังคับ)</span></label><input id="request-area" name="area" maxlength="200" placeholder="ระบุจังหวัดได้ ยังไม่ต้องกรอกที่อยู่เต็ม"><span class="form-hint" id="request-area-hint">ใช้ประกอบการสอบถามการจัดส่ง ไม่ต้องให้ที่อยู่ละเอียดในขั้นเตรียมข้อความ</span></div><div class="field"><label for="request-notes"><span id="request-notes-label">รายละเอียดเพิ่มเติม</span></label><textarea id="request-notes" name="notes" maxlength="2000" placeholder="จำนวนเครื่อง ปริมาณใช้งานต่อเดือน หรืออาการที่พบ"></textarea></div><button class="button primary" type="submit" id="request-submit">ตรวจทานข้อความขอตรวจรุ่น</button><p class="form-hint" id="privacy">ข้อมูลใช้สร้างข้อความในเบราว์เซอร์เท่านั้น ไม่มีการส่งหรือบันทึกลงระบบ รูปต้องแนบอีกครั้งเมื่อมีช่องทางรับเรื่องจริง</p></form><section class="form-result" id="request-result" aria-labelledby="result-title" hidden><h3 id="result-title">ข้อความพร้อมตรวจทาน</h3><pre id="request-text"></pre><p class="small">ยังไม่ได้ส่งข้อความ LINE OA @MAVO อยู่ระหว่างเตรียมเปิดให้บริการ</p><div class="actions"><button type="button" id="copy-request" class="button primary">คัดลอกข้อความ</button><button type="button" id="save-request" class="button secondary">บันทึกข้อความลงเครื่อง</button></div><p id="copy-status" class="feedback" role="status"></p></section></div></div></div></section>`);
await fs.mkdir(path.join(dist,'assets/article-guides'),{recursive:true});
for(const module of knowledge.modules){
 if(!module.editorial)throw new Error('Missing article metadata '+module.id);
 const e=module.editorial;
 await page('articles/'+module.id+'.html',e.seoTitle,renderArticlePage(module,knowledge.modules),{description:e.description,article:module,image:module.image,dataPage:'article-static',navCurrent:'knowledge.html',breadcrumbs:[{name:'หน้าแรก',path:'/'},{name:'คลังความรู้',path:'/knowledge.html'},{name:clusters[e.cluster].label,path:'/knowledge.html#'+e.cluster},{name:module.title,path:articlePath(module.id)}]});
 const origin=getOrigin(siteConfig);
 const guide=[module.title,'','สรุปนำไปใช้',...e.takeaways.map(t=>'• '+t),'','เช็กลิสต์',...module.practical_steps.map((t,i)=>(i+1)+'. '+t),'',module.scope_note,'',e.shareText,origin?'อ่านบทความ: '+origin+articlePath(module.id):'MAVO — เลือกอย่างมั่นใจ ใช้งบอย่างคุ้มค่า'].join('\n');
 await fs.writeFile(path.join(dist,'assets/article-guides',module.id+'.txt'),guide+'\n');
}
await buildCustomerChecklists({root,modules:knowledge.modules,origin:getOrigin(siteConfig),lineURL});
for(const video of knowledge.videos){
 const pathname=videoPath(video.id);
 const title=video.thai_title+' — วิดีโอและสรุปภาษาไทย';
 const description='ดูวิดีโอจาก '+video.publisher+' เรื่อง'+video.thai_title+' พร้อมสรุปภาษาไทย ประเด็นนำไปใช้ และแหล่งอ้างอิงสำหรับเลือกโทนเนอร์อย่างเข้าใจ';
 await page(pathname.slice(1),title,renderVideoArticle(video,knowledge.modules),{description,article:{title:video.thai_title},image:{src:'https://i.ytimg.com/vi/'+youtubeId(video)+'/hqdefault.jpg',alt:video.thai_title},dataPage:'video-article',navCurrent:'knowledge.html',breadcrumbs:[{name:'หน้าแรก',path:'/'},{name:'คลังความรู้',path:'/knowledge.html'},{name:video.thai_title,path:pathname}]});
}
for(const record of data.records){
 const pathname=productPath(record.sku);
 const title='โทนเนอร์ MAVO '+record.model+' สำหรับ '+record.brand+' | '+record.sku;
 const description='ดูราคาและรายละเอียด '+record.sku+' อ้างอิงตลับ '+record.model+' สำหรับเครื่อง '+record.brand+' ราคา '+money(record.salePriceIncVat)+' บาท รวม VAT และส่งปกติ ตรวจรุ่นก่อนซื้อ พร้อม MAVO Care ตามเงื่อนไข';
 await page(pathname.slice(1),title,renderProductPage(record),{description,image:{src:'/assets/mavo-box-navy-cool-blue-v3.png',alt:'กล่องโทนเนอร์ MAVO'},dataPage:'product-static',navCurrent:'products.html',breadcrumbs:[{name:'หน้าแรก',path:'/'},{name:'สินค้าและราคา',path:'/products.html'},{name:record.sku,path:pathname}]});
}
const origin=getOrigin(siteConfig);
await fs.writeFile(path.join(dist,'llms.txt'),generateLlmsTxt({origin,contact:siteConfig.contact}));
const indexPaths=builtPages.filter(p=>!p.noindex).map(p=>p.path);
await fs.writeFile(path.join(dist,'robots.txt'),siteConfig.indexable&&origin?'User-agent: *\nAllow: /\nSitemap: '+origin+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n');
if(origin&&siteConfig.indexable)await fs.writeFile(path.join(dist,'sitemap.xml'),sitemapXML(origin,indexPaths));
else await fs.rm(path.join(dist,'sitemap.xml'),{force:true});
await fs.writeFile(path.join(root,'qa/seo-build-report.json'),JSON.stringify({origin,indexable:siteConfig.indexable,pages:builtPages.length,articles:knowledge.modules.length,videoArticles:knowledge.videos.length,products:data.records.length,indexPaths,pending:origin?[]:['Set the real public HTTPS origin in site.config.json before generating public canonical URLs and sitemap.']},null,2));
console.log('Built '+builtPages.length+' local MAVO pages with static articles/products. No publication or Git operations.');
