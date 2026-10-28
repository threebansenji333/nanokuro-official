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

  var vaultCache = null;
  var vaultCategory = null;
  var vaultSourceList = [];
  var vaultViewState = {
    sort: 'title-asc',
    status: 'all',
    download: 'all',
    category: 'all',
    query: ''
  };
  var lastFocusEl = null;

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
    return '<span class="badge soon">準備中</span>';
  }

  /** Extract max numeric constant from strings like "AT Lv.18.5" / "IN Lv.16 / AT Lv.16". */
  function maxConstant(diffText) {
    var text = String(diffText || '');
    var re = /Lv\.?\s*(\d+(?:\.\d+)?)/gi;
    var max = null;
    var m;
    while ((m = re.exec(text))) {
      var n = parseFloat(m[1]);
      if (!Number.isNaN(n) && (max == null || n > max)) max = n;
    }
    return max;
  }

  function difficultyBadge(diffText) {
    var label = String(diffText || '').trim();
    if (!label || label === '—') return '';
    var n = maxConstant(label);
    var glow = '';
    if (n != null) {
      if (n >= 18) glow = ' diff-glow-red';
      else if (n >= 17) glow = ' diff-glow-purple';
    }
    return '<span class="badge diff-badge' + glow + '">' + escapeHtml(label) + '</span>';
  }

  /** True when at least one variant offers a real file download (not denied / watch-only). */
  function hasFileDownload(chart) {
    if (!chart || chart.accessDenied) return false;
    var vs = chart.variants || [];
    for (var i = 0; i < vs.length; i++) {
      if (vs[i].accessDenied) continue;
      if (vs[i].file) return true;
    }
    return false;
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

  function ensureCushionHost() {
    var host = qs('#cushion-host');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'cushion-host';
    host.className = 'cushion-host';
    host.hidden = true;
    host.innerHTML =
      '<div class="cushion-backdrop" data-cushion-close="1"></div>' +
      '<div class="cushion-panel" role="dialog" aria-modal="true" aria-labelledby="cushion-title">' +
        '<div class="cushion-panel__head">' +
          '<div>' +
            '<p class="cushion-panel__eyebrow">DOWNLOAD CUSHION</p>' +
            '<h2 id="cushion-title">—</h2>' +
          '</div>' +
          '<button type="button" class="cushion-close" data-cushion-close="1" aria-label="閉じる">×</button>' +
        '</div>' +
        '<div id="cushion-mount" class="cushion"></div>' +
      '</div>';
    document.body.appendChild(host);

    host.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-cushion-close') === '1') {
        closeCushion();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !host.hidden) closeCushion();
    });
    return host;
  }

  function openCushion(chart) {
    var host = ensureCushionHost();
    lastFocusEl = document.activeElement;
    qs('#cushion-title', host).textContent = chart.title || '—';
    renderCushionBody(chart, qs('#cushion-mount', host));
    host.hidden = false;
    document.body.classList.add('cushion-open');
    var closeBtn = qs('.cushion-close', host);
    if (closeBtn) closeBtn.focus();
  }

  function closeCushion() {
    var host = qs('#cushion-host');
    if (!host) return;
    host.hidden = true;
    document.body.classList.remove('cushion-open');
    if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
      try { lastFocusEl.focus(); } catch (e) {}
    }
  }

  function renderCushionBody(chart, mount) {
    if (!mount) return;
    var variants = chart.variants || [];
    var yt = chart.youtubeChannel || CONFIG.youtubeChannelDefault;

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
            '<button type="button" class="btn" data-cushion-close="1">閉じる</button>' +
            '<a class="btn" href="notice.html">注意事項</a>' +
          '</div>' +
        '</section>';
      return;
    }

    var difficulties = unique(variants.map(function (v) { return v.difficulty; }).filter(Boolean));
    var state = {
      difficulty: difficulties[0] || null,
      shader: null,
      edition: null
    };

    function variantsForDiff() {
      return variants.filter(function (v) {
        return !state.difficulty || v.difficulty === state.difficulty;
      });
    }

    function filteredByShader(list) {
      return list.filter(function (v) {
        if (state.shader === 'on') return !!v.shader;
        if (state.shader === 'off') return !v.shader;
        return true;
      });
    }

    function shaderOptions() {
      return unique(variantsForDiff().map(function (v) {
        return v.shader ? 'on' : 'off';
      }));
    }

    function editionOptions() {
      return unique(
        filteredByShader(variantsForDiff())
          .map(function (v) { return v.edition; })
          .filter(Boolean)
      );
    }

    function currentVariant() {
      return filteredByShader(variantsForDiff()).filter(function (v) {
        if (state.edition && v.edition) return v.edition === state.edition;
        if (state.edition && !v.edition) return false;
        return true;
      })[0] || null;
    }

    function ensureDefaults() {
      var sOpts = shaderOptions();
      if (!sOpts.length) state.shader = null;
      else if (sOpts.indexOf(state.shader) === -1) {
        state.shader = sOpts.indexOf('on') !== -1 ? 'on' : sOpts[0];
      }

      var eOpts = editionOptions();
      if (!eOpts.length) state.edition = null;
      else if (eOpts.indexOf(state.edition) === -1) {
        state.edition = eOpts[0];
      }
    }

    function paint() {
      ensureDefaults();
      var v = currentVariant();
      var shaderOpts = shaderOptions();
      var editionOpts = editionOptions();
      var constLabel = v
        ? formatConstantLabel(v.difficulty, v.constant)
        : (chart.difficulty || '—');

      var diffBtns = difficulties.map(function (d) {
        return '<button type="button" data-diff="' + escapeHtml(d) + '" aria-pressed="' +
          (state.difficulty === d ? 'true' : 'false') + '">' + escapeHtml(d) + '</button>';
      }).join('');

      var shaderBtns = shaderOpts.map(function (s) {
        var label = s === 'on' ? 'Shader あり' : 'Shader なし';
        return '<button type="button" data-shader="' + s + '" aria-pressed="' +
          (state.shader === s ? 'true' : 'false') + '">' + label + '</button>';
      }).join('');

      var editionBtns = editionOpts.map(function (e) {
        return '<button type="button" data-edition="' + escapeHtml(e) + '" aria-pressed="' +
          (state.edition === e ? 'true' : 'false') + '">' + escapeHtml(e) + '</button>';
      }).join('');

      var denied = !!(chart.accessDenied || (v && v.accessDenied));
      var watchUrl = (v && v.watchUrl) || chart.watchUrl || '';
      var primaryAction;
      if (denied) {
        primaryAction = '<span class="btn btn-denied" aria-disabled="true">Access Denied</span>';
      } else if (watchUrl) {
        primaryAction = '<a class="btn btn-primary" href="' + escapeHtml(watchUrl) +
          '" target="_blank" rel="noopener noreferrer">WATCH ON YOUTUBE</a>';
      } else if (v && v.file) {
        var dlName = v.downloadName || ((chart.title || 'chart') + '.zip');
        primaryAction = '<a class="btn btn-primary" href="' + escapeHtml(v.file) +
          '" download="' + escapeHtml(dlName) + '">DOWNLOAD</a>';
      } else {
        primaryAction = '<span class="btn btn-primary" aria-disabled="true">DOWNLOAD 準備中</span>';
      }

      var showDiff = difficulties.length > 1 || (difficulties[0] && difficulties[0] !== '—');
      var pickTitle = denied ? 'ACCESS' : (watchUrl ? 'WATCH' : 'DIFF / SHADER / EDITION');

      mount.innerHTML =
        '<section class="cushion-meta" aria-label="譜面情報">' +
          '<dl>' +
            '<dt>曲名</dt><dd>' + escapeHtml(chart.title || '—') + '</dd>' +
            '<dt>コンポーザー</dt><dd>' + escapeHtml(chart.composer || '—') + '</dd>' +
            '<dt>譜面制作者</dt><dd>' + escapeHtml((v && v.charter) || chart.charter || 'Nanokuro') + '</dd>' +
            '<dt>難易度</dt><dd>' + escapeHtml(constLabel) + '</dd>' +
            '<dt>キーモード</dt><dd>' + escapeHtml(chart.keymode || 'Phigros') + '</dd>' +
            '<dt>シェーダー</dt><dd>' + escapeHtml(v && typeof v.shader === 'boolean' ? (v.shader ? 'あり' : 'なし') : '—') + '</dd>' +
            (v && v.edition ? ('<dt>版</dt><dd>' + escapeHtml(v.edition) + '</dd>') : '') +
          '</dl>' +
          '<p class="cushion-hint">' +
            escapeHtml(chart.detailHint || '定数や譜面制作者などの詳細は YouTube 概要欄を参照してください。') +
            ' <a href="' + escapeHtml(yt) + '" target="_blank" rel="noopener noreferrer">YouTube チャンネルを開く</a>' +
          '</p>' +
        '</section>' +
        '<section class="cushion-pick" aria-label="差分選択">' +
          '<h2>' + pickTitle + '</h2>' +
          (showDiff
            ? '<div class="cushion-row"><div class="cushion-row__label">難易度差分</div><div class="cushion-options" id="diff-options">' + diffBtns + '</div></div>'
            : '') +
          (shaderOpts.length > 1
            ? '<div class="cushion-row"><div class="cushion-row__label">シェーダー</div><div class="cushion-options" id="shader-options">' + shaderBtns + '</div></div>'
            : '') +
          (editionOpts.length
            ? '<div class="cushion-row"><div class="cushion-row__label">版</div><div class="cushion-options" id="edition-options">' + editionBtns + '</div></div>'
            : '') +
          '<p class="cushion-summary">選択中: ' + escapeHtml(v ? (v.label || constLabel) : 'なし') + '</p>' +
          '<div class="cushion-actions">' +
            primaryAction +
            '<button type="button" class="btn" data-cushion-close="1">閉じる</button>' +
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
      qsa('#edition-options button', mount).forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.edition = btn.getAttribute('data-edition');
          paint();
        });
      });
    }

    paint();
  }

  function bindChartListActions(container, charts) {
    qsa('[data-open-cushion]', container).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-open-cushion');
        var chart = null;
        for (var i = 0; i < charts.length; i++) {
          if (charts[i].id === id) {
            chart = charts[i];
            break;
          }
        }
        if (!chart && vaultCache) {
          var hit = findChartById(vaultCache, id);
          chart = hit && hit.chart;
        }
        if (chart) openCushion(chart);
      });
    });
  }

  function ensureVaultControls(showCategory) {
    var mount = qs('#chart-mount');
    if (!mount) return null;
    var box = qs('#vault-controls');
    if (!box) {
      box = document.createElement('div');
      box.id = 'vault-controls';
      box.className = 'vault-controls';
      mount.parentNode.insertBefore(box, mount);
    }

    box.innerHTML =
      '<div class="vault-controls__row">' +
        '<label class="vault-field">' +
          '<span>検索</span>' +
          '<input type="search" id="vault-query" placeholder="曲名 / 制作者 / タグ" value="' +
            escapeHtml(vaultViewState.query) + '">' +
        '</label>' +
        '<label class="vault-field">' +
          '<span>ソート</span>' +
          '<select id="vault-sort">' +
            '<option value="title-asc">曲名 昇順</option>' +
            '<option value="title-desc">曲名 降順</option>' +
            '<option value="const-desc">定数 高い順</option>' +
            '<option value="const-asc">定数 低い順</option>' +
            '<option value="status">状態</option>' +
          '</select>' +
        '</label>' +
        '<label class="vault-field">' +
          '<span>状態</span>' +
          '<select id="vault-status">' +
            '<option value="all">すべて</option>' +
            '<option value="open">OPEN</option>' +
            '<option value="archive">ARCHIVE</option>' +
            '<option value="soon">準備中</option>' +
          '</select>' +
        '</label>' +
        '<label class="vault-field">' +
          '<span>配布</span>' +
          '<select id="vault-download">' +
            '<option value="all">すべて</option>' +
            '<option value="file">ファイルDLあり</option>' +
            '<option value="nofile">ファイルDLなし</option>' +
            '<option value="youtube">YouTube誘導</option>' +
            '<option value="denied">Access Denied</option>' +
          '</select>' +
        '</label>' +
        (showCategory
          ? '<label class="vault-field">' +
              '<span>区分</span>' +
              '<select id="vault-category">' +
                '<option value="all">すべて</option>' +
                '<option value="個人">個人</option>' +
                '<option value="合作">合作</option>' +
                '<option value="その他">その他</option>' +
              '</select>' +
            '</label>'
          : '') +
      '</div>' +
      '<p class="vault-controls__hint" id="vault-result-hint"></p>';

    qs('#vault-sort', box).value = vaultViewState.sort;
    qs('#vault-status', box).value = vaultViewState.status;
    qs('#vault-download', box).value = vaultViewState.download;
    if (showCategory) qs('#vault-category', box).value = vaultViewState.category;

    function syncFromUI() {
      vaultViewState.sort = qs('#vault-sort', box).value;
      vaultViewState.status = qs('#vault-status', box).value;
      vaultViewState.download = qs('#vault-download', box).value;
      vaultViewState.query = qs('#vault-query', box).value || '';
      if (showCategory) {
        var catSel = qs('#vault-category', box);
        vaultViewState.category = catSel ? catSel.value : 'all';
      }
      applyVaultView();
    }

    ['change', 'input'].forEach(function (ev) {
      box.addEventListener(ev, function (e) {
        var t = e.target;
        if (!t || !t.id) return;
        if (
          t.id === 'vault-sort' ||
          t.id === 'vault-status' ||
          t.id === 'vault-download' ||
          t.id === 'vault-category' ||
          t.id === 'vault-query'
        ) {
          syncFromUI();
        }
      });
    });

    return box;
  }

  function matchesDownloadFilter(chart, mode) {
    if (mode === 'all') return true;
    if (mode === 'file') return hasFileDownload(chart);
    if (mode === 'nofile') return !hasFileDownload(chart);
    if (mode === 'youtube') {
      return !!(chart.distribution === 'youtube' || chart.watchUrl ||
        ((chart.variants || []).some(function (v) { return !!v.watchUrl; })));
    }
    if (mode === 'denied') {
      return !!(chart.accessDenied ||
        ((chart.variants || []).some(function (v) { return !!v.accessDenied; })));
    }
    return true;
  }

  function sortCharts(list, mode) {
    var arr = list.slice();
    var statusRank = { open: 0, archive: 1, soon: 2 };
    arr.sort(function (a, b) {
      if (mode === 'title-asc' || mode === 'title-desc') {
        var cmp = String(a.title || '').localeCompare(String(b.title || ''), 'ja');
        return mode === 'title-desc' ? -cmp : cmp;
      }
      if (mode === 'const-asc' || mode === 'const-desc') {
        var ca = maxConstant(a.difficulty);
        var cb = maxConstant(b.difficulty);
        if (ca == null && cb == null) return String(a.title || '').localeCompare(String(b.title || ''), 'ja');
        if (ca == null) return 1;
        if (cb == null) return -1;
        return mode === 'const-desc' ? (cb - ca) : (ca - cb);
      }
      if (mode === 'status') {
        var ra = statusRank[a.status || 'soon'];
        var rb = statusRank[b.status || 'soon'];
        if (ra !== rb) return ra - rb;
        return String(a.title || '').localeCompare(String(b.title || ''), 'ja');
      }
      return 0;
    });
    return arr;
  }

  function applyVaultView() {
    var mount = qs('#chart-mount');
    if (!mount) return;
    var q = String(vaultViewState.query || '').trim().toLowerCase();
    var filtered = vaultSourceList.filter(function (c) {
      if (vaultViewState.status !== 'all' && (c.status || 'soon') !== vaultViewState.status) return false;
      if (!matchesDownloadFilter(c, vaultViewState.download)) return false;
      if (
        vaultCategory === 'all' &&
        vaultViewState.category !== 'all' &&
        c.listCategory !== vaultViewState.category
      ) return false;
      if (q) {
        var hay = [
          c.title, c.composer, c.charter, c.note, c.difficulty, c.keymode,
          (c.tags || []).join(' '), c.listCategory
        ].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var sorted = sortCharts(filtered, vaultViewState.sort);
    renderChartList(mount, sorted);

    var count = qs('#chart-count');
    if (count) count.textContent = String(sorted.length);
    var hint = qs('#vault-result-hint');
    if (hint) {
      hint.textContent = sorted.length + ' / ' + vaultSourceList.length + ' 件を表示';
    }
  }

  function renderChartList(container, charts) {
    if (!container) return;
    if (!charts || !charts.length) {
      container.innerHTML = '<div class="empty-state">条件に一致する譜面がありません</div>';
      return;
    }
    var html = '<ul class="chart-list">';
    charts.forEach(function (c) {
      var meta = [c.keymode || 'Phigros', c.composer || '', c.charter ? ('Chart: ' + c.charter) : '']
        .filter(Boolean)
        .join(' · ');
      var action;
      if (c.id) {
        var btnLabel = hasFileDownload(c) ? '詳細 / DL' : '詳細';
        action = '<button type="button" class="btn" data-open-cushion="' + escapeHtml(c.id) + '">' + btnLabel + '</button>';
      } else if (c.download) {
        action = '<a class="btn" href="' + escapeHtml(c.download) + '" download>DOWNLOAD</a>';
      } else if ((c.status || 'soon') === 'soon') {
        action = '';
      } else {
        action = '<span class="btn" aria-disabled="true">準備中</span>';
      }
      html +=
        '<li class="chart-item" data-tags="' + (c.tags || []).join(' ') + '">' +
          '<div>' +
            '<h3 class="chart-item__title">' + escapeHtml(c.title) + '</h3>' +
            '<p class="chart-item__meta">' +
              (c.listCategory
                ? '<span class="badge cat-badge">' + escapeHtml(c.listCategory) + '</span> '
                : '') +
              escapeHtml(meta) + (c.note ? ' · ' + escapeHtml(c.note) : '') +
            '</p>' +
          '</div>' +
          '<div class="chart-item__actions">' +
            '<div class="chart-item__marks">' +
              statusBadge(c.status || 'soon') +
              difficultyBadge(c.difficulty) +
            '</div>' +
            action +
          '</div>' +
        '</li>';
    });
    html += '</ul>';
    container.innerHTML = html;
    bindChartListActions(container, charts);
  }

  function loadVault(category) {
    var mount = qs('#chart-mount');
    if (!mount) return;
    vaultCategory = category;
    mount.innerHTML = '<div class="empty-state">LOADING...</div>';
    fetch('data/charts.json?v=20261029i', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then(function (data) {
        vaultCache = data;
        var list;
        if (category === 'all') {
          list = []
            .concat(((data && data.standard) || []).map(function (c) {
              return Object.assign({}, c, { listCategory: '個人' });
            }))
            .concat(((data && data.collab) || []).map(function (c) {
              return Object.assign({}, c, { listCategory: '合作' });
            }))
            .concat(((data && data.keymodes) || []).map(function (c) {
              return Object.assign({}, c, { listCategory: 'その他' });
            }));
        } else {
          list = (data && data[category]) || [];
        }
        vaultSourceList = list.slice();
        vaultViewState = {
          sort: 'title-asc',
          status: 'all',
          download: 'all',
          category: 'all',
          query: ''
        };
        ensureVaultControls(category === 'all');
        applyVaultView();
      })
      .catch(function () {
        mount.innerHTML = '<div class="empty-state">FAILED TO LOAD CHART INDEX</div>';
      });
  }

  function boot() {
    initNav();
    markCurrentNav();
    wireSecondBanners();
    var cat = document.body.getAttribute('data-vault');
    if (cat) loadVault(cat);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.NanokuroSite = {
    config: CONFIG,
    loadVault: loadVault,
    openCushion: openCushion,
    closeCushion: closeCushion
  };
})();
