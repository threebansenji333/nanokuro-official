(function () {
  'use strict';

  if (window.NanokuroFx) return;

  var MAX_DPR = 1.5;
  var PIXEL_BUDGET = 2200000;
  var MIN_QUALITY = 0.5;
  var SLOW_FRAME = 0.034;
  var IDLE_AFTER = 6;
  var GATE_INTENSITY = 0.7;

  var VERT_SRC = [
    'attribute vec2 a_pos;',
    'void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  /* GLSL ES 1.00 so the same source runs on WebGL2 and WebGL1. All lengths are CSS px. */
  var FRAG_SRC = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    '',
    'uniform vec2 u_res;',
    'uniform float u_scale;',
    'uniform float u_time;',
    'uniform float u_pulse;',
    'uniform vec2 u_mouse;',
    'uniform float u_scroll;',
    'uniform float u_energy;',
    'uniform float u_intensity;',
    '',
    'const vec3 CYAN = vec3(0.369, 0.906, 1.0);',
    'const vec3 VERMILION = vec3(0.820, 0.302, 0.196);',
    'const float FACET = 340.0;',
    'const float CELL = 56.0;',
    '',
    'float hash21(vec2 p) {',
    '  p = fract(p * vec2(234.34, 435.345));',
    '  p += dot(p, p + 34.23);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'vec2 hash22(vec2 p) {',
    '  float n = hash21(p);',
    '  return vec2(n, hash21(p + n * 19.19));',
    '}',
    '',
    'float stroke(float d, float aa) {',
    '  return 1.0 - smoothstep(0.35, 0.35 + aa, d);',
    '}',
    '',
    'vec2 facetPoint(vec2 cell) {',
    '  return 0.12 + 0.76 * hash22(cell);',
    '}',
    '',
    'void main() {',
    '  vec2 view = u_res / u_scale;',
    '  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_scale;',
    '  float aa = max(0.8, 1.0 / u_scale);',
    '',
    '  vec2 dm = (p - u_mouse) / max(360.0, 0.32 * max(view.x, view.y));',
    '  float spot = exp(-2.2 * dot(dm, dm));',
    '',
    '  vec3 col = vec3(0.0);',
    '  float alpha = 0.0;',
    '',
    '  /* crystal facets: voronoi cells whose planes catch the pointer light */',
    '  vec2 cp = (p + vec2(0.0, u_scroll * 0.28)) / FACET + u_time * vec2(0.004, 0.0025);',
    '  vec2 ci = floor(cp);',
    '  vec2 cf = fract(cp);',
    '  vec2 mr = vec2(0.0);',
    '  vec2 mg = vec2(0.0);',
    '  float md = 8.0;',
    '  for (int j = -1; j <= 1; j++) {',
    '    for (int i = -1; i <= 1; i++) {',
    '      vec2 g = vec2(float(i), float(j));',
    '      vec2 r = g + facetPoint(ci + g) - cf;',
    '      float d = dot(r, r);',
    '      if (d < md) { md = d; mr = r; mg = g; }',
    '    }',
    '  }',
    '  float edge = 8.0;',
    '  for (int j = -1; j <= 1; j++) {',
    '    for (int i = -1; i <= 1; i++) {',
    '      vec2 g = mg + vec2(float(i), float(j));',
    '      vec2 r = g + facetPoint(ci + g) - cf;',
    '      vec2 dr = r - mr;',
    '      if (dot(dr, dr) > 0.00001) edge = min(edge, dot(0.5 * (mr + r), normalize(dr)));',
    '    }',
    '  }',
    '  float fh = hash21(ci + mg + 5.3);',
    '  vec2 normal = vec2(cos(fh * 6.2831), sin(fh * 6.2831));',
    '  vec2 toLight = u_mouse - p;',
    '  float facing = 0.5 + 0.5 * dot(normal, toLight / (length(toLight) + 1.0));',
    '  float fill = 0.045 * facing * facing * facing * (0.3 + 0.7 * spot);',
    '  float rim = stroke(edge * FACET, aa * 1.4) * (0.05 + 0.11 * spot);',
    '  col += (fh > 0.92 ? VERMILION : CYAN) * fill + CYAN * rim;',
    '  alpha += fill + rim;',
    '',
    '  /* circuit traces and vias, parallax against scroll */',
    '  vec2 q = (p + vec2(0.0, u_scroll * 0.72)) / CELL;',
    '',
    '  float hy = floor(q.y + 0.5);',
    '  vec2 hid = vec2(floor(q.x), hy);',
    '  float hh = hash21(hid + 3.1);',
    '  float hd = abs(q.y - hy) * CELL;',
    '',
    '  float vx = floor(q.x + 0.5);',
    '  vec2 vid = vec2(vx, floor(q.y));',
    '  float vh = hash21(vid + 7.7);',
    '  float vd = abs(q.x - vx) * CELL;',
    '',
    '  vec2 nid = floor(q + 0.5);',
    '  float via = step(0.86, hash21(nid + 11.3)) * stroke(abs(length(q - nid) * CELL - 3.0), aa);',
    '',
    '  float traces = max(max(step(0.62, hh) * stroke(hd, aa), step(0.7, vh) * stroke(vd, aa)), via);',
    '  float traceA = traces * (0.05 + 0.17 * spot);',
    '  col += CYAN * traceA;',
    '  alpha += traceA;',
    '',
    '  /* data pulses on a subset of traces; scrolling speeds them up */',
    '  float glow = (0.22 + 0.3 * spot) * (1.0 + 0.6 * u_energy);',
    '  float hs = hash21(hid + 13.7);',
    '  float hHead = fract(u_pulse * (0.08 + 0.22 * hs) * sign(hs - 0.5) + hh * 7.0);',
    '  float hT = abs(fract(fract(q.x) - hHead + 0.5) - 0.5);',
    '  float hPulse = step(0.8, hh) * exp(-hT * hT * 80.0) * (stroke(hd, aa) + 0.5 * exp(-hd * hd / 6.0));',
    '',
    '  float vs = hash21(vid + 17.3);',
    '  float vHead = fract(u_pulse * (0.08 + 0.22 * vs) * sign(vs - 0.5) + vh * 7.0);',
    '  float vT = abs(fract(fract(q.y) - vHead + 0.5) - 0.5);',
    '  float vPulse = step(0.86, vh) * exp(-vT * vT * 80.0) * (stroke(vd, aa) + 0.5 * exp(-vd * vd / 6.0));',
    '',
    '  col += (hs > 0.86 ? VERMILION : CYAN) * hPulse * glow;',
    '  col += (vs > 0.86 ? VERMILION : CYAN) * vPulse * glow;',
    '  alpha += (hPulse + vPulse) * glow;',
    '',
    '  /* premultiplied output; grain breaks up banding in the faint facet fills */',
    '  float grain = (hash21(gl_FragCoord.xy) - 0.5) / 255.0;',
    '  alpha = clamp(alpha * u_intensity + grain, 0.0, 1.0);',
    '  col = min(clamp(col * u_intensity + grain, 0.0, 1.0), vec3(alpha));',
    '  gl_FragColor = vec4(col, alpha);',
    '}'
  ].join('\n');

  var UNIFORMS = ['u_res', 'u_scale', 'u_time', 'u_pulse', 'u_mouse', 'u_scroll', 'u_energy', 'u_intensity'];

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  var canvas = null;
  var gl = null;
  var uniforms = null;
  var ready = false;
  var rafId = 0;
  var lastNow = 0;
  var clock = 0;
  var pulseClock = 0;
  var lastPointerAt = 0;
  var quality = 1;
  var renderScale = 1;
  var perfTime = 0;
  var perfFrames = 0;
  var cushionOpen = false;
  var optedOut = false;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var scroll = { y: 0, energy: 0 };
  var intensity = { value: 1, target: 1 };

  function prefersReducedMotion() {
    return !!(reduceQuery && reduceQuery.matches);
  }

  function viewWidth() {
    return canvas.clientWidth || window.innerWidth || 1;
  }

  function viewHeight() {
    return canvas.clientHeight || window.innerHeight || 1;
  }

  function compile(type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      if (window.console) console.warn('[fx-backdrop]', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function setupGL() {
    var opts = {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true
    };
    gl = canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts);
    if (!gl) return false;

    var vs = compile(gl.VERTEX_SHADER, VERT_SRC);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return false;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'a_pos');
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    uniforms = {};
    UNIFORMS.forEach(function (name) {
      uniforms[name] = gl.getUniformLocation(program, name);
    });
    return true;
  }

  function resize() {
    if (!ready) return;
    var w = viewWidth();
    var h = viewHeight();
    var s = Math.min(window.devicePixelRatio || 1, MAX_DPR, Math.sqrt(PIXEL_BUDGET / (w * h))) * quality;
    var pw = Math.max(1, Math.round(w * s));
    var ph = Math.max(1, Math.round(h * s));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    renderScale = pw / w;
    gl.viewport(0, 0, pw, ph);
  }

  function draw() {
    if (!ready) return;
    gl.uniform2f(uniforms.u_res, canvas.width, canvas.height);
    gl.uniform1f(uniforms.u_scale, renderScale);
    gl.uniform1f(uniforms.u_time, clock);
    gl.uniform1f(uniforms.u_pulse, pulseClock);
    gl.uniform2f(uniforms.u_mouse, mouse.x, mouse.y);
    gl.uniform1f(uniforms.u_scroll, scroll.y);
    gl.uniform1f(uniforms.u_energy, scroll.energy);
    gl.uniform1f(uniforms.u_intensity, intensity.value);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function ease(rate, dt) {
    return 1 - Math.exp(-rate * dt);
  }

  function shouldAnimate() {
    return ready && !document.hidden && !prefersReducedMotion() && !cushionOpen && !optedOut;
  }

  function trackPerformance(dt) {
    perfTime += dt;
    perfFrames++;
    if (perfTime < 2) return;
    var avg = perfTime / perfFrames;
    perfTime = 0;
    perfFrames = 0;
    if (avg > SLOW_FRAME && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality * 0.8);
      resize();
    }
  }

  function tick(now) {
    rafId = 0;
    if (!shouldAnimate()) return;
    var dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    clock += dt;

    if (clock - lastPointerAt > IDLE_AFTER) {
      mouse.tx = viewWidth() * (0.5 + 0.28 * Math.sin(clock * 0.11));
      mouse.ty = viewHeight() * (0.42 + 0.18 * Math.cos(clock * 0.083));
    }
    mouse.x += (mouse.tx - mouse.x) * ease(22, dt);
    mouse.y += (mouse.ty - mouse.y) * ease(22, dt);

    var prevY = scroll.y;
    var targetY = window.scrollY || window.pageYOffset || 0;
    scroll.y += (targetY - scroll.y) * ease(28, dt);
    var speed = dt > 0 ? Math.abs(scroll.y - prevY) / dt : 0;
    scroll.energy += (Math.min(1, speed / 1200) - scroll.energy) * ease(14, dt);

    intensity.value += (intensity.target - intensity.value) * ease(6, dt);
    pulseClock += dt * (1 + 3.5 * scroll.energy);

    trackPerformance(dt);
    draw();
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (rafId || !shouldAnimate()) return;
    lastNow = 0;
    perfTime = 0;
    perfFrames = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* Paused states keep the last presented frame; reduced motion gets one settled still. */
  function refresh() {
    if (!ready) return;
    if (shouldAnimate()) {
      start();
      return;
    }
    stop();
    if (prefersReducedMotion()) {
      intensity.value = intensity.target;
      scroll.energy = 0;
      draw();
    }
  }

  function syncPageState() {
    var body = document.body;
    if (!body) return;
    intensity.target = body.classList.contains('has-chrome') ? 1 : GATE_INTENSITY;
    cushionOpen = body.classList.contains('cushion-open');
    /* body.fx-off: the page paints its own backdrop and site.css hides the canvas. */
    optedOut = body.classList.contains('fx-off');
    refresh();
  }

  function onResize() {
    resize();
    if (!rafId) draw();
  }

  function onPointer(e) {
    mouse.tx = e.clientX;
    mouse.ty = e.clientY;
    /* Snap most of the way immediately so light tracks the pointer without lag. */
    mouse.x += (mouse.tx - mouse.x) * 0.55;
    mouse.y += (mouse.ty - mouse.y) * 0.55;
    lastPointerAt = clock;
  }

  function teardown() {
    stop();
    ready = false;
    document.documentElement.classList.remove('fx-on');
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  function boot() {
    canvas = document.createElement('canvas');
    canvas.id = 'fx-backdrop';
    canvas.className = 'fx-backdrop';
    canvas.setAttribute('aria-hidden', 'true');
    document.documentElement.appendChild(canvas);

    try {
      ready = setupGL();
    } catch (e) {
      ready = false;
    }
    if (!ready) {
      teardown();
      return;
    }

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      ready = false;
      stop();
    }, false);
    canvas.addEventListener('webglcontextrestored', function () {
      ready = setupGL();
      if (!ready) {
        teardown();
        return;
      }
      resize();
      draw();
      refresh();
    }, false);

    mouse.x = mouse.tx = viewWidth() * 0.5;
    mouse.y = mouse.ty = viewHeight() * 0.42;
    scroll.y = window.scrollY || window.pageYOffset || 0;
    intensity.target = document.body.classList.contains('has-chrome') ? 1 : GATE_INTENSITY;
    intensity.value = intensity.target;

    resize();
    draw();
    document.documentElement.classList.add('fx-on');
    void canvas.offsetWidth;
    canvas.classList.add('is-ready');

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('scroll', function () {
      if (optedOut) return;
      var targetY = window.scrollY || window.pageYOffset || 0;
      scroll.y += (targetY - scroll.y) * 0.65;
      if (!rafId) {
        draw();
        start();
      }
    }, { passive: true });
    document.addEventListener('visibilitychange', refresh);
    if (reduceQuery) {
      if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', refresh);
      else if (reduceQuery.addListener) reduceQuery.addListener(refresh);
    }
    /* bgm.js soft navigation rewrites body attributes (has-chrome / cushion-open) in place. */
    new MutationObserver(syncPageState).observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    syncPageState();
  }

  window.NanokuroFx = { refresh: refresh };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
