// Calculator UI: reads the form, calls SwitchKitTax.compute, renders results.
(function () {
  var T = window.SwitchKitTax;
  var form = document.getElementById('calc-form');
  if (!T || !form) return;
  var $ = function (id) { return document.getElementById(id); };
  var inr = function (n) {
    return '₹' + Math.round(n).toLocaleString('en-IN');
  };
  var lakh = function (n) { return '₹' + (n / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L'; };

  // Prefill from query string, e.g. calculator.html?ctc=1800000&basic=40&variable=150000
  var q = new URLSearchParams(location.search);
  [['ctc', 'ctc'], ['basic', 'basicPct'], ['variable', 'variable'], ['pt', 'pt']].forEach(function (p) {
    var v = q.get(p[0]);
    if (v !== null && v !== '' && !isNaN(Number(v))) $(p[1]).value = Number(v);
  });

  function row(label, value, cls) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + label + '</td><td class="num">' + value + '</td></tr>';
  }

  function render() {
    var r = T.compute({
      ctc: $('ctc').value,
      basicPct: $('basicPct').value,
      variable: $('variable').value || 0,
      employerPfInCtc: $('employerPf').checked,
      gratuityInCtc: $('gratuity').checked,
      pfCapped: $('pfCapped').checked,
      professionalTax: $('pt').value === '' ? 0 : $('pt').value
    });
    $('ctc-words').textContent = r.ctc > 0 ? lakh(r.ctc) + ' per year' : '';
    $('calc-error').textContent = r.errors.join(' ');
    if (r.errors.length && !(r.ctc > 0)) return;

    $('out-month').textContent = inr(r.fixedInHandMonth);
    $('out-year').textContent = inr(r.inHandYear);
    $('out-pct').textContent = (r.inHandPctOfCtc * 100).toFixed(1) + '% of CTC';
    $('out-variable').textContent = Number($('variable').value) > 0
      ? 'Plus about ' + inr(r.variableInHand) + ' from variable pay after tax, if paid in full.'
      : 'No variable pay entered.';

    var rows = '';
    rows += row('Annual CTC', inr(r.ctc));
    rows += row('Employer PF (inside CTC, not paid to you)', '− ' + inr(r.employerPf), 'sub');
    rows += row('Gratuity provision (inside CTC, paid only after 5 yrs)', '− ' + inr(r.gratuity), 'sub');
    rows += row('Gross salary', inr(r.gross), 'total');
    rows += row('Standard deduction', '− ' + inr(r.standardDeduction), 'sub');
    rows += row('Taxable income', inr(r.taxable));
    rows += row('Tax as per slabs', inr(r.slabTax), 'sub');
    rows += row('Rebate / marginal relief', '− ' + inr(r.rebate), 'sub');
    if (r.surcharge > 0) rows += row('Surcharge', inr(r.surcharge), 'sub');
    rows += row('Health &amp; education cess (4%)', inr(r.cess), 'sub');
    rows += row('Total income tax', inr(r.incomeTax), 'total');
    rows += row('Gross salary', inr(r.gross));
    rows += row('Employee PF (12% of ' + ($('pfCapped').checked ? 'capped ' : '') + 'basic)', '− ' + inr(r.employeePf));
    rows += row('Professional tax', '− ' + inr(r.professionalTax));
    rows += row('Income tax', '− ' + inr(r.incomeTax));
    rows += row('In-hand per year', inr(r.inHandYear), 'total');
    rows += row('Average per month (incl. variable)', inr(r.inHandMonthAvg));
    $('breakdown').innerHTML = rows;

    // Keep the URL shareable without reloading
    var p = new URLSearchParams({ ctc: $('ctc').value, basic: $('basicPct').value, variable: $('variable').value || 0 });
    history.replaceState(null, '', location.pathname + '?' + p.toString());
  }

  form.addEventListener('input', render);
  form.addEventListener('submit', function (e) { e.preventDefault(); render(); });
  render();
})();
