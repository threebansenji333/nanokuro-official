(function () {
  'use strict';

  var STORAGE_TIME = 'nk-bgm-t';
  var STORAGE_WANT = 'nk-bgm-want';
  var STORAGE_UNLOCKED = 'nk-bgm-unlocked';
  var STORAGE_MUTED = 'nk-bgm-muted';
  var FILE = 'naki-sekai-no-komoriuta.mp3';
  var VOLUME = 0.32;

  function resolveSrc() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (/\/bgm\.js(\?|$)/.test(src)) {
        return src.replace(/\/js\/bgm\.js(\?.*)?$/, '/audio/' + FILE);
      }
    }
    try {
      return new URL('audio/' + FILE, location.href).href;
    } catch (e) {
      return 'audio/' + FILE;
    }
  }

  var audio = new Audio();
  audio.src = resolveSrc();
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = VOLUME;
  audio.setAttribute('playsinline', '');
  audio.setAttribute('aria-hidden', 'true');

  var muted = localStorage.getItem(STORAGE_MUTED) === '1';
  var unlocked = sessionStorage.getItem(STORAGE_UNLOCKED) === '1';
  /* User intent: keep playing across pages unless muted. Do NOT sync from audio.paused. */
  var wantPlay = !muted && sessionStorage.getItem(STORAGE_WANT) !== '0';
  var button = null;
  var persistTimer = null;
  var started = false;
  var softNavBusy = false;

  function readSavedTime() {
    var raw = sessionStorage.getItem(STORAGE_TIME);
    var t = raw == null ? 0 : parseFloat(raw);
    return isFinite(t) && t >= 0 ? t : 0;
  }

  function persist() {
    try {
      if (!isNaN(audio.currentTime)) {
        sessionStorage.setItem(STORAGE_TIME, String(audio.currentTime));
      }
      sessionStorage.setItem(STORAGE_WANT, wantPlay ? '1' : '0');
      if (unlocked) sessionStorage.setItem(STORAGE_UNLOCKED, '1');
      localStorage.setItem(STORAGE_MUTED, muted ? '1' : '0');
    } catch (e) { /* ignore */ }
  }

  function schedulePersist() {
    if (persistTimer) return;
    persistTimer = setTimeout(function () {
      persistTimer = null;
      persist();
    }, 200);
  }

  function applyMute() {
    audio.muted = muted;
    if (button) {
      button.setAttribute('aria-pressed', muted ? 'true' : 'false');
      button.classList.toggle('is-muted', muted);
      button.title = muted ? 'BGMをオン' : 'BGMをミュート';
      button.setAttribute('aria-label', muted ? 'BGMをオンにする' : 'BGMをミュートする');
      button.textContent = muted ? 'BGM OFF' : 'BGM ON';
    }
  }

  function tryPlay() {
    if (!wantPlay || muted) {
      applyMute();
      return;
    }
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(function () {
        unlocked = true;
        sessionStorage.setItem(STORAGE_UNLOCKED, '1');
        applyMute();
      }).catch(function () {
        applyMute();
      });
    } else {
      applyMute();
    }
  }

  function seekAndPlay() {
    if (started) {
      tryPlay();
      return;
    }
    started = true;
    var t = readSavedTime();
    var applySeek = function () {
      try {
        if (audio.duration && isFinite(audio.duration) && t >= audio.duration) {
          t = t % audio.duration;
        }
        if (t > 0) audio.currentTime = t;
      } catch (e) { /* ignore */ }
      tryPlay();
    };

    if (audio.readyState >= 1) {
      applySeek();
    } else {
      audio.addEventListener('loadedmetadata', applySeek, { once: true });
      tryPlay();
    }
  }

  function unlockFromGesture() {
    unlocked = true;
    sessionStorage.setItem(STORAGE_UNLOCKED, '1');
    if (muted) {
      applyMute();
      return;
    }
    wantPlay = true;
    sessionStorage.setItem(STORAGE_WANT, '1');
    tryPlay();
  }

  function onGesture() {
    if (muted) return;
    if (!unlocked || audio.paused) unlockFromGesture();
  }

  function createToggle() {
    if (button && button.isConnected) {
      applyMute();
      return;
    }
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'bgm-toggle';
    button.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      unlocked = true;
      sessionStorage.setItem(STORAGE_UNLOCKED, '1');
      muted = !muted;
      localStorage.setItem(STORAGE_MUTED, muted ? '1' : '0');
      applyMute();
      if (muted) {
        audio.pause();
        wantPlay = false;
        sessionStorage.setItem(STORAGE_WANT, '0');
      } else {
        wantPlay = true;
        sessionStorage.setItem(STORAGE_WANT, '1');
        tryPlay();
      }
      persist();
    });
    document.body.appendChild(button);
    applyMute();
  }

  function isSoftNavCandidate(anchor) {
    if (!anchor || !anchor.getAttribute) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;
    var href = anchor.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return false;
    try {
      var url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return false;
      if (url.pathname === location.pathname && url.search === location.search) return false;
      /* Same-directory HTML pages only (this site’s pages). */
      if (!/\.html?$/i.test(url.pathname) && !/\/$/.test(url.pathname)) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function stripPageScripts(root) {
    var list = root.querySelectorAll('script');
    for (var i = 0; i < list.length; i++) list[i].parentNode.removeChild(list[i]);
  }

  function softNavigate(url, push) {
    if (softNavBusy) return;
    softNavBusy = true;
    persist();

    fetch(url, { credentials: 'same-origin', cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('nav ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        stripPageScripts(doc.body);

        document.title = doc.title || document.title;

        var names = [];
        for (var i = 0; i < document.body.attributes.length; i++) {
          names.push(document.body.attributes[i].name);
        }
        names.forEach(function (n) { document.body.removeAttribute(n); });
        for (var j = 0; j < doc.body.attributes.length; j++) {
          var a = doc.body.attributes[j];
          document.body.setAttribute(a.name, a.value);
        }

        /* Keep Audio alive; wipe DOM and re-mount toggle after. */
        button = null;
        document.body.innerHTML = doc.body.innerHTML;
        createToggle();

        if (push !== false) {
          history.pushState({ nkSoft: 1 }, '', url);
        }

        if (window.NanokuroSite && typeof window.NanokuroSite.reboot === 'function') {
          window.NanokuroSite.reboot();
        }

        window.scrollTo(0, 0);
        tryPlay();
      })
      .catch(function () {
        /* Fallback: hard navigation */
        location.href = url;
      })
      .then(function () {
        softNavBusy = false;
      });
  }

  audio.addEventListener('timeupdate', schedulePersist);
  window.addEventListener('pagehide', persist);
  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persist();
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!isSoftNavCandidate(a)) return;
    e.preventDefault();
    softNavigate(a.href, true);
  }, true);

  window.addEventListener('popstate', function () {
    softNavigate(location.href, false);
  });

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (type) {
    document.addEventListener(type, onGesture, { passive: true });
  });

  function bootUi() {
    createToggle();
    seekAndPlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootUi);
  } else {
    bootUi();
  }

  seekAndPlay();

  window.NanokuroBgm = {
    audio: audio,
    persist: persist,
    softNavigate: softNavigate,
    mute: function (v) {
      muted = !!v;
      wantPlay = !muted;
      applyMute();
      if (muted) audio.pause();
      else tryPlay();
      persist();
    },
    isMuted: function () { return muted; }
  };
})();
