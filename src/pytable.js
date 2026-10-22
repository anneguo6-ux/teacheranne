// 從「拼音對照表.html」取出 {漢字句: "拼音 拼音 …"}，供遊戲逐句套用
const fs=require('fs');
const un=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
const CJK=/[\u3400-\u9fff\uf900-\ufaff]/g;
const LAT=/[A-Za-z\u00C0-\u024F\u1EA0-\u1EF9]+(?:[ ][A-Za-z\u00C0-\u024F\u1EA0-\u1EF9]+)*/g;
const SYL=/[A-Za-züÜêÊ\u0101\u00E1\u01CE\u00E0\u0113\u00E9\u011B\u00E8\u012B\u00ED\u01D0\u00EC\u014D\u00F3\u01D2\u00F2\u016B\u00FA\u01D4\u00F9\u01D6\u01D8\u01DA\u01DC\u0144\u0148\u01F9\u1E3F]+/g;
module.exports=function(file){
  const html=fs.readFileSync(file,'utf8'),out={},bad=[];
  const re=/<div class="h">(.*?)<\/div><div class="p">(.*?)<\/div>/g;let m;
  while((m=re.exec(html))){
    const h=un(m[1]),p0=un(m[2]);let p=p0;
    const nc=(h.match(CJK)||[]).length;if(!nc||!p0.trim())continue;
    (h.match(LAT)||[]).forEach(l=>{const k=p.indexOf(l);if(k>=0)p=p.slice(0,k)+' '+p.slice(k+l.length)});
    const syl=p.match(SYL)||[];
    if(syl.length!==nc){bad.push([h,p0,nc,syl.length]);continue}
    out[h]=syl.join(' ');
  }
  return {table:out,bad};
};
