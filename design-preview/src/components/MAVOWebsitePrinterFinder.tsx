import React, { useMemo, useState, useEffect } from 'react';
import { products, printers, articles, Product } from './data';
import './MAVOWebsitePrinterFinder.css';

const LINE = 'https://line.me/R/ti/p/%40mavo';
const ARTICLE_IMAGES: Record<string,string> = {
  'toner-material-and-compatibility': '/assets/toner-material-and-compatibility-640.webp',
  'print-quality-check': '/assets/print-quality-check-640.webp',
  'savings-to-business-profit': '/assets/savings-to-business-profit-640.webp',
};

const money = (value: number) => value.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
const brandName = (name: string) => ({CANON:'Canon',BROTHER:'Brother',HP:'HP',SAMSUNG:'Samsung',PANTUM:'Pantum'}[name] || name);
function Icon({name='arrow', size=22}: {name?:string;size?:number}) {
  const paths:Record<string,React.ReactNode> = {
    arrow:<><path d="M4 12h15M13 5l7 7-7 7"/></>,
    chat:<><path d="M21 11a8 8 0 0 1-8 8H8l-5 3v-7a8 8 0 1 1 18-4Z"/><path d="M8 9h8M8 13h5"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    shield:<><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    printer:<><path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6Z"/><path d="M17 11h1"/></>,
    close:<path d="m5 5 14 14M19 5 5 19"/>,
    menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
    download:<><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.arrow}</svg>;
}
function LineButton({children='ส่งรุ่นเครื่องทาง LINE',className=''}: {children?:React.ReactNode;className?:string}) {
  return <a className={`mv-button mv-primary ${className}`} href={LINE} target="_blank" rel="noreferrer"><Icon name="chat"/>{children}<Icon size={18}/></a>;
}
function SavingExample({sku,printer,onSelect}: {sku:string;printer:string;onSelect:()=>void}) {
  const p = products.find(x=>x.sku===sku)!;
  const r = p.reference!;
  return <article className="mv-example">
    <div className="mv-example-top"><span>{brandName(p.brand)}</span><span className="mv-percent">ประหยัด {((r.price-p.price)/r.price*100).toFixed(1)}%</span></div>
    <h3>{printer}</h3><p className="mv-muted">ตัวอย่างตลับ {p.model} · สีดำ</p>
    <div className="mv-example-prices"><div><span>ตลับแท้อ้างอิง</span><s>฿{money(r.price)}</s></div><div><span>MAVO</span><strong>฿{money(p.price)}</strong></div></div>
    <div className="mv-example-bottom"><span>เหลือเงินเพิ่ม <b>฿{money(r.price-p.price)}</b> / ตลับ</span><button onClick={onSelect} aria-label={`เปรียบเทียบ ${printer}`}><Icon/></button></div>
    <a className="mv-source" href={r.url} target="_blank" rel="noreferrer">{r.label} · {brandName(p.brand)}{r.stock==='backorder'?' (Pre-order)':''} ↗</a>
  </article>;
}

export const MAVOWebsitePrinterFinder = () => {
  const [menuOpen,setMenuOpen] = useState(false);
  const [brand,setBrand] = useState('CANON');
  const [query,setQuery] = useState('');
  const [printerId,setPrinterId] = useState('canonlbp623cdw');
  const [sku,setSku] = useState('MAV-CRG054-BK');
  const [quantity,setQuantity] = useState(1);
  const [activeArticle,setActiveArticle] = useState<string|null>(null);
  const selectedPrinter = printers.find(p=>p.id===printerId);
  const filtered = useMemo(()=>printers.filter(p=>p.brand===brand && normalize(p.model).includes(normalize(query))),[brand,query]);
  const matches = products.filter(p=>selectedPrinter?.skus.includes(p.sku));
  const product = matches.find(p=>p.sku===sku) || matches[0];
  const reference = product?.reference;
  const saving = product && reference ? reference.price-product.price : 0;
  const selectedArticle = articles.find(a=>a.id===activeArticle);
  useEffect(() => {
    if (!activeArticle) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById('article-reader')?.scrollIntoView({block:'start', behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    });
    return () => cancelAnimationFrame(frame);
  }, [activeArticle]);

  function choosePrinter(id: string) { setPrinterId(id);setSku(printers.find(p=>p.id===id)?.skus[0] || ''); }
  function chooseBrand(value:string) { setBrand(value);setQuery('');choosePrinter(''); }
  function showExample(id:string) {
    const printer = printers.find(p=>p.id===id)!;
    setBrand(printer.brand);setQuery('');choosePrinter(id);
    document.getElementById('finder')?.scrollIntoView({behavior:'smooth'});
  }
  function navClick(){setMenuOpen(false);}
  return <div className="mavo-site" lang="th">
    <a className="mv-skip" href="#main">ข้ามไปเนื้อหา</a>
    <header className="mv-header"><div className="mv-shell mv-header-inner">
      <a className="mv-logo" href="#main" aria-label="MAVO หน้าแรก"><img src="/assets/mavo-logo.png" alt="MAVO — Confidence, every day."/></a>
      <nav className={menuOpen?'mv-nav is-open':'mv-nav'} aria-label="เมนูหลัก">
        <a href="#finder" onClick={navClick}>ค้นหารุ่นและราคา</a><a href="#quality" onClick={navClick}>รู้ก่อนเปลี่ยน</a><a href="#care" onClick={navClick}>MAVO Care</a><a href="#partners" onClick={navClick}>ตัวแทนจำหน่าย</a>
      </nav>
      <a className="mv-header-contact" href={LINE} target="_blank" rel="noreferrer"><Icon name="chat" size={20}/>คุยกับ MAVO</a>
      <button className="mv-menu" aria-label={menuOpen?'ปิดเมนู':'เปิดเมนู'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}><Icon name={menuOpen?'close':'menu'}/></button>
    </div></header>
    <main id="main">
      <section className="mv-hero mv-shell">
        <div className="mv-hero-copy">
          <h1>เหลือเงินให้ธุรกิจ<br/><span>มากขึ้น</span><br/>พิมพ์งานได้มั่นใจ</h1>
          <p>โทนเนอร์ทางเลือกแบบตลับผลิตใหม่สำหรับธุรกิจ<br className="mv-desktop"/> เลือกให้ตรงเครื่อง เห็นราคาที่จ่ายจริง<br className="mv-desktop"/> พร้อมทีม MAVO ดูแลเมื่อมีปัญหา</p>
          <div className="mv-actions"><LineButton/><a className="mv-text-link" href="#finder">ลองเทียบความคุ้มค่า <Icon size={18}/></a></div>
          <div className="mv-hero-note"><Icon name="check" size={18}/> เริ่มจากรุ่นเครื่อง ไม่ต้องรู้รหัสตลับ</div>
        </div>
        <div className="mv-hero-product">
          <div className="mv-product-image"><img src="/assets/mavo-box-navy-cool-blue-v3.png" alt="กล่องโทนเนอร์ MAVO สีน้ำเงินเข้มและฟ้า"/><div className="mv-warranty"><Icon name="shield" size={32}/><div><strong>รับประกัน 1 ปี</strong><span>มั่นใจ มี MAVO Care ดูแล</span></div></div></div>
          <div className="mv-product-caption"><span>ต้นทุนงานพิมพ์ที่เลือกได้</span><b>Confidence, every day.</b></div>
        </div>
      </section>
      <div className="mv-proof-strip"><div className="mv-shell"><span><Icon name="printer"/>ช่วยตรวจรุ่นก่อนซื้อ</span><span><Icon name="shield"/>รับประกัน 1 ปี ตามเงื่อนไข</span><span><Icon name="check"/>ราคารวม VAT และส่งปกติในประเทศ</span></div></div>

      <section className="mv-section mv-shell" id="savings">
        <div className="mv-section-heading"><h2>ประหยัดที่งานพิมพ์<br/><span>ต่อยอดได้อีกหลายเรื่อง</span></h2><p>ดูตัวอย่างราคาจริง แล้วลองเทียบกับเครื่องที่คุณใช้<br/>เงินที่เหลือ นำไปดูแลสต็อก ทีมงาน หรือลูกค้าได้ต่อ</p></div>
        <div className="mv-examples"><SavingExample sku="MAV-CRG054-BK" printer="Canon LBP623Cdw" onSelect={()=>showExample('canonlbp623cdw')}/><SavingExample sku="MAV-107A" printer="HP Laser 107a" onSelect={()=>showExample('hplaser107a')}/></div>
        <p className="mv-comparison-note">ราคาทั้งสองฝั่งรวม VAT 7% · ตรวจข้อมูล 26 พ.ย. 2569 · MAVO รวมส่งปกติในประเทศ<br/>เป็นการเทียบราคาต่อตลับ ไม่ใช่ผลทดสอบจำนวนหน้าเท่ากันหรือการรับรองจากแบรนด์เครื่องพิมพ์ ราคาต้นทางอาจเปลี่ยนได้</p>
      </section>

      <section className="mv-finder-section" id="finder"><div className="mv-shell mv-section">
        <div className="mv-section-heading"><h2>เครื่องของคุณ<br/><span>ประหยัดได้เท่าไร?</span></h2><p>เลือกรุ่นเครื่องพิมพ์ที่คุณรู้จัก<br/>เราจะแสดงตลับและราคาที่เกี่ยวข้องให้</p></div>
        <div className="mv-finder">
          <div className="mv-finder-controls">
            <label htmlFor="brand">แบรนด์เครื่องพิมพ์</label><select id="brand" value={brand} onChange={e=>chooseBrand(e.target.value)}>{['CANON','HP','BROTHER','SAMSUNG','PANTUM'].map(b=><option key={b} value={b}>{brandName(b)}</option>)}</select>
            <label htmlFor="printer-search">ค้นหารุ่นเครื่องของคุณ</label><div className="mv-search"><Icon name="search" size={20}/><input id="printer-search" value={query} onChange={e=>{setQuery(e.target.value);choosePrinter('');}} placeholder="เช่น LBP623Cdw หรือ Laser 107a" autoComplete="off"/></div>
            <label htmlFor="printer-model">เลือกรุ่นเครื่องพิมพ์ <small>{filtered.length} รุ่น</small></label><select id="printer-model" value={printerId} onChange={e=>choosePrinter(e.target.value)}><option value="">เลือกรุ่นเครื่องของคุณ</option>{filtered.map(p=><option key={p.id} value={p.id}>{brandName(p.brand)} {p.model}</option>)}</select>
            {matches.length>1 && <><label htmlFor="cartridge-color">ตลับที่ต้องการสำหรับเครื่องนี้</label><select id="cartridge-color" value={product?.sku || ''} onChange={e=>setSku(e.target.value)}>{matches.map(p=><option key={p.sku} value={p.sku}>{p.model} · {p.color==='ไม่ระบุ'?'ดูรายละเอียดกับทีม':p.color}</option>)}</select></>}
            <p className="mv-model-help">หารุ่นไม่เจอ? <a href={LINE} target="_blank" rel="noreferrer">ส่งรูปป้ายเครื่องให้เราช่วยดู <Icon size={15}/></a></p>
          </div>
          <div className="mv-finder-result" aria-live="polite">
            {product && selectedPrinter ? <>
              <div className="mv-result-title"><div><span>สำหรับเครื่องพิมพ์ของคุณ</span><h3>{brandName(selectedPrinter.brand)} {selectedPrinter.model}</h3></div><Icon name="printer" size={32}/></div>
              <p className="mv-result-code">MAVO {product.model}{product.color!=='ไม่ระบุ'?` · ${product.color}`:''}<br/><small>{product.sku}</small></p>
              {reference && <div className="mv-bar-row"><div><span>ตลับแท้อ้างอิง</span><strong>฿{money(reference.price)}</strong></div><div className="mv-bar"><i style={{width:'100%'}}/></div></div>}
              <div className="mv-bar-row mv-bar-mavo"><div><span>MAVO</span><strong>฿{money(product.price)}</strong></div><div className="mv-bar"><i style={{width:reference?`${Math.min(100,product.price/reference.price*100)}%`:'100%'}}/></div></div>
              <p className="mv-vat-note">ราคาต่อตลับ รวม VAT 7% · MAVO รวมส่งปกติในประเทศ</p>
              {reference ? <><div className="mv-quantity"><label htmlFor="quantity">ลองคำนวณจำนวนที่ใช้</label><div><button aria-label="ลดจำนวน" disabled={quantity<=1} onClick={()=>setQuantity(Math.max(1,quantity-1))}>−</button><input aria-label="จำนวนตลับ" id="quantity" type="number" min="1" max="999" value={quantity} onChange={e=>setQuantity(Math.min(999,Math.max(1,Number(e.target.value)||1)))}/><button aria-label="เพิ่มจำนวน" disabled={quantity>=999} onClick={()=>setQuantity(Math.min(999,quantity+1))}>+</button><span>ตลับ</span></div></div><div className="mv-total"><div><span>{saving>=0?'ประหยัดรวม':'ราคาต่างกันรวม'}</span><strong>฿{money(Math.abs(saving)*quantity)}</strong></div><b>{saving>=0?'ลดลง':'เพิ่มขึ้น'} {Math.abs(saving/reference.price*100).toFixed(1)}%</b></div><a className="mv-source" href={reference.url} target="_blank" rel="noreferrer">{reference.label} · {reference.model}{reference.stock==='backorder'?' (Pre-order)':''} ↗</a></> : <p className="mv-reference-missing">รุ่นนี้มีราคา MAVO แล้ว แต่ยังไม่มีราคาอ้างอิงจากแบรนด์ จึงยังไม่แสดงยอดประหยัด</p>}
              <p className="mv-finder-fine">ให้ทีมยืนยันรุ่นและรายละเอียดก่อนสั่งซื้อ การเทียบราคานี้ยังไม่รวมความแตกต่างด้านจำนวนหน้าที่พิมพ์ได้</p>
            </> : <div className="mv-empty"><Icon name="printer" size={48}/><h3>{filtered.length?'เริ่มจากเครื่องที่คุณใช้':'ยังไม่พบรุ่นนี้ในรายการ'}</h3><p>{filtered.length?'เลือกรุ่นเครื่องด้านซ้าย เพื่อดูตลับและราคาที่เกี่ยวข้อง':'รายการยังเพิ่มเติมอยู่ ส่งรูปป้ายรุ่นให้ทีมตรวจได้ ไม่ได้หมายความว่าเครื่องใช้ไม่ได้'}</p>{!filtered.length && <LineButton>ส่งรูปป้ายเครื่อง</LineButton>}</div>}
          </div>
        </div>
        <div className="mv-finder-foot"><span>เลือกตรงรุ่นก่อน แล้วค่อยตัดสินใจ</span><LineButton>ให้ทีมช่วยตรวจรุ่นนี้</LineButton></div>
      </div></section>

      <section className="mv-section mv-shell mv-quality" id="quality">
        <div className="mv-quality-heading"><h2>เลือกอย่างเข้าใจ<br/><span>มั่นใจกว่าเดิม</span></h2><p>ตลับผลิตใหม่จากผู้ผลิตทางเลือก ออกแบบให้ใช้กับรุ่นเครื่องที่ระบุ การเลือกให้คุ้มจึงเริ่มจากข้อมูลและงานพิมพ์ที่คุณใช้จริง</p><a href="/assets/print-quality-check.pdf" target="_blank" rel="noreferrer" className="mv-text-link"><Icon name="download"/>ดาวน์โหลดเช็กลิสต์คุณภาพ PDF</a></div>
        <div className="mv-quality-steps">
          <article><span className="mv-step">1</span><div><h3>ให้ตรงรุ่น ก่อนดูราคา</h3><p>ตรวจป้ายเครื่อง รหัสตลับ และสีที่ต้องใช้ ช่วยลดความเสี่ยงจากการซื้อผิดรุ่นตั้งแต่ต้น</p></div></article>
          <article><span className="mv-step">2</span><div><h3>ดูผลงานพิมพ์ ไม่ดูแค่น้ำหนัก</h3><p>ลองตัวอักษรเล็ก เส้นตาราง พื้นทึบ และการติดกระดาษ น้ำหนักช่วยบันทึกปริมาณ แต่ยืนยันคุณภาพทั้งหมดไม่ได้</p></div></article>
          <article><span className="mv-step">3</span><div><h3>รู้ว่าใครดูแล เมื่อมีปัญหา</h3><p>เก็บ Serial และหลักฐานซื้อ ติดต่อทีม MAVO พร้อมภาพงานพิมพ์ เพื่อให้ช่วยตรวจและดำเนินการตามเงื่อนไข</p></div></article>
        </div>
      </section>

      <section className="mv-care" id="care"><div className="mv-shell mv-care-inner">
        <div><div className="mv-care-brand">MAVO <span>Care</span><Icon name="shield" size={34}/></div><h2>ประหยัดได้<br/>มีคนดูแลด้วย</h2><p>รับประกัน 1 ปี พร้อมทีมช่วยตรวจอาการผ่านช่องทางออนไลน์ ใช้ Serial สินค้าและหลักฐานซื้อประกอบการดูแล</p><LineButton>ติดต่อ MAVO Care</LineButton><details className="mv-care-terms"><summary>อ่านวิธีรับประกันและเตรียมข้อมูล</summary><p>เตรียม Serial รุ่นเครื่อง วันที่ซื้อ หลักฐานซื้อ และภาพอาการหรืองานพิมพ์ ทีมตรวจข้อมูลเพื่อยืนยันสิทธิ์และแนวทางแก้ไขก่อนดำเนินการ การรับประกันเป็นไปตามเงื่อนไขสินค้า ไม่ครอบคลุมหมึกหมดตามการใช้งานหรือความเสียหายจากการใช้งานผิดวิธี</p></details></div>
        <ol className="mv-care-flow"><li><span>01</span><div><h3>ส่งข้อมูลผ่าน LINE</h3><p>รูป Serial ป้ายเครื่อง หลักฐานซื้อ และภาพอาการ</p></div></li><li><span>02</span><div><h3>ช่วยตรวจอาการไปด้วยกัน</h3><p>ทีมแนะนำขั้นตอน และนัดวิดีโอคอลเมื่อจำเป็น</p></div></li><li><span>03</span><div><h3>ดูแลต่อจนได้ข้อสรุป</h3><p>ยืนยันแนวทางตามสิทธิ์ บันทึกและติดตามเคสกับทีม</p></div></li></ol>
      </div></section>

      <section className="mv-section mv-shell" id="knowledge"><div className="mv-section-heading"><h2>ความรู้ที่ช่วยให้<br/><span>ทุกการเลือกคุ้มขึ้น</span></h2><p>อ่านให้เข้าใจ ทดลองให้เห็นจริง<br/>แล้วเลือกสิ่งที่เหมาะกับธุรกิจของคุณ</p></div>
        <div className="mv-articles">{articles.map(a=><article key={a.id}><button className="mv-article-image" onClick={()=>setActiveArticle(activeArticle===a.id?null:a.id)} aria-label={`อ่าน ${a.title}`} aria-expanded={activeArticle===a.id} aria-controls="article-reader"><img loading="lazy" src={ARTICLE_IMAGES[a.id]} alt={a.title}/></button><h3><button onClick={()=>setActiveArticle(activeArticle===a.id?null:a.id)}>{a.title}</button></h3><p>{a.summary}</p><button className="mv-text-link" onClick={()=>setActiveArticle(activeArticle===a.id?null:a.id)} aria-expanded={activeArticle===a.id} aria-controls="article-reader">{activeArticle===a.id?'ปิดบทความ':'อ่านเรื่องนี้'}<Icon size={18}/></button></article>)}</div>
        <div id="article-reader">{selectedArticle && <article className="mv-article-reader"><button className="mv-reader-close" onClick={()=>setActiveArticle(null)} aria-label="ปิดบทความ"><Icon name="close"/></button><h3>{selectedArticle.title}</h3>{selectedArticle.paragraphs?.map((p,i)=><p key={i}>{p}</p>)}{selectedArticle.steps?.length>0 && <><h4>นำไปใช้ได้อย่างไร</h4><ul>{selectedArticle.steps.map((p,i)=><li key={i}>{p}</li>)}</ul></>}{selectedArticle.sources?.length>0 && <div className="mv-article-sources"><h4>อ่านแหล่งอ้างอิง</h4>{selectedArticle.sources.map((s,i)=><a key={i} href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>)}</div>}</article>}</div>
      </section>

      <section className="mv-faq-section"><div className="mv-shell mv-faq"><h2>คำถามก่อนเปลี่ยน<br/><span>เราช่วยตอบให้</span></h2><div>{[
        ['ต้องรู้รหัสตลับก่อนซื้อไหม?','ไม่จำเป็น เริ่มจากยี่ห้อและรุ่นเครื่องพิมพ์ หรือส่งรูปป้ายรุ่นทาง LINE ทีม MAVO จะช่วยตรวจรหัสตลับ สี และรายละเอียดก่อนสั่งซื้อ'],
        ['ตลับใหม่ ต่างจากตลับเติมหมึกอย่างไร?','MAVO เป็นตลับผลิตใหม่จากผู้ผลิตทางเลือก ไม่ใช้ตลับเก่ามาปรับสภาพ การเลือกควรดูรุ่นเครื่องที่รองรับ ผลพิมพ์จริง และเงื่อนไขดูแลร่วมกัน'],
        ['ใช้แล้วเครื่องจะมีปัญหาไหม?','ไม่ควรรับรองว่าไม่มีความเสี่ยงกับเครื่องทุกรุ่น วัสดุและผงหมึกต้องเหมาะกับระบบพิมพ์ จึงควรตรวจรุ่นก่อนซื้อ ทดลองงานจริง และหยุดใช้งานพร้อมติดต่อทีมเมื่อพบอาการผิดปกติ'],
        ['ราคาที่เห็นรวมอะไรแล้ว?','ราคา MAVO รวม VAT 7% และค่าจัดส่งปกติในประเทศ ส่วนราคาแบรนด์ต้นทางแสดงตามแหล่งอ้างอิงที่ระบุ การคำนวณเป็นการเทียบราคาต่อตลับ ยังไม่ใช่ต้นทุนต่อหน้าที่ผ่านการทดสอบ'],
      ].map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>
      <section className="mv-final mv-shell"><div><h2>เริ่มประหยัด<br/><span>จากเครื่องที่คุณมี</span></h2><p>ส่งรูปป้ายเครื่องมาให้ทีมช่วยดูรุ่นและราคา<br/>ได้ข้อมูลครบ แล้วค่อยตัดสินใจ</p></div><LineButton/></section>
      <section className="mv-partners" id="partners"><div className="mv-shell"><div><h3>เติบโตไปด้วยกันกับ MAVO</h3><p>สำหรับร้านไอที ผู้ดูแลเครื่องพิมพ์ และผู้จำหน่ายสินค้าให้องค์กร</p></div><a href={LINE} target="_blank" rel="noreferrer" className="mv-text-link">สนใจเป็นตัวแทนจำหน่าย <Icon size={19}/></a></div></section>
    </main>
    <footer className="mv-footer mv-shell"><div className="mv-footer-top"><div><img src="/assets/mavo-logo.png" alt="MAVO"/><p>ทุกการเลือกที่คุ้มค่า<br/>คือความใส่ใจในธุรกิจ</p></div><div><h3>เลือกอย่างมั่นใจ</h3><a href="#finder">ค้นหารุ่นและราคา</a><a href="#quality">วิธีตรวจคุณภาพ</a><a href="#care">MAVO Care</a></div><div><h3>ติดต่อ MAVO</h3><a href="mailto:sales@mavo.com">sales@mavo.com</a><a href="tel:021011644">02-101-1644</a><a href="tel:0824426266">082-442-6266</a></div><div><h3>คุยกันได้ที่</h3><a href={LINE} target="_blank" rel="noreferrer">LINE @mavo ↗</a><a href="https://www.facebook.com/Mavothai" target="_blank" rel="noreferrer">Facebook · Mavothai ↗</a><a href="https://www.youtube.com/@Mavothai" target="_blank" rel="noreferrer">YouTube · Mavothai ↗</a></div></div><div className="mv-footer-bottom"><span>© 2026 MAVO. Confidence, every day.</span><a href="#main">กลับด้านบน ↑</a></div></footer>
  </div>;
};
