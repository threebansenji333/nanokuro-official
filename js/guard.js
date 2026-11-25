/*
 * guard.js — 連続アクセス・埋め込み型の自動送信ツール（いわゆる田代砲系）への軽い対策。
 * 静的ホスティングではサーバー側の遮断ができないため、このページ側で届く範囲だけを守る。
 * 通常の閲覧（ページ移動・検索・DL・BGM）には影響しない上限にしてある。
 */
(function () {
  'use strict';

  var HIT_KEY = 'nk-guard-hits';
  var HIT_WINDOW_MS = 10000;
  var HIT_LIMIT = 40;
  var FETCH_WINDOW_MS = 10000;
  var FETCH_LIMIT = 40;

  function haltPage(title, message) {
    try { window.stop(); } catch (e) {}
    try {
      document.documentElement.innerHTML =
        '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>' + title + '</title></head>' +
        '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#05060c;' +
        'color:#b7c3d6;font:16px/1.8 sans-serif;text-align:center;padding:24px">' +
        '<p>' + message + '</p></body>';
    } catch (e) {}
  }

  /* 1. 他サイトの iframe に埋め込まれた場合は表示も読み込みも止める */
  var framed = false;
  try { framed = window.top !== window.self; } catch (e) { framed = true; }
  if (framed) {
    try { document.documentElement.style.display = 'none'; } catch (e) {}
    try { window.top.location.replace(window.self.location.href); } catch (e) {}
    try { window.stop(); } catch (e) {}
    return;
  }

  /* 2. 短時間に読み込みが集中した場合は、そのページ以降の読み込みを止めて待ってもらう */
  try {
    var now = Date.now();
    var hits = [];
    try { hits = JSON.parse(localStorage.getItem(HIT_KEY) || '[]'); } catch (e) { hits = []; }
    if (!Array.isArray(hits)) hits = [];
    hits = hits.filter(function (t) { return typeof t === 'number' && now - t < HIT_WINDOW_MS; });
    if (hits.length >= HIT_LIMIT) {
      localStorage.setItem(HIT_KEY, JSON.stringify(hits));
      haltPage('しばらくお待ちください', 'アクセスが短時間に集中しています。10秒ほど待ってから、もう一度開いてください。');
      return;
    }
    hits.push(now);
    localStorage.setItem(HIT_KEY, JSON.stringify(hits.slice(-HIT_LIMIT)));
  } catch (e) { /* localStorage が使えない環境では何もしない */ }

  /* 3. このページ内の fetch に回数の上限を設ける（暴走や外部スクリプトからの連打を抑える） */
  if (typeof window.fetch === 'function') {
    var origFetch = window.fetch;
    var stamps = [];
    window.fetch = function () {
      var t = Date.now();
      while (stamps.length && t - stamps[0] > FETCH_WINDOW_MS) stamps.shift();
      if (stamps.length >= FETCH_LIMIT) {
        return Promise.reject(new TypeError('Too many requests'));
      }
      stamps.push(t);
      return origFetch.apply(this, arguments);
    };
  }
})();
