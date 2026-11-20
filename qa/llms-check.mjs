import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {generateLlmsTxt} from '../llms.mjs';

const root=new URL('../dist/',import.meta.url);
const config=JSON.parse(await fs.readFile(new URL('../site.config.json',import.meta.url),'utf8'));
const guide=await fs.readFile(new URL('llms.txt',root),'utf8');
assert.ok(guide.startsWith('# MAVO\n'));
assert.ok(guide.includes('> '));
assert.equal(guide,generateLlmsTxt(config),'Rebuild llms.txt after changing the source/config');
const links=[...guide.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match=>match[1]);
let localLinks=0;
for(const link of links){
 const url=new URL(link,config.origin||'https://mavo-check.invalid');
 if(url.origin!==(config.origin||'https://mavo-check.invalid'))continue;
 assert.ok(!/\/(internal|private-data|qa)\/|\.xlsx$|members/.test(url.pathname),'Only public site information belongs in llms.txt');
 const bytes=await fs.readFile(new URL('.'+decodeURIComponent(url.pathname),root));
 if(url.hash)assert.ok(bytes.toString('utf8').includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),`Missing anchor: ${link}`);
 localLinks++;
}
assert.ok(localLinks>=20);
const production=generateLlmsTxt({...config,origin:'https://example.invalid'});
assert.ok(production.includes('https://example.invalid/products.html'));
assert.ok(!/\]\(\//.test(production),'Configured sites need absolute internal links');
assert.throws(()=>generateLlmsTxt({origin:'http://localhost:4088'}));
console.log(JSON.stringify({passed:true,links:links.length,localLinks,productionDomainSupported:true}));
