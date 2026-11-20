import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pageHead,getOrigin,sitemapXML,productPath} from '../seo.mjs';
const base=new URL('../',import.meta.url);
const read=p=>fs.readFile(new URL(p,base),'utf8');
const knowledge=JSON.parse(await read('dist/data/knowledge.json'));
const products=JSON.parse(await read('dist/data/products.json'));
const report=JSON.parse(await read('qa/seo-build-report.json'));
const config=JSON.parse(await read('site.config.json'));
let sharing={sharingEnabled:false};
try{sharing=JSON.parse(await read('qa/share-preview-state.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
assert.equal(config.origin,'');assert.equal(config.indexable,false);
assert.equal(sharing.sharingEnabled,false,'Preview must remain local only');
const expectedArticleCount=16;
assert.equal(knowledge.modules.length,expectedArticleCount);
assert.equal(new Set(knowledge.modules.map(m=>m.image.src)).size,expectedArticleCount);
const titleSet=new Set(),descriptionSet=new Set();
let structuredArticles=0;
for(const m of knowledge.modules){
 const html=await read('dist/articles/'+m.id+'.html');
 assert.ok(html.includes('data-page="article-static"'));
 assert.ok(html.includes(m.image.src));assert.ok(html.includes('srcset="'));
 assert.ok(html.includes('<h1 class="page-title">'+m.title+'</h1>'));
 assert.ok(html.includes(m.paragraphs[0].replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')));
 assert.ok(html.includes('noindex, follow'));assert.ok(!html.includes('rel="canonical"'));
 for(const id of m.editorial.relatedIds)assert.ok(html.includes('/articles/'+id+'.html'));
 const title=html.match(/<title>(.*?)<\/title>/s)[1];
 const description=html.match(/name="description" content="(.*?)"/s)[1];
 assert.ok(!titleSet.has(title));assert.ok(!descriptionSet.has(description));
 titleSet.add(title);descriptionSet.add(description);
 for(const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)){
  const data=JSON.parse(match[1]);assert.equal(data['@type'],'Article');structuredArticles++;
 }
 const guidePath='/assets/article-guides/'+m.id+'.pdf';
 const guide=await fs.readFile(new URL('dist'+guidePath,base));
 assert.equal(guide.subarray(0,5).toString('ascii'),'%PDF-');
 assert.ok(guide.length>1000,'Customer PDF must contain a complete document: '+m.id);
 assert.ok(html.includes('download href="'+guidePath+'">ดาวน์โหลดเช็กลิสต์ PDF</a>'));
 assert.ok(!html.includes('download href="/assets/article-guides/'+m.id+'.txt"'));
}
assert.equal(structuredArticles,expectedArticleCount);
const catalog=await read('dist/products.html');
for(const r of products.records){
 const p=productPath(r.sku);assert.ok(catalog.includes(p));
 const html=await read('dist'+p);assert.ok(html.includes(r.sku));
 assert.ok(html.includes(Number(r.salePriceIncVat).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})));
 assert.ok(html.includes('data-page="product-static"'));
}
const library=await read('dist/knowledge.html');
for(const m of knowledge.modules)assert.ok(library.includes('/articles/'+m.id+'.html'));
assert.equal(getOrigin(config),'');
assert.throws(()=>getOrigin({...config,indexable:true}));
const productionConfig={...config,origin:'https://example.invalid',indexable:true};
const sample=knowledge.modules[0];
const production=pageHead(productionConfig,{title:sample.editorial.seoTitle,description:sample.editorial.description,path:'/articles/'+sample.id+'.html',article:sample,image:sample.image,breadcrumbs:[{name:'คลังความรู้',path:'/knowledge.html'}]});
assert.ok(production.includes('index, follow, max-image-preview:large'));
assert.ok(production.includes('rel="canonical" href="https://example.invalid/articles/'));
assert.ok(production.includes('property="og:image" content="https://example.invalid/assets/articles/optimized/'));
for(const match of production.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))JSON.parse(match[1]);
const sitemap=sitemapXML(productionConfig.origin,report.indexPaths);
assert.equal([...sitemap.matchAll(/<loc>/g)].length,121);
assert.ok(!(await read('dist/robots.txt')).includes('example.invalid'));
assert.ok(!library.includes('example.invalid'));
try{await read('dist/sitemap.xml');assert.fail('Local build must not have public sitemap');}catch(e){assert.equal(e.code,'ENOENT');}
const result={passed:true,uniqueArticleImages:expectedArticleCount,staticArticles:expectedArticleCount,customerChecklistPDFs:expectedArticleCount,staticProducts:92,relatedLinks:knowledge.modules.reduce((count,m)=>count+m.editorial.relatedIds.length,0),structuredArticles,domainConfigured:false,productionMetadataSimulated:true,sitemapCandidateURLs:121,productionPublished:false,temporaryPreviewShared:sharing.sharingEnabled};
await fs.writeFile(new URL('seo-static-check.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
