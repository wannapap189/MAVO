import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMembersApi} from './members-api.mjs';
const appRoot=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(appRoot,'dist');
const port=Number(process.env.MAVO_PORT??0);
const databasePath=path.resolve(process.env.MAVO_DB_PATH??path.join(appRoot,'private-data','members.sqlite'));
if(databasePath.toLowerCase()===root.toLowerCase()||databasePath.toLowerCase().startsWith((root+path.sep).toLowerCase()))throw new Error('Member database must be outside the public website directory.');
const membersApi=createMembersApi({databasePath,productsPath:path.join(root,'data','products.json')});
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.pdf':'application/pdf'};
let revision=Date.now();fs.watch(root,{recursive:true},()=>{revision=Date.now();});
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://127.0.0.1');
 if(await membersApi(req,res,url))return;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 if(url.pathname==='/__preview'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({name:'MAVO local preview',revision}));return;}
 let name;try{name=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end('<html lang="th"><meta charset="utf-8"><title>ไม่พบหน้า | MAVO</title><body style="font-family:Tahoma;padding:60px"><h1>ไม่พบหน้านี้</h1><a href="/">กลับหน้าแรก MAVO</a></body></html>');return;}
 const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
 if(url.pathname==='/members.html')headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
 res.writeHead(200,headers);if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);});
 }catch(error){console.error('Local request failed:',error.message);if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง'}));}
});
server.listen(port,'127.0.0.1',()=>{const url=`http://127.0.0.1:${server.address().port}`;fs.writeFileSync(process.env.MAVO_PREVIEW_STATE_PATH??path.join(appRoot,'qa','preview-state.json'),JSON.stringify({url,pid:process.pid}));console.log(`MAVO preview ready: ${url}`);});
