const fs=require('fs');
const crypto=require('crypto');
let h=fs.readFileSync('src/game.src.html','utf8');
const lib=fs.readFileSync('pinyin-pro.min.js','utf8');
if(/<\/script/i.test(lib))throw new Error('lib has </script');
h=h.replace('/*PINYIN_LIB*/',()=>lib);
h=h.replace('/*MOE_DATA*/',()=>fs.readFileSync('src/moe.json','utf8'));

// 資料夾裡每一份「…題庫.html」就是一個內建題庫（最近修改的排最前面）
const files=fs.readdirSync('.').filter(f=>/題庫\.html$/.test(f)).map(f=>({f,t:fs.statSync(f).mtimeMs})).sort((a,b)=>b.t-a.t).map(x=>x.f);
if(!files.length)throw new Error('找不到「…題庫.html」');
const banks=[],mergedPyt={};
for(const f of files){
  const pt=require('./src/pytable.js')(f);
  const bd=require('./src/bundle.js')(f,pt.table);
  bd.id=f.replace(/\.html$/,'');
  bd.name=f.replace(/\.html$/,'');
  banks.push(bd);
  for(const k of Object.keys(pt.table))if(!(k in mergedPyt))mergedPyt[k]=pt.table[k];
  console.log('題庫「'+bd.name+'」',f,'：題目',bd.counts.q,'、圖片',bd.counts.imgs,'、機會',bd.counts.chance,'、命運',bd.counts.fate,'、拼音',Object.keys(pt.table).length,'句（對不上',pt.bad.length,'）版本',bd.ver);
}
h=h.replace('/*PYT_DATA*/',()=>JSON.stringify(mergedPyt));
const bj=JSON.stringify({banks});
if(/<\/script/i.test(bj))throw new Error('bundle has </script');
h=h.replace('/*BUNDLE_DATA*/',()=>bj);
fs.writeFileSync('monoply.html',h);
// syntax check main script
const m=h.match(/<script>\s*'use strict'([\s\S]*?)<\/script>/);
fs.writeFileSync(process.env.TEMP+'/chk.js',"'use strict'"+m[1]);
