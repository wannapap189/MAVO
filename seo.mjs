export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const articlePath=id=>'/articles/'+encodeURIComponent(id)+'.html';
export const productPath=sku=>'/products/'+encodeURIComponent(sku.toLowerCase())+'.html';
export function getOrigin(config){
 if(!config.origin){if(config.indexable)throw new Error('Set a public origin before enabling indexing.');return '';}
 const url=new URL(config.origin);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||/^(localhost|127\.|0\.0\.0\.0)/.test(url.hostname))throw new Error('Site origin must be a public HTTPS origin only.');
 return url.origin;
}
export function pageHead(config,options){
 const origin=getOrigin(config);
 const url=origin?new URL(options.path,origin).href:'';
 const image=origin&&options.image?new URL(options.image.src??options.image,origin).href:'';
 const title=/\|\s*MAVO$/i.test(options.title)?options.title:options.title+' | MAVO';
 const robots=config.indexable&&!options.noindex?'index, follow, max-image-preview:large':'noindex, follow';
 const structured=[];
 if(options.article){
  const a=options.article;
  structured.push({'@context':'https://schema.org','@type':'Article',headline:a.title,description:options.description,inLanguage:'th-TH',publisher:{'@type':'Organization',name:'MAVO',...(origin?{url:origin,logo:{'@type':'ImageObject',url:origin+'/assets/mavo-logo.png'}}:{})},...(url?{mainEntityOfPage:url,url}:{}),...(image?{image:[image]}:{})});
 }
 if(origin&&options.breadcrumbs){structured.push({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:options.breadcrumbs.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:new URL(item.path,origin).href}))});}
 return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#09253d"><title>${escapeHTML(title)}</title><meta name="description" content="${escapeHTML(options.description)}"><meta name="robots" content="${robots}">${url?`<link rel="canonical" href="${escapeHTML(url)}">`:''}<meta property="og:type" content="${options.article?'article':'website'}"><meta property="og:locale" content="th_TH"><meta property="og:site_name" content="MAVO"><meta property="og:title" content="${escapeHTML(title)}"><meta property="og:description" content="${escapeHTML(options.description)}">${url?`<meta property="og:url" content="${escapeHTML(url)}">`:''}${image?`<meta property="og:image" content="${escapeHTML(image)}"><meta property="og:image:alt" content="${escapeHTML(options.image.alt??options.title)}">`:''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHTML(title)}"><meta name="twitter:description" content="${escapeHTML(options.description)}">${image?`<meta name="twitter:image" content="${escapeHTML(image)}">`:''}${structured.map(value=>`<script type="application/ld+json">${JSON.stringify(value).replace(/</g,'\\u003c')}</script>`).join('')}<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/brand-theme.css"><script type="module" src="/app.js"></script>`;
}
export function sitemapXML(origin,pages){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(p=>'  <url><loc>'+escapeHTML(new URL(p,origin).href)+'</loc></url>').join('\n')+'\n</urlset>\n';}
