import fs from 'node:fs';
const readManifest=name=>{try{return JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8')).images??[];}catch(error){if(error.code==='ENOENT')return [];throw error;}};
const uniqueImages=new Map(readManifest('article-unique-image-manifest.json').map(item=>[item.id,item]));
const optimizedImages=new Map(readManifest('article-optimized-image-manifest.json').map(item=>[item.id,item]));
const images={
 office:{src:'/assets/articles/office.png',alt:'ภาพประกอบจำลองเครื่องพิมพ์เลเซอร์และงานเอกสารในสำนักงาน',caption:'ภาพประกอบจำลองของพื้นที่ทำงาน ไม่ใช่ภาพลูกค้าอ้างอิง'},
 online:{src:'/assets/articles/online.png',alt:'ภาพประกอบจำลองงานเอกสารจากเครื่องเลเซอร์และพื้นที่จัดสินค้าร้านออนไลน์',caption:'ภาพประกอบจำลองงานหลังร้านที่ใช้เครื่องพิมพ์เลเซอร์'},
 quality:{src:'/assets/articles/quality.png',alt:'ภาพประกอบจำลองตลับโทนเนอร์ เครื่องชั่ง และตัวอย่างเอกสารสำหรับตรวจสอบ',caption:'ภาพประกอบจำลองอุปกรณ์ตรวจสอบ ไม่ใช่ผลการชั่งหรือผลทดสอบสินค้าจริง'},
 budget:{src:'/assets/articles/budget.png',alt:'ภาพประกอบจำลองเครื่องคิดเลข เอกสารวางงบ และเครื่องพิมพ์',caption:'ภาพประกอบจำลองการวางงบ ตัวเลขคำนวณอยู่ในเนื้อหาบทความ'},
};
const imageKeys={
 'toner-material-and-compatibility':'quality',
 'print-quality-check':'quality',
 'weight-and-new-cartridge':'quality',
 'usable-page-cost':'budget',
 'smart-toner-buying-for-business':'quality',
 'use-printer-settings-wisely':'office',
 'price-multiples-and-savings-explained':'budget',
 'office-toner-budget-examples':'online',
 'business-office-print-budget':'office',
 'small-shop-print-budget':'online',
 'multi-branch-print-budget':'office',
 'online-shop-laser-print-budget':'online',
};
export function attachArticleImage(module){
 const image=optimizedImages.get(module.id)??uniqueImages.get(module.id)??images[imageKeys[module.id]];
 return image?{...module,image:{width:1672,height:941,generated:true,...image}}:module;
}
