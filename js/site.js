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
    secondCollectionsLabel: '2nd Nanokuro Collections'
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
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
      var action = c.download
        ? '<a class="btn" href="' + c.download + '" download>DOWNLOAD</a>'
        : '<span class="btn" aria-disabled="true">準備中</span>';
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

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    loadVault: loadVault
  };
})();
