# MAVO

โค้ดเว็บไซต์ MAVO ระบบสมาชิก และ `llms.txt` — **Repository สาธารณะสำหรับงานพัฒนา**

## เริ่มงานในเครื่อง

ใช้ Node.js 24 ขึ้นไป (ระบบสมาชิกใช้ `node:sqlite`) ตัวเว็บและเซิร์ฟเวอร์หลักไม่มี npm dependency เพิ่มเติม

```sh
node build.mjs
npm test
npm run test:links
npm run test:llms
npm run test:members
npm start
```

คำสั่งสุดท้ายจะแสดง URL `http://127.0.0.1:<port>` ใน terminal เปิด URL นั้นเพื่อดูเว็บ ตั้ง `MAVO_PORT` หากต้องการพอร์ตคงที่ เซิร์ฟเวอร์ฟังเฉพาะเครื่องนี้

เก็บโฟลเดอร์ `dist/` ที่มากับ repository ไว้ด้วย เพราะมีทั้งไฟล์ต้นฉบับ CSS/JS ข้อมูลสินค้า ภาพ และ PDF ที่ใช้สร้างเว็บ **อย่าลบ dist ก่อน build**

## ไฟล์ใน repository

| เส้นทาง | ใช้งาน |
| --- | --- |
| `dist/` | หน้าเว็บ สินค้า 92 SKU บทความ วิดีโอ และ PDF สำหรับลูกค้า |
| `home.content.html`, `care.content.html`, `dealers.content.html` | เนื้อหาหน้าหลัก |
| `build.mjs` และโมดูล `.mjs` | สร้างหน้าเว็บจากข้อมูลและเนื้อหา |
| `site.config.json` | ช่องทางติดต่อ โดเมน และการเปิดให้ค้นหา |
| `llms.mjs` → `dist/llms.txt` | ข้อมูลสรุปและทางเข้าหน้าสำคัญสำหรับเครื่องมือ AI |
| `MEMBERS-OPERATIONS.txt` | วิธีใช้งานและสำรองระบบสต็อกบริษัทลูกค้า |

**ทีมที่รับงานต้องรับ Excel ทะเบียนสินค้าและคู่มือภายในจากเจ้าของผ่านช่องทางส่วนตัวเพิ่มเติมทุกครั้ง** เอกสารเหล่านี้ไม่ได้รวมใน repository สาธารณะ Excel ไม่ซิงก์ราคากับเว็บอัตโนมัติ เมื่อปรับราคา ให้ตรวจคู่กับ `dist/data/products.json` และตรวจราคารวม VAT ให้ตรงกันก่อนส่งงาน

## ขอบเขตการเผยแพร่

ขณะส่งมอบ เจ้าของให้เว็บดูได้เฉพาะในเครื่อง จึงคง `origin: ""` และ `indexable: false` ไว้ ไม่มีการเปิด GitHub Pages หรือ tunnel การเก็บโค้ดบน GitHub ไม่ได้เปิดเว็บไซต์ให้ลูกค้าใช้งาน

เมื่อเจ้าของสั่งเผยแพร่และมีโดเมนจริง จึงตั้ง `origin` เป็น HTTPS ของโดเมนนั้นและ `indexable: true` แล้ว build เพื่อสร้าง canonical, sitemap และลิงก์เต็มใน `llms.txt` ค่าเริ่มต้นและชุดตรวจ SEO ปัจจุบันตรวจเงื่อนไข local-only

หากนำเว็บไปโฮสต์ในภายหลัง ให้ใช้ **เฉพาะ `dist/` เป็น public root** ห้ามเสิร์ฟราก repository หรือ `internal/` รวมทั้งห้ามเผยแพร่ `private-data/` ระบบสมาชิกต้องมี Node server และฐานข้อมูล จึงใช้ static hosting อย่างเดียวไม่ได้

## PDF สำหรับลูกค้า

มีไฟล์สำเร็จรูปครบใน `dist/assets/article-guides/` Build จะใช้ไฟล์เดิมเมื่อข้อมูลไม่เปลี่ยน หากแก้เนื้อหา PDF ต้องมี Python พร้อม `reportlab`, `pypdf`, `uharfbuzz` และ `Pillow` รวมทั้งฟอนต์ Tahoma (`tahoma.ttf`, `tahomabd.ttf`) ที่มีสิทธิ์ใช้งาน

ตั้ง `MAVO_PDF_PYTHON` เป็น path ของ Python และ `MAVO_PDF_FONT_DIR` เป็นโฟลเดอร์ฟอนต์หากไม่ได้ใช้ `C:\Windows\Fonts` แล้วรัน build ใหม่ รายการแพ็กเกจอยู่ใน `requirements-pdf.txt` ไฟล์สำหรับลูกค้าคนละชุดกับคู่มือแบรนด์ภายใน

## ระบบสมาชิก

เปิด `/members.html` เพื่อตั้งบัญชีผู้ดูแลครั้งแรก ข้อมูลใหม่จะถูกเก็บใน `private-data/members.sqlite` นอก public root ฐานข้อมูลจริง บัญชี รหัสผ่าน และ session เดิมไม่ได้แนบมากับ repository

การทดสอบ `npm run test:members` ใช้ฐานชั่วคราวแยกจากข้อมูลจริง ก่อนเปิดใช้งานภายนอกต้องจัดโฮสต์ HTTPS ระบบสำรองข้อมูลและสิทธิ์ผู้ดูแลตามงานเผยแพร่

## การเปลี่ยนข้อมูลที่ใช้บ่อย

- ราคาและรุ่น: `dist/data/products.json` และ Excel ภายใน
- LINE/อีเมล/โทรศัพท์: `site.config.json` แล้ว build
- บทความ: `article-editorial-metadata.json`, `knowledge-*-additions.json`, `dist/data/knowledge.json` และโมดูลสร้างเนื้อหา
- สีและรูปแบบ: `dist/styles.css`, `dist/brand-theme.css`
- สรุปสำหรับ AI: `llms.mjs` แล้ว build; `llms.txt` เป็นข้อมูลช่วยอ้างอิง ไม่รับประกันการจัดอันดับหรือการนำไปใช้ของบริการ AI

สคริปต์ `optimize-article-images.mjs` และ `render-social.mjs` เป็นเครื่องมือเตรียมภาพเสริม ใช้ `sharp` และ `playwright` ตามลำดับ ไม่จำเป็นสำหรับ build/start ปกติ และไม่ต้องรันเพื่อเปิดเว็บที่ส่งมอบ

คงหลักการสื่อสาร: นำด้วยความคุ้มค่า ตรวจรุ่นก่อนซื้อ ให้ความรู้และหลักฐานที่ตรวจได้ พร้อม MAVO Care รับประกัน 1 ปีตามเงื่อนไข ไม่สัญญาบริการเปลี่ยนตลับถึงที่
