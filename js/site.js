(function () {
  'use strict';

  /**
   * 2nd Nanokuro Collections link:
   * - Local: sibling folder index (portal)
   * - Online: Vercel production
   */
  var PRODUCTION_SECOND_URL = 'https://2nd-nanokuro-collections-qc5qz23dp-threebansenji333s-projects.vercel.app/';
  var LOCAL_SECOND_URL = '../2nd Nanokuro Collections/html/index.html';
  /* Captured at load: soft-nav swaps <body>, which removes this <script> tag. */
  var SITE_SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  var isRemoteHost = /^(localhost|127\.0\.0\.1)$/i.test(location.hostname) === false
    && location.protocol !== 'file:';
  var CONFIG = {
    secondCollectionsUrl: isRemoteHost ? PRODUCTION_SECOND_URL : LOCAL_SECOND_URL,
    secondCollectionsLabel: '2nd Nanokuro Collections',
    youtubeChannelDefault: 'https://www.youtube.com/channel/UCu5CRiALcXxvmwDIqtr_cNw'
  };

  var vaultCache = null;
  var VAULT_QUERY_MAX = 64;
  var vaultCategory = null;
  var vaultSourceList = [];
  var vaultShownCharts = [];
  var vaultViewState = {
    sort: 'title-asc',
    status: 'all',
    download: 'all',
    category: 'all',
    query: ''
  };
  var lastFocusEl = null;
  var cushionEscBound = false;
  var cushionAnimId = 0;
  var cushionClosing = false;
  var CUSHION_ANIM_MS = 320;
  var cushionSlides = [];
  var cushionCharts = [];
  var cushionIndex = 0;
  var cushionHoldTimer = 0;
  var cushionHoldDelay = 0;
  var cushionHoldDir = 0;
  var cushionSwitchBound = false;
  /* 複数選択: picks[chartId] = { chart, variant, done } / order = 選択順 */
  var multiSelect = {
    active: false,
    picks: Object.create(null),
    order: []
  };
  /* 注意事項左下ショートカット: DL/一括DL から飛んだときの戻り先 */
  var NOTICE_RETURN_KEY = 'nk-notice-return';
  var PENDING_RESTORE_KEY = 'nk-pending-restore';
  var noticeReturn = null;
  var pendingRestore = null;

  function easeOutSine(t) {
    return Math.sin((t * Math.PI) / 2);
  }

  function easeInSine(t) {
    return 1 - Math.cos((t * Math.PI) / 2);
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function setCushionVisual(host, opacity) {
    var backdrop = qs('.cushion-backdrop', host);
    var panel = qs('.cushion-panel', host);
    host.style.setProperty('--cushion-opacity', String(opacity));
    if (backdrop) backdrop.style.opacity = String(opacity);
    if (panel) panel.style.opacity = String(opacity);
  }

  function runCushionMotion(host, mode, onDone) {
    if (cushionAnimId) {
      cancelAnimationFrame(cushionAnimId);
      cushionAnimId = 0;
    }
    if (prefersReducedMotion()) {
      setCushionVisual(host, mode === 'in' ? 1 : 0);
      if (onDone) onDone();
      return;
    }
    var start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / CUSHION_ANIM_MS);
      var opacity = mode === 'in' ? easeOutSine(t) : 1 - easeInSine(t);
      setCushionVisual(host, opacity);
      if (t < 1) {
        cushionAnimId = requestAnimationFrame(frame);
      } else {
        cushionAnimId = 0;
        setCushionVisual(host, mode === 'in' ? 1 : 0);
        if (onDone) onDone();
      }
    }
    cushionAnimId = requestAnimationFrame(frame);
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function siteBaseHref() {
    var src = SITE_SCRIPT_SRC;
    if (!src) {
      var el = document.querySelector('script[src*="site.js"]');
      src = el && el.src ? el.src : '';
    }
    if (src) return src.replace(/js\/site\.js[^/]*$/, '');
    try {
      return new URL('.', location.href).href;
    } catch (e) {
      return '';
    }
  }

  /** Resolve site-root-relative paths (charts/, notice.html, data/) from any page depth. */
  function siteAssetUrl(path) {
    if (!path) return path;
    if (/^(https?:|data:|blob:|#|mailto:)/i.test(path)) return path;
    if (path.charAt(0) === '/') return path;
    try {
      return new URL(path.replace(/^\.\//, ''), siteBaseHref()).href;
    } catch (e) {
      return siteBaseHref() + path.replace(/^\.\//, '');
    }
  }

  function chartsDataUrl() {
    return siteAssetUrl('data/charts.json?v=20261117c');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setNavOpen(header, toggle, open) {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function initNav() {
    var header = qs('.site-header');
    var toggle = qs('.nav-toggle');
    var nav = qs('.nav', header);
    if (!header || !toggle) return;

    if (nav && !nav.id) nav.id = 'site-nav';
    toggle.setAttribute('aria-controls', nav ? nav.id : 'site-nav');

    toggle.addEventListener('click', function () {
      setNavOpen(header, toggle, !header.classList.contains('is-open'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('is-open')) {
        setNavOpen(header, toggle, false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!header.classList.contains('is-open')) return;
      if (header.contains(e.target)) return;
      setNavOpen(header, toggle, false);
    });

    qsa('.nav a', header).forEach(function (a) {
      a.addEventListener('click', function () {
        setNavOpen(header, toggle, false);
      });
    });

    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function markCurrentNav() {
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (path.indexOf('vault') === 0) path = 'vault.html';
    qsa('.nav a[data-nav]').forEach(function (a) {
      var target = (a.getAttribute('data-nav') || '').toLowerCase();
      if (target && path === target) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function focusMainLandmark() {
    var main = qs('#main') || qs('#door-panel') || qs('main');
    if (!main) return;
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    try { main.focus({ preventScroll: true }); } catch (e) { main.focus(); }
  }

  function preferReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function secondTransitUrl(base) {
    try {
      var url = new URL(base, location.href);
      url.searchParams.set('from', 'nanokuro-official');
      return url.href;
    } catch (e) {
      var join = String(base).indexOf('?') >= 0 ? '&' : '?';
      return base + join + 'from=nanokuro-official';
    }
  }

  function ensureTransitOverlay() {
    var el = qs('#site-transit');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'site-transit';
    el.className = 'site-transit';
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="site-transit__veil"></div>' +
      '<div class="site-transit__core" aria-hidden="true">' +
        '<span class="site-transit__shard s1"></span>' +
        '<span class="site-transit__shard s2"></span>' +
        '<span class="site-transit__shard s3"></span>' +
        '<p class="site-transit__label">OPENING 2ND NANOKURO COLLECTIONS</p>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  function runSecondTransit(href) {
    var target = secondTransitUrl(href);
    if (preferReducedMotion()) {
      location.href = target;
      return;
    }
    var overlay = ensureTransitOverlay();
    overlay.hidden = false;
    requestAnimationFrame(function () {
      overlay.classList.add('is-active');
    });
    window.setTimeout(function () {
      location.href = target;
    }, 920);
  }

  function wireSecondBanners() {
    qsa('[data-second-link]').forEach(function (el) {
      if (el.tagName !== 'A') return;
      el.href = CONFIG.secondCollectionsUrl;
      if (el.dataset.transitBound === '1') return;
      el.dataset.transitBound = '1';
      el.addEventListener('click', function (e) {
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        runSecondTransit(el.href);
      });
    });
  }

  /* ホームの 2nd バナーは遷移演出を呼ばない。コードは残し、クリックは Access Denied のみ。 */
  var accessDeniedDocBound = false;

  function hideAccessDenied() {
    var pop = qs('#access-denied-pop');
    if (pop) pop.hidden = true;
  }

  function showAccessDenied() {
    var pop = qs('#access-denied-pop');
    if (!pop) {
      pop = document.createElement('p');
      pop.id = 'access-denied-pop';
      pop.className = 'access-denied-pop';
      pop.setAttribute('role', 'status');
      pop.setAttribute('aria-live', 'assertive');
      pop.textContent = 'Access Denied';
      document.body.appendChild(pop);
    }
    pop.hidden = false;
  }

  function bindAccessDeniedDocument() {
    if (accessDeniedDocBound) return;
    accessDeniedDocBound = true;
    document.addEventListener('click', function (e) {
      var pop = qs('#access-denied-pop');
      if (!pop || pop.hidden) return;
      if (e.target && e.target.closest && e.target.closest('[data-access-denied]')) return;
      hideAccessDenied();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var host = qs('#cushion-host');
      if (host && !host.hidden) return;
      hideAccessDenied();
    });
  }

  function wireAccessDenied() {
    bindAccessDeniedDocument();
    qsa('[data-access-denied]').forEach(function (el) {
      if (el.dataset.deniedBound === '1') return;
      el.dataset.deniedBound = '1';
      el.addEventListener('click', function (e) {
        e.preventDefault();
        showAccessDenied();
      });
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

  /** Variants that offer a real file download (not denied / watch-only). */
  function downloadableVariants(chart) {
    if (!chart || chart.accessDenied) return [];
    return (chart.variants || []).filter(function (v) {
      return !v.accessDenied && !!v.file;
    });
  }

  /** True when at least one variant offers a real file download (not denied / watch-only). */
  function hasFileDownload(chart) {
    return downloadableVariants(chart).length > 0;
  }

  function variantLabel(v) {
    if (!v) return '—';
    return v.label || formatConstantLabel(v.difficulty, v.constant);
  }

  function downloadNameFor(chart, v) {
    return v.downloadName || ((chart.title || 'chart') + '.zip');
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

  function cushionHintHtml(chart, fallback, yt) {
    if (chart && chart.detailHint === false) return '';
    return '<p class="cushion-hint">' +
      escapeHtml((chart && chart.detailHint) || fallback) +
      ' <a href="' + escapeHtml(yt) + '" target="_blank" rel="noopener noreferrer">YouTube チャンネルを開く</a>' +
    '</p>';
  }

  function shaderDisplay(v) {
    if (!v || v.shader == null || v.shader === '') return '—';
    if (v.shader === true) return 'あり';
    if (v.shader === false) return 'なし';
    return String(v.shader);
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
          '<div class="cushion-panel__heading">' +
            '<button type="button" class="cushion-switch" data-cushion-step="-1" hidden aria-label="前の譜面">‹</button>' +
            '<div class="cushion-panel__titles">' +
              '<p class="cushion-panel__eyebrow" id="cushion-eyebrow">DOWNLOAD CUSHION</p>' +
              '<h2 id="cushion-title">—</h2>' +
              '<p class="cushion-panel__composer" id="cushion-composer" hidden>' +
                '<span id="cushion-composer-name"></span>' +
              '</p>' +
            '</div>' +
            '<button type="button" class="cushion-switch" data-cushion-step="1" hidden aria-label="次の譜面">›</button>' +
          '</div>' +
          '<button type="button" class="cushion-close" data-cushion-close="1" aria-label="閉じる">×</button>' +
        '</div>' +
        '<div id="cushion-mount" class="cushion"></div>' +
      '</div>';
    document.body.appendChild(host);
    bindCushionSwitch(host);

    host.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-cushion-close') === '1') {
        closeCushion();
      }
    });
    if (!cushionEscBound) {
      cushionEscBound = true;
      document.addEventListener('keydown', function (e) {
        var h = qs('#cushion-host');
        if (e.key === 'Escape' && h && !h.hidden) closeCushion();
      });
    }
    return host;
  }

  /** mode: chart | pick | batch — shares host, fade motion, Esc and focus return. */
  function presentCushion(mode, eyebrow, title, render, composer) {
    var host = ensureCushionHost();
    var wasShown = !host.hidden;
    if (cushionClosing) {
      cushionClosing = false;
      if (cushionAnimId) {
        cancelAnimationFrame(cushionAnimId);
        cushionAnimId = 0;
      }
    }
    if (!wasShown) lastFocusEl = document.activeElement;
    host.setAttribute('data-cushion-mode', mode);
    stopCushionHold();
    if (mode !== 'chart') hideCushionSwitch();
    var eyebrowEl = qs('#cushion-eyebrow', host);
    if (eyebrowEl) eyebrowEl.textContent = eyebrow;
    qs('#cushion-title', host).textContent = title || '—';
    setCushionComposer(host, composer);
    render(qs('#cushion-mount', host));
    host.hidden = false;
    document.body.classList.add('cushion-open');
    setCushionVisual(host, 0);
    runCushionMotion(host, 'in', function () {
      var closeBtn = qs('.cushion-close', host);
      if (closeBtn) closeBtn.focus();
    });
  }

  function setCushionComposer(host, composer) {
    var composerLine = qs('#cushion-composer', host);
    var composerName = qs('#cushion-composer-name', host);
    var composerLabel = qs('.cushion-panel__composer-k', host);
    if (composerLabel && composerLabel.parentNode) composerLabel.parentNode.removeChild(composerLabel);
    if (!composerLine || !composerName) return;
    if (composer) {
      composerName.textContent = composer;
      composerLine.hidden = false;
    } else {
      composerName.textContent = '';
      composerLine.hidden = true;
    }
  }

  function cushionLineup(chart, opts) {
    var rows = [];
    if (document.body.classList.contains('page-1st') && vaultCache) {
      qsa('.cup-plate[data-open-chart]').forEach(function (plate) {
        var hit = findChartById(vaultCache, plate.getAttribute('data-open-chart'));
        if (!hit || !hit.chart) return;
        rows.push({
          chart: hit.chart,
          preferredDifficulty: plate.getAttribute('data-pref-diff') || null,
          preferredEdition: plate.getAttribute('data-pref-edition') || null
        });
      });
    } else if (vaultShownCharts && vaultShownCharts.length) {
      vaultShownCharts.forEach(function (item) {
        rows.push({ chart: item, preferredDifficulty: null });
      });
    }
    if (!rows.length && chart) {
      rows.push({ chart: chart, preferredDifficulty: (opts && opts.preferredDifficulty) || null });
    }
    var seen = Object.create(null);
    return rows.filter(function (row) {
      var id = row.chart && row.chart.id;
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function showCushionChart(chart) {
    var titleEl = qs('#cushion-title');
    if (titleEl) titleEl.textContent = (chart && chart.title) || '—';
    setCushionComposer(qs('#cushion-host'), chart && chart.composer);
    if (chart && chart.id) writeChartNoticeReturn(chart.id);
  }

  function hideCushionSwitch() {
    qsa('[data-cushion-step]').forEach(function (btn) {
      btn.hidden = true;
      btn.disabled = true;
    });
  }

  function syncCushionSwitch() {
    var multi = cushionSlides.length > 1;
    qsa('[data-cushion-step]').forEach(function (btn) {
      var dir = Number(btn.getAttribute('data-cushion-step'));
      btn.hidden = !multi;
      btn.disabled = !multi || (dir < 0 ? cushionIndex <= 0 : cushionIndex >= cushionSlides.length - 1);
    });
  }

  function stopCushionHold() {
    if (cushionHoldTimer) {
      window.clearTimeout(cushionHoldTimer);
      cushionHoldTimer = 0;
    }
    cushionHoldDir = 0;
    cushionHoldDelay = 0;
  }

  function stepCushion(dir) {
    var next = cushionIndex + dir;
    if (next < 0 || next >= cushionSlides.length) return false;
    cushionIndex = next;
    cushionSlides.forEach(function (slide, i) {
      slide.hidden = i !== cushionIndex;
    });
    showCushionChart(cushionCharts[cushionIndex]);
    syncCushionSwitch();
    return true;
  }

  function beginCushionHold(dir) {
    stopCushionHold();
    if (!stepCushion(dir)) return;
    cushionHoldDir = dir;
    cushionHoldDelay = 380;
    function tick() {
      if (!cushionHoldDir) return;
      cushionHoldDelay = Math.max(72, Math.round(cushionHoldDelay * 0.84));
      if (!stepCushion(cushionHoldDir)) {
        stopCushionHold();
        return;
      }
      cushionHoldTimer = window.setTimeout(tick, cushionHoldDelay);
    }
    cushionHoldTimer = window.setTimeout(tick, cushionHoldDelay);
  }

  function bindCushionSwitch(host) {
    if (cushionSwitchBound) return;
    cushionSwitchBound = true;
    qsa('[data-cushion-step]', host).forEach(function (btn) {
      btn.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || btn.disabled) return;
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        beginCushionHold(Number(btn.getAttribute('data-cushion-step')));
      });
      btn.addEventListener('pointerup', stopCushionHold);
      btn.addEventListener('pointercancel', stopCushionHold);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      btn.addEventListener('click', function (e) { e.preventDefault(); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var panel = qs('#cushion-host');
      if (!panel || panel.hidden || panel.getAttribute('data-cushion-mode') !== 'chart') return;
      var target = e.target;
      if (target && target.closest && target.closest('input, textarea, select')) return;
      e.preventDefault();
      beginCushionHold(e.key === 'ArrowRight' ? 1 : -1);
    });
    document.addEventListener('keyup', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') stopCushionHold();
    });
  }

  function renderCushionRail(mount, chart, opts) {
    stopCushionHold();
    var lineup = cushionLineup(chart, opts);
    mount.innerHTML = '';
    cushionSlides = [];
    cushionCharts = [];
    var focus = 0;
    lineup.forEach(function (row, i) {
      var slide = document.createElement('div');
      slide.className = 'cushion-slide';
      slide.hidden = true;
      mount.appendChild(slide);
      var slideOpts = {
        preferredDifficulty: row.chart.id === chart.id
          ? ((opts && opts.preferredDifficulty) || row.preferredDifficulty)
          : row.preferredDifficulty,
        preferredEdition: row.chart.id === chart.id
          ? ((opts && opts.preferredEdition) || row.preferredEdition)
          : row.preferredEdition
      };
      renderCushionBody(row.chart, slide, slideOpts);
      cushionSlides.push(slide);
      cushionCharts.push(row.chart);
      if (row.chart.id === chart.id) focus = i;
    });
    cushionIndex = focus;
    cushionSlides.forEach(function (slide, i) {
      slide.hidden = i !== cushionIndex;
    });
    syncCushionSwitch();
    if (cushionCharts[cushionIndex]) showCushionChart(cushionCharts[cushionIndex]);
  }

  function openCushion(chart, opts) {
    opts = opts || {};
    presentCushion('chart', 'DOWNLOAD CUSHION', chart.title, function (mount) {
      renderCushionRail(mount, chart, opts);
    }, chart.composer || '—');
    if (chart && chart.id) writeChartNoticeReturn(chart.id);
  }

  function closeCushion() {
    var host = qs('#cushion-host');
    if (!host || host.hidden || cushionClosing) return;
    cushionClosing = true;
    stopCushionHold();
    /* 通常クローズ時は注意事項からの戻り先を破棄（notice への soft-nav では呼ばれない） */
    clearNoticeReturn();
    runCushionMotion(host, 'out', function () {
      host.hidden = true;
      document.body.classList.remove('cushion-open');
      cushionClosing = false;
      setCushionVisual(host, 1);
      if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
        try { lastFocusEl.focus(); } catch (e) {}
      }
    });
  }

  /* 譜面データの取得は共有する。同時の重複取得を防ぎ、直後の再取得は手元の控えを使う（連打対策） */
  var chartsInflight = null;
  var vaultCacheAt = 0;
  var CHARTS_FRESH_MS = 30000;

  function fetchChartsData() {
    if (vaultCache && Date.now() - vaultCacheAt < CHARTS_FRESH_MS) {
      return Promise.resolve(vaultCache);
    }
    if (chartsInflight) return chartsInflight;
    chartsInflight = fetch(chartsDataUrl(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('failed');
        return r.json();
      })
      .then(function (data) {
        vaultCache = data;
        vaultCacheAt = Date.now();
        chartsInflight = null;
        return data;
      }, function (err) {
        chartsInflight = null;
        throw err;
      });
    return chartsInflight;
  }

  function ensureCharts(done) {
    if (vaultCache) {
      done(vaultCache);
      return;
    }
    fetchChartsData().then(function (data) {
      done(data);
    }, function () {
      done(null);
    });
  }

  function openFromCupHub(chartId, chamberId, opts) {
    opts = opts || {};
    if (!chartId) return;
    ensureCharts(function (data) {
      if (!data) return;
      var hit = findChartById(data, chartId);
      if (!hit || !hit.chart) return;
      openCushion(hit.chart, {
        preferredDifficulty: opts.preferredDifficulty || null,
        preferredEdition: opts.preferredEdition || null
      });
    });
  }

  function currentVaultPage() {
    var file = (location.pathname.split('/').pop() || '');
    if (/^vault-(all|standard|collab|keymodes)\.html$/i.test(file)) return file;
    return 'vault-all.html';
  }

  function isNoticePage() {
    return document.body.classList.contains('page-notice') ||
      /notice\.html$/i.test(location.pathname);
  }

  function writeNoticeReturn(payload) {
    noticeReturn = payload || null;
    try {
      if (payload) sessionStorage.setItem(NOTICE_RETURN_KEY, JSON.stringify(payload));
      else sessionStorage.removeItem(NOTICE_RETURN_KEY);
    } catch (e) { /* ignore */ }
  }

  function clearNoticeReturn() {
    writeNoticeReturn(null);
  }

  function readNoticeReturn() {
    if (noticeReturn) return noticeReturn;
    try {
      var raw = sessionStorage.getItem(NOTICE_RETURN_KEY);
      if (!raw) return null;
      noticeReturn = JSON.parse(raw);
      return noticeReturn;
    } catch (e) {
      return null;
    }
  }

  function writeChartNoticeReturn(chartId) {
    if (!chartId) return;
    writeNoticeReturn({
      v: 1,
      mode: 'chart',
      vault: currentVaultPage(),
      chartId: chartId
    });
  }

  function writeBatchNoticeReturn() {
    var picks = multiSelect.order.map(function (id) {
      var entry = multiSelect.picks[id];
      if (!entry || !entry.variant || !entry.variant.id) return null;
      return { chartId: id, variantId: entry.variant.id };
    }).filter(Boolean);
    if (!picks.length) {
      clearNoticeReturn();
      return;
    }
    writeNoticeReturn({
      v: 1,
      mode: 'batch',
      vault: currentVaultPage(),
      picks: picks
    });
  }

  function armPendingRestore(payload) {
    pendingRestore = payload || null;
    try {
      if (payload) sessionStorage.setItem(PENDING_RESTORE_KEY, '1');
      else sessionStorage.removeItem(PENDING_RESTORE_KEY);
    } catch (e) { /* ignore */ }
  }

  function consumePendingRestore() {
    var armed = false;
    try {
      armed = sessionStorage.getItem(PENDING_RESTORE_KEY) === '1';
      sessionStorage.removeItem(PENDING_RESTORE_KEY);
    } catch (e) { /* ignore */ }
    var payload = pendingRestore || (armed ? readNoticeReturn() : null);
    pendingRestore = null;
    return payload;
  }

  function resolveChart(chartId) {
    if (!chartId) return null;
    var listed = findListedChart(vaultSourceList, chartId);
    if (listed) return listed;
    if (vaultCache) {
      var hit = findChartById(vaultCache, chartId);
      return hit && hit.chart;
    }
    return null;
  }

  function resolveVariant(chart, variantId) {
    if (!chart || !variantId) return null;
    var vs = chart.variants || [];
    for (var i = 0; i < vs.length; i++) {
      if (vs[i].id === variantId) return vs[i];
    }
    return null;
  }

  function tryPendingRestore() {
    var payload = consumePendingRestore();
    if (!payload || !document.body.getAttribute('data-vault')) return;
    clearNoticeReturn();

    if (payload.mode === 'chart' && payload.chartId) {
      var chart = resolveChart(payload.chartId);
      if (chart) openCushion(chart);
      return;
    }

    if (payload.mode === 'batch' && payload.picks && payload.picks.length) {
      clearMultiPicks();
      multiSelect.active = true;
      document.body.classList.add('multi-select-on');
      payload.picks.forEach(function (item) {
        var c = resolveChart(item.chartId);
        var v = resolveVariant(c, item.variantId);
        if (c && v && v.file && !c.accessDenied && !v.accessDenied) {
          addMultiPick(c, v);
        }
      });
      syncMultiSelectUi();
      if (multiSelect.order.length) openBatchCushion();
      else setMultiSelect(false);
    }
  }

  function syncNoticeDock() {
    var dock = qs('#notice-dock');
    if (!dock) return;
    var link = qs('[data-notice-go]', dock);
    if (!link) return;
    var ret = readNoticeReturn();
    var canReturn = !!(ret && (ret.mode === 'chart' || (ret.mode === 'batch' && ret.picks && ret.picks.length)));
    if (canReturn) {
      link.textContent = 'DLへ戻る';
      link.setAttribute('data-notice-go', 'dl');
      link.setAttribute('href', ret.vault || 'vault-all.html');
      link.setAttribute('aria-label', ret.mode === 'batch'
        ? '一括ダウンロード画面へ戻る（' + ret.picks.length + '件）'
        : '譜面のダウンロード画面へ戻る');
    } else {
      link.textContent = '譜面一覧';
      link.setAttribute('data-notice-go', 'vault');
      link.setAttribute('href', 'vault-all.html');
      link.setAttribute('aria-label', '譜面一覧へ');
    }
  }

  function ensureNoticeDock() {
    var dock = qs('#notice-dock');
    if (dock) return dock;
    dock = document.createElement('div');
    dock.id = 'notice-dock';
    dock.className = 'multi-dock notice-dock';
    dock.setAttribute('role', 'navigation');
    dock.setAttribute('aria-label', '注意事項ショートカット');
    dock.innerHTML =
      '<a class="multi-dock__btn" data-notice-go="vault" href="vault-all.html">譜面一覧</a>';

    /* soft-nav の click より先に戻り先を武装／解除する */
    dock.addEventListener('pointerdown', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[data-notice-go]') : null;
      if (!a) return;
      var go = a.getAttribute('data-notice-go');
      if (go === 'dl') {
        var ret = readNoticeReturn();
        if (ret) armPendingRestore(ret);
      } else {
        armPendingRestore(null);
        clearNoticeReturn();
      }
    }, true);

    var bgm = qs('.bgm-toggle');
    if (bgm && bgm.parentNode === document.body) document.body.insertBefore(dock, bgm);
    else document.body.appendChild(dock);
    return dock;
  }

  function mountNoticeDock() {
    var dock = qs('#notice-dock');
    if (!isNoticePage()) {
      if (dock && dock.parentNode) dock.parentNode.removeChild(dock);
      return;
    }
    ensureNoticeDock();
    syncNoticeDock();
  }

  /** difficulty → shader → edition state shared by the chart cushion and the batch picker. */
  function createVariantPicker(variants) {
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

    return {
      difficulties: difficulties,
      state: state,
      shaderOptions: shaderOptions,
      editionOptions: editionOptions,
      currentVariant: currentVariant,
      ensureDefaults: ensureDefaults
    };
  }

  function variantOptionRowsHtml(picker) {
    var state = picker.state;
    var difficulties = picker.difficulties;
    var shaderOpts = picker.shaderOptions();
    var editionOpts = picker.editionOptions();

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

    var showDiff = difficulties.length > 1 || (difficulties[0] && difficulties[0] !== '—');

    return (showDiff
        ? '<div class="cushion-row"><div class="cushion-row__label">難易度差分</div><div class="cushion-options" id="diff-options">' + diffBtns + '</div></div>'
        : '') +
      (shaderOpts.length > 1
        ? '<div class="cushion-row"><div class="cushion-row__label">シェーダー</div><div class="cushion-options" id="shader-options">' + shaderBtns + '</div></div>'
        : '') +
      (editionOpts.length
        ? '<div class="cushion-row"><div class="cushion-row__label">版</div><div class="cushion-options" id="edition-options">' + editionBtns + '</div></div>'
        : '');
  }

  var VARIANT_OPTION_GROUPS = [
    { key: 'diff', field: 'difficulty' },
    { key: 'shader', field: 'shader' },
    { key: 'edition', field: 'edition' }
  ];

  /** repaint() rebuilds the markup, so focus is handed back to the same option afterwards. */
  function bindVariantOptions(mount, picker, repaint) {
    VARIANT_OPTION_GROUPS.forEach(function (group) {
      var sel = '#' + group.key + '-options button';
      qsa(sel, mount).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var value = btn.getAttribute('data-' + group.key);
          picker.state[group.field] = value;
          repaint();
          var again = qsa(sel, mount).filter(function (b) {
            return b.getAttribute('data-' + group.key) === value;
          })[0];
          if (again) again.focus();
        });
      });
    });
  }

  function renderCushionBody(chart, mount, opts) {
    if (!mount) return;
    opts = opts || {};
    var variants = chart.variants || [];
    var yt = chart.youtubeChannel || CONFIG.youtubeChannelDefault;
    var noticeHref = siteAssetUrl('notice.html');

    if (!variants.length) {
      mount.innerHTML =
        '<section class="cushion-meta">' +
          '<dl>' +
            '<dt>譜面制作者</dt><dd>' + escapeHtml(chart.charter || 'Nanokuro') + '</dd>' +
            '<dt>難易度</dt><dd>' + escapeHtml(chart.difficulty || '—') + '</dd>' +
          '</dl>' +
          cushionHintHtml(chart, '詳細は YouTube 概要欄を参照してください。', yt) +
        '</section>' +
        '<section class="cushion-pick">' +
          '<p class="cushion-summary">この譜面のダウンロードファイルはまだ接続されていません。</p>' +
          '<div class="cushion-actions">' +
            '<span class="btn btn-primary btn-get" aria-disabled="true">DOWNLOAD 準備中</span>' +
            '<button type="button" class="btn" data-cushion-close="1">閉じる</button>' +
            '<a class="btn" href="' + escapeHtml(noticeHref) + '">注意事項</a>' +
          '</div>' +
        '</section>';
      return;
    }

    var picker = createVariantPicker(variants);
    if (opts.preferredDifficulty && picker.difficulties.indexOf(opts.preferredDifficulty) !== -1) {
      picker.state.difficulty = opts.preferredDifficulty;
    }
    if (opts.preferredEdition) {
      picker.state.edition = opts.preferredEdition;
    }

    function paint() {
      picker.ensureDefaults();
      var v = picker.currentVariant();
      var constLabel = v
        ? formatConstantLabel(v.difficulty, v.constant)
        : (chart.difficulty || '—');

      var denied = !!(chart.accessDenied || (v && v.accessDenied));
      var watchUrl = (v && v.watchUrl) || chart.watchUrl || '';
      var primaryAction;
      if (denied) {
        primaryAction = '<span class="btn btn-denied" aria-disabled="true">Access Denied</span>';
      } else if (watchUrl) {
        primaryAction = '<a class="btn btn-primary" href="' + escapeHtml(watchUrl) +
          '" target="_blank" rel="noopener noreferrer">WATCH ON YOUTUBE</a>';
      } else if (v && v.file) {
        var dlName = downloadNameFor(chart, v);
        primaryAction = '<a class="btn btn-primary btn-get" href="' + escapeHtml(siteAssetUrl(v.file)) +
          '" download="' + escapeHtml(dlName) + '">DOWNLOAD</a>';
      } else {
        primaryAction = '<span class="btn btn-primary btn-get" aria-disabled="true">DOWNLOAD 準備中</span>';
      }

      var pickTitle = denied ? 'ACCESS' : (watchUrl ? 'WATCH' : 'DIFF / SHADER / EDITION');

      mount.innerHTML =
        '<section class="cushion-meta" aria-label="譜面情報">' +
          '<dl>' +
            '<dt>譜面制作者</dt><dd>' + escapeHtml((v && v.charter) || chart.charter || 'Nanokuro') + '</dd>' +
            '<dt>難易度</dt><dd>' + escapeHtml(constLabel) + '</dd>' +
            '<dt>シェーダー</dt><dd>' + escapeHtml(shaderDisplay(v)) + '</dd>' +
            (v && v.edition ? ('<dt>版</dt><dd>' + escapeHtml(v.edition) + '</dd>') : '') +
          '</dl>' +
          cushionHintHtml(chart, '定数や譜面制作者などの詳細は YouTube 概要欄を参照してください。', yt) +
        '</section>' +
        '<section class="cushion-pick" aria-label="差分選択">' +
          (pickTitle === 'DIFF / SHADER / EDITION' ? '' : '<h2>' + pickTitle + '</h2>') +
          variantOptionRowsHtml(picker) +
          '<p class="cushion-summary">選択中: ' + escapeHtml(v ? (v.label || constLabel) : 'なし') + '</p>' +
          '<div class="cushion-actions">' +
            primaryAction +
            '<button type="button" class="btn" data-cushion-close="1">閉じる</button>' +
            '<a class="btn" href="' + escapeHtml(noticeHref) + '">注意事項</a>' +
          '</div>' +
        '</section>';

      bindVariantOptions(mount, picker, paint);
    }

    paint();
  }

  /** Variant picker for multi-select: only downloadable variants, confirm queues one for batch DL. */
  function openVariantPicker(chart, onPick) {
    presentCushion('pick', 'SELECT FOR BATCH', chart.title, function (mount) {
      var picker = createVariantPicker(downloadableVariants(chart));

      function paint() {
        picker.ensureDefaults();
        var v = picker.currentVariant();
        mount.innerHTML =
          '<section class="cushion-pick" aria-label="一括DLする差分の選択">' +
            variantOptionRowsHtml(picker) +
            '<p class="cushion-summary">選択中: ' + escapeHtml(v ? variantLabel(v) : 'なし') + '</p>' +
            '<div class="cushion-actions">' +
              '<button type="button" class="btn btn-primary" data-variant-confirm="1"' +
                (v ? '' : ' aria-disabled="true"') + '>一括DLに追加</button>' +
              '<button type="button" class="btn" data-cushion-close="1">キャンセル</button>' +
            '</div>' +
          '</section>';

        bindVariantOptions(mount, picker, paint);
        var confirmBtn = qs('[data-variant-confirm]', mount);
        if (confirmBtn && v) {
          confirmBtn.addEventListener('click', function () { onPick(v); });
        }
      }

      paint();
    });
  }

  function findListedChart(charts, id) {
    for (var i = 0; i < charts.length; i++) {
      if (charts[i].id === id) return charts[i];
    }
    if (vaultCache) {
      var hit = findChartById(vaultCache, id);
      return hit && hit.chart;
    }
    return null;
  }

  function bindChartListActions(container, charts) {
    qsa('.chart-item[data-open-cushion]', container).forEach(function (row) {
      function activateRow() {
        var id = row.getAttribute('data-open-cushion');
        var chart = findListedChart(charts, id);
        if (!chart) return;
        if (multiSelect.active) toggleMultiPick(chart);
        else openCushion(chart);
      }
      row.addEventListener('click', activateRow);
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateRow();
        }
      });
    });
  }

  /* ---------- 複数選択 / 一括DL ---------- */

  function addMultiPick(chart, variant) {
    if (!multiSelect.picks[chart.id]) multiSelect.order.push(chart.id);
    multiSelect.picks[chart.id] = { chart: chart, variant: variant, done: false };
  }

  function removeMultiPick(id) {
    if (!multiSelect.picks[id]) return;
    delete multiSelect.picks[id];
    multiSelect.order = multiSelect.order.filter(function (x) { return x !== id; });
  }

  function clearMultiPicks() {
    multiSelect.picks = Object.create(null);
    multiSelect.order = [];
  }

  function announceMulti(text) {
    var status = qs('#multi-dock [data-multi="status"]');
    if (status) status.textContent = text;
  }

  function syncChartRow(row) {
    var id = row.getAttribute('data-open-cushion');
    var titleEl = qs('.chart-item__title', row);
    var title = (titleEl && titleEl.textContent) || '譜面';
    var pick = qs('.chart-item__pick', row);
    var nodl = row.classList.contains('chart-item--nodl');
    var entry = id && multiSelect.active ? multiSelect.picks[id] : null;

    row.classList.toggle('is-selected', !!entry);
    if (pick) {
      pick.textContent = !multiSelect.active ? ''
        : (nodl ? 'DL不可' : (entry ? variantLabel(entry.variant) : '選択'));
    }
    if (!id) return;

    if (!multiSelect.active) {
      row.removeAttribute('aria-pressed');
      row.removeAttribute('aria-disabled');
      row.setAttribute('aria-label', title + 'の詳細を開く');
    } else if (nodl) {
      row.removeAttribute('aria-pressed');
      row.setAttribute('aria-disabled', 'true');
      row.setAttribute('aria-label', title + '（DL不可のため選択できません）');
    } else {
      row.removeAttribute('aria-disabled');
      row.setAttribute('aria-pressed', entry ? 'true' : 'false');
      row.setAttribute('aria-label', title + (entry ? '（' + variantLabel(entry.variant) + '）' : ''));
    }
  }

  function syncChartRows(root) {
    qsa('.chart-item', root || qs('#chart-mount') || document).forEach(syncChartRow);
  }

  function syncMultiDock() {
    var dock = qs('#multi-dock');
    if (!dock) return;
    var on = multiSelect.active;
    var count = multiSelect.order.length;
    qs('[data-multi="start"]', dock).hidden = on;
    qs('[data-multi="clear"]', dock).hidden = !on;
    var batch = qs('[data-multi="batch"]', dock);
    batch.hidden = !on;
    batch.setAttribute('aria-disabled', count ? 'false' : 'true');
    batch.setAttribute('aria-label', '一括DL（' + count + '件選択中）');
    qs('.multi-dock__count', batch).textContent = String(count);
    dock.classList.toggle('is-active', on);
  }

  function syncMultiSelectUi() {
    syncChartRows();
    syncMultiDock();
  }

  function setMultiSelect(on) {
    multiSelect.active = !!on;
    if (!multiSelect.active) clearMultiPicks();
    document.body.classList.toggle('multi-select-on', multiSelect.active);
    syncMultiSelectUi();
    var dock = qs('#multi-dock');
    var next = dock && qs(multiSelect.active ? '[data-multi="clear"]' : '[data-multi="start"]', dock);
    if (next) next.focus();
    announceMulti(multiSelect.active
      ? '複数選択モード。DLしたい譜面を選んでください'
      : '選択を取り消しました');
  }

  function toggleMultiPick(chart) {
    if (!chart || !chart.id) return;
    if (multiSelect.picks[chart.id]) {
      removeMultiPick(chart.id);
      syncMultiSelectUi();
      announceMulti(multiSelect.order.length + '件選択中');
      return;
    }
    var options = downloadableVariants(chart);
    if (!options.length) return;
    if (options.length === 1) {
      addMultiPick(chart, options[0]);
      syncMultiSelectUi();
      announceMulti(multiSelect.order.length + '件選択中');
      return;
    }
    openVariantPicker(chart, function (variant) {
      if (multiSelect.active) {
        addMultiPick(chart, variant);
        syncMultiSelectUi();
        announceMulti(multiSelect.order.length + '件選択中');
      }
      closeCushion();
    });
  }

  function openBatchCushion() {
    if (!multiSelect.active || !multiSelect.order.length) return;
    presentCushion('batch', 'BATCH DOWNLOAD', '一括ダウンロード', renderBatchBody);
    writeBatchNoticeReturn();
  }

  function renderBatchBody(mount) {
    if (!mount) return;
    var entries = multiSelect.order
      .map(function (id) { return multiSelect.picks[id]; })
      .filter(Boolean);

    if (!entries.length) {
      clearNoticeReturn();
      mount.innerHTML =
        '<section class="cushion-pick" aria-label="一括ダウンロード一覧">' +
          '<p class="cushion-summary">選択中の譜面はありません。</p>' +
          '<div class="cushion-actions">' +
            '<button type="button" class="btn" data-cushion-close="1">閉じる</button>' +
          '</div>' +
        '</section>';
      return;
    }
    writeBatchNoticeReturn();

    var items = entries.map(function (entry) {
      var c = entry.chart;
      var v = entry.variant;
      var title = c.title || '譜面';
      var label = variantLabel(v);
      var name = downloadNameFor(c, v);
      var meta = [
        label,
        typeof v.shader === 'boolean' ? (v.shader ? 'Shader あり' : 'Shader なし') : '',
        name
      ].filter(Boolean).join(' · ');
      return '<li class="batch-item' + (entry.done ? ' is-done' : '') + '">' +
        '<div class="batch-item__info">' +
          '<p class="batch-item__title">' + escapeHtml(title) +
            '<span class="badge batch-item__done">DL済</span></p>' +
          '<p class="batch-item__meta">' + escapeHtml(meta) + '</p>' +
        '</div>' +
        '<div class="batch-item__actions">' +
          '<a class="btn btn-primary btn-get" href="' + escapeHtml(v.file) + '" download="' + escapeHtml(name) + '"' +
            ' data-batch-get="' + escapeHtml(c.id) + '"' +
            ' aria-label="' + escapeHtml(title + ' ' + label + ' をダウンロード') + '">DOWNLOAD</a>' +
          '<button type="button" class="btn batch-item__remove" data-batch-remove="' + escapeHtml(c.id) + '"' +
            ' aria-label="' + escapeHtml(title + ' を一括DLから外す') + '">外す</button>' +
        '</div>' +
      '</li>';
    }).join('');

    mount.innerHTML =
      '<section class="cushion-pick" aria-label="一括ダウンロード一覧">' +
        '<h2>DOWNLOAD LIST</h2>' +
        '<p class="cushion-summary">選択中 ' + entries.length + ' 件。各譜面の DOWNLOAD から保存してください。</p>' +
        '<ul class="batch-list">' + items + '</ul>' +
        '<div class="cushion-actions">' +
          '<button type="button" class="btn" data-cushion-close="1">閉じる</button>' +
          '<a class="btn" href="notice.html">注意事項</a>' +
        '</div>' +
      '</section>';

    qsa('[data-batch-get]', mount).forEach(function (a) {
      a.addEventListener('click', function () {
        var entry = multiSelect.picks[a.getAttribute('data-batch-get')];
        if (entry) entry.done = true;
        var li = a.closest('.batch-item');
        if (li) li.classList.add('is-done');
      });
    });

    qsa('[data-batch-remove]', mount).forEach(function (btn, index) {
      btn.addEventListener('click', function () {
        removeMultiPick(btn.getAttribute('data-batch-remove'));
        syncMultiSelectUi();
        announceMulti(multiSelect.order.length + '件選択中');
        renderBatchBody(mount);
        var rest = qsa('[data-batch-remove]', mount);
        var next = rest[Math.min(index, rest.length - 1)] || qs('#cushion-host .cushion-close');
        if (next) next.focus();
      });
    });
  }

  function ensureMultiDock() {
    var dock = qs('#multi-dock');
    if (dock) return dock;
    dock = document.createElement('div');
    dock.id = 'multi-dock';
    dock.className = 'multi-dock';
    dock.setAttribute('role', 'group');
    dock.setAttribute('aria-label', '複数選択');
    dock.innerHTML =
      '<button type="button" class="multi-dock__btn" data-multi="start">複数選択</button>' +
      '<button type="button" class="multi-dock__btn" data-multi="clear" hidden>選択取り消し</button>' +
      '<button type="button" class="multi-dock__btn multi-dock__btn--primary" data-multi="batch" hidden>' +
        '一括DL<span class="multi-dock__count" aria-hidden="true">0</span>' +
      '</button>' +
      '<span class="visually-hidden" data-multi="status" aria-live="polite"></span>';

    dock.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('button[data-multi]') : null;
      if (!btn) return;
      var action = btn.getAttribute('data-multi');
      if (action === 'start') setMultiSelect(true);
      else if (action === 'clear') setMultiSelect(false);
      else if (action === 'batch') openBatchCushion();
    });

    /* BGMトグルより前に置き、Tab順を画面の左→右に揃える */
    var bgm = qs('.bgm-toggle');
    if (bgm && bgm.parentNode === document.body) document.body.insertBefore(dock, bgm);
    else document.body.appendChild(dock);
    return dock;
  }

  /** Runs on every boot/reboot: soft-nav keeps module state, so selection is reset per page. */
  function mountMultiDock() {
    multiSelect.active = false;
    clearMultiPicks();
    document.body.classList.remove('multi-select-on');
    var dock = qs('#multi-dock');
    if (!document.body.getAttribute('data-vault')) {
      if (dock && dock.parentNode) dock.parentNode.removeChild(dock);
      return;
    }
    ensureMultiDock();
    syncMultiDock();
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
          '<input type="search" id="vault-query" maxlength="' + VAULT_QUERY_MAX + '" autocomplete="off" placeholder="曲名 / 制作者 / タグ" value="' +
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

    var queryTimer = 0;

    function syncFromUI() {
      clearTimeout(queryTimer);
      var queryEl = qs('#vault-query', box);
      var rawQuery = queryEl.value || '';
      if (rawQuery.length > VAULT_QUERY_MAX) {
        rawQuery = rawQuery.slice(0, VAULT_QUERY_MAX);
        queryEl.value = rawQuery;
      }
      vaultViewState.sort = qs('#vault-sort', box).value;
      vaultViewState.status = qs('#vault-status', box).value;
      vaultViewState.download = qs('#vault-download', box).value;
      vaultViewState.query = rawQuery;
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
        if (t.id === 'vault-query' && ev === 'input') {
          clearTimeout(queryTimer);
          queryTimer = setTimeout(syncFromUI, 140);
          return;
        }
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
    vaultShownCharts = sorted.slice();
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
      var openable = !!c.id;
      var rowAttrs = ' class="chart-item' + (openable ? ' chart-item--openable' : '') +
          (hasFileDownload(c) ? '' : ' chart-item--nodl') + '"' +
        ' data-tags="' + (c.tags || []).join(' ') + '"';
      if (openable) {
        rowAttrs +=
          ' data-open-cushion="' + escapeHtml(c.id) + '"' +
          ' role="button"' +
          ' tabindex="0"' +
          ' aria-label="' + escapeHtml((c.title || '譜面') + 'の詳細を開く') + '"';
      }
      html +=
        '<li' + rowAttrs + '>' +
          '<div>' +
            '<p class="chart-item__title">' + escapeHtml(c.title) + '</p>' +
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
            '<span class="chart-item__pick" aria-hidden="true"></span>' +
          '</div>' +
        '</li>';
    });
    html += '</ul>';
    container.innerHTML = html;
    bindChartListActions(container, charts);
    syncChartRows(container);
  }

  function loadVault(category) {
    var mount = qs('#chart-mount');
    if (!mount) return;
    vaultCategory = category;
    mount.innerHTML = '<div class="empty-state">LOADING...</div>';
    fetchChartsData()
      .then(function (data) {
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
        tryPendingRestore();
      })
      .catch(function () {
        mount.innerHTML = '<div class="empty-state">FAILED TO LOAD CHART INDEX</div>';
      });
  }

  function sha256Hex(text) {
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) {
      return Promise.reject(new Error('crypto'));
    }
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      var bytes = new Uint8Array(buf);
      var hex = '';
      for (var i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      return hex;
    });
  }

  /** TRPG scenario pages: password gate (survives soft-nav via reboot). */
  function initTrpgLock() {
    var root = qs('[data-trpg-lock]');
    if (!root) return;
    var id = root.getAttribute('data-trpg-lock') || 'default';
    var expect = String(root.getAttribute('data-trpg-hash') || '').toLowerCase();
    var storageKey = 'nk-trpg-unlock-' + id;
    var form = qs('#trpg-lock-form', root);
    var panel = qs('#trpg-locked', root);
    var input = qs('#trpg-lock-input', root);
    var status = qs('#trpg-lock-status', root);
    var relock = qs('[data-trpg-relock]', root);
    if (!form || !panel || !expect) return;

    function setUnlocked(on) {
      panel.hidden = !on;
      form.hidden = !!on;
      root.classList.toggle('is-unlocked', !!on);
      if (status) status.textContent = on ? '開錠しました。' : '';
      if (on) {
        try { sessionStorage.setItem(storageKey, '1'); } catch (e) { /* ignore */ }
        var first = qs('h3', panel) || panel;
        if (first && typeof first.focus === 'function') {
          if (!first.hasAttribute('tabindex')) first.setAttribute('tabindex', '-1');
          try { first.focus(); } catch (err) { /* ignore */ }
        }
      } else {
        try { sessionStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
        if (input) {
          input.value = '';
          input.focus();
        }
      }
    }

    try {
      if (sessionStorage.getItem(storageKey) === '1') setUnlocked(true);
      else setUnlocked(false);
    } catch (e) {
      setUnlocked(false);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var guess = input ? String(input.value || '') : '';
      if (!guess) {
        if (status) status.textContent = 'パスワードを入力してください。';
        return;
      }
      if (status) status.textContent = '確認中…';
      sha256Hex(guess).then(function (hex) {
        if (hex === expect) {
          setUnlocked(true);
        } else {
          if (status) status.textContent = 'パスワードが違います。';
          if (input) {
            input.select();
            input.focus();
          }
        }
      }).catch(function () {
        if (status) status.textContent = 'この環境では開錠できません（HTTPS または localhost で開いてください）。';
      });
    });

    if (relock) {
      relock.addEventListener('click', function () {
        setUnlocked(false);
        if (status) status.textContent = '再施錠しました。';
      });
    }
  }

  function ensureFirstCup() {
    if (!document.body.classList.contains('page-1st')) return;
    function run() {
      if (window.NanokuroFirstCup && typeof window.NanokuroFirstCup.boot === 'function') {
        window.NanokuroFirstCup.boot();
      }
    }
    if (window.NanokuroFirstCup) {
      run();
      return;
    }
    var existing = document.querySelector('script[data-nk-1st-cup]');
    if (existing) {
      existing.addEventListener('load', run);
      return;
    }
    var s = document.createElement('script');
    var siteSrc = SITE_SCRIPT_SRC;
    if (!siteSrc) {
      var base = document.querySelector('script[src*="site.js"]');
      siteSrc = base && base.src ? base.src : '';
    }
    s.src = siteSrc
      ? siteSrc.replace(/site\.js[^/]*$/, '1st-cup.js?v=20261124a')
      : 'js/1st-cup.js?v=20261124a';
    s.setAttribute('data-nk-1st-cup', '1');
    s.addEventListener('load', run);
    s.addEventListener('error', function () { /* ignore */ });
    document.body.appendChild(s);
  }

  var vaultHelpDocBound = false;

  function setVaultHelpOpen(open) {
    var root = qs('#vault-help');
    if (!root) return;
    var panel = qs('#vault-help-panel', root);
    var btn = qs('.vault-help__btn', root);
    if (!panel || !btn) return;
    panel.hidden = !open;
    root.classList.toggle('is-open', !!open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function bindVaultHelpDocument() {
    if (vaultHelpDocBound) return;
    vaultHelpDocBound = true;
    document.addEventListener('click', function (e) {
      var root = qs('#vault-help');
      if (!root || !root.classList.contains('is-open')) return;
      if (root.contains(e.target)) return;
      setVaultHelpOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var host = qs('#cushion-host');
      if (host && !host.hidden) return;
      var root = qs('#vault-help');
      if (!root || !root.classList.contains('is-open')) return;
      setVaultHelpOpen(false);
      var btn = qs('.vault-help__btn', root);
      if (btn) btn.focus();
    });
  }

  function mountVaultHelp() {
    var existing = qs('#vault-help');
    if (!document.body.getAttribute('data-vault')) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    if (existing) return;
    bindVaultHelpDocument();

    var root = document.createElement('div');
    root.id = 'vault-help';
    root.className = 'vault-help';
    root.innerHTML =
      '<div class="vault-help__panel" id="vault-help-panel" hidden role="region" aria-labelledby="vault-help-title">' +
        '<h2 class="vault-help__title" id="vault-help-title">保管庫の使い方</h2>' +
        '<ol class="vault-help__steps">' +
          '<li>' +
            '<svg class="vault-help__art" viewBox="0 0 240 78" aria-hidden="true">' +
              '<rect class="vh-plate" x="8" y="10" width="146" height="26" rx="2"></rect>' +
              '<circle class="vh-stroke" cx="24" cy="23" r="5"></circle>' +
              '<path class="vh-stroke" d="M28 27 L33 32"></path>' +
              '<rect class="vh-bar" x="40" y="20" width="96" height="6" rx="1"></rect>' +
              '<rect class="vh-plate" x="162" y="10" width="70" height="26" rx="2"></rect>' +
              '<rect class="vh-bar" x="172" y="20" width="40" height="6" rx="1"></rect>' +
              '<path class="vh-stroke" d="M218 18 L224 23 L218 28"></path>' +
              '<rect class="vh-hot" x="8" y="46" width="52" height="20" rx="2"></rect>' +
              '<text class="vh-onhot" x="34" y="60" text-anchor="middle">曲名</text>' +
              '<rect class="vh-plate" x="68" y="46" width="58" height="20" rx="2"></rect>' +
              '<text class="vh-dim" x="97" y="60" text-anchor="middle">OPEN</text>' +
              '<rect class="vh-plate" x="134" y="46" width="98" height="20" rx="2"></rect>' +
              '<text class="vh-dim" x="183" y="60" text-anchor="middle">ファイルDL</text>' +
            '</svg>' +
            '<p>上の欄で曲を探す</p>' +
          '</li>' +
          '<li>' +
            '<svg class="vault-help__art" viewBox="0 0 240 78" aria-hidden="true">' +
              '<rect class="vh-plate vh-plate--hot" x="8" y="16" width="200" height="48" rx="2"></rect>' +
              '<rect class="vh-hot" x="20" y="28" width="96" height="8" rx="1"></rect>' +
              '<rect class="vh-bar" x="20" y="44" width="128" height="5" rx="1"></rect>' +
              '<rect class="vh-plate" x="150" y="28" width="42" height="16" rx="2"></rect>' +
              '<path class="vh-hot" d="M196 40 L196 62 L204 56 L212 70 L218 67 L210 53 L222 53 Z"></path>' +
            '</svg>' +
            '<p>曲名を押して開く</p>' +
          '</li>' +
          '<li>' +
            '<svg class="vault-help__art" viewBox="0 0 240 96" aria-hidden="true">' +
              '<text class="vh-arrow" x="6" y="20">‹</text>' +
              '<rect class="vh-bar" x="36" y="10" width="168" height="7" rx="1"></rect>' +
              '<text class="vh-arrow" x="214" y="20">›</text>' +
              '<text class="vh-dim" x="8" y="44">難易度</text>' +
              '<rect class="vh-plate" x="64" y="32" width="40" height="16" rx="2"></rect>' +
              '<rect class="vh-hot" x="110" y="32" width="40" height="16" rx="2"></rect>' +
              '<text class="vh-dim" x="8" y="68">シェーダー</text>' +
              '<rect class="vh-hot" x="74" y="56" width="32" height="16" rx="2"></rect>' +
              '<rect class="vh-plate" x="114" y="56" width="32" height="16" rx="2"></rect>' +
              '<text class="vh-dim" x="8" y="92">版</text>' +
              '<rect class="vh-plate" x="64" y="80" width="40" height="16" rx="2"></rect>' +
              '<rect class="vh-hot" x="110" y="80" width="40" height="16" rx="2"></rect>' +
            '</svg>' +
            '<p>差分を選ぶ。矢印で隣の曲へ</p>' +
          '</li>' +
          '<li>' +
            '<svg class="vault-help__art" viewBox="0 0 240 78" aria-hidden="true">' +
              '<rect class="vh-hot" x="40" y="10" width="160" height="30" rx="2"></rect>' +
              '<text class="vh-onhot" x="120" y="30" text-anchor="middle">DOWNLOAD</text>' +
              '<rect class="vh-plate" x="12" y="52" width="16" height="16" rx="2"></rect>' +
              '<path class="vh-stroke vh-check" d="M15 60 L19 65 L26 54"></path>' +
              '<text class="vh-ink" x="36" y="65">複数選択</text>' +
            '</svg>' +
            '<p>DOWNLOAD。複数は左下</p>' +
          '</li>' +
        '</ol>' +
      '</div>' +
      '<button type="button" class="vault-help__btn" aria-expanded="false" aria-controls="vault-help-panel">' +
        '<span aria-hidden="true">?</span>' +
        '<span class="visually-hidden">譜面保管庫の使い方</span>' +
      '</button>';

    var btn = qs('.vault-help__btn', root);
    btn.addEventListener('click', function () {
      var panel = qs('#vault-help-panel', root);
      setVaultHelpOpen(panel.hidden);
    });
    document.body.appendChild(root);
  }

  function boot() {
    initNav();
    markCurrentNav();
    wireSecondBanners();
    wireAccessDenied();
    mountMultiDock();
    mountNoticeDock();
    initTrpgLock();
    ensureFirstCup();
    mountVaultHelp();
    var cat = document.body.getAttribute('data-vault');
    if (cat) loadVault(cat);
  }

  /* DL/一括DL から注意事項へ移る直前に戻り先を再確定（soft-nav で cushion が消えても残す） */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (!/notice\.html/i.test(a.getAttribute('href') || '')) return;
    var host = qs('#cushion-host');
    if (!host || host.hidden) return;
    var mode = host.getAttribute('data-cushion-mode');
    if (mode === 'batch') writeBatchNoticeReturn();
    else if (mode === 'chart') {
      var ret = readNoticeReturn();
      if (ret && ret.mode === 'chart' && ret.chartId) writeChartNoticeReturn(ret.chartId);
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.NanokuroSite = {
    config: CONFIG,
    loadVault: loadVault,
    openCushion: openCushion,
    openFromCupHub: openFromCupHub,
    closeCushion: closeCushion,
    reboot: function () {
      boot();
      focusMainLandmark();
    }
  };
})();
