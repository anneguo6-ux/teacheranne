// 把「拼音對照表.html」升級成可編輯、可新增題目的版本（可重複執行：每次都會換成最新的編輯器與拼音引擎）
// 用法：node src/pyt-inject.js
const fs = require('fs');
const FILE = '拼音對照表.html';
let h = fs.readFileSync(FILE, 'utf8');

// 1. 移除舊的注入內容
h = h.replace(/<style id="pyt-editor-css">[\s\S]*?<\/style>/g, '');
h = h.replace(/<style id="pyt-css2">[\s\S]*?<\/style>/g, '');
h = h.replace(/<script id="pyt-[a-z0-9-]+">[\s\S]*?<\/script>/g, '');
h = h.replace(/<p class="addp">[\s\S]*?<\/p>/g, '');

// 2. 補欄位（圖片、操作）與「新增」按鈕
let ti = 0;
const NAMES = ['題目', '機會', '命運'];
const ADD = ['＋ 新增題目', '＋ 新增機會事件', '＋ 新增命運事件'];
const SEC = ['q', 'c', 'f'];
h = h.replace(/<table>([\s\S]*?)<\/table>/g, (m, inner) => {
  const i = ti++;
  if (i > 2) return m;
  if (!/class="op"/.test(inner)) {
    const isQ = i === 0;
    inner = inner.replace('</tr></thead>', (isQ ? '<th>圖片</th>' : '') + '<th></th></tr></thead>');
    inner = inner.replace(/<\/td><\/tr>/g, '</td>' + (isQ ? '<td class="im"></td>' : '') + '<td class="op"></td></tr>');
  }
  return '<table>' + inner + '</table><p class="addp"><button class="add" data-sec="' + SEC[i] + '" type="button">' + ADD[i] + '</button></p>';
});

// 3. 拼音引擎（取自遊戲，確保兩邊結果一致）
const game = fs.readFileSync('src/game.src.html', 'utf8');
const a = game.indexOf('/*PYENGINE_START*/'), b = game.indexOf('/*PYENGINE_END*/');
if (a < 0 || b < 0) throw new Error('找不到 PYENGINE 標記');
const engine = game.slice(a, b);
const lib = fs.readFileSync('pinyin-pro.min.js', 'utf8');
const moe = fs.readFileSync('src/moe.json', 'utf8');
const css = fs.readFileSync('src/pyt-editor.css', 'utf8');
const js = fs.readFileSync('src/pyt-editor.js', 'utf8');
for (const s of [lib, moe, engine, js]) if (/<\/script/i.test(s)) throw new Error('內容含有 </script');

const head = '<style id="pyt-css2">\n' + css + '</style>';
const tail =
  '<script id="pyt-lib">' + lib + '</script>' +
  '<script id="pyt-moe">window.MOE=' + moe + ';</script>' +
  '<script id="pyt-engine">var CJK_TEST=/[㐀-鿿豈-﫿]/;\n' + engine + '\nwindow.pyArr=pyArr;</script>' +
  '<script id="pyt-editor">' + js + '</script>';
h = h.replace('</head>', () => head + '</head>').replace('</body>', () => tail + '</body>');
fs.writeFileSync(FILE, h);
console.log('完成：', FILE, (h.length / 1024).toFixed(0) + ' KB');
