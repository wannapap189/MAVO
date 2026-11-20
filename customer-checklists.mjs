import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function buildCustomerChecklists({root,modules,origin,lineURL}){
 const source={edition:'20 พฤศจิกายน 2569',origin,lineURL,modules:modules.map(m=>({id:m.id,title:m.title,summary:m.summary,practical_steps:m.practical_steps,scope_note:m.scope_note,sources:m.sources??[]}))};
 const serialized=JSON.stringify(source,null,2)+'\n';
 const sourcePath=path.join(root,'qa','customer-checklists-source.json');
 const outputPath=path.join(root,'dist','assets','article-guides');
 const builderPath=path.join(root,'build-customer-checklists.py');
 await fs.mkdir(outputPath,{recursive:true});
 await fs.writeFile(sourcePath,serialized);
 const builderHash=hash(await fs.readFile(builderPath));
 const logoHash=hash(await fs.readFile(path.join(root,'dist','assets','mavo-logo.png')));
 let manifest;try{manifest=JSON.parse(await fs.readFile(path.join(outputPath,'manifest.json'),'utf8'));}catch{}
 let fresh=manifest?.sourceHash===hash(serialized)&&manifest?.builderHash===builderHash&&manifest?.logoHash===logoHash&&manifest?.entries?.length===modules.length;
 if(fresh){for(const entry of manifest.entries){try{const bytes=await fs.readFile(path.join(outputPath,entry.file));if(hash(bytes)!==entry.sha256){fresh=false;break;}}catch{fresh=false;break;}}}
 if(!fresh){
  const python=process.env.MAVO_PDF_PYTHON||'python';
  try{execFileSync(python,[builderPath,'--source',sourcePath,'--out',outputPath],{cwd:root,stdio:'inherit',windowsHide:true});}
  catch(error){throw new Error('สร้าง PDF เช็กลิสต์ไม่สำเร็จ: กำหนด MAVO_PDF_PYTHON เป็น Python ที่มี reportlab และ pypdf แล้วรัน build อีกครั้ง',{cause:error});}
 }
}
