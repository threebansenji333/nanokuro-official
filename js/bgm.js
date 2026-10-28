(function () {
  'use strict';

  var STORAGE_TIME = 'nk-bgm-t';
  var STORAGE_PLAYING = 'nk-bgm-playing';
  var STORAGE_UNLOCKED = 'nk-bgm-unlocked';
  var STORAGE_MUTED = 'nk-bgm-muted';
  var SRC = 'audio/naki-sekai-no-komoriuta.mp3';
  var VOLUME = 0.32;

  var audio = new Audio();
  audio.src = SRC;
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = VOLUME;
  audio.setAttribute('playsinline', '');
  audio.setAttribute('aria-hidden', 'true');

  var muted = localStorage.getItem(STORAGE_MUTED) === '1';
  var unlocked = sessionStorage.getItem(STORAGE_UNLOCKED) === '1';
  var wantPlay = sessionStorage.getItem(STORAGE_PLAYING) !== '0';
  var button = null;
  var persistTimer = null;
  var started = false;

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
      sessionStorage.setItem(STORAGE_PLAYING, audio.paused ? '0' : '1');
      if (unlocked) sessionStorage.setItem(STORAGE_UNLOCKED, '1');
      localStorage.setItem(STORAGE_MUTED, muted ? '1' : '0');
    } catch (e) { /* ignore quota / private mode */ }
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
      } catch (e) { /* ignore seek before ready */ }
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
    sessionStorage.setItem(STORAGE_PLAYING, '1');
    tryPlay();
  }

  function onGesture() {
    if (muted) return;
    if (!unlocked || audio.paused) unlockFromGesture();
  }

  function createToggle() {
    if (button) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'bgm-toggle';
    button.addEventListener('click', function (e) {
      e.preventDefault();
      unlocked = true;
      sessionStorage.setItem(STORAGE_UNLOCKED, '1');
      muted = !muted;
      localStorage.setItem(STORAGE_MUTED, muted ? '1' : '0');
      applyMute();
      if (muted) {
        audio.pause();
        wantPlay = false;
        sessionStorage.setItem(STORAGE_PLAYING, '0');
      } else {
        wantPlay = true;
        sessionStorage.setItem(STORAGE_PLAYING, '1');
        tryPlay();
      }
      persist();
    });
    document.body.appendChild(button);
    applyMute();
  }

  function isInternalNav(anchor) {
    if (!anchor || !anchor.getAttribute) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;
    var href = anchor.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return false;
    try {
      var url = new URL(anchor.href, location.href);
      return url.origin === location.origin;
    } catch (e) {
      return false;
    }
  }

  audio.addEventListener('timeupdate', schedulePersist);
  audio.addEventListener('pause', persist);
  audio.addEventListener('play', persist);

  window.addEventListener('pagehide', persist);
  window.addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persist();
  });

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (isInternalNav(a)) persist();
  }, true);

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (type) {
    document.addEventListener(type, onGesture, { once: false, passive: true });
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

  // Resume ASAP even before DOMContentLoaded (position only).
  seekAndPlay();

  window.NanokuroBgm = {
    audio: audio,
    persist: persist,
    mute: function (v) {
      muted = !!v;
      applyMute();
      persist();
    },
    isMuted: function () { return muted; }
  };
})();
