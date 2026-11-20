from pathlib import Path
import argparse, hashlib, json, re, shutil, unicodedata
from urllib.parse import urlparse
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parent
args=argparse.ArgumentParser()
args.add_argument('--source',type=Path,required=True)
args.add_argument('--out',type=Path,required=True)
args=args.parse_args()
source_bytes=args.source.read_bytes()
source=json.loads(source_bytes)
args.out.mkdir(parents=True,exist_ok=True)
masters=ROOT.parent/'output/pdf/mavo-customer-checklists'
masters.mkdir(parents=True,exist_ok=True)
FONT_ROOT=Path(__import__('os').environ.get('MAVO_PDF_FONT_DIR',r'C:\Windows\Fonts'))
pdfmetrics.registerFont(TTFont('Mavo',str(FONT_ROOT/'tahoma.ttf')))
pdfmetrics.registerFont(TTFont('MavoBold',str(FONT_ROOT/'tahomabd.ttf')))
W,H=A4
NAVY=HexColor('#09253D'); CYAN=HexColor('#5CC6E7'); MUTED=HexColor('#526A7A')
LINE=HexColor('#CFDFE8'); ICE=HexColor('#F0F7FA'); BLUE=HexColor('#236982')
LOGO=ROOT/'dist/assets/mavo-logo.png'
LINE_URL=source['lineURL']

def clean(s):
    return str(s or '').replace('\u2013','-').replace('\u2014','-').replace('\u2011','-')

def width(s,size,font='Mavo'):
    return pdfmetrics.stringWidth(s,font,size)

def clusters(text):
    result=[]
    for char in text:
        if result and (unicodedata.combining(char) or '\u0e31'<=char<='\u0e3a' or '\u0e47'<=char<='\u0e4e'):
            result[-1]+=char
        else:result.append(char)
    return result

def wrap(text,max_width,size,font='Mavo'):
    text=clean(text)
    words=re.findall(r'\S+\s*',text)
    lines=[];line=''
    for token in words:
        if width(line+token,size,font)<=max_width:
            line+=token;continue
        if line.strip():lines.append(line.rstrip());line=''
        if width(token.rstrip(),size,font)<=max_width:line=token;continue
        for cluster in clusters(token):
            if width(line+cluster,size,font)>max_width and line:
                lines.append(line.rstrip());line=''
            line+=cluster
    if line.strip():lines.append(line.rstrip())
    return lines

def draw_text(c,s,x,top,size=11,bold=False,color=NAVY):
    c.setFont('MavoBold' if bold else 'Mavo',size);c.setFillColor(color)
    c.drawString(x,H-top-size,clean(s),shaping=True)

def multiline(c,lines,x,top,size,leading,bold=False,color=NAVY):
    for n,line in enumerate(lines):draw_text(c,line,x,top+n*leading,size,bold,color)
    return top+len(lines)*leading

def rectangle(c,x,top,w,h,fill,stroke=None,r=0):
    c.setFillColor(fill);c.setStrokeColor(stroke or fill);c.setLineWidth(.6)
    if r:c.roundRect(x,H-top-h,w,h,r,fill=1,stroke=bool(stroke))
    else:c.rect(x,H-top-h,w,h,fill=1,stroke=bool(stroke))

def line(c,x,top,w,color=LINE):
    c.setStrokeColor(color);c.setLineWidth(.6);c.line(x,H-top,x+w,H-top)

def write_field(c,label,x,top,w):
    draw_text(c,label,x,top,9.5,color=MUTED)
    offset=width(label,9.5)+9;line(c,x+offset,top+13,w-offset)

def render(module):
    output=masters/(module['id']+'.pdf')
    c=canvas.Canvas(str(output),pagesize=A4,pageCompression=1)
    c.setTitle('MAVO | '+module['title']);c.setAuthor('MAVO')
    c.setSubject('เช็กลิสต์สำหรับลูกค้า: '+module['title'])
    c.drawImage(ImageReader(str(LOGO)),38,H-68,width=100,height=37.7,mask='auto')
    draw_text(c,'CUSTOMER CHECKLIST',402,35,9.2,True,BLUE)
    draw_text(c,'เลือกคุ้ม ใช้มั่นใจ',402,52,10,False,MUTED)

    title_size=22
    title_lines=wrap(module['title'],W-120,title_size,'MavoBold')
    while len(title_lines)>2 and title_size>18:
        title_size-=.5;title_lines=wrap(module['title'],W-120,title_size,'MavoBold')
    band_height=max(86,38+len(title_lines)*29)
    rectangle(c,38,82,W-76,band_height,NAVY,r=10)
    rectangle(c,38,102,4,28,CYAN)
    draw_text(c,'เช็กลิสต์นำไปใช้กับงานของคุณ',56,94,10,True,CYAN)
    multiline(c,title_lines,56,113,title_size,29,True,white)

    summary_lines=wrap(module['summary'],W-76,10.6)
    y=multiline(c,summary_lines,38,82+band_height+16,10.6,15.8,color=MUTED)+15
    write_field(c,'บริษัท / ผู้บันทึก',38,y,340);write_field(c,'วันที่',404,y,153)
    y+=26
    write_field(c,'รุ่นเครื่อง / เรื่องที่ประเมิน',38,y,W-76)
    y+=31
    draw_text(c,'ตรวจทีละข้อ แล้วเก็บข้อมูลจากงานจริง',38,y,12.5,True)
    draw_text(c,'ติ๊กเมื่อทำแล้ว',451,y+2,9.3,color=MUTED)
    y+=27

    check_names=[];check_boxes=[]
    for index,step in enumerate(module['practical_steps']):
        lines=wrap(step,W-112,11.15)
        row_height=max(42,len(lines)*16.5+17)
        field=f'check_{index+1:02d}'
        check_names.append(field)
        c.acroForm.checkbox(name=field,tooltip=f'Checklist item {index+1}',x=42,y=H-y-14,size=12,
            checked=False,buttonStyle='check',borderWidth=.8,borderColor=BLUE,fillColor=white,textColor=NAVY,forceBorder=True)
        multiline(c,lines,68,y,11.15,16.5)
        line(c,68,y+row_height-7,W-108)
        check_boxes.append({'top':y,'height':row_height,'lines':len(lines)})
        y+=row_height

    scope_lines=wrap(module['scope_note'],W-100,9.2)
    scope_height=len(scope_lines)*12.5+29
    sources=module.get('sources',[])
    source_rows=(len(sources)+1)//2
    source_height=source_rows*14+(15 if sources else 0)
    footer_top=754
    scope_top=footer_top-source_height-scope_height-13
    notes_top=y+10
    notes_height=scope_top-notes_top-13
    if notes_height<37:
        raise ValueError(f"Checklist too long: {module['id']}, notes height {notes_height:.1f}")
    rectangle(c,38,notes_top,W-76,notes_height,ICE,r=7)
    draw_text(c,'ผลที่พบ / สิ่งที่ต้องสอบถามเพิ่มเติม',50,notes_top+9,10.3,True)
    note_y=notes_top+36
    while note_y<notes_top+notes_height-8:
        line(c,50,note_y,W-100);note_y+=21
    draw_text(c,'ใช้ข้อมูลนี้อย่างไร',50,scope_top+2,9.5,True,BLUE)
    multiline(c,scope_lines,50,scope_top+18,9.2,12.5,color=MUTED)

    if sources:
        sy=scope_top+scope_height+2
        draw_text(c,'อ่านแหล่งข้อมูลประกอบ',38,sy,8.5,True,BLUE);sy+=15
        for i,reference in enumerate(sources):
            domain=urlparse(reference['url']).netloc.removeprefix('www.')
            label=f"{i+1}. {domain}"
            if width(label,8.2)>238:label=f'แหล่งข้อมูล {i+1}'
            x=38+(i%2)*267;t=sy+(i//2)*14
            draw_text(c,label,x,t,8.2,color=BLUE)
            c.linkURL(reference['url'],(x,H-t-12,x+min(242,width(label,8.2)),H-t+2),relative=0,thickness=0)

    rectangle(c,38,footer_top,W-76,60,NAVY,r=8)
    draw_text(c,'ส่งรุ่นเครื่องให้ MAVO ช่วยตรวจ',52,footer_top+10,12.5,True,white)
    draw_text(c,'LINE @mavo  |  ช่วยเลือกก่อนซื้อ ดูแลต่อเมื่อใช้งาน',52,footer_top+31,9.1,False,HexColor('#D5EDF5'))
    c.linkURL(LINE_URL,(50,H-footer_top-54,440,H-footer_top-6),relative=0,thickness=0)
    qr=QrCodeWidget(LINE_URL,barLevel='M')
    x0,y0,x1,y1=qr.getBounds();size=49
    drawing=Drawing(size,size,transform=[size/(x1-x0),0,0,size/(y1-y0),0,0]);drawing.add(qr)
    rectangle(c,W-98,footer_top+5,51,51,white,r=3)
    renderPDF.draw(drawing,c,W-97,H-footer_top-55)
    c.linkURL(LINE_URL,(W-98,H-footer_top-56,W-47,H-footer_top-5),relative=0,thickness=0)
    draw_text(c,'ฉบับ '+source['edition']+' · อ่านบทความหัวข้อเดียวกันได้ในคลังความรู้ MAVO',38,820,7.6,color=MUTED)
    draw_text(c,'1 / 1',530,820,7.6,color=MUTED)
    if source.get('origin'):
        article_url=source['origin'].rstrip('/')+'/articles/'+module['id']+'.html'
        c.linkURL(article_url,(38,H-831,490,H-817),relative=0,thickness=0)
    c.showPage();c.save()

    reader=PdfReader(output)
    fields=reader.get_fields() or {}
    assert len(reader.pages)==1
    assert set(fields)==set(check_names)
    assert all(str(field.get('/V'))=='/Off' for field in fields.values())
    widgets=[a.get_object() for a in reader.pages[0].get('/Annots',[]) if a.get_object().get('/Subtype')=='/Widget']
    assert len(widgets)==len(check_names)
    assert all(w.get('/AP',{}).get('/N') and str(w.get('/V'))=='/Off' for w in widgets)
    text=reader.pages[0].extract_text()
    assert 'MAVO' in text and 'LINE @mavo' in text
    assert 'localhost' not in text and '127.0.0.1' not in text
    shutil.copy2(output,args.out/output.name)
    return {'id':module['id'],'title':module['title'],'file':output.name,'pages':1,'checkboxes':len(fields),'notesHeight':round(notes_height,1),'rows':check_boxes,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}

entries=[render(module) for module in source['modules']]
manifest={'sourceHash':hashlib.sha256(source_bytes).hexdigest(),'builderHash':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'logoHash':hashlib.sha256(LOGO.read_bytes()).hexdigest(),'edition':source['edition'],'entries':entries}
(args.out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pdfs':len(entries),'pages':sum(e['pages'] for e in entries),'checkboxes':sum(e['checkboxes'] for e in entries),'minNotesHeight':min(e['notesHeight'] for e in entries)},ensure_ascii=False))
