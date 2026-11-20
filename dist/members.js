const $=selector=>document.querySelector(selector);
const app={user:null,needsSetup:false,catalog:[],companies:[],stocks:[],movements:[],requests:[],view:'stock',companyId:'',busy:false};
const productBySku=new Map();
const statusLabels={requested:'รอทีมรับเรื่อง',reviewed:'ทีมรับเรื่องแล้ว',shipped:'จัดส่งแล้ว',received:'รับสินค้าแล้ว',canceled:'ยกเลิกแล้ว'};
const movementLabels={receive:'รับเข้า',use:'เบิกใช้',adjust:'ปรับยอด',restock:'รับสินค้าตามคำขอ',restock_received:'รับสินค้าตามคำขอ',request_received:'รับสินค้าตามคำขอ',request_receive:'รับสินค้าตามคำขอ'};
const viewCopy={stock:['ดูแลสต็อกอย่างมีข้อมูล','สต็อกบริษัท','เห็นรุ่นที่ใช้ ยอดคงเหลือ และรายการที่ควรวางแผนเติม'],requests:['วางแผนเติมให้เหมาะกับการใช้','คำขอเติมสินค้า','ติดตามเรื่องที่ส่งให้ทีม MAVO ตั้งแต่รับเรื่องจนได้รับสินค้า'],history:['ตรวจสอบยอดย้อนหลัง','ประวัติสต็อก','ดูที่มาของยอดคงเหลือ พร้อมผู้บันทึกและรายละเอียดแต่ละรายการ'],companies:['สำหรับทีม MAVO','บริษัทและสมาชิก','จัดบริษัทที่ดูแล และสร้างบัญชีให้ลูกค้าเข้าดูสต็อกของตนเอง']};
const number=value=>Number(value||0).toLocaleString('th-TH');
const isAdmin=()=>app.user?.role==='admin';
const companyName=id=>app.companies.find(company=>String(company.id)===String(id))?.name||'บริษัท';
const product=sku=>productBySku.get(String(sku))||{sku:String(sku||''),model:String(sku||''),unit:'กล่อง'};
const unit=sku=>product(sku).unit||'กล่อง';
const visibleColor=value=>{const color=String(value||'').trim();return /^(ไม่ระบุ|ไม่ระบุสี|n\/?a|unknown|-)$/i.test(color)?'':color;};
const modelName=sku=>{const p=product(sku);return [p.model,visibleColor(p.color)].filter(Boolean).join(' · ')||String(sku);};
const dateText=value=>{if(!value)return 'ยังไม่มีข้อมูล';const date=new Date(value);return Number.isNaN(date.getTime())?String(value):date.toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'});};
const activeRequest=r=>!['received','canceled'].includes(r.status);
const inScope=row=>!app.companyId||String(row.companyId)===String(app.companyId);
const lowStock=row=>Number(row.minStock)>0&&Number(row.quantity)<=Number(row.minStock);
const scopedStocks=()=>app.stocks.filter(inScope);

function el(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=String(text);return element;}
function button(label,handler,className='secondary small'){const node=el('button','button '+className,label);node.type='button';node.addEventListener('click',handler);return node;}
function feedback(node,message){node.textContent=message||'';node.hidden=!message;}
function announce(message,error=false){const node=$('#global-feedback');feedback(node,message);node.classList.toggle('error',error);}
function emptyState(title,description,action){const node=el('div','empty-state');node.append(el('div','empty-icon','▦'),el('h3','',title),el('p','',description));if(action)node.append(button(action.label,action.run,'primary'));return node;}
function statusBadge(status,label){return el('span','status-badge '+status,label||statusLabels[status]||status);}
function setFormBusy(form,busy){for(const element of form.querySelectorAll('button,input,select,textarea'))element.disabled=busy;form.setAttribute('aria-busy',String(busy));}
function clearPrivateState(){app.user=null;app.catalog=[];app.companies=[];app.stocks=[];app.movements=[];app.requests=[];app.companyId='';app.view='stock';productBySku.clear();$('#app-screen').hidden=true;for(const id of ['stock-list','request-list','history-list','company-list'])$('#'+id).replaceChildren();$('#account-name').textContent='';$('#stock-search').value='';$('#stock-low-only').checked=false;announce('');if($('#action-dialog').open)$('#action-dialog').close();$('#dialog-fields').replaceChildren();dialogContext=null;}

async function api(path,options={}){
 const config={method:options.method||'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
 if(options.body!==undefined){config.headers['Content-Type']='application/json';config.body=JSON.stringify(options.body);}
 let response;
 try{response=await fetch('/api/members'+path,config);}catch{throw new Error('เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง');}
 let data;try{data=await response.json();}catch{throw new Error('ระบบตอบกลับไม่สมบูรณ์ กรุณาลองอีกครั้ง');}
 if(!response.ok){const error=new Error(typeof data.error==='string'?data.error:'ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง');error.status=response.status;error.code=data.code;throw error;}
 return data;
}

function showAuth(needsSetup,message=''){
 clearPrivateState();app.needsSetup=needsSetup;
 $('#boot-state').hidden=true;$('#auth-screen').hidden=false;
 $('#auth-kicker').textContent=needsSetup?'เริ่มต้นสำหรับเจ้าของระบบ':'พื้นที่สมาชิก';
 $('#auth-title').textContent=needsSetup?'ตั้งบัญชีผู้ดูแล MAVO':'เข้าสู่ระบบ';
 $('#auth-description').textContent=needsSetup?'สร้างบัญชีผู้ดูแลคนแรก แล้วเพิ่มบริษัทและบัญชีลูกค้าที่ต้องการดูแล':'ใช้บัญชีบริษัทที่ทีม MAVO จัดเตรียมให้';
 $('#setup-name-wrap').hidden=!needsSetup;$('#auth-name').required=needsSetup;
 $('#setup-confirm-wrap').hidden=!needsSetup;$('#auth-confirm').required=needsSetup;
 $('#auth-password-hint').hidden=!needsSetup;$('#auth-help').hidden=needsSetup;
 $('#auth-password').minLength=needsSetup?12:1;
 $('#auth-password').autocomplete=needsSetup?'new-password':'current-password';
 $('#auth-submit').textContent=needsSetup?'สร้างบัญชีผู้ดูแล':'เข้าสู่ระบบ';
 $('#auth-password').value='';$('#auth-confirm').value='';$('#show-password').checked=false;
 $('#auth-password').type='password';$('#auth-confirm').type='password';
 feedback($('#auth-feedback'),message);
}

async function bootstrap(){
 $('#boot-state').hidden=false;$('#retry-boot').hidden=true;$('#boot-state .loader').hidden=false;$('#boot-state p').textContent='กำลังเปิดพื้นที่สมาชิก MAVO';
 try{
  const data=await api('/bootstrap');
  if(!data.user){showAuth(Boolean(data.needsSetup));return;}
  app.user=data.user;await loadData();$('#auth-screen').hidden=true;$('#boot-state').hidden=true;$('#app-screen').hidden=false;
 }catch(error){
  if(error.status===401){showAuth(false,'กรุณาเข้าสู่ระบบอีกครั้ง');return;}
  clearPrivateState();$('#auth-screen').hidden=true;$('#boot-state').hidden=false;$('#boot-state .loader').hidden=true;$('#boot-state p').textContent=error.message;$('#retry-boot').hidden=false;
 }
}

async function loadData(){
 const [state,catalog]=await Promise.all([api('/state'),api('/catalog')]);
 app.user=state.user||app.user;app.companies=state.companies||[];app.stocks=state.stocks||[];app.movements=state.movements||[];app.requests=state.requests||[];
 app.catalog=catalog.products||[];productBySku.clear();for(const p of app.catalog)productBySku.set(String(p.sku),p);
 if(!isAdmin())app.companyId=String(app.user.companyId||'');
 else if(app.companyId&&!app.companies.some(company=>String(company.id)===app.companyId))app.companyId='';
 renderShell();renderView();$('#refresh-time').textContent='อัปเดต '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'});
}

function renderShell(){
 $('#account-name').textContent=app.user.name||app.user.username;
 $('#role-tag').textContent=isAdmin()?'ทีม MAVO':'สมาชิกบริษัท';
 $('#admin-nav').hidden=!isAdmin();$('#company-filter-wrap').hidden=!isAdmin();
 $('#company-scope').hidden=isAdmin();$('#company-scope').textContent=companyName(app.user.companyId);
 const select=$('#company-filter');select.replaceChildren(new Option('ทุกบริษัท',''));
 for(const company of app.companies)select.add(new Option(company.name,String(company.id)));
 select.value=app.companyId;
 const count=app.requests.filter(activeRequest).length;$('#request-nav-count').textContent=number(count);$('#request-nav-count').hidden=!count;
 if(!isAdmin()&&app.view==='companies')app.view='stock';
}

function renderView(){
 const [eyebrow,title,description]=viewCopy[app.view];$('#page-eyebrow').textContent=eyebrow;$('#page-title').textContent=title;$('#page-description').textContent=description;
 for(const nav of document.querySelectorAll('.nav-button')){const active=nav.dataset.view===app.view;nav.classList.toggle('active',active);if(active)nav.setAttribute('aria-current','page');else nav.removeAttribute('aria-current');}
 for(const name of Object.keys(viewCopy))$('#'+name+'-view').hidden=name!==app.view;
 const actions=$('#page-actions');actions.replaceChildren();
 if(app.view==='stock'){
  if(isAdmin()){actions.append(button('เพิ่มรุ่นที่ดูแล',()=>openAction('settings'),'secondary'),button('บันทึกสต็อก',()=>openAction('movement'),'primary'));}
  else actions.append(button('ขอเติมสินค้า',()=>openAction('request'),'primary'));
  renderStock();
 }else if(app.view==='requests'){actions.append(button('ขอเติมสินค้า',()=>openAction('request'),'primary'));renderRequests();}
 else if(app.view==='history')renderHistory();
 else if(app.view==='companies'){actions.append(button('เพิ่มบริษัท',()=>openAction('company'),'primary'));renderCompanies();}
}

function renderStock(){
 const stocks=scopedStocks();$('#summary-skus').textContent=number(stocks.length);$('#summary-total').textContent=number(stocks.reduce((total,row)=>total+Number(row.quantity||0),0));
 const units=[...new Set(stocks.map(row=>row.unit||unit(row.sku)))];
 $('#summary-total-unit').textContent=units.length>1?'หน่วยสินค้า (มีหลายหน่วย)':units[0]||'กล่อง';
 if(units.length>1){$('#summary-total').textContent='—';$('#summary-total-unit').textContent='ดูแยกตามหน่วยในแต่ละรายการ';}
 $('#summary-low').textContent=number(stocks.filter(lowStock).length);$('#summary-requests').textContent=number(app.requests.filter(inScope).filter(activeRequest).length);
 const list=$('#stock-list');list.replaceChildren();const term=$('#stock-search').value.trim().toLowerCase();const onlyLow=$('#stock-low-only').checked;
 const filtered=stocks.filter(row=>!onlyLow||lowStock(row)).filter(row=>[row.sku,modelName(row.sku),product(row.sku).brand,companyName(row.companyId)].join(' ').toLowerCase().includes(term));
 if(!filtered.length){
  if(term||onlyLow)list.append(emptyState('ไม่พบรายการตามที่เลือก','ลองเปลี่ยนคำค้น หรือแสดงรายการทั้งหมด'));
  else if(isAdmin()&&!app.companies.length)list.append(emptyState('เริ่มดูแลบริษัทแรก','เพิ่มบริษัทลูกค้า แล้วเลือกรุ่นสินค้าและบันทึกยอดเริ่มต้นที่ตรวจนับแล้ว',{label:'เพิ่มบริษัท',run:()=>openAction('company')}));
  else list.append(emptyState('ยังไม่มีรายการสต็อก',isAdmin()?'เพิ่มรุ่นสินค้าที่บริษัทใช้ แล้วบันทึกรับเข้าตามยอดที่ตรวจนับจริง':'ทีม MAVO จะช่วยเพิ่มรุ่นที่บริษัทใช้ คุณส่งคำขอเติมสินค้าให้ทีมตรวจได้',{label:isAdmin()?'เพิ่มรุ่นที่ดูแล':'ขอเติมสินค้า',run:()=>openAction(isAdmin()?'settings':'request')}));
  return;
 }
 for(const stock of filtered){
  const row=el('article','stock-row');const prod=el('div','stock-product');prod.append(el('strong','',modelName(stock.sku)),el('p','',stock.sku));if(isAdmin())prod.append(el('span','company-chip',companyName(stock.companyId)));
  const quantity=el('div','stock-number');quantity.append(el('span','metric-label','คงเหลือ'),el('strong','',number(stock.quantity)),el('span','',stock.unit||unit(stock.sku)));
  const minimum=el('div','stock-minimum');minimum.append(el('span','metric-label','จุดวางแผนเติม'),el('strong','',Number(stock.minStock)>0?number(stock.minStock):'ยังไม่ตั้ง'));if(Number(stock.minStock)>0)minimum.append(el('span','', ' '+(stock.unit||unit(stock.sku))));
  const status=el('div','stock-status');status.append(statusBadge(lowStock(stock)?'low':Number(stock.quantity)===0?'empty':'available',lowStock(stock)?'ถึงจุดเติม':Number(stock.quantity)===0?'คงเหลือ 0':'มีสต็อก'));status.append(el('p','status-detail',Number(stock.minStock)>0?'เตือนที่ '+number(stock.minStock)+' '+unit(stock.sku):'ยังไม่ตั้งจุดเตือน'));
  const actions=el('div','stock-row-actions');
  if(isAdmin()){actions.append(button('บันทึก',()=>openAction('movement',stock),'secondary small'),button('จุดเตือน',()=>openAction('settings',stock),'secondary small'));}
  else{const use=button('เบิกใช้',()=>openAction('movement',stock),'secondary small');use.disabled=Number(stock.quantity)<=0;actions.append(use,button('ขอเติม',()=>openAction('request',stock),'secondary small'));}
  row.append(prod,quantity,minimum,status,actions);list.append(row);
 }
}

function renderRequests(){
 const list=$('#request-list');list.replaceChildren();const requests=app.requests.filter(inScope);
 if(!requests.length){list.append(emptyState('ยังไม่มีคำขอเติมสินค้า','ระบุรุ่นและจำนวนที่ต้องการให้ทีมตรวจ เมื่อมีคำขอ คุณติดตามสถานะได้จากหน้านี้',{label:'ขอเติมสินค้า',run:()=>openAction('request')}));return;}
 for(const request of requests){
  const row=el('article','request-card');const body=el('div');const topline=el('div','request-topline');topline.append(statusBadge(request.status),el('span','request-id','คำขอ '+String(request.id).slice(0,8).toUpperCase()));
  body.append(topline,el('h3','',modelName(request.sku)),el('p','request-subline',request.sku+' · '+number(request.quantity)+' '+unit(request.sku)+' · '+companyName(request.companyId)));
  if(request.note)body.append(el('p','request-note',request.note));body.append(el('p','request-meta','ส่งคำขอ '+dateText(request.createdAt)+(request.updatedAt&&request.updatedAt!==request.createdAt?' · อัปเดต '+dateText(request.updatedAt):'')));
  const actions=el('div','request-actions');
  if(isAdmin()){
   if(request.status==='requested')actions.append(button('รับเรื่อง',()=>openAction('status',{request,status:'reviewed'}),'primary small'));
   if(request.status==='reviewed')actions.append(button('บันทึกจัดส่ง',()=>openAction('status',{request,status:'shipped'}),'primary small'));
   if(request.status==='shipped')actions.append(button('ยืนยันรับสินค้า',()=>openAction('status',{request,status:'received'}),'primary small'));
   if(['requested','reviewed','shipped'].includes(request.status))actions.append(button('ยกเลิกคำขอ',()=>openAction('status',{request,status:'canceled'}),'danger small'));
  }else{
   if(request.status==='shipped')actions.append(button('ยืนยันรับสินค้า',()=>openAction('status',{request,status:'received'}),'primary small'));
   if(request.status==='requested')actions.append(button('ยกเลิกคำขอ',()=>openAction('status',{request,status:'canceled'}),'danger small'));
  }
  if(request.status==='received')actions.append(el('p','muted compact','เพิ่มยอดสต็อกแล้ว'));
  if(request.status==='canceled')actions.append(el('p','muted compact','ไม่มีการเพิ่มยอดสต็อก'));
  row.append(body,actions);list.append(row);
 }
}

function renderHistory(){
 const list=$('#history-list');list.replaceChildren();const rows=app.movements.filter(inScope);
 if(!rows.length){list.append(emptyState('ยังไม่มีรายการเคลื่อนไหว','เมื่อมีการรับเข้า เบิกใช้ หรือปรับยอด รายละเอียดจะปรากฏที่นี่'));return;}
 for(const movement of rows){
  const row=el('article','history-row');const date=el('div');date.append(el('strong','',movementLabels[movement.type]||movement.type),el('p','',dateText(movement.createdAt)));
  const prod=el('div');prod.append(el('strong','',modelName(movement.sku)),el('p','',movement.sku));if(isAdmin())prod.append(el('p','',companyName(movement.companyId)));
  const delta=Number(movement.delta);const amount=el('div');amount.append(el('div','history-delta'+(delta>0?' positive':''),(delta>0?'+':'')+number(delta)),el('p','',unit(movement.sku)));
  const reason=el('div');reason.append(el('strong','',movement.actorName||'ทีมผู้บันทึก'),el('p','history-reason',movement.reason||'ไม่มีรายละเอียดเพิ่มเติม'));
  row.append(date,prod,amount,reason);list.append(row);
 }
}

function renderCompanies(){
 const list=$('#company-list');list.replaceChildren();const companies=app.companies.filter(company=>!app.companyId||String(company.id)===app.companyId);
 if(!companies.length){list.append(emptyState('เพิ่มบริษัทที่ต้องการดูแล','สร้างบริษัทก่อน แล้วเพิ่มบัญชีสมาชิกและรุ่นสินค้าให้กับบริษัทนั้น',{label:'เพิ่มบริษัท',run:()=>openAction('company')}));return;}
 for(const company of companies){
  const card=el('article','company-card');const body=el('div');const stocks=app.stocks.filter(row=>String(row.companyId)===String(company.id));const requests=app.requests.filter(row=>String(row.companyId)===String(company.id)).filter(activeRequest);
  body.append(el('h3','',company.name),el('p','',number(stocks.length)+' รายการสินค้า · '+number(requests.length)+' คำขอที่กำลังดูแล'));
  const actions=el('div','company-card-actions');actions.append(button('ดูสต็อก',()=>{app.companyId=String(company.id);app.view='stock';renderShell();renderView();},'secondary small'),button('สร้างบัญชีลูกค้า',()=>openAction('user',{companyId:company.id}),'secondary small'));
  card.append(body,actions);list.append(card);
 }
}

let dialogContext=null;
function addField(name,label,options={}){
 const wrap=el('label','',label);const node=el(options.tag||'input');node.name=name;node.id='field-'+name;
 if(!options.tag)node.type=options.type||'text';
 for(const [key,value] of Object.entries(options)){if(['tag','help','choices','value'].includes(key))continue;if(key in node)node[key]=value;else node.setAttribute(key,String(value));}
 if(options.choices){for(const choice of options.choices)node.add(new Option(choice.label,String(choice.value)));}
 if(options.value!==undefined)node.value=String(options.value);
 wrap.append(node);if(options.help)wrap.append(el('span','input-help',options.help));$('#dialog-fields').append(wrap);return node;
}
function defaultCompany(hint){return String(hint.companyId||app.companyId||(!isAdmin()?app.user.companyId:'')|| (app.companies.length===1?app.companies[0].id:''));}
function addCompanyField(hint){
 const id=defaultCompany(hint);
 if(!isAdmin()){dialogContext.companyId=String(app.user.companyId);const summary=el('div','dialog-summary');summary.append(el('strong','',companyName(app.user.companyId)));$('#dialog-fields').append(summary);return;}
 addField('companyId','บริษัท',{tag:'select',required:true,value:id,choices:[{value:'',label:'เลือกบริษัท'},...app.companies.map(company=>({value:company.id,label:company.name}))]});
}
function addProductField(hint){
 return addField('sku','รุ่นสินค้า',{tag:'select',required:true,value:hint.sku||'',choices:[{value:'',label:'เลือกรุ่นหรือรหัสสินค้า'},...app.catalog.map(p=>({value:p.sku,label:[p.model,visibleColor(p.color),p.sku].filter(Boolean).join(' · ')}))]});
}
function summaryLine(text){const node=el('div','dialog-summary',text);$('#dialog-fields').append(node);return node;}

function openAction(mode,hint={}){
 if(!app.user)return;
 if(['movement','settings','request','user'].includes(mode)&&isAdmin()&&!app.companies.length){mode='company';announce('เพิ่มบริษัทก่อน เพื่อแยกข้อมูลสต็อกและสมาชิกให้ถูกต้อง');}
 dialogContext={mode,...hint,companyId:defaultCompany(hint),mutationId:crypto.randomUUID()};
 const dialog=$('#action-dialog');$('#dialog-fields').replaceChildren();feedback($('#dialog-feedback'),'');$('#action-form').reset();$('#dialog-submit').textContent='บันทึก';$('#dialog-kicker').textContent='MAVO MEMBERS';
 if(mode==='company'){
  $('#dialog-title').textContent='เพิ่มบริษัท';$('#dialog-description').textContent='ใช้ชื่อที่ทีมและลูกค้ารู้จัก เพื่อแยกสต็อกและบัญชีสมาชิก';
  addField('name','ชื่อบริษัท / ร้านค้า',{required:true,maxLength:160,autocomplete:'organization'});$('#dialog-submit').textContent='เพิ่มบริษัท';
 }else if(mode==='user'){
  $('#dialog-title').textContent='สร้างบัญชีลูกค้า';$('#dialog-description').textContent='บัญชีนี้เห็นและทำรายการได้เฉพาะบริษัทที่เลือก';addCompanyField(hint);
  addField('name','ชื่อผู้ใช้งาน',{required:true,maxLength:100,autocomplete:'off'});addField('username','ชื่อผู้ใช้สำหรับเข้าสู่ระบบ',{required:true,minLength:3,maxLength:100,autocomplete:'off',spellcheck:false,help:'อย่างน้อย 3 ตัวอักษร ใช้ตัวอักษร ตัวเลข หรือ _ . @ + -'});
  addField('password','รหัสผ่านเริ่มต้น',{type:'password',required:true,minLength:12,maxLength:256,autocomplete:'new-password',help:'อย่างน้อย 12 ตัวอักษร ส่งมอบบัญชีให้ลูกค้าผ่านช่องทางที่ตกลงกัน'});$('#dialog-submit').textContent='สร้างบัญชี';
 }else if(mode==='settings'){
  $('#dialog-title').textContent=hint.sku?'ตั้งจุดวางแผนเติม':'เพิ่มรุ่นที่ดูแล';$('#dialog-description').textContent='ตั้งยอดที่อยากให้ทีมเริ่มวางแผนเติมสินค้า การตั้งค่านี้ไม่เปลี่ยนยอดคงเหลือ';addCompanyField(hint);const sku=addProductField(hint);
  const min=addField('minStock','จุดวางแผนเติม (กล่อง)',{type:'number',required:true,min:0,step:1,max:1000000,value:hint.minStock??0,help:'ถึงยอดนี้หรือต่ำกว่า จะแสดงว่าควรวางแผนเติม ตั้ง 0 หากยังไม่ใช้จุดเตือน'});
  const syncUnit=()=>{min.parentElement.firstChild.textContent='จุดวางแผนเติม ('+unit(sku.value)+')';};sku.addEventListener('change',syncUnit);syncUnit();
 }else if(mode==='movement'){
  $('#dialog-title').textContent=isAdmin()?'บันทึกสต็อก':'บันทึกเบิกใช้';$('#dialog-description').textContent='บันทึกตามจำนวนที่เกิดขึ้นจริง รายการจะอยู่ในประวัติพร้อมผู้บันทึก';addCompanyField(hint);const sku=addProductField(hint);
  let type;if(isAdmin())type=addField('type','ประเภทรายการ',{tag:'select',required:true,choices:[{value:'receive',label:'รับสินค้าเข้า'},{value:'use',label:'เบิกใช้'},{value:'adjust',label:'ปรับเพิ่ม / ลดจากยอดปัจจุบัน'}]});
  const qty=addField('quantity','จำนวน (กล่อง)',{type:'number',required:true,min:1,step:1,max:1000000,value:1});
  const qtyHelp=el('p','field-note');$('#dialog-fields').append(qtyHelp);
  const syncMovement=()=>{const kind=type?.value||'use';qty.min=kind==='adjust'?-1000000:1;qty.parentElement.firstChild.textContent=(kind==='adjust'?'จำนวนที่เพิ่ม / ลด':'จำนวน')+' ('+unit(sku.value)+')';qtyHelp.textContent=kind==='adjust'?'ใส่จำนวนที่เปลี่ยน เช่น 2 เพื่อเพิ่ม หรือ -2 เพื่อลด ไม่ใช่ยอดคงเหลือใหม่':'จำนวนเป็นหน่วยตามทะเบียนสินค้า และเบิกได้ไม่เกินคงเหลือ';};
  sku.addEventListener('change',syncMovement);type?.addEventListener('change',syncMovement);syncMovement();
  addField('reason','รายละเอียด / เหตุผล',{tag:'textarea',required:true,maxLength:500,placeholder:isAdmin()?'เช่น รับเข้าตามใบส่งสินค้า หรือเหตุผลการปรับยอด':'เช่น ใช้กับเครื่องฝ่ายบัญชี'});$('#dialog-submit').textContent='บันทึกรายการ';
 }else if(mode==='request'){
  $('#dialog-title').textContent='ขอเติมสินค้า';$('#dialog-description').textContent='ส่งรุ่นและจำนวนให้ทีม MAVO ตรวจและแจ้งเงื่อนไขก่อนดำเนินการ คำขอนี้ยังไม่ใช่คำสั่งซื้อ';addCompanyField(hint);const sku=addProductField(hint);
  const qty=addField('quantity','จำนวนที่ต้องการ (กล่อง)',{type:'number',required:true,min:1,step:1,max:1000000,value:1});
  const syncUnit=()=>{qty.parentElement.firstChild.textContent='จำนวนที่ต้องการ ('+unit(sku.value)+')';};sku.addEventListener('change',syncUnit);syncUnit();
  addField('note','รายละเอียดเพิ่มเติม',{tag:'textarea',maxLength:1000,placeholder:'เช่น วันที่ต้องการใช้ หรือข้อมูลให้ทีมติดต่อกลับ'});$('#dialog-submit').textContent='ส่งคำขอให้ทีม MAVO';
 }else if(mode==='status'){
  const request=hint.request,status=hint.status;const title={reviewed:'รับเรื่องคำขอ',shipped:'บันทึกการจัดส่ง',received:'ยืนยันรับสินค้า',canceled:'ยกเลิกคำขอ'}[status];$('#dialog-title').textContent=title;$('#dialog-submit').textContent=title;
  $('#dialog-description').textContent=status==='received'?'ยืนยันเมื่อบริษัทได้รับสินค้าแล้ว รายการนี้จะเพิ่มยอดคงเหลือหนึ่งครั้ง':status==='canceled'?'คำขอนี้จะปิดโดยไม่มีการเพิ่มยอดสต็อก':status==='shipped'?'บันทึกเมื่อจัดส่งสินค้าแล้ว เพื่อให้ลูกค้าติดตามและยืนยันรับสินค้า':'แจ้งว่าทีมรับเรื่องแล้ว และประสานรายละเอียดกับลูกค้าต่อ';
  summaryLine(companyName(request.companyId)+' · '+modelName(request.sku)+' · '+number(request.quantity)+' '+unit(request.sku));
  addField('note',status==='shipped'?'รายละเอียดการจัดส่ง / เลขติดตาม':'บันทึกเพิ่มเติม',{tag:'textarea',required:status==='canceled'||status==='shipped'||(status==='received'&&isAdmin()),maxLength:1000,placeholder:status==='received'&&isAdmin()?'ระบุข้อมูลที่ยืนยันว่าลูกค้าได้รับสินค้าแล้ว':''});
 }
 dialog.showModal();
}

function closeDialog(){if($('#action-form').getAttribute('aria-busy')==='true')return;$('#action-dialog').close();$('#dialog-fields').replaceChildren();dialogContext=null;}

$('#action-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!dialogContext||app.busy)return;const form=event.currentTarget;if(!form.reportValidity())return;
 const context=dialogContext;const values=Object.fromEntries(new FormData(form).entries());const companyId=isAdmin()?values.companyId||context.companyId:app.user.companyId;
 let path,method='POST',body,success='บันทึกข้อมูลแล้ว';
 if(context.mode==='company'){path='/companies';body={name:values.name.trim()};success='เพิ่มบริษัทแล้ว เริ่มเพิ่มรุ่นที่ดูแลหรือสร้างบัญชีลูกค้าได้';}
 else if(context.mode==='user'){path='/users';body={companyId,name:values.name.trim(),username:values.username.trim(),password:values.password};success='สร้างบัญชีลูกค้าแล้ว แจ้งชื่อผู้ใช้และรหัสผ่านให้ผู้รับที่ตกลงไว้';}
 else if(context.mode==='settings'){path='/stock-settings';body={companyId,sku:values.sku,minStock:Number(values.minStock)};success='บันทึกรุ่นที่ดูแลและจุดวางแผนเติมแล้ว';}
 else if(context.mode==='movement'){path='/movements';body={companyId,sku:values.sku,type:isAdmin()?values.type:'use',quantity:Number(values.quantity),reason:values.reason.trim(),mutationId:context.mutationId};success='บันทึกรายการสต็อกแล้ว';}
 else if(context.mode==='request'){path='/requests';body={companyId,sku:values.sku,quantity:Number(values.quantity),note:values.note?.trim()||'',mutationId:context.mutationId};success='ส่งคำขอให้ทีม MAVO แล้ว ติดตามต่อได้ในเมนูคำขอเติมสินค้า';}
 else if(context.mode==='status'){path='/requests/'+encodeURIComponent(context.request.id);method='PATCH';body={status:context.status,mutationId:context.mutationId};if(values.note?.trim())body.note=values.note.trim();success=context.status==='received'?'ยืนยันรับสินค้าและเพิ่มยอดสต็อกแล้ว':'อัปเดตสถานะคำขอแล้ว';}
 if(('quantity'in(body||{}))&&(!Number.isSafeInteger(body.quantity)||body.quantity===0|| (body.type!=='adjust'&&body.quantity<1))){feedback($('#dialog-feedback'),'กรุณาระบุจำนวนเต็มที่ถูกต้อง');return;}
 if(('minStock'in(body||{}))&&(!Number.isSafeInteger(body.minStock)||body.minStock<0)){feedback($('#dialog-feedback'),'จุดวางแผนเติมต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');return;}
 feedback($('#dialog-feedback'),'');app.busy=true;setFormBusy(form,true);let saved=false;
 try{
  const result=await api(path,{method,body});saved=true;setFormBusy(form,false);app.busy=false;closeDialog();
  if(context.mode==='company'&&result.company?.id)app.companyId=String(result.company.id);
  if(context.mode==='request')app.view='requests';
  await loadData();announce(success);
 }catch(error){
  if(error.status===401){setFormBusy(form,false);app.busy=false;closeDialog();showAuth(false,'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');}
  else if(saved){announce('บันทึกสำเร็จแล้ว แต่ยังโหลดข้อมูลล่าสุดไม่ได้ กรุณากดอัปเดตข้อมูล',true);}
  else feedback($('#dialog-feedback'),error.message);
 }finally{setFormBusy(form,false);app.busy=false;}
});

$('#auth-form').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget;if(app.busy||!form.reportValidity())return;
 if(app.needsSetup&&$('#auth-password').value!==$('#auth-confirm').value){feedback($('#auth-feedback'),'รหัสผ่านทั้งสองช่องไม่ตรงกัน');return;}
 const body={username:$('#auth-username').value.trim(),password:$('#auth-password').value};if(app.needsSetup)body.name=$('#auth-name').value.trim();
 app.busy=true;setFormBusy(form,true);feedback($('#auth-feedback'),'');
 try{await api(app.needsSetup?'/setup':'/login',{method:'POST',body});$('#auth-password').value='';$('#auth-confirm').value='';app.view='stock';app.companyId='';announce('');await bootstrap();}
 catch(error){feedback($('#auth-feedback'),error.message);}
 finally{setFormBusy(form,false);app.busy=false;}
});
$('#show-password').addEventListener('change',event=>{const type=event.target.checked?'text':'password';$('#auth-password').type=type;$('#auth-confirm').type=type;});
$('#retry-boot').addEventListener('click',bootstrap);
$('#close-dialog').addEventListener('click',closeDialog);$('#cancel-dialog').addEventListener('click',closeDialog);
$('#action-dialog').addEventListener('cancel',event=>{if(app.busy)event.preventDefault();});
$('#action-dialog').addEventListener('close',()=>{if(!app.busy){$('#dialog-fields').replaceChildren();dialogContext=null;}});
for(const button of document.querySelectorAll('.nav-button'))button.addEventListener('click',()=>{app.view=button.dataset.view;announce('');renderView();});
$('#company-filter').addEventListener('change',event=>{app.companyId=event.target.value;announce('');renderView();});
$('#stock-search').addEventListener('input',renderStock);$('#stock-low-only').addEventListener('change',renderStock);
$('#refresh').addEventListener('click',async()=>{const button=$('#refresh');button.disabled=true;try{await loadData();announce('อัปเดตข้อมูลล่าสุดแล้ว');}catch(error){if(error.status===401)showAuth(false,'กรุณาเข้าสู่ระบบอีกครั้ง');else announce(error.message,true);}finally{button.disabled=false;}});
$('#logout').addEventListener('click',async()=>{const button=$('#logout');button.disabled=true;try{await api('/logout',{method:'POST',body:{}});$('#auth-username').value='';showAuth(false);}catch(error){if(error.status===401)showAuth(false);else announce(error.message,true);}finally{button.disabled=false;}});
bootstrap();
