import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Static output only: no browser, network requests, or private customer data.
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(project,'dist');
const base='https://mavo-check.invalid';
const files=[];
async function walk(directory){
 for(const entry of await fs.readdir(directory,{withFileTypes:true})){
  const file=path.join(directory,entry.name);
  if(entry.isDirectory())await walk(file);else if(entry.isFile())files.push(file);
 }
}
await walk(root);
const relative=file=>path.relative(root,file).split(path.sep).join('/');
const decode=value=>value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi,entity=>{
 const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
 if(named[entity.toLowerCase()])return named[entity.toLowerCase()];
 const code=entity.slice(2,-1);return String.fromCodePoint(code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):parseInt(code,10));
});
const plain=html=>decode(html.replace(/<[^>]+>/g,'')).trim();
const pages=new Map(),references=[],issues=[];
// Legacy shells obtain their main content from app.js; member auth and app H1s
// are mutually exclusive hidden views. Their references and IDs are still checked.
const dynamicHeadings=new Set(['article.html','product.html','theme-preview.html','members.html']);
for(const file of files.filter(f=>f.endsWith('.html'))){
 const html=await fs.readFile(file,'utf8');
 const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const ids=new Set();
 for(const tag of clean.matchAll(/<([a-z][\w:-]*)\b([^<>]*)>/gi)){
  const attrs={};
  for(const attr of tag[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g))attrs[attr[1].toLowerCase()]=decode(attr[2]??attr[3]??attr[4]??'');
  if(attrs.id){
   if(ids.has(attrs.id))issues.push({page:relative(file),kind:'duplicate-id',value:attrs.id});
   ids.add(attrs.id);
  }
  for(const attr of ['href','src','poster'])if(attrs[attr])references.push({file,ref:attrs[attr],kind:attr});
  if(attrs.srcset&&!attrs.srcset.trim().startsWith('data:'))for(const candidate of attrs.srcset.split(',')){
   const ref=candidate.trim().split(/\s+/)[0];if(ref)references.push({file,ref,kind:'srcset'});
  }
 }
 const h1=[...clean.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)].map(m=>plain(m[1]));
 const title=plain(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]??'');
 if(!title)issues.push({page:relative(file),kind:'missing-title'});
 if(!dynamicHeadings.has(relative(file))&&(h1.length!==1||!h1[0]))issues.push({page:relative(file),kind:'main-heading',count:h1.length});
 pages.set(path.resolve(file),{ids,h1,title});
}
// Check locally referenced fonts and images in every CSS file too.
for(const file of files.filter(f=>f.endsWith('.css'))){
 const css=(await fs.readFile(file,'utf8')).replace(/\/\*[\s\S]*?\*\//g,'');
 for(const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)){
  const ref=(match[1]??match[2]??match[3]??'').trim();if(ref)references.push({file,ref,kind:'css-url'});
 }
}
const titles=new Map();
for(const [file,{title}] of pages){
 if(title&&titles.has(title))issues.push({page:relative(file),kind:'duplicate-title',other:relative(titles.get(title))});
 titles.set(title,file);
}
let localReferences=0,anchorReferences=0;
for(const {file,ref,kind} of references){
 if(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref))continue;
 let url;
 try{url=new URL(ref,base+'/'+relative(file));}catch{issues.push({page:relative(file),kind:'invalid-url',ref});continue;}
 if(url.origin!==base)continue;
 localReferences++;
 let pathname,fragment;
 try{pathname=decodeURIComponent(url.pathname);fragment=decodeURIComponent(url.hash.slice(1));}
 catch{issues.push({page:relative(file),kind:'invalid-url-encoding',ref});continue;}
 let target=path.resolve(root,'.'+pathname);
 if(target!==root&&!target.startsWith(root+path.sep)){issues.push({page:relative(file),kind:'outside-output',ref});continue;}
 try{
  if((await fs.stat(target)).isDirectory())target=path.join(target,'index.html');
  if(!(await fs.stat(target)).isFile())throw new Error('Not a file');
 }catch{issues.push({page:relative(file),kind:'missing-target',ref,attribute:kind});continue;}
 if(fragment&&pages.has(target)){
  anchorReferences++;
  if(!pages.get(target).ids.has(fragment))issues.push({page:relative(file),kind:'missing-anchor',ref});
 }
}
const result={passed:issues.length===0,pages:pages.size,localReferences,anchorReferences,checkedCSS:files.filter(f=>f.endsWith('.css')).length,headingExceptions:[...dynamicHeadings],issues};
await fs.writeFile(path.join(project,'qa/site-links-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
if(issues.length)process.exitCode=1;
