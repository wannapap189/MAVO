import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync,backup} from 'node:sqlite';
const root=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(process.env.MAVO_DB_PATH??path.join(root,'private-data','members.sqlite'));
if(!fs.existsSync(source))throw new Error('ยังไม่พบฐานข้อมูลสมาชิก ให้เปิดระบบครั้งแรกก่อนสำรอง');
const directory=path.join(root,'private-data','backups');
fs.mkdirSync(directory,{recursive:true});
const destination=path.join(directory,`members-${new Date().toISOString().replaceAll(':','-')}.sqlite`);
const database=new DatabaseSync(source,{readOnly:true});
try{await backup(database,destination);console.log('สำรองข้อมูลสำเร็จ: '+destination);}finally{database.close();}
