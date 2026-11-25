(function (global) {
  'use strict';

  var observer = null;
  var railBound = false;

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function isHub() {
    return document.body.classList.contains('page-1st');
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* Hidden-until-revealed state only exists once .cup-scroll--reveal is set here,
     so markup stays fully visible without this script or with reduced motion. */
  function initReveal() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    var root = document.querySelector('.cup-scroll');
    if (!root) return;
    var items = qsa('[data-reveal]', root);
    if (!items.length) return;

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      root.classList.remove('cup-scroll--reveal');
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    root.classList.add('cup-scroll--reveal');
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        if (observer) observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    items.forEach(function (el) { observer.observe(el); });
  }

  function syncRail() {
    if (!isHub()) return;
    var stages = qsa('.cup-stage[id]');
    var links = qsa('.cup-rail a[href^="#"]');
    if (!stages.length || !links.length) return;

    var currentId = stages[0].id;
    var mid = window.scrollY + window.innerHeight * 0.35;
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].offsetTop <= mid) currentId = stages[i].id;
    }
    links.forEach(function (a) {
      var id = (a.getAttribute('href') || '').slice(1);
      if (id === currentId) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function bindRail() {
    if (!railBound) {
      window.addEventListener('scroll', syncRail, { passive: true });
      window.addEventListener('resize', syncRail);
      railBound = true;
    }
    syncRail();
  }

  function scrollToChamber(chamberId) {
    if (!chamberId || !isHub()) return false;
    var target = document.getElementById(chamberId);
    if (!target || !target.classList || !target.classList.contains('cup-stage')) return false;
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
      });
    }
    try {
      if (history && history.replaceState) history.replaceState(null, '', '#' + chamberId);
      else location.hash = '#' + chamberId;
    } catch (err) { /* ignore */ }
    syncRail();
    return true;
  }

  /** In-page hashes: scroll to section id, not an SVG sprite symbol with the same fragment. */
  function bindInPageAnchors() {
    if (bindInPageAnchors.bound) return;
    bindInPageAnchors.bound = true;
    document.addEventListener('click', function (e) {
      if (!isHub()) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || !a.getAttribute) return;
      var href = a.getAttribute('href') || '';
      if (href.length < 2 || href.charAt(0) !== '#') return;
      var id = href.slice(1);
      if (!id || id.indexOf('/') !== -1) return;
      var target = document.getElementById(id);
      if (!target || !target.classList || !target.classList.contains('cup-stage')) return;
      e.preventDefault();
      scrollToChamber(id);
    }, true);
  }
  bindInPageAnchors.bound = false;

  function openPlateChart(plate) {
    if (!plate) return;
    var chartId = plate.getAttribute('data-open-chart');
    if (!chartId) return;
    var prefDiff = plate.getAttribute('data-pref-diff') || '';
    var prefEdition = plate.getAttribute('data-pref-edition') || '';
    if (window.NanokuroSite && typeof window.NanokuroSite.openFromCupHub === 'function') {
      window.NanokuroSite.openFromCupHub(chartId, null, {
        preferredDifficulty: prefDiff || null,
        preferredEdition: prefEdition || null
      });
    }
  }

  function bindPlates() {
    if (bindPlates.bound) return;
    bindPlates.bound = true;
    document.addEventListener('click', function (e) {
      if (!isHub()) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var plate = e.target && e.target.closest
        ? e.target.closest('.cup-plate[data-open-chart]')
        : null;
      if (!plate) return;
      e.preventDefault();
      openPlateChart(plate);
    });
    document.addEventListener('keydown', function (e) {
      if (!isHub()) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var plate = e.target && e.target.closest
        ? e.target.closest('.cup-plate[data-open-chart]')
        : null;
      if (!plate || e.target !== plate) return;
      e.preventDefault();
      openPlateChart(plate);
    });
  }
  bindPlates.bound = false;

  function boot() {
    if (!isHub()) return;
    initReveal();
    bindRail();
    bindInPageAnchors();
    bindPlates();
  }

  global.NanokuroFirstCup = {
    boot: boot,
    ensure: boot,
    scrollToChamber: scrollToChamber
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
