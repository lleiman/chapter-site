import http from "node:http";
import {readFileSync,readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {PNG} from "pngjs";

const root=path.dirname(fileURLToPath(import.meta.url));
const css=readFileSync(path.join(root,"style.css"),"utf8");
const articles=readdirSync(path.join(root,"content"))
  .filter(n=>/^\d{3}-[a-z0-9-]+\.json$/.test(n))
  .map(n=>JSON.parse(readFileSync(path.join(root,"content",n),"utf8")))
  .sort((a,b)=>b.date.localeCompare(a.date));
const bySlug=new Map(articles.map(a=>[a.slug,a]));

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function hostOrigin(req){let h=String(req.headers["x-forwarded-host"]||req.headers.host||"localhost:3000").split(",")[0].trim();if(!/^[a-z0-9.:-]+$/i.test(h))h="localhost:3000";const scheme=(h.includes("localhost")||h.startsWith("127."))?"http":"https";return process.env.PUBLIC_URL||scheme+"://"+h;}
function shell(body,title,desc,url,img,type){return [
  "<!doctype html><html lang='ru'><head><meta charset='utf-8'>",
  "<meta name='viewport' content='width=device-width,initial-scale=1'>",
  "<meta name='theme-color' content='#0b0b0c'>",
  "<title>",esc(title),"</title>",
  "<meta name='description' content='",esc(desc),"'>",
  "<link rel='canonical' href='",esc(url),"'>",
  "<meta property='og:type' content='",type,"'>",
  "<meta property='og:site_name' content='LEIMAN LAB'>",
  "<meta property='og:title' content='",esc(title),"'>",
  "<meta property='og:description' content='",esc(desc),"'>",
  "<meta property='og:url' content='",esc(url),"'>",
  "<meta property='og:image' content='",esc(img),"'>",
  "<meta property='og:image:width' content='1200'>",
  "<meta property='og:image:height' content='630'>",
  "<meta name='twitter:card' content='summary_large_image'>",
  "<link rel='stylesheet' href='/style.css'>",
  "</head><body>",
  "<header class='header'><div class='wrap header-content'>",
  "<a class='brand' href='/'>LEIMAN <span>LAB</span></a>",
  "<nav class='navigation'><a href='/#journal'>Журнал</a><a href='/#about'>О лаборатории</a><a href='https://t.me/aiadepts' rel='noopener'>Telegram ↗</a></nav>",
  "</div></header>",body,
  "<footer><div class='wrap footer micro'><span>© LEIMAN LAB · RESEARCH & CREATIVE PRACTICE</span><span>TECHNOLOGY / BUSINESS / CONSCIOUSNESS / ART</span></div></footer>",
  "</body></html>"
].join("");}
function logoTiles(){return "<div class='art' aria-label='Геометрический знак Leiman Lab'><span class='micro tag'>LL / VISUAL STUDY 001</span><div class='art-grid'><i class='sq'></i><i class='sq none'></i><i class='sq none'></i><i class='sq'></i><i class='sq r'></i><i class='sq none'></i><i class='sq'></i><i class='sq r'></i><i class='sq r'></i></div></div>";}
function home(origin){
 const list=articles.map(a=>[
  "<a class='story' href='/articles/",esc(a.slug),"'>",
  "<div class='micro'>",esc(a.number)," / ",esc(a.category),"<br>",esc(a.dateLabel),"</div>",
  "<div><h2>",esc(a.title),"</h2><p>",esc(a.summary),"</p></div><span class='arrow'>↗</span></a>"
 ].join("")).join("");
 const content=[
 "<main><section class='wrap hero'><div><div class='label'>INDEPENDENT RESEARCH & CREATIVE PRACTICE / 2026</div>",
 "<h1>LEIMAN<br><em>LAB.</em></h1>",
 "<p>Исследую, создаю и проверяю на практике. ИИ, технологии, продакшен, бизнес, сознание, психология и искусство.</p>",
 "<a class='btn' href='#journal'>Открыть журнал ↗</a></div>",logoTiles(),"</section>",
 "<section id='journal' class='wrap journal'><div class='separator micro'><span>01 / JOURNAL</span><span>",articles.length," PUBLICATIONS / NEWEST FIRST</span></div>",
 list,"</section><section id='about' class='wrap about'><div><div class='label'>ABOUT / LEIMAN LAB</div>",
 "<h2>Исследование<br>как практика.</h2></div><div>",
 "<p>Личная исследовательская и проектная лаборатория Льва Леймана. Здесь встречаются технологии, продакшен, бизнес, психология и искусство. Публикую собственные наблюдения, гипотезы, прототипы и разборы исследований с первоисточниками.</p>",
 "<p>Коммерческие проекты: AI-продакшен, AI-продукты, R&D и экспериментальные спецпроекты.</p>",
 "<a class='btn' href='https://t.me/leimanleo' rel='noopener'>Связаться ↗</a>",
 "</div></section></main>"
 ].join("");
 return shell(content,"Leiman Lab — журнал исследовательской лаборатории","Технологии, бизнес, психология, искусство и эксперименты Льва Леймана.",origin+"/",origin+"/og/warhound.png","website");
}
function renderBlock(b){
 if(b.type==="p")return "<p>"+esc(b.text)+"</p>";
 if(b.type==="h2")return "<h2>"+esc(b.text)+"</h2>";
 if(b.type==="h3")return "<h3>"+esc(b.text)+"</h3>";
 if(b.type==="note")return "<aside class='note'><p>"+esc(b.text)+"</p></aside>";
 if(b.type==="list")return "<ul>"+(b.items||[]).map(x=>"<li>"+esc(x)+"</li>").join("")+"</ul>";
 return "";
}
function articlePage(a,origin){
 const sources=(a.sources||[]).map(s=>"<li><a href='"+esc(s.url)+"' rel='noopener noreferrer' target='_blank'>"+esc(s.label)+" ↗</a></li>").join("");
 const content=[
 "<main class='article' itemscope itemtype='https://schema.org/Article'>",
 "<a class='back micro' href='/'>← LEIMAN LAB / JOURNAL</a>",
 "<section class='article-head'><div class='label'>",esc(a.eyebrow)," · ",esc(a.category),"</div>",
 "<h1 itemprop='headline'>",esc(a.title),"</h1>",
 "<p class='deck' itemprop='description'>",esc(a.description),"</p>",
 "<div class='article-meta micro'><span>",esc(a.dateLabel),"</span><span>ЛЕВ ЛЕЙМАН</span><span>",esc(a.readTime),"</span></div>",
 "</section><article class='article-body' itemprop='articleBody'>",
 (a.blocks||[]).map(renderBlock).join(""),
 "<section class='sources'><div class='label'>ИСТОЧНИКИ / SOURCES</div>",
 "<ul>",sources,"</ul><p class='micro'>Материал отражает сведения, доступные на дату публикации. Продолжающиеся расследования могут изменить оценки.</p></section>",
 "<div class='end'><span class='label'>LEIMAN LAB / JOURNAL</span><p>Наблюдения, исследования, эксперименты и работающие прототипы.</p>",
 "<a class='btn' href='/'>Другие материалы ↗</a> &nbsp; <a class='btn' href='https://t.me/aiadepts'>Telegram ↗</a></div>",
 "</article></main>"
 ].join("");
 return shell(content,a.title+" — Leiman Lab",a.description,origin+"/articles/"+a.slug,origin+"/og/"+a.slug+".png","article");
}
const font={
"A":["01110","10001","10001","11111","10001","10001","10001"],
"B":["11110","10001","10001","11110","10001","10001","11110"],
"C":["01111","10000","10000","10000","10000","10000","01111"],
"D":["11110","10001","10001","10001","10001","10001","11110"],
"E":["11111","10000","10000","11110","10000","10000","11111"],
"F":["11111","10000","10000","11110","10000","10000","10000"],
"G":["01111","10000","10000","10111","10001","10001","01111"],
"H":["10001","10001","10001","11111","10001","10001","10001"],
"I":["11111","00100","00100","00100","00100","00100","11111"],
"J":["00111","00010","00010","00010","10010","10010","01100"],
"K":["10001","10010","10100","11000","10100","10010","10001"],
"L":["10000","10000","10000","10000","10000","10000","11111"],
"M":["10001","11011","10101","10101","10001","10001","10001"],
"N":["10001","11001","10101","10011","10001","10001","10001"],
"O":["01110","10001","10001","10001","10001","10001","01110"],
"P":["11110","10001","10001","11110","10000","10000","10000"],
"Q":["01110","10001","10001","10001","10101","10010","01101"],
"R":["11110","10001","10001","11110","10100","10010","10001"],
"S":["01111","10000","10000","01110","00001","00001","11110"],
"T":["11111","00100","00100","00100","00100","00100","00100"],
"U":["10001","10001","10001","10001","10001","10001","01110"],
"V":["10001","10001","10001","10001","10001","01010","00100"],
"W":["10001","10001","10001","10101","10101","10101","01010"],
"X":["10001","10001","01010","00100","01010","10001","10001"],
"Y":["10001","10001","01010","00100","00100","00100","00100"],
"Z":["11111","00001","00010","00100","01000","10000","11111"],
"0":["01110","10001","10011","10101","11001","10001","01110"],
"1":["00100","01100","00100","00100","00100","00100","01110"],
"2":["11110","00001","00001","01110","10000","10000","11111"],
"3":["11110","00001","00001","01110","00001","00001","11110"],
"6":["01110","10000","10000","11110","10001","10001","01110"],
"/":["00001","00001","00010","00100","01000","10000","10000"],
"-":["00000","00000","00000","11111","00000","00000","00000"]
};
function ogImage(a){
 const W=1200,H=630,p=new PNG({width:W,height:H});
 function rect(x,y,w,h,r,g,b){for(let yy=Math.max(0,y);yy<Math.min(y+h,H);yy++)for(let xx=Math.max(0,x);xx<Math.min(x+w,W);xx++){const i=(yy*W+xx)*4;p.data[i]=r;p.data[i+1]=g;p.data[i+2]=b;p.data[i+3]=255;}}
 rect(0,0,W,H,11,11,12);
 function type(t,x,y,z,r,g,b){let xx=x;for(let c of t.toUpperCase()){let glyph=font[c];if(glyph)for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==="1")rect(xx+gx*z,y+gy*z,z-1,z-1,r,g,b);xx+=6*z;}}
 rect(65,51,1070,2,56,54,56);rect(65,584,1070,2,56,54,56);
 type("LEIMAN LAB",67,83,6,241,239,235);
 type("FIELD NOTE "+a.number,67,175,4,227,44,51);
 const tt=a.ogTitle||"LEIMAN LAB";const z=tt.length>13?10:15;
 type(tt,66,318,z,241,239,235);
 type("RESEARCH / 2026",68,538,4,160,157,151);
 for(const [x,y,c] of [[0,0,0],[0,1,0],[0,2,0],[1,1,1],[1,2,1],[2,2,1]]){
  const xx=910+x*65, yy=188+y*65;if(c===0)rect(xx,yy,59,59,241,239,235);else rect(xx,yy,59,59,227,44,51);
 }
 return PNG.sync.write(p);
}
const imageCache=new Map();
const server=http.createServer((req,res)=>{
 const origin=hostOrigin(req);let u;try{u=new URL(req.url||"/",origin);}catch{res.writeHead(400).end("Bad request");return;}
 const pathname=u.pathname;
 if(pathname==="/health"){res.writeHead(200,{"Content-Type":"text/plain"}).end("OK");return;}
 if(pathname==="/style.css"){res.writeHead(200,{"Content-Type":"text/css; charset=utf-8","Cache-Control":"public,max-age=3600"}).end(css);return;}
 if(pathname==="/favicon.ico"){res.writeHead(204).end();return;}
 if(pathname==="/robots.txt"){res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8"}).end("User-agent: *\nAllow: /\nSitemap: "+origin+"/sitemap.xml\n");return;}
 if(pathname==="/sitemap.xml"){res.writeHead(200,{"Content-Type":"application/xml; charset=utf-8"}).end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+["/"].concat(articles.map(a=>"/articles/"+a.slug)).map(x=>"<url><loc>"+origin+x+"</loc></url>").join("")+"</urlset>");return;}
 const og=/^\/og\/([a-z0-9-]+)\.png$/.exec(pathname);
 if(og){const a=bySlug.get(og[1]);if(!a){res.writeHead(404).end("Not found");return;}if(!imageCache.has(a.slug))imageCache.set(a.slug,ogImage(a));res.writeHead(200,{"Content-Type":"image/png","Content-Length":imageCache.get(a.slug).length,"Cache-Control":"public,max-age=3600"}).end(imageCache.get(a.slug));return;}
 if(pathname==="/"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}).end(home(origin));return;}
 const m=/^\/articles\/([a-z0-9-]+)\/?$/.exec(pathname);
 if(m&&bySlug.has(m[1])){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}).end(articlePage(bySlug.get(m[1]),origin));return;}
 res.writeHead(404,{"Content-Type":"text/html; charset=utf-8"}).end(shell("<main class='wrap' style='padding:100px 0'><div class='label'>404 / NOT FOUND</div><h1>Страница не найдена.</h1><a class='btn' href='/'>В журнал ↗</a></main>","404 — Leiman Lab","",origin+"/",origin+"/og/warhound.png","website"));
});
server.listen(Number(process.env.PORT)||3000,"0.0.0.0");
