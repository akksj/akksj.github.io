/* Sarthak Giri · Portfolio — cinematic scroll story.
   Libraries (CDN, pinned): GSAP 3.13.0 + ScrollTrigger, Lenis 1.3.27.
   Everything degrades gracefully: without JS, without the CDN, or with
   prefers-reduced-motion the page is fully readable and static. */
(function () {
  'use strict';

  var root = document.documentElement;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q).matches : false; };
  var REDUCE = mq('(prefers-reduced-motion: reduce)');
  var FINE = mq('(hover: hover) and (pointer: fine)');
  var SMALL = mq('(max-width: 899px)');
  var HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  var MOTION = HAS_GSAP && !REDUCE;

  // Static GitHub data gathered on 16 Oct 2026 from github.com/akksj (bytes per language, GitHub linguist).
  // Projects: akksj.github.io, mediq-clinic, udhaar-khata, timetable-generator-php-mysql-
  var LANGUAGES = [
    { name: 'HTML', bytes: 84494, color: '#e34c26' },
    { name: 'JavaScript', bytes: 47952, color: '#f1e05a' },
    { name: 'PHP', bytes: 18838, color: '#8892bf' },
    { name: 'CSS', bytes: 10988, color: '#563d7c' }
  ];

  /* ------------------------------------------------------------------ basics */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var loader = document.getElementById('loader');
  setTimeout(function () { if (loader) loader.classList.add('done'); }, REDUCE ? 0 : 1450);

  var toggle = document.querySelector('.nav__toggle');
  var menu = document.getElementById('nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
      }
    });
  }

  var nav = document.querySelector('.nav');
  var bar = document.getElementById('progress-bar');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('scrolled', y > 8);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    scrollRatio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    if (bar) bar.style.transform = 'scaleX(' + scrollRatio + ')';
  }
  var scrollRatio = 0;
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Language bar + legend
  var langbar = document.getElementById('langbar');
  var legend = document.getElementById('legend');
  if (langbar && legend) {
    var total = LANGUAGES.reduce(function (s, l) { return s + l.bytes; }, 0);
    LANGUAGES.forEach(function (l) {
      var pct = (l.bytes / total) * 100;
      var seg = document.createElement('span');
      seg.style.background = l.color;
      seg.style.width = pct + '%';
      seg.title = l.name + ' ' + pct.toFixed(1) + '%';
      langbar.appendChild(seg);
      var li = document.createElement('li');
      var dot = document.createElement('i');
      dot.style.background = l.color;
      li.appendChild(dot);
      li.appendChild(document.createTextNode(l.name));
      var b = document.createElement('b');
      b.textContent = pct.toFixed(1) + '%';
      li.appendChild(b);
      legend.appendChild(li);
    });
    langbar.setAttribute('aria-label', 'Language breakdown: ' + LANGUAGES.map(function (l) {
      return l.name + ' ' + ((l.bytes / total) * 100).toFixed(1) + '%';
    }).join(', '));
  }

  // Active chapter (top nav + side rail)
  var navLinks = document.querySelectorAll('.nav__menu a[href^="#"], .rail a[href^="#"]');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------- pointer (shared state) */
  var pointer = { x: window.innerWidth / 2, y: window.innerHeight * 0.4, nx: 0.5, ny: 0.6, active: false };
  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.nx = e.clientX / window.innerWidth; pointer.ny = 1 - e.clientY / window.innerHeight;
    pointer.active = true;
  }, { passive: true });

  /* -------------------------------------------- WebGL aurora (shader field) */
  (function aurora() {
    var canvas = document.getElementById('aurora');
    if (!canvas) return;
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) { canvas.style.display = 'none'; return; }

    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = [
      'precision mediump float;',
      'uniform vec2 u_res;uniform float u_time;uniform vec2 u_mouse;uniform float u_scroll;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
      ' return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
      'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
      'void main(){',
      ' vec2 p=(gl_FragCoord.xy-.5*u_res)/u_res.y;',
      ' vec2 m=(u_mouse-.5)*vec2(u_res.x/u_res.y,1.);',
      ' float t=u_time*.045; float d=length(p-m);',
      ' vec2 q=vec2(fbm(p*1.4+vec2(t,-t*.6)),fbm(p*1.4+vec2(-t*.8,t)+3.1));',
      ' vec2 warp=(m-p)*.45*exp(-d*2.2);',
      ' vec2 r=vec2(fbm(p*1.9+q*1.7+warp+vec2(t*1.6,0.)),fbm(p*1.9+q*1.7-warp-vec2(0.,t*1.3)));',
      ' float f=fbm(p*1.6+r*1.8);',
      ' vec3 c1=vec3(.43,.91,.72),c2=vec3(.38,.65,.98),c3=vec3(.65,.55,.98),c4=vec3(.96,.45,.71);',
      ' vec3 a=mix(c1,c3,smoothstep(.15,.65,u_scroll)); vec3 b=mix(c2,c4,smoothstep(.35,1.,u_scroll));',
      ' vec3 col=mix(a,b,clamp(r.x*1.6-.3,0.,1.));',
      ' float band=pow(smoothstep(.25,.95,f),2.2);',
      ' float ribbon=exp(-pow((p.y-.18*sin(p.x*1.6+t*3.)-(r.y-.5)*.6)*3.2,2.));',
      ' col*=band*1.25+ribbon*band*1.4;',
      ' col+=a*.22*exp(-d*3.2);',
      ' col*=.62;',
      ' col+=vec3(.012,.016,.045);',
      ' gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n');

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { return null; }
      return s;
    }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) { canvas.style.display = 'none'; return; }
    var prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, 'u_res'), uTime = gl.getUniformLocation(prog, 'u_time'),
        uMouse = gl.getUniformLocation(prog, 'u_mouse'), uScroll = gl.getUniformLocation(prog, 'u_scroll');

    // Render at reduced resolution: the field is soft, so this is invisible and cheap.
    var scale = SMALL || !FINE ? 0.28 : 0.42;
    function resize() {
      canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    var mx = 0.5, my = 0.6, sc = 0, start = performance.now(), last = 0, running = true;
    var frameGap = SMALL || !FINE ? 1000 / 30 : 0;
    function draw(now) {
      mx += (pointer.nx - mx) * 0.05; my += (pointer.ny - my) * 0.05; sc += (scrollRatio - sc) * 0.06;
      gl.uniform1f(uTime, (now - start) / 1000 + 20.0);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uScroll, sc);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    function loop(now) {
      if (!running) return;
      requestAnimationFrame(loop);
      if (frameGap && now - last < frameGap) return;
      last = now; draw(now);
    }
    if (REDUCE) { draw(performance.now()); }
    else {
      requestAnimationFrame(loop);
      document.addEventListener('visibilitychange', function () {
        running = !document.hidden;
        if (running) requestAnimationFrame(loop);
      });
    }
    requestAnimationFrame(function () { canvas.classList.add('ready'); });
  })();

  /* ---------------------------------- particle dust that reacts to the mouse */
  (function dust() {
    if (REDUCE) return;
    var c = document.getElementById('dust');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, SMALL ? 1 : 1.5);
    var W, H, parts = [];
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(SMALL ? 34 : 110, (W * H) / (SMALL ? 12000 : 13000)));
      parts = [];
      for (var i = 0; i < n; i++) {
        var z = Math.random();
        parts.push({ x: Math.random() * W, y: Math.random() * H, z: z, vx: (Math.random() - 0.5) * 0.15, vy: -0.05 - z * 0.25, ox: 0, oy: 0, tw: Math.random() * 6.28 });
      }
    }
    resize();
    window.addEventListener('resize', resize);
    var lastY = window.scrollY, running = true;
    var hues = ['110,231,183', '96,165,250', '167,139,250', '244,114,182'];
    function frame() {
      if (!running) return;
      requestAnimationFrame(frame);
      var sy = window.scrollY, dy = sy - lastY; lastY = sy;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      var hue = hues[Math.min(3, Math.floor(scrollRatio * 4))];
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy - dy * (0.05 + p.z * 0.25); p.tw += 0.03;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
        var dx = p.x - pointer.x, dyy = p.y - pointer.y, d2 = dx * dx + dyy * dyy;
        if (FINE && pointer.active && d2 < 22000) {
          var force = (1 - d2 / 22000) * 18;
          var dd = Math.sqrt(d2) || 1;
          p.ox += (dx / dd * force - p.ox) * 0.1; p.oy += (dyy / dd * force - p.oy) * 0.1;
          var a = (1 - d2 / 22000) * 0.35;
          ctx.strokeStyle = 'rgba(' + hue + ',' + a.toFixed(3) + ')';
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(pointer.x, pointer.y); ctx.lineTo(p.x + p.ox, p.y + p.oy); ctx.stroke();
        } else { p.ox *= 0.94; p.oy *= 0.94; }
        var r = 0.6 + p.z * 1.8;
        var al = (0.25 + p.z * 0.55) * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.fillStyle = 'rgba(' + hue + ',' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x + p.ox, p.y + p.oy, r, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden; if (running) requestAnimationFrame(frame);
    });
  })();

  /* -------------------------------------------------------- custom cursor */
  (function cursor() {
    if (REDUCE || !FINE) return;
    var el = document.querySelector('.cursor');
    if (!el) return;
    var dot = el.querySelector('.cursor__dot'), ring = el.querySelector('.cursor__ring');
    root.classList.add('has-cursor');
    var rx = pointer.x, ry = pointer.y;
    el.classList.add('is-hidden');
    window.addEventListener('pointermove', function () { el.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('mouseleave', function () { el.classList.add('is-hidden'); });
    window.addEventListener('pointerdown', function () { el.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { el.classList.remove('is-down'); });
    document.addEventListener('pointerover', function (e) {
      el.classList.toggle('is-link', !!(e.target.closest && e.target.closest('a, button, .chips li, .tilt')));
    });
    (function tick() {
      rx += (pointer.x - rx) * 0.18; ry += (pointer.y - ry) * 0.18;
      dot.style.transform = 'translate3d(' + pointer.x + 'px,' + pointer.y + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(tick);
    })();
  })();

  /* ------------------------------------------------------------ no motion */
  if (!MOTION) return;

  /* ===================================================== GSAP story layer */
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('fx');

  // Smooth scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger stays in sync.
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === '#intro' ? -200 : 0, duration: 1.6 });
    else target.scrollIntoView({ behavior: 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ---------- Chapter 00: split-letter name, glow, gradient sweep ---------- */
  var name = document.getElementById('hero-name');
  var chars = [];
  if (name) {
    var text = name.textContent.trim();
    name.setAttribute('aria-label', text);
    name.textContent = '';
    text.split(' ').forEach(function (w, wi) {
      var word = document.createElement('span');
      word.className = 'word'; word.setAttribute('aria-hidden', 'true');
      w.split('').forEach(function (ch) {
        var s = document.createElement('span'); s.className = 'char'; s.textContent = ch;
        word.appendChild(s); chars.push(s);
      });
      name.appendChild(word);
      if (wi < text.split(' ').length - 1) name.appendChild(document.createTextNode(' '));
    });
    name.classList.add('split');
    var sweepTween = null;
    var measure = function () {
      var w = Math.max(name.offsetWidth, 300) * 1.5;
      name.style.setProperty('--w', w + 'px');
      chars.forEach(function (c) { c.style.setProperty('--x', (c.offsetLeft + (c.parentNode.offsetLeft || 0) * 0) + 'px'); });
      if (sweepTween) sweepTween.kill();
      gsap.set(name, { '--sweep': '0px' });
      sweepTween = gsap.to(name, { '--sweep': -w + 'px', duration: 7, ease: 'none', repeat: -1 });
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
  }

  var heroBits = gsap.utils.toArray('.hero__kicker, .hero__hi, .hero__role, .hero__intro, .hero__cta, .hero__note, .scrollcue');
  gsap.set(heroBits, { autoAlpha: 0, y: 24 });
  gsap.set(chars, { yPercent: 115, rotationX: -95, autoAlpha: 0, filter: 'blur(14px)', transformOrigin: '50% 100% -30px' });
  var intro = gsap.timeline({ delay: 0.95 });
  intro
    .to('.hero__kicker, .hero__hi', { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' })
    .to(chars, { yPercent: 0, rotationX: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 1.1, stagger: 0.04, ease: 'expo.out' }, '-=0.35')
    .fromTo(name, { filter: 'drop-shadow(0 0 0 rgba(110,231,183,0)) brightness(1.8)' },
      { filter: 'drop-shadow(0 0 30px rgba(110,231,183,.28)) brightness(1)', duration: 1.4, ease: 'power2.out', clearProps: 'filter' }, '-=0.9')
    .to('.hero__role, .hero__intro, .hero__cta, .hero__note, .scrollcue', { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }, '-=1.0');

  // Hero exits like a camera pull-back.
  gsap.to('.hero__inner', {
    yPercent: -18, scale: 0.92, autoAlpha: 0, filter: 'blur(8px)', ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 15%', scrub: true }
  });

  /* ---------- generic reveals for chapter intros ---------- */
  gsap.utils.toArray('.chapter__intro').forEach(function (h) {
    gsap.from(h.children, {
      y: 50, autoAlpha: 0, filter: 'blur(8px)', duration: 1, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: h, start: 'top 82%' }
    });
  });

  /* ---------- Chapter 01: word-by-word statement + pinned problem deck ---------- */
  var ptitle = document.querySelector('.problem__title');
  if (ptitle) {
    var words = ptitle.textContent.trim().split(/\s+/);
    ptitle.setAttribute('aria-label', ptitle.textContent.trim());
    ptitle.innerHTML = words.map(function (w, i) {
      var cls = i >= words.length - 2 ? 'w em' : 'w';
      return '<span class="' + cls + '" aria-hidden="true">' + (i >= words.length - 2 ? '<em>' + w + '</em>' : w) + '</span>';
    }).join(' ');
    gsap.from(ptitle.querySelectorAll('.w'), {
      yPercent: 60, autoAlpha: 0, rotationX: -60, filter: 'blur(10px)', duration: 0.9, stagger: 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: '.problem', start: 'top 70%' }
    });
    gsap.from('.problem__lead, .problem__counter, .problem__bars, .problem .kicker', {
      y: 20, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: '.problem', start: 'top 65%' }
    });
  }

  var mm = gsap.matchMedia();
  var cards = gsap.utils.toArray('.pcard');
  var bars = gsap.utils.toArray('.problem__bars i');
  var pcount = document.getElementById('pcount');

  mm.add('(min-width: 900px)', function () {
    // Problem deck: cards replace each other in 3D while the chapter is pinned.
    gsap.set(cards, { autoAlpha: 0, yPercent: 40, rotationX: -28, scale: 0.9, transformOrigin: '50% 100%' });
    gsap.set(cards[0], { autoAlpha: 1, yPercent: 0, rotationX: 0, scale: 1 });
    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: 1 },
      scrollTrigger: {
        trigger: '.problem', start: 'top top', end: '+=' + (cards.length * 85) + '%', pin: true, scrub: 0.8, anticipatePin: 1,
        onUpdate: function (self) {
          var idx = Math.min(cards.length - 1, Math.floor(self.progress * cards.length * 0.999));
          if (pcount) pcount.textContent = '0' + (idx + 1);
          bars.forEach(function (b, i) {
            var p = Math.min(1, Math.max(0, self.progress * cards.length - i));
            b.style.setProperty('--p', p.toFixed(3));
          });
        }
      }
    });
    cards.forEach(function (c, i) {
      if (i === 0) { tl.to({}, { duration: 0.6 }); return; }
      tl.to(cards[i - 1], { autoAlpha: 0, yPercent: -35, rotationX: 22, scale: 0.88 }, '>')
        .to(c, { autoAlpha: 1, yPercent: 0, rotationX: 0, scale: 1 }, '<0.15')
        .to({}, { duration: 0.6 });
    });

    // Project scenes: each scene pins full-screen and the next one slides over it.
    var scenes = gsap.utils.toArray('.scene');
    scenes.forEach(function (scene, i) {
      var card = scene.querySelector('.scene__card');
      var num = scene.querySelector('.scene__bgnum');
      var vis = scene.querySelector('.scene__visual');
      var txt = scene.querySelectorAll('.scene__text > *');
      gsap.fromTo(card, { y: 140, scale: 0.9, autoAlpha: 0 }, {
        y: 0, scale: 1, autoAlpha: 1, ease: 'power2.out',
        scrollTrigger: { trigger: scene, start: 'top 95%', end: 'top 20%', scrub: 0.6 }
      });
      gsap.from(txt, {
        y: 40, autoAlpha: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out',
        scrollTrigger: { trigger: scene, start: 'top 45%' }
      });
      gsap.fromTo(num, { y: 160 }, { y: -160, ease: 'none', scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo(vis, { y: 70 }, { y: -40, ease: 'none', scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: true } });
      if (i < scenes.length - 1) {
        ScrollTrigger.create({ trigger: scene, start: 'top top', end: '+=100%', pin: true, pinSpacing: false });
        var out = gsap.timeline({ scrollTrigger: { trigger: scenes[i + 1], start: 'top 95%', end: 'top 20%', scrub: true } });
        out.to(card, { scale: 0.84, autoAlpha: 0.15, y: -50, rotationX: 0, ease: 'power1.in', immediateRender: false }, 0)
           .to(num, { autoAlpha: 0, ease: 'none', immediateRender: false }, 0);
      }
    });

    // Skills: rings fly in from the core.
    gsap.from('.ring', {
      scale: 0.2, autoAlpha: 0, rotation: -40, duration: 1.4, stagger: 0.15, ease: 'expo.out',
      scrollTrigger: { trigger: '#orbit', start: 'top 75%' }
    });
    gsap.from('.orbit__core', { scale: 0, autoAlpha: 0, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '#orbit', start: 'top 75%' } });
  });

  mm.add('(max-width: 899px)', function () {
    gsap.utils.toArray('.pcard, .scene__card, .ring').forEach(function (el) {
      gsap.from(el, { y: 50, autoAlpha: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
  });

  /* ---------- 3D tilt + hover glow + magnetic buttons (mouse only) ---------- */
  if (FINE) {
    gsap.utils.toArray('.tilt').forEach(function (card) {
      var rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      var ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      gsap.set(card, { transformPerspective: 1200 });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        rx((0.5 - y) * 8); ry((x - 0.5) * 10);
        card.style.setProperty('--mx', (x * 100) + '%'); card.style.setProperty('--my', (y * 100) + '%');
      });
      card.addEventListener('pointerleave', function () { rx(0); ry(0); });
    });
    gsap.utils.toArray('[data-magnetic]').forEach(function (b) {
      var qx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' });
      var qy = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.3); qy((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener('pointerleave', function () { qx(0); qy(0); });
    });
    // Orbit parallax: rings drift with the mouse at different depths.
    var orbit = document.getElementById('orbit');
    if (orbit && !SMALL) {
      var rings = gsap.utils.toArray('.ring').map(function (r, i) {
        return { x: gsap.quickTo(r, 'x', { duration: 1.2, ease: 'power3.out' }), y: gsap.quickTo(r, 'y', { duration: 1.2, ease: 'power3.out' }), d: (i + 1) * 7 };
      });
      document.querySelector('.skills').addEventListener('pointermove', function (e) {
        var cx = e.clientX / window.innerWidth - 0.5, cy = e.clientY / window.innerHeight - 0.5;
        rings.forEach(function (r) { r.x(cx * r.d); r.y(cy * r.d); });
      });
    }
  }

  /* ---------- languages bar grows in ---------- */
  gsap.from('.langbar span', { scaleX: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.langs', start: 'top 80%' } });
  gsap.from('.langs', { y: 50, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.langs', start: 'top 88%' } });

  /* ---------- Chapter 04: SVG journey line draws on scroll ---------- */
  var path = document.getElementById('tl-path');
  var tlBox = document.getElementById('timeline');
  if (path && tlBox) {
    var svg = path.ownerSVGElement;
    var comet = document.createElement('span');
    comet.className = 'timeline__comet'; comet.setAttribute('aria-hidden', 'true');
    tlBox.appendChild(comet);
    var len = path.getTotalLength();
    path.setAttribute('pathLength', '1');
    gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
    var placeComet = function (p) {
      var pt = path.getPointAtLength(len * p);
      var sr = svg.getBoundingClientRect(), br = tlBox.getBoundingClientRect();
      var x = sr.left - br.left + (pt.x / 100) * sr.width;
      var y = sr.top - br.top + (pt.y / 1000) * sr.height;
      comet.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      comet.style.opacity = p > 0.005 && p < 0.995 ? 1 : 0;
    };
    gsap.to(path, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: tlBox, start: 'top 65%', end: 'bottom 65%', scrub: 0.5, onUpdate: function (s) { placeComet(s.progress); } }
    });
    gsap.utils.toArray('.ms').forEach(function (m, i) {
      gsap.from(m.querySelector('.ms__card'), {
        x: SMALL ? 30 : (i % 2 ? 80 : -80), autoAlpha: 0, rotationY: SMALL ? 0 : (i % 2 ? -18 : 18), filter: 'blur(6px)', duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: m, start: 'top 72%' }
      });
    });
  }

  /* ---------- stats count up ---------- */
  gsap.utils.toArray('.stat__num').forEach(function (el) {
    var end = parseInt(el.getAttribute('data-count'), 10) || 0;
    var o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.6, ease: 'power2.out',
      onUpdate: function () { el.textContent = Math.round(o.v); },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });
  gsap.from('.stat', { y: 40, autoAlpha: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 90%' } });

  /* ---------- Chapter 05: finale ---------- */
  gsap.from('.contact__inner > *', {
    y: 60, autoAlpha: 0, filter: 'blur(10px)', duration: 1.1, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact', start: 'top 65%' }
  });
  gsap.fromTo('.contact__title', { scale: 0.85, letterSpacing: '0.02em' }, {
    scale: 1, letterSpacing: '-0.05em', ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'center center', scrub: true }
  });

  // Recalculate once fonts and layout settle.
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
