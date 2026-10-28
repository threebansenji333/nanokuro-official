(function () {
  'use strict';

  /**
   * 2nd Nanokuro Collections link:
   * - Local: sibling folder
   * - Online: set PRODUCTION_SECOND_URL below when that site is public
   */
  var PRODUCTION_SECOND_URL = '';
  var LOCAL_SECOND_URL = '../2nd Nanokuro Collections/html/map.html';
  var isRemoteHost = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname) === false
    && location.protocol !== 'file:';
  var CONFIG = {
    secondCollectionsUrl: (isRemoteHost && PRODUCTION_SECOND_URL)
      ? PRODUCTION_SECOND_URL
      : (isRemoteHost ? 'https://github.com/threebansenji333/2nd-Nanokuro-Collections' : LOCAL_SECOND_URL),
    secondCollectionsLabel: '2nd Nanokuro Collections',
    youtubeChannelDefault: 'https://www.youtube.com/channel/UCu5CRiALcXxvmwDIqtr_cNw'
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initNav() {
    var header = qs('.site-header');
    var toggle = qs('.nav-toggle');
    if (!header || !toggle) return;
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function markCurrentNav() {
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    qsa('.nav a[data-nav]').forEach(function (a) {
      var target = (a.getAttribute('data-nav') || '').toLowerCase();
      if (target && path === target) a.setAttribute('aria-current', 'page');
    });
  }

  function wireSecondBanners() {
    qsa('[data-second-link]').forEach(function (el) {
      if (el.tagName === 'A') el.href = CONFIG.secondCollectionsUrl;
    });
  }

  function statusBadge(status) {
    if (status === 'open') return '<span class="badge open">OPEN</span>';
    if (status === 'archive') return '<span class="badge archive">ARCHIVE</span>';
    return '<span class="badge soon">COMING SOON</span>';
  }

  function findChartById(data, id) {
    var cats = ['standard', 'collab', 'keymodes'];
    for (var i = 0; i < cats.length; i++) {
      var list = (data && data[cats[i]]) || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].id === id) return { chart: list[j], category: cats[i] };
      }
    }
    return null;
  }

  function renderChartList(container, charts) {
    if (!container) return;
    if (!charts || !charts.length) {
      container.innerHTML = '<div class="empty-state">NO ENTRIES IN THIS CATEGORY YET</div>';
      return;
    }
    var html = '<ul class="chart-list">';
    charts.forEach(function (c) {
      var meta = [c.difficulty || '', c.keymode || 'Phigros', c.composer || '']
        .filter(Boolean)
        .join(' · ');
      var action;
      if (c.id) {
        action = '<a class="btn" href="chart.html?id=' + encodeURIComponent(c.id) + '">詳細 / DL</a>';
      } else if (c.download) {
        action = '<a class="btn" href="' + escapeHtml(c.download) + '" download>DOWNLOAD</a>';
      } else {
        action = '<span class="btn" aria-disabled="true">準備中</span>';
      }
      html +=
        '<li class="chart-item" data-tags="' + (c.tags || []).join(' ') + '">' +
          '<div>' +
            '<h3 class="chart-item__title">' + escapeHtml(c.title) + '</h3>' +
            '<p class="chart-item__meta">' + escapeHtml(meta) + (c.note ? ' · ' + escapeHtml(c.note) : '') + '</p>' +
          '</div>' +
          '<div class="chart-item__actions">' +
            statusBadge(c.status || 'soon') +
            action +
          '</div>' +
        '</li>';
    });
    html += '</ul>';
    container.innerHTML = html;
  }

  function loadVault(category) {
    var mount = qs('#chart-mount');
    if (!mount) return;
    mount.innerHTML = '<div class="empty-state">LOADING...</div>';
    fetch('data/charts.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then(function (data) {
        var list = (data && data[category]) || [];
        renderChartList(mount, list);
        var count = qs('#chart-count');
        if (count) count.textContent = String(list.length);
      })
      .catch(function () {
        mount.innerHTML = '<div class="empty-state">FAILED TO LOAD CHART INDEX</div>';
      });
  }

  function unique(arr) {
    var out = [];
    arr.forEach(function (v) {
      if (out.indexOf(v) === -1) out.push(v);
    });
    return out;
  }

  function formatConstantLabel(diff, constant) {
    if (!diff) return constant || '—';
    if (constant == null || constant === '') return diff;
    return diff + ' Lv.' + constant;
  }

  function initChartCushion() {
    var mount = qs('#cushion-mount');
    if (!mount || document.body.getAttribute('data-page') !== 'chart-cushion') return;

    var params = new URLSearchParams(location.search);
    var id = params.get('id');
    if (!id) {
      mount.innerHTML = '<div class="empty-state">CHART ID MISSING</div>';
      return;
    }

    fetch('data/charts.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then(function (data) {
        var hit = findChartById(data, id);
        if (!hit) {
          mount.innerHTML = '<div class="empty-state">CHART NOT FOUND</div>';
          return;
        }
        renderCushion(hit.chart, hit.category);
      })
      .catch(function () {
        mount.innerHTML = '<div class="empty-state">FAILED TO LOAD CHART</div>';
      });
  }

  function renderCushion(chart, category) {
    var mount = qs('#cushion-mount');
    var titleEl = qs('#chart-title');
    if (titleEl) titleEl.textContent = chart.title || '—';
    document.title = (chart.title || 'Chart') + ' — NANOKURO Vault';

    var variants = chart.variants || [];
    var yt = chart.youtubeChannel || CONFIG.youtubeChannelDefault;
    var backHref = category === 'collab'
      ? 'vault-collab.html'
      : (category === 'keymodes' ? 'vault-keymodes.html' : 'vault-standard.html');

    var difficulties = unique(variants.map(function (v) { return v.difficulty; }).filter(Boolean));
    var state = {
      difficulty: difficulties[0] || null,
      shader: null
    };

    function variantsForDiff() {
      return variants.filter(function (v) {
        return !state.difficulty || v.difficulty === state.difficulty;
      });
    }

    function shaderOptions() {
      var opts = unique(variantsForDiff().map(function (v) {
        return v.shader ? 'on' : 'off';
      }));
      return opts;
    }

    function currentVariant() {
      var list = variantsForDiff().filter(function (v) {
        if (state.shader === 'on') return !!v.shader;
        if (state.shader === 'off') return !v.shader;
        return true;
      });
      return list[0] || null;
    }

    function ensureShaderDefault() {
      var opts = shaderOptions();
      if (!opts.length) {
        state.shader = null;
        return;
      }
      if (opts.indexOf(state.shader) === -1) {
        state.shader = opts.indexOf('on') !== -1 ? 'on' : opts[0];
      }
    }

    function paint() {
      ensureShaderDefault();
      var v = currentVariant();
      var shaderOpts = shaderOptions();
      var constLabel = v
        ? formatConstantLabel(v.difficulty, v.constant)
        : (chart.difficulty || '—');

      var diffBtns = difficulties.map(function (d) {
        return '<button type="button" data-diff="' + escapeHtml(d) + '" aria-pressed="' +
          (state.difficulty === d ? 'true' : 'false') + '"' +
          (difficulties.length ? '' : ' disabled') + '>' + escapeHtml(d) + '</button>';
      }).join('');

      var shaderBtns = shaderOpts.map(function (s) {
        var label = s === 'on' ? 'Shader あり' : 'Shader なし';
        return '<button type="button" data-shader="' + s + '" aria-pressed="' +
          (state.shader === s ? 'true' : 'false') + '">' + label + '</button>';
      }).join('');

      var dlDisabled = !(v && v.file);
      var dlHref = v && v.file ? v.file : '#';
      var dlName = v && v.downloadName ? v.downloadName : (chart.title || 'chart') + '.zip';

      mount.innerHTML =
        '<section class="cushion-meta" aria-label="譜面情報">' +
          '<dl>' +
            '<dt>曲名</dt><dd>' + escapeHtml(chart.title || '—') + '</dd>' +
            '<dt>コンポーザー</dt><dd>' + escapeHtml(chart.composer || '—') + '</dd>' +
            '<dt>譜面制作者</dt><dd>' + escapeHtml(chart.charter || 'Nanokuro') + '</dd>' +
            '<dt>難易度</dt><dd id="meta-diff">' + escapeHtml(constLabel) + '</dd>' +
            '<dt>キーモード</dt><dd>' + escapeHtml(chart.keymode || 'Phigros') + '</dd>' +
            '<dt>シェーダー</dt><dd id="meta-shader">' +
              escapeHtml(v ? (v.shader ? 'あり' : 'なし') : '—') +
            '</dd>' +
          '</dl>' +
          '<p class="cushion-hint">' +
            escapeHtml(chart.detailHint || '定数や譜面制作者などの詳細は YouTube 概要欄を参照してください。') +
            ' <a href="' + escapeHtml(yt) + '" target="_blank" rel="noopener noreferrer">YouTube チャンネルを開く</a>' +
          '</p>' +
        '</section>' +
        '<section class="cushion-pick" aria-label="差分選択">' +
          '<h2>DIFF / SHADER</h2>' +
          (difficulties.length
            ? '<div class="cushion-row"><div class="cushion-row__label">難易度差分</div><div class="cushion-options" id="diff-options">' + diffBtns + '</div></div>'
            : '<p class="cushion-hint">難易度差分はまだ登録されていません。</p>') +
          (shaderOpts.length > 1
            ? '<div class="cushion-row"><div class="cushion-row__label">シェーダー</div><div class="cushion-options" id="shader-options">' + shaderBtns + '</div></div>'
            : (shaderOpts.length === 1
              ? '<div class="cushion-row"><div class="cushion-row__label">シェーダー</div><div class="cushion-options">' + shaderBtns + '</div></div>'
              : '')) +
          '<p class="cushion-summary" id="cushion-summary">' +
            '選択中: ' + escapeHtml(v ? (v.label || constLabel) : 'なし') +
          '</p>' +
          '<div class="cushion-actions">' +
            (dlDisabled
              ? '<span class="btn btn-primary" aria-disabled="true">DOWNLOAD 準備中</span>'
              : '<a class="btn btn-primary" id="dl-btn" href="' + escapeHtml(dlHref) + '" download="' + escapeHtml(dlName) + '">DOWNLOAD</a>') +
            '<a class="btn" href="' + backHref + '">一覧に戻る</a>' +
            '<a class="btn" href="notice.html">注意事項</a>' +
          '</div>' +
        '</section>';

      qsa('#diff-options button', mount).forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.difficulty = btn.getAttribute('data-diff');
          paint();
        });
      });
      qsa('#shader-options button', mount).forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.shader = btn.getAttribute('data-shader');
          paint();
        });
      });
    }

    if (!variants.length) {
      mount.innerHTML =
        '<section class="cushion-meta">' +
          '<dl>' +
            '<dt>曲名</dt><dd>' + escapeHtml(chart.title || '—') + '</dd>' +
            '<dt>コンポーザー</dt><dd>' + escapeHtml(chart.composer || '—') + '</dd>' +
            '<dt>譜面制作者</dt><dd>' + escapeHtml(chart.charter || 'Nanokuro') + '</dd>' +
            '<dt>難易度</dt><dd>' + escapeHtml(chart.difficulty || '—') + '</dd>' +
          '</dl>' +
          '<p class="cushion-hint">' +
            escapeHtml(chart.detailHint || '詳細は YouTube 概要欄を参照してください。') +
            ' <a href="' + escapeHtml(yt) + '" target="_blank" rel="noopener noreferrer">YouTube チャンネルを開く</a>' +
          '</p>' +
        '</section>' +
        '<section class="cushion-pick">' +
          '<p class="cushion-summary">この譜面のダウンロードファイルはまだ接続されていません。</p>' +
          '<div class="cushion-actions">' +
            '<span class="btn btn-primary" aria-disabled="true">DOWNLOAD 準備中</span>' +
            '<a class="btn" href="' + backHref + '">一覧に戻る</a>' +
          '</div>' +
        '</section>';
      return;
    }

    paint();
  }

  function boot() {
    initNav();
    markCurrentNav();
    wireSecondBanners();
    var cat = document.body.getAttribute('data-vault');
    if (cat) loadVault(cat);
    initChartCushion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.NanokuroSite = {
    config: CONFIG,
    loadVault: loadVault
  };
})();
