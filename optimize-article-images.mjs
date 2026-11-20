import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const root=path.dirname(fileURLToPath(import.meta.url));
const unique=JSON.parse(await fs.readFile(path.join(root,'article-unique-image-manifest.json'),'utf8')).images;
const bases=[
 {id:'weight-and-new-cartridge',src:'/assets/articles/quality.png',alt:'ภาพประกอบจำลองตลับโทนเนอร์ เครื่องชั่ง และเอกสารสำหรับตรวจสอบ',caption:'ภาพประกอบจำลองอุปกรณ์ตรวจสอบ ไม่ใช่ผลการชั่งหรือผลทดสอบสินค้าจริง'},
 {id:'usable-page-cost',src:'/assets/articles/budget.png',alt:'ภาพประกอบจำลองการวางงบค่าโทนเนอร์ด้วยเครื่องคิดเลขและเอกสาร',caption:'ภาพประกอบจำลองการวางงบ ตัวเลขคำนวณอยู่ในเนื้อหาบทความ'},
 {id:'business-office-print-budget',src:'/assets/articles/office.png',alt:'ภาพประกอบจำลองเครื่องพิมพ์เลเซอร์และงานเอกสารในสำนักงาน SME',caption:'ภาพประกอบจำลองของสำนักงาน ไม่ใช่ภาพลูกค้าอ้างอิง'},
 {id:'online-shop-laser-print-budget',src:'/assets/articles/online.png',alt:'ภาพประกอบจำลองพื้นที่จัดสินค้าและงานเอกสารจากเครื่องเลเซอร์ของร้านออนไลน์',caption:'ภาพประกอบจำลองงานหลังร้านที่ใช้เครื่องพิมพ์เลเซอร์'},
];
const destination=path.join(root,'dist/assets/articles/optimized');await fs.mkdir(destination,{recursive:true});
const images=[];let originalBytes=0,webBytes=0;
for(const image of [...bases,...unique]){
 const source=path.join(root,'dist',image.src);const full=path.join(destination,image.id+'.webp');const small=path.join(destination,image.id+'-640.webp');
 // Web delivery encodings only: preserve the original composition and source PNG.
 const [metadata]=await Promise.all([
  sharp(source).resize({width:1280,withoutEnlargement:true}).webp({quality:84}).toFile(full),
  sharp(source).resize({width:640,withoutEnlargement:true}).webp({quality:80}).toFile(small),
 ]);
 originalBytes+=(await fs.stat(source)).size;webBytes+=metadata.size;
 images.push({...image,originalSrc:image.src,src:'/assets/articles/optimized/'+image.id+'.webp',srcset:'/assets/articles/optimized/'+image.id+'-640.webp 640w, /assets/articles/optimized/'+image.id+'.webp '+metadata.width+'w',width:metadata.width,height:metadata.height,generated:true});
}
if(images.length!==12||new Set(images.map(i=>i.src)).size!==12)throw new Error('Expected 12 distinct article image assets');
await fs.writeFile(path.join(root,'article-optimized-image-manifest.json'),JSON.stringify({images},null,2)+'\n');
console.log(JSON.stringify({images:images.length,originalBytes,webBytes,percentSmaller:Number((100*(1-webBytes/originalBytes)).toFixed(1))}));
