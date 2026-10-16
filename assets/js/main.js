// Mobile nav toggle + footer year. No dependencies.
(function () {
  var t = document.querySelector('.nav-toggle');
  var l = document.querySelector('.nav-links');
  if (t && l) {
    t.addEventListener('click', function () {
      var open = l.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
