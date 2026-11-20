const fields=['price','shipping','remediation','pages'];
const scenarios={a:{a:[250,50,0,1000],b:[450,0,0,1000]},b:{a:[250,50,150,400],b:[450,0,0,1000]}};
export function compareCosts(a,b){
 const valid=o=>[o.price,o.shipping,o.remediation].every(n=>Number.isFinite(n)&&n>=0&&Number.isSafeInteger(Math.round(n*100)))&&Number.isSafeInteger(o.pages)&&o.pages>0;
 if(!valid(a)||!valid(b))return null;
 const prepare=o=>{const totalCents=Math.round(o.price*100)+Math.round(o.shipping*100)+Math.round(o.remediation*100);return {totalCents,total:totalCents/100,pages:o.pages,cpp:totalCents/100/o.pages};};
 const left=prepare(a),right=prepare(b);
 if(!Number.isSafeInteger(left.totalCents)||!Number.isSafeInteger(right.totalCents))return null;
 const crossA=BigInt(left.totalCents)*BigInt(right.pages),crossB=BigInt(right.totalCents)*BigInt(left.pages);
 const winner=crossA===crossB?'tie':crossA<crossB?'a':'b';
 const high=Math.max(left.cpp,right.cpp),difference=Math.abs(left.cpp-right.cpp);
 return {a:left,b:right,winner,difference,percent:winner==='tie'?0:difference/high*100};
}
const number=(value,digits=2)=>value.toLocaleString('th-TH',{minimumFractionDigits:digits,maximumFractionDigits:digits});
export function initBuyingGuide(){
 const calculatorPanel=document.querySelector('#buyer-calculator-panel');
 const openCalculator=()=>{if(calculatorPanel)calculatorPanel.open=true;};
 document.querySelectorAll('a[href="#buyer-calculator"]').forEach(link=>link.addEventListener('click',openCalculator));
 window.addEventListener('hashchange',()=>{if(location.hash==='#buyer-calculator')openCalculator();});
 if(location.hash==='#buyer-calculator'){openCalculator();document.querySelector('#buyer-calculator')?.scrollIntoView();}
 const form=document.querySelector('#buyer-cost-form');if(!form)return;
 const result=document.querySelector('#buyer-cost-result'),note=document.querySelector('#buyer-scenario-note'),confirm=document.querySelector('#buyer-vat-confirm');
 const input=(side,key)=>document.querySelector('#buyer-'+side+'-'+key);
 let demo=false;
 const read=side=>{
  const values={};for(const key of fields){const field=input(side,key);if(!field.value.trim()||!field.checkValidity())return null;values[key]=field.valueAsNumber;}
  return values;
 };
 function render(){
  const a=read('a'),b=read('b');
  note.textContent=demo?'กำลังดูตัวเลขสมมติ A/B ไม่ใช่ผลทดสอบ MAVO หรือร้านค้าใด':'ผลขึ้นกับข้อมูลที่คุณกรอก ยังไม่ใช่หลักฐานผลทดสอบหากไม่ได้เก็บจากการใช้งานจริง';
  if(!a||!b){result.innerHTML='<p>กรอกตัวเลขให้ครบ ค่าใช้จ่ายต้องไม่ติดลบ และจำนวนหน้าต้องเป็นจำนวนเต็มมากกว่า 0</p>';return;}
  if(!confirm.checked){result.innerHTML='<p>ยืนยันว่าราคาทั้งสองฝั่งรวม VAT และใช้ฐานค่าใช้จ่ายเดียวกันก่อนดูผล</p>';return;}
  const comparison=compareCosts(a,b);
  if(!comparison){result.innerHTML='<p>ตรวจจำนวนหน้าและค่าใช้จ่าย ตัวเลขต้องอยู่ในช่วงที่คำนวณได้</p>';return;}
  const {winner,difference,percent}=comparison;
  const digits=winner!=='tie'&&comparison.a.cpp.toFixed(3)===comparison.b.cpp.toFixed(3)?6:3;
  const largest=Math.max(comparison.a.cpp,comparison.b.cpp);
  const bars=['a','b'].map(side=>{const row=comparison[side];return `<div class="buyer-result-option"><div><span>ทางเลือก ${side.toUpperCase()}</span><strong>${number(row.cpp,digits)} <small>บาท/หน้า</small></strong></div><div class="buyer-cost-track"><span style="width:${largest?row.cpp/largest*100:0}%"></span></div><p>รวม ${number(row.total)} บาท ÷ ${number(row.pages,0)} หน้าที่ใช้ได้</p></div>`;}).join('');
  const differenceText=difference>0&&difference<0.001?'น้อยกว่า 0.001':number(difference,3);
  const percentText=percent>0&&percent<0.01?'น้อยกว่า 0.01%':number(percent,2)+'%';
  const conclusion=winner==='tie'?'ต้นทุนต่อหน้าตามข้อมูลนี้เท่ากัน':`ทางเลือก ${winner.toUpperCase()} มีต้นทุนต่ำกว่าทางเลือก ${winner==='a'?'B':'A'} ${differenceText} บาท/หน้า (${percentText} ของต้นทุนฝั่งที่สูงกว่า)`;
  result.innerHTML=`<h3>ต้นทุนต่อหน้าตามข้อมูลที่กรอก</h3><div class="buyer-result-grid">${bars}</div><p class="buyer-result-conclusion">${conclusion}</p><p class="small muted">ข้อสรุปนี้เปรียบเทียบเฉพาะต้นทุนที่กรอก คุณภาพและเงื่อนไขดูแลต้องประเมินร่วมกัน</p>`;
 }
 form.addEventListener('submit',e=>e.preventDefault());
 form.addEventListener('input',e=>{if(e.target!==confirm)demo=false;render();});
 for(const button of document.querySelectorAll('[data-buyer-scenario]'))button.addEventListener('click',()=>{
  const scenario=scenarios[button.dataset.buyerScenario];if(!scenario)return;
  for(const side of ['a','b'])fields.forEach((key,i)=>{input(side,key).value=scenario[side][i];});
  confirm.checked=true;demo=true;render();
 });
 document.querySelector('#buyer-clear').addEventListener('click',()=>{
  form.reset();demo=false;result.innerHTML='<p>กรอกข้อมูลครบและยืนยันฐานราคา เพื่อดูผลเปรียบเทียบ</p>';
  note.textContent='ยังไม่มีผลคำนวณ กรอกข้อมูลจริงของคุณ หรือเลือกตัวอย่างสมมติ';
 });
}
