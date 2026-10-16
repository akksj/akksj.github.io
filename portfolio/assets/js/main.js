/* Portfolio interactions: plain JS, no dependencies. */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');

  // Static GitHub data gathered on 16 Oct 2026 from github.com/akksj (bytes per language, GitHub linguist).
  // Projects: akksj.github.io, mediq-clinic, udhaar-khata, timetable-generator-php-mysql-
  var LANGUAGES = [
    { name: 'HTML', bytes: 84494, color: '#e34c26' },
    { name: 'JavaScript', bytes: 47952, color: '#f1e05a' },
    { name: 'PHP', bytes: 18838, color: '#8892bf' },
    { name: 'CSS', bytes: 10988, color: '#563d7c' }
  ];

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Mobile nav
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
      }
    });
  }

  // Nav border on scroll
  var nav = document.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Language bar + legend
  var bar = document.getElementById('langbar');
  var legend = document.getElementById('legend');
  if (bar && legend) {
    var total = LANGUAGES.reduce(function (s, l) { return s + l.bytes; }, 0);
    LANGUAGES.forEach(function (l) {
      var pct = (l.bytes / total) * 100;
      var seg = document.createElement('span');
      seg.style.background = l.color;
      seg.style.width = pct + '%';
      seg.title = l.name + ' ' + pct.toFixed(1) + '%';
      bar.appendChild(seg);

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
    bar.setAttribute('aria-label', 'Language breakdown: ' + LANGUAGES.map(function (l) {
      return l.name + ' ' + ((l.bytes / total) * 100).toFixed(1) + '%';
    }).join(', '));
  }

  // Reveal on scroll + active nav link
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });

    var links = document.querySelectorAll('.nav__menu a[href^="#"]');
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }
})();
