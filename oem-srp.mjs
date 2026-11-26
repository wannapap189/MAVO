// Official Thai references. Webshop selling prices are explicitly distinct from SRP.
import {brandStorePrices} from './oem-brand-store.mjs';
const brochure = 'https://www.brother.co.th/en/-/media/ap2/thailand/promotion/at-your-side-oct---dec-2026.pdf?rev=bd549e73c0214dd6b76e430d295791aa';
export const referencePolicy = {
  basis: 'official-thailand-brand-reference', checkedOn: '2026-11-26',
  label: 'ราคาอ้างอิงจากแบรนด์ · แยกประเภทแหล่งราคา',
  note: 'Brother ใช้ราคาแค็ตตาล็อก ต.ค.–ธ.ค. 2569 ส่วน Canon และ HP ใช้ราคาขายเว็บแบรนด์ในไทย ไม่เรียกว่า SRP ราคาตามร้านและโปรโมชั่นอาจต่างกัน ส่วนต่างนี้ไม่ใช่ผลประหยัดจริงของลูกค้าทุกราย',
  sourcePeriod: '2026-10-01 / 2026-12-31',
  requiresReviewAfter: '2026-12-31',
  missingPolicy: 'ไม่ใช้ราคาของร้านค้าหรือราคาต่างประเทศแทน SRP ไทย หากรุ่นหรือฐาน VAT ยังยืนยันไม่ครบจะไม่คำนวณส่วนต่าง'
};
// Transcribed and visually checked against the laser consumables table, PDF page 14.
const mono = {TN1000:1370,TN2060:1155,TN2260:1670,TN2280:2770,TN2360:1290,TN2380:2390,TN2460:1440,TN2480:2890,TN2560:1290,TN3350:5650};
const colour = {TN261:[2880,2490],TN263:[2090,2490],TN267:[3140,3540],TN269:[1990,2290],TN340:[2290,2720]};
const prices = {...mono};
for (const [model,[black,cmy]] of Object.entries(colour)) {
  prices[model+'BK']=black;
  for (const c of ['C','M','Y']) prices[model+c]=cmy;
}
const dual = {'TN2260/2280':['TN2260','TN2280'],'TN2360/2380':['TN2360','TN2380'],'TN2460/2480':['TN2460','TN2480']};

function storeOffers(record, vatRate) {
  const suffix=record.color?.match(/\((BK|C|M|Y)\)/)?.[1];
  const keys=record.brand==='CANON'
    ? [record.model.replace(/^CRG/,'')+(suffix?'-'+suffix:'')]
    : record.model==='107A'?['W1107A']:record.model==='CB435/436A'?['CB435A','CB436A']:(record.model.match(/C[BFE]\d{3}A/g)||[]);
  return keys.flatMap(key=>{
    const source=brandStorePrices[record.brand]?.[key];
    if(!source)return [];
    const hp=record.brand==='HP';
    return [{oemBrand:record.brand,oemModel:hp?key:'Cartridge '+key.replace('-',' '),
      sourcePrice:source.sourcePrice,currency:'THB',vatBasis:'included',
      priceExVat:source.sourcePrice/(1+vatRate),priceIncVat:source.sourcePrice,
      sourceUrl:source.sourceUrl,sourceTitle:(hp?'HP Thailand Store':'Canon Thailand eStore')+' · '+source.title,
      vatEvidenceUrl:hp?'https://www.hp.com/th-th/shop/terms-conditions':'https://goto.canon.co.th/estore/checkout/cart/',
      vatEvidenceNote:hp?'ข้อกำหนด HP Store หัวข้อราคาและค่าจัดส่งระบุว่าราคารวมภาษีสินค้าและบริการ':'ตรวจตะกร้า Canon eStore วันที่ 26 พ.ย. 2569: Cartridge 325 ราคา 2,537 บาท ภาษี 165.97 บาท ยอดสุทธิ 2,537 บาท ส่งฟรี จึงยืนยันฐานราคารวม VAT 7% ของร้าน (ไม่ได้สั่งซื้อ)',
      observedDate:referencePolicy.checkedOn,availability:'reference-only',stockDetail:source.stockDetail,
      priceKind:'brand-store',sourceType:'manufacturer-thailand-webstore',
      priceLabel:'ราคาขายเว็บแบรนด์',requiresReviewAfter:'2026-12-26'}];
  });
}

export function applyBrandReferences(data) {
  return {...data, comparisonPolicy:referencePolicy, comparisonObservedDate:referencePolicy.checkedOn,
    records:data.records.map(record=>{
      const suffix = record.color?.match(/\((BK|C|M|Y)\)/)?.[1] || '';
      const models = dual[record.model] || [record.model+(colour[record.model] ? suffix : '')];
      const comparisons = record.brand==='BROTHER' ? models.filter(model=>prices[model]).map(model=>({
        oemBrand:'BROTHER', oemModel:model, sourcePrice:prices[model], currency:'THB',
        vatBasis:'included', priceExVat:prices[model]/(1+data.vatRate), priceIncVat:prices[model],
        sourceUrl:brochure+'#page=14', sourceTitle:'Brother · แค็ตตาล็อก ต.ค.–ธ.ค. 2569 หน้า 14',
        sourcePage:14, sourcePeriod:referencePolicy.sourcePeriod,
        vatEvidenceUrl:brochure+'#page=6',
        vatEvidenceNote:'หมายเหตุราคารวม VAT 7% ในแค็ตตาล็อกฉบับเดียวกัน หน้า 6; ตารางวัสดุการพิมพ์อยู่หน้า 14',
        observedDate:referencePolicy.checkedOn, availability:'reference-only', stockDetail:null,
        priceKind:'brand-catalog', sourceType:'manufacturer-thailand-catalog',
        priceLabel:'ราคาแค็ตตาล็อก Brother', requiresReviewAfter:referencePolicy.requiresReviewAfter
      })) : storeOffers(record,data.vatRate);
      return {...record, comparisons,
        comparisonStatus:comparisons.length ? 'brand-reference-available':'pending-srp',
        missingReason:comparisons.length ? null : 'ยังไม่พบราคา SRP หรือราคาขายเว็บแบรนด์ในไทยที่ยืนยันรุ่นและ VAT ได้ ส่งราคาที่ซื้ออยู่ให้ทีมช่วยเทียบได้'
      };
    })};
}
