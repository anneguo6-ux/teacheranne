// 從「拼音對照表.html」產生遊戲內建題庫（題目、圖片、機會、命運、拼音），build.js 會嵌進遊戲
const fs = require('fs');
const crypto = require('crypto');

const un = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const plain = s => un(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const fld = s => s.replace(/[|｜\t\r\n]/g, '｜');

function section(html, id) {
  const a = html.indexOf('<h2 id="' + id + '"');
  if (a < 0) return '';
  const t = html.indexOf('<tbody>', a), e = html.indexOf('</tbody>', t);
  return t < 0 ? '' : html.slice(t, e);
}
function rows(tb) {
  const out = [];
  (tb.match(/<tr>[\s\S]*?<\/tr>/g) || []).forEach(tr => {
    out.push((tr.match(/<td[^>]*>[\s\S]*?<\/td>/g) || []));
  });
  return out;
}
const hOf = td => { const m = td && td.match(/<div class="h">([\s\S]*?)<\/div>/); return m ? plain(m[1]) : ''; };
const clsOf = (tds, c) => tds.find(t => t.indexOf('class="' + c + '"') >= 0) || '';

module.exports = function (file, pyt) {
  const html = fs.readFileSync(file, 'utf8');
  const qs = [], imgs = {};
  rows(section(html, 'q')).forEach(tds => {
    const q = hOf(tds[1]), a = hOf(tds[2]);
    if (!q) return;
    let icon = plain(clsOf(tds, 'ic')); if (icon === '❓') icon = '';
    const m = parseInt(plain(clsOf(tds, 'm')), 10);
    const im = clsOf(tds, 'im').match(/<img[^>]*>/);
    let name = '';
    if (im) {
      const src = (im[0].match(/src="([^"]*)"/) || [])[1] || '';
      const nm = (im[0].match(/data-name="([^"]*)"/) || [])[1];
      if (/^data:/.test(src)) { name = un(nm || ('圖片' + (Object.keys(imgs).length + 1) + '.jpg')); imgs[name] = src; }
    }
    qs.push([fld(q), fld(a), icon, isNaN(m) ? '' : m, name].join('|').replace(/\|+$/, ''));
  });
  const ev = id => {
    const out = [];
    rows(section(html, id)).forEach(tds => {
      const text = hOf(tds[1]); if (!text) return;
      const amt = parseInt(plain(clsOf(tds, 'm')), 10);
      out.push([fld(plain(clsOf(tds, 'ic'))), fld(text), isNaN(amt) ? 0 : amt].join('|'));
    });
    return out;
  };
  const head = '# 內建題庫（來自拼音對照表）\n';
  const b = {
    q: head + qs.join('\n'),
    chance: head + ev('c').join('\n'),
    fate: head + ev('f').join('\n'),
    imgs,
    pyt: pyt || {}
  };
  const h = crypto.createHash('md5');
  h.update(b.q + '\n' + b.chance + '\n' + b.fate + '\n' + JSON.stringify(Object.keys(imgs).map(k => k + ':' + imgs[k].length)) + JSON.stringify(b.pyt));
  b.ver = h.digest('hex').slice(0, 8);
  b.counts = { q: qs.length, chance: ev('c').length, fate: ev('f').length, imgs: Object.keys(imgs).length };
  return b;
};
