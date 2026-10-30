"""Leiman Lab journal-style Telegram test graphics. All data labels are authored, not generative."""
from functools import lru_cache
from html import escape
P="#F4F2EE";I="#191919";R="#C72B34";M="#726D68";L="#C9C5BE"
def txt(x,y,t,sz=27,c=I,font="DejaVu Sans",weight="normal"):
 return f'<text x="{x}" y="{y}" font-family="{font}" font-size="{sz}" font-weight="{weight}" fill="{c}">{escape(str(t))}</text>'
def ln(x,y,x2,y2,c=L,w=2):return f'<path d="M{x} {y}L{x2} {y2}" stroke="{c}" stroke-width="{w}"/>'
def frame(n):
 return [f'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="{P}"/>',f'<rect width="16" height="1350" fill="{I}"/>',
 txt(66,82,"LEIMAN LAB",38,I,weight="bold"),txt(66,123,"RESEARCH  /  ESSAYS  /  JOURNAL",17,M),
 txt(848,82,"NOTE 002",21,R,weight="bold"),ln(66,157,1004,157,I,2),
 ln(66,1245,1004,1245),txt(66,1293,"LEIMAN LAB  /  OCTOBER 2026",20,M),
 txt(919,1293,str(n)+" / 03",20,R,weight="bold")]
def cover():
 s=frame(1)
 s += [txt(68,258,"ТЕХНОЛОГИИ И ОБЩЕСТВО",26,R,weight="bold"),
 txt(61,426,"После",108,I,"DejaVu Serif"),txt(61,573,"чёрного",108,I,"DejaVu Serif"),txt(61,720,"октября",108,I,"DejaVu Serif"),
 ln(67,776,202,776,R,5),txt(69,857,"Безопасность интернета",38,I,"DejaVu Serif"),
 txt(69,919,"в эпоху ИИ-агентов",38,I,"DejaVu Serif"),
 txt(69,1036,"Что произошло, что доказано",26,M),txt(69,1085,"и где начинается мифология.",26,M),
 f'<rect x="67" y="1145" width="936" height="68" fill="{I}"/>',txt(93,1191,"◢  ИССЛЕДОВАНИЕ",27,P,weight="bold")]
 return ''.join(s)+'</svg>'
def figures():
 s=frame(2)
 s +=[txt(67,244,"01   /   ДАННЫЕ",27,R,weight="bold"),txt(64,345,"Цена цифровых",59,I,"DejaVu Serif"),
 txt(64,428,"преступлений",59,I,"DejaVu Serif"),txt(68,487,"Заявленные потери FBI IC3, США",26,M)]
 left,right,top,bot=130,966,567,957
 for t in (0,5,10,15,20,25):
  y=bot-t/25*(bot-top);s+=[ln(left,round(y),right,round(y),L,1),txt(79,round(y)+8,str(t),21,M)]
 pts=[]
 for i,(year,val,label) in enumerate([("2023",12.5,"12,5"),("2024",16.6,"16,6"),("2025",20.877,"20,9")]):
  x=left+i*(right-left)/2;y=bot-val/25*(bot-top);pts.append((x,y))
  s +=[txt(round(x)-38,bot+50,year,24,M),txt(round(x)-46,round(y)-27,label,29,I,weight="bold")]
 s +=['<polyline points="'+' '.join(f'{x:.1f},{y:.1f}' for x,y in pts)+f'" fill="none" stroke="{R}" stroke-width="5"/>']
 for x,y in pts:s +=[f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{R}"/>']
 s +=[ln(67,1076,1005,1076,I),txt(69,1133,"1 008 597",53,R,"DejaVu Serif"),txt(481,1126,"жалоб в 2025 году",26,I),
 txt(68,1192,"Общий фон интернет-преступлений, не статистика AI-атак.",20,M)]
 return ''.join(s)+'</svg>'
def claims():
 s=frame(3)
 s +=[txt(68,238,"02   /   ПРОВЕРКА ФАКТОВ",27,R,weight="bold"),
 txt(65,353,"Что подтверждено.",60,I,"DejaVu Serif"),txt(65,439,"А что нет.",60,I,"DejaVu Serif"),
 txt(69,496,"Факты, версии и лабораторные результаты.",24,M)]
 sections=[
 (554,"◉  ПОДТВЕРЖДЕНО",R,[
 "Railway сообщила об атаке на внутренние системы.",
 "Саморепликация prompt injection показана в тесте.",
 "Модели помогают находить сложные уязвимости."]),
 (830,"△  ПРЕДВАРИТЕЛЬНО",I,[
 "Атакующих могли интересовать ключи",
 "AI-провайдеров, по версии Railway."]),
 (1055,"—  НЕ ДОКАЗАНО",I,[
 "Что Railway атаковал автономный ИИ.",
 "Что ИИ самостоятельно «взламывает интернет»."])]
 for y,label,col,lines in sections:
  s +=[ln(69,y-31,1003,y-31),txt(69,y+29,label,26,col,weight="bold")]
  for i,item in enumerate(lines):
   s +=[txt(71,y+87+i*46,item,20,I)]
 s +=[ln(69,1191,1003,1191,R,3),txt(69,1225,"Информация ≠ полномочие.",26,R,"DejaVu Serif")]
 return ''.join(s)+'</svg>'

@lru_cache(maxsize=3)
def svg_for(n):return {1:cover,2:figures,3:claims}[n]()

@lru_cache(maxsize=3)
def png_for(n):
 import cairosvg
 return cairosvg.svg2png(bytestring=svg_for(n).encode(),output_width=1080,output_height=1350)
