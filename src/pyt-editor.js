/* 拼音對照表 編輯器：改拼音、增刪題目（含圖片）、自動產生拼音、下載修改後的檔案 */
(function () {
  'use strict';
  var KEY = 'pyt_state_v2';
  var SECS = ['q', 'c', 'f'];
  var CJK_G = /[㐀-鿿豈-﫿]/g;
  var LAT = /[A-Za-zÀ-ɏẠ-ỹ]+(?:[ ][A-Za-zÀ-ɏẠ-ỹ]+)*/g;
  var SYL = /[A-Za-züÜêÊāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]+/g;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function tbody(id) {
    var h = document.getElementById(id), t = h && h.nextElementSibling;
    while (t && t.tagName !== 'TABLE') t = t.nextElementSibling;
    return t && t.tBodies[0];
  }
  function secOf(tr) { return tr.parentNode === tbody('q') ? 'q' : tr.parentNode === tbody('c') ? 'c' : 'f'; }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function hz(p) { return txt(p.previousElementSibling); }

  /* ---------- 自動拼音（與遊戲使用同一套引擎：簡編本＋指定讀法＋變調） ---------- */
  function autoPy(h) {
    if (!h || typeof window.pyArr !== 'function') return '';
    var arr = window.pyArr(h), tok = [], buf = '';
    for (var i = 0; i < h.length; i++) {
      if (/[㐀-鿿豈-﫿]/.test(h[i])) {
        if (buf.trim()) { tok.push(buf.trim()); buf = ''; }
        tok.push(arr[i] || '');
      } else buf += h[i];
    }
    if (buf.trim()) tok.push(buf.trim());
    return tok.join(' ');
  }

  /* ---------- 檢查：漢字數 = 拼音音節數 ---------- */
  function counts(p) {
    var h = hz(p), s = txt(p), nc = (h.match(CJK_G) || []).length;
    (h.match(LAT) || []).forEach(function (l) { var k = s.indexOf(l); if (k >= 0) s = s.slice(0, k) + ' ' + s.slice(k + l.length); });
    return [nc, (s.match(SYL) || []).length];
  }

  /* ---------- 初始狀態 ---------- */
  var base = {};      // 檔案載入時：漢字句 -> 拼音
  var orig = {};      // 檔案載入時：各表格的 tbody HTML
  SECS.forEach(function (id) {
    var tb = tbody(id); if (!tb) return;
    orig[id] = tb.innerHTML;
    $$('div.p', tb).forEach(function (p) { base[hz(p)] = txt(p); });
  });

  /* ---------- 準備列（可編輯屬性、按鈕） ---------- */
  function prep(root) {
    $$('div.h, div.p, td.ic, td.m', root).forEach(function (c) {
      c.setAttribute('contenteditable', 'true'); c.setAttribute('spellcheck', 'false');
    });
    (root.tagName === 'TR' ? [root] : $$('tr', root)).forEach(function (tr) {
      var im = $('td.im', tr), op = $('td.op', tr);
      if (im) {
        $$('button', im).forEach(function (b) { b.remove(); });
        var has = $('img', im);
        var b = document.createElement('button'); b.type = 'button';
        b.className = has ? 'imx' : 'imp'; b.textContent = has ? '✖ 移除' : '🖼️ 選圖片'; im.appendChild(b);
      }
      if (op && !$('button', op)) {
        var d = document.createElement('button'); d.type = 'button'; d.className = 'del'; d.title = '刪除這一列'; d.textContent = '🗑';
        op.appendChild(d);
      }
    });
  }
  function renumber() {
    SECS.forEach(function (id) {
      var tb = tbody(id); if (!tb) return;
      $$('tr', tb).forEach(function (tr, i) { var n = $('td.no', tr); if (n) n.textContent = String(i + 1); });
      var h2 = document.getElementById(id), n = tb.rows.length;
      if (h2) h2.textContent = h2.textContent.replace(/共 \d+ 筆/, '共 ' + n + ' 筆');
      var a = $('nav a[href="#' + id + '"]');
      if (a) a.textContent = a.textContent.replace(/（\d+）/, '（' + n + '）');
    });
  }

  /* ---------- 標記與狀態列 ---------- */
  var bar, st, search, mode;
  function mark(p) {
    var s = txt(p), c = counts(p), b = base[hz(p)];
    p.classList.toggle('empty', !s);
    p.classList.toggle('bad', !!s && c[0] !== c[1]);
    p.classList.toggle('mod', !!s && s !== b);
    p.title = (s && c[0] !== c[1]) ? ('漢字 ' + c[0] + ' 個，拼音音節 ' + c[1] + ' 個，數量不一致（遊戲會略過這一句）') : (!s ? '空白：遊戲會自動產生拼音' : '');
  }
  function status() {
    var ps = $$('div.p', document);
    ps.forEach(mark);
    var n = SECS.map(function (id) { var tb = tbody(id); return tb ? tb.rows.length : 0; });
    var mod = ps.filter(function (p) { return p.classList.contains('mod'); }).length;
    var bad = ps.filter(function (p) { return p.classList.contains('bad'); }).length;
    var emp = ps.filter(function (p) { return p.classList.contains('empty') && /[㐀-鿿]/.test(hz(p)); }).length;
    st.innerHTML = '題庫 ' + n[0] + '　機會 ' + n[1] + '　命運 ' + n[2] + '　已修改 <b class="o">' + mod + '</b>　音節數對不上 <b>' + bad + '</b>　空白拼音 ' + emp;
    filter();
  }
  function filter() {
    var q = search.value.trim().toLowerCase(), m = mode.value;
    $$('tbody tr').forEach(function (tr) {
      var ok = true;
      if (q) ok = tr.textContent.toLowerCase().indexOf(q) >= 0;
      if (ok && m === 'mod') ok = !!$('div.p.mod', tr) || tr.classList.contains('new');
      if (ok && m === 'bad') ok = !!$('div.p.bad', tr);
      if (ok && m === 'empty') ok = !!$('div.p.empty', tr);
      tr.style.display = ok ? '' : 'none';
    });
  }

  /* ---------- 暫存 ---------- */
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        var o = { t: Date.now() };
        SECS.forEach(function (id) { o[id] = tbody(id).innerHTML; });
        localStorage.setItem(KEY, JSON.stringify(o));
        warn.textContent = '';
      } catch (e) { warn.textContent = '⚠️ 瀏覽器暫存空間不足（圖片太多），請記得按「下載修改後的檔案」。'; }
    }, 400);
  }
  function changed() { renumber(); status(); save(); }

  /* ---------- 圖片 ---------- */
  function toData(file, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var src = fr.result;
      if (/svg|gif/.test(file.type)) { cb(src); return; }
      var im = new Image();
      im.onload = function () {
        var sc = Math.min(1, 700 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
        var x = c.getContext('2d'), png = file.type === 'image/png';
        if (!png) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(im, 0, 0, c.width, c.height);
        cb(c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.82));
      };
      im.onerror = function () { alert('這個檔案無法當成圖片讀取。'); };
      im.src = src;
    };
    fr.readAsDataURL(file);
  }
  function uniqName(name, td) {
    var used = $$('td.im img').filter(function (i) { return i.parentNode !== td; }).map(function (i) { return i.getAttribute('data-name'); });
    var n = name, k = 2, m = name.match(/^(.*?)(\.[^.]+)?$/);
    while (used.indexOf(n) >= 0) { n = m[1] + '-' + k + (m[2] || ''); k++; }
    return n;
  }
  function setImg(td, data, name) {
    var old = $('img', td); if (old) old.remove();
    var img = document.createElement('img'); img.className = 'thumb'; img.alt = '';
    img.src = data; img.setAttribute('data-name', uniqName(name || '圖片.jpg', td)); img.title = img.getAttribute('data-name');
    td.insertBefore(img, td.firstChild);
    prep(td.parentNode); changed();
  }
  function pickImage(td) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () { var f = inp.files[0]; if (f) toData(f, function (d) { setImg(td, d, f.name); }); };
    inp.click();
  }

  /* ---------- 新增 / 刪除列 ---------- */
  function addRow(id) {
    var tb = tbody(id), tr = document.createElement('tr');
    var two = '<td><div class="h"></div><div class="p"></div></td>';
    tr.innerHTML = '<td class="no"></td>' + two + (id === 'q' ? two : '') +
      '<td class="ic"></td><td class="m">100</td>' +
      (id === 'q' ? '<td class="im"></td>' : '') + '<td class="op"></td>';
    tr.className = 'new';
    tb.appendChild(tr); prep(tr); changed();
    $('div.h', tr).focus();
    tr.scrollIntoView({ block: 'center' });
  }

  /* ---------- 匯出（乾淨的 HTML，遊戲與 build.js 都讀得懂） ---------- */
  function exportHtml() {
    var clone = document.documentElement.cloneNode(true);
    var b = $('#bar', clone); if (b) b.remove();
    $$('[contenteditable]', clone).forEach(function (e) { e.removeAttribute('contenteditable'); });
    $$('[spellcheck]', clone).forEach(function (e) { e.removeAttribute('spellcheck'); });
    $$('tbody button', clone).forEach(function (e) { e.remove(); });
    $$('tbody tr', clone).forEach(function (tr) { tr.removeAttribute('style'); tr.removeAttribute('class'); });
    $$('div.h', clone).forEach(function (d) { var t = txt(d); d.setAttribute('class', 'h'); d.removeAttribute('title'); d.textContent = t; });
    $$('div.p', clone).forEach(function (d) { var t = txt(d); d.setAttribute('class', 'p'); d.removeAttribute('title'); d.removeAttribute('data-auto'); d.textContent = t; });
    $$('td.ic', clone).forEach(function (d) { d.textContent = txt(d); });
    $$('td.m', clone).forEach(function (d) { var n = parseInt(txt(d), 10); d.textContent = isNaN(n) ? '0' : String(n); });
    $$('img.thumb', clone).forEach(function (i) { i.removeAttribute('title'); });
    return '<!doctype html>' + clone.outerHTML;
  }
  window.__pytExport = exportHtml;

  /* ---------- 介面 ---------- */
  var warn;
  bar = document.createElement('div'); bar.id = 'bar';
  bar.innerHTML =
    '<button class="add" data-sec="q" type="button">＋ 新增題目</button>' +
    '<button class="add" data-sec="c" type="button">＋ 新增機會事件</button>' +
    '<button class="add" data-sec="f" type="button">＋ 新增命運事件</button>' +
    '<button class="go" id="b-dl">💾 下載修改後的檔案</button>' +
    '<button class="ai" id="b-ai">✨ 補齊空白拼音</button>' +
    '<button class="rs" id="b-rs">↩ 全部還原</button>' +
    '<input id="b-q" type="search" placeholder="搜尋漢字或拼音…">' +
    '<select id="b-m"><option value="all">全部</option><option value="mod">只看已修改／新增</option><option value="bad">只看對不上</option><option value="empty">只看空白拼音</option></select>' +
    '<span class="st" id="b-st"></span><span class="warn" id="b-warn"></span>' +
    '<div class="tip"><b>編輯：</b>直接點文字就能改（漢字、藍字拼音、圖示、金額都可以）。拼音的音節用空白隔開。<b>圖示：</b>留空時，匯入遊戲後由系統依題目內容自動配圖示（有圖片的題目會用 🖼️）。<b>新增題目：</b>按上方的「＋ 新增…」（每個表格下方也有），輸入漢字後，拼音會自動補上，之後仍可修改；題庫的圖片欄可選圖片（也可拖曳圖片進去）。<b>套用到遊戲：</b>改完按「💾 下載」，到遊戲「設定」或「遊戲設定」按「匯入題庫檔」，選這個下載的檔案，題目、圖片、機會、命運和拼音都會一起匯入。</div>';
  document.body.insertBefore(bar, document.body.firstChild);
  st = $('#b-st'); search = $('#b-q'); mode = $('#b-m'); warn = $('#b-warn');

  prep(document);
  renumber();

  // 還原上次沒下載的修改
  try {
    var sv = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (sv && SECS.some(function (id) { return sv[id] !== orig[id]; })) {
      if (confirm('找到上次還沒下載的修改（' + new Date(sv.t).toLocaleString('zh-TW') + '），要還原嗎？\n按「取消」會捨棄那些修改。')) {
        SECS.forEach(function (id) { if (sv[id] != null) tbody(id).innerHTML = sv[id]; });
        prep(document); renumber();
      } else { localStorage.removeItem(KEY); }
    }
  } catch (e) {}
  status();

  /* ---------- 事件（用事件委派，新增的列也有效） ---------- */
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t.closest) return;
    var p = t.closest('div.p');
    if (p) {
      if (!p.textContent.trim()) p.innerHTML = '';
      var h = hz(p), v = p.textContent;
      $$('div.p').forEach(function (o) { if (o !== p && hz(o) === h && h && o.textContent !== v) o.textContent = v; });
    }
    var ic = t.closest('td.ic');
    if (ic && !ic.textContent.trim()) ic.innerHTML = '';
    if (t.closest('div.h,div.p,td.ic,td.m')) { status(); save(); }
  });
  document.addEventListener('focusout', function (e) {
    var t = e.target; if (!t.closest) return;
    var h = t.closest('div.h');
    if (h) {
      var p = h.nextElementSibling, ph = txt(h), cur = txt(p);
      if (ph && (!cur || p.getAttribute('data-auto') === cur)) {
        var a = autoPy(ph); p.textContent = a; p.setAttribute('data-auto', a);
      }
      renumber(); status(); save();
    }
    var m = t.closest('td.m');
    if (m) {
      var n = parseInt(txt(m).replace(/[^\d-]/g, ''), 10);
      var isQ = secOf(m.parentNode) === 'q';
      if (isNaN(n)) n = isQ ? 100 : 0;
      if (isQ) n = Math.min(1000, Math.max(100, Math.round(n / 100) * 100));
      m.textContent = String(n); status(); save();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.closest && e.target.closest('div.h,div.p,td.ic,td.m')) { e.preventDefault(); e.target.blur(); }
  });
  document.addEventListener('paste', function (e) {
    if (e.target.closest && e.target.closest('[contenteditable]')) {
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\s+/g, ' ');
      document.execCommand('insertText', false, t);
    }
  });
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var add = t.closest('button.add'); if (add) { addRow(add.getAttribute('data-sec')); return; }
    var del = t.closest('button.del');
    if (del) {
      var tr = del.closest('tr');
      if (!txt(tr).replace(/[\d❓🍀🔮🖼️]/g, '').trim() || confirm('要刪除這一列嗎？\n' + txt($('div.h', tr)))) { tr.remove(); changed(); }
      return;
    }
    var imp = t.closest('button.imp'), thumb = t.closest('img.thumb');
    if (imp || thumb) { pickImage(t.closest('td.im')); return; }
    var imx = t.closest('button.imx');
    if (imx) { var td = imx.closest('td'); $('img', td).remove(); prep(td.parentNode); changed(); }
  });
  document.addEventListener('dragover', function (e) { if (e.target.closest && e.target.closest('td.im')) e.preventDefault(); });
  document.addEventListener('drop', function (e) {
    var td = e.target.closest && e.target.closest('td.im');
    if (!td) return;
    e.preventDefault();
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /^image\//.test(f.type)) toData(f, function (d) { setImg(td, d, f.name); });
  });
  $('#b-dl').onclick = function () {
    var blob = new Blob([exportHtml()], { type: 'text/html;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = '拼音對照表.html'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  $('#b-ai').onclick = function () {
    var n = 0;
    $$('div.p').forEach(function (p) {
      if (!txt(p) && hz(p) && /[㐀-鿿]/.test(hz(p))) { var a = autoPy(hz(p)); p.textContent = a; p.setAttribute('data-auto', a); n++; }
    });
    status(); save(); alert('已補上 ' + n + ' 句拼音。');
  };
  $('#b-rs').onclick = function () {
    if (!confirm('要把這一頁的所有修改（包括新增、刪除的題目）都還原成開啟時的樣子嗎？')) return;
    SECS.forEach(function (id) { tbody(id).innerHTML = orig[id]; });
    prep(document); renumber();
    try { localStorage.removeItem(KEY); } catch (e) {}
    status();
  };
  search.addEventListener('input', filter);
  mode.addEventListener('change', filter);
})();
