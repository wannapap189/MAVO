import {renderLineContact} from './line-contact.mjs';

export function renderMavoBenefits({lineURL=''}={}){return `
<section class="section mavo-benefits home-fit-section" id="mavo-benefits" aria-labelledby="mavo-benefits-title">
 <div class="container split">
  <div>
   <p class="eyebrow">รู้จักโทนเนอร์ทางเลือก</p>
   <h2 id="mavo-benefits-title">ตลับใหม่แบรนด์ MAVO<br>เลือกให้ตรงเครื่องที่คุณใช้</h2>
   <p class="lead">ตลับโทนเนอร์ที่ผลิตขึ้นสำหรับเครื่องเลเซอร์รุ่นที่รองรับ จำหน่ายภายใต้แบรนด์ MAVO พร้อมการดูแลของเรา</p>
   <ul class="home-fit-facts"><li><strong>ผลิตใหม่ทั้งตลับ</strong><span>ใช้ตลับใหม่ ไม่ใช้ตลับเก่าปรับสภาพ</span></li><li><strong>เลือกตามรุ่นเครื่อง</strong><span>แต่ละเครื่องใช้ตลับต่างกัน ทีมช่วยยืนยันก่อนสั่งซื้อ</span></li><li><strong>ประเมินจากงานจริง</strong><span>ดูความคมชัด ความสม่ำเสมอ และจำนวนหน้าที่ใช้งานได้</span></li></ul>
  </div>
  <aside class="home-fit-panel" id="machine-fit">
   <p class="eyebrow">เริ่มได้ แม้ไม่รู้รหัสตลับ</p>
   <h3>เครื่องของคุณ<br>ใช้ MAVO รุ่นไหน?</h3>
   <p>ส่งรูปป้ายชื่อรุ่นเครื่อง หรือรหัสบนตลับเดิม ทีมช่วยตรวจรุ่นที่รองรับ พร้อมแจ้งราคาให้ตัดสินใจ</p>
   <div class="home-fit-photo-tip"><strong>ถ่ายตรงไหน?</strong><span>ป้ายรุ่นที่ด้านหน้าหรือด้านหลังเครื่อง และรหัสบนตลับเดิมถ้ามี</span></div>
   <div class="actions">${renderLineContact(lineURL,{label:'ส่งรุ่นเครื่องทาง LINE'})}<a class="text-link" href="/products.html">รู้รหัสแล้ว ดูสินค้าและราคา</a></div>
  </aside>
 </div>
</section>`;}
