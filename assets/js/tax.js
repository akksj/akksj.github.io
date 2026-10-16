/*
 * SwitchKit India — CTC to in-hand salary engine (pure functions, no DOM).
 * New tax regime, FY 2026-27 (tax year 2026-27). Resident individual, salaried.
 * Used by calculator.html in the browser and by tests/test_calc.js under Node.
 *
 * Rules (verified Oct 2026 against incometax.gov.in / Finance Act 2025):
 *  - Slabs: 0-4L nil, 4-8L 5%, 8-12L 10%, 12-16L 15%, 16-20L 20%, 20-24L 25%, >24L 30%
 *  - Standard deduction Rs 75,000 for salaried
 *  - Rebate (s.87A of the 1961 Act, s.156 of the Income-tax Act 2025): full rebate up to
 *    Rs 60,000 if taxable income <= Rs 12L; marginal relief just above Rs 12L
 *  - Surcharge (new regime): 10% > 50L, 15% > 1Cr, 25% > 2Cr, with marginal relief
 *  - Health & education cess 4% on tax + surcharge
 */
(function (root) {
  'use strict';

  var SLABS = [
    [400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15],
    [2000000, 0.20], [2400000, 0.25], [Infinity, 0.30]
  ];
  var STANDARD_DEDUCTION = 75000;
  var REBATE_LIMIT = 1200000;
  var REBATE_MAX = 60000;
  var CESS = 0.04;
  var GRATUITY_RATE = 0.0481; // 15/26 days per year of service ≈ 4.81% of basic (common CTC provision)
  var PF_RATE = 0.12;
  var PF_WAGE_CEILING = 15000 * 12;
  var SURCHARGE = [[5000000, 0.10], [10000000, 0.15], [20000000, 0.25]];

  function slabTax(income) {
    var tax = 0, lower = 0;
    for (var i = 0; i < SLABS.length; i++) {
      var upper = SLABS[i][0], rate = SLABS[i][1];
      if (income > lower) tax += (Math.min(income, upper) - lower) * rate;
      lower = upper;
    }
    return tax;
  }

  // Tax after rebate / marginal relief (before surcharge and cess)
  function taxAfterRebate(taxable) {
    var t = slabTax(taxable);
    if (taxable <= REBATE_LIMIT) return Math.max(0, t - Math.min(t, REBATE_MAX));
    return Math.min(t, taxable - REBATE_LIMIT); // marginal relief
  }

  function surchargeRate(taxable) {
    var r = 0;
    for (var i = 0; i < SURCHARGE.length; i++) if (taxable > SURCHARGE[i][0]) r = SURCHARGE[i][1];
    return r;
  }

  // Tax + surcharge (with marginal relief on surcharge), before cess
  function taxWithSurcharge(taxable) {
    var base = taxAfterRebate(taxable);
    var rate = surchargeRate(taxable);
    if (rate === 0) return { tax: base, surcharge: 0 };
    var threshold = 0;
    for (var i = 0; i < SURCHARGE.length; i++) if (taxable > SURCHARGE[i][0]) threshold = SURCHARGE[i][0];
    var atThreshold = taxAfterRebate(threshold) * (1 + surchargeRate(threshold));
    var full = base * (1 + rate);
    var capped = Math.min(full, atThreshold + (taxable - threshold));
    return { tax: base, surcharge: capped - base };
  }

  function totalTax(taxable) {
    var t = taxWithSurcharge(Math.max(0, taxable));
    var cess = (t.tax + t.surcharge) * CESS;
    return { slab: slabTax(Math.max(0, taxable)), afterRebate: t.tax, surcharge: t.surcharge, cess: cess, total: t.tax + t.surcharge + cess };
  }

  /**
   * opts: {
   *   ctc (Rs/yr), basicPct (0-100, % of CTC), variable (Rs/yr, part of CTC),
   *   employerPfInCtc (bool, default true), gratuityInCtc (bool, default true),
   *   pfCapped (bool, default false: PF on full basic), professionalTax (Rs/yr, default 2400)
   * }
   */
  function compute(opts) {
    var ctc = Number(opts.ctc) || 0;
    var basicPct = opts.basicPct == null ? 40 : Number(opts.basicPct);
    var variable = Number(opts.variable) || 0;
    var employerPfInCtc = opts.employerPfInCtc !== false;
    var gratuityInCtc = opts.gratuityInCtc !== false;
    var pfCapped = !!opts.pfCapped;
    var pt = opts.professionalTax == null ? 2400 : Number(opts.professionalTax);

    var basic = ctc * basicPct / 100;
    var pfBase = pfCapped ? Math.min(basic, PF_WAGE_CEILING) : basic;
    var employeePf = PF_RATE * pfBase;
    var employerPf = employerPfInCtc ? PF_RATE * pfBase : 0;
    var gratuity = gratuityInCtc ? GRATUITY_RATE * basic : 0;
    var gross = ctc - employerPf - gratuity;           // taxable salary paid to you
    var taxable = Math.max(0, gross - STANDARD_DEDUCTION);
    var tax = totalTax(taxable);
    var inHandYear = gross - employeePf - pt - tax.total;

    // Split: what you get every month vs. the variable payout (taxed at the margin)
    var taxableFixed = Math.max(0, gross - variable - STANDARD_DEDUCTION);
    var taxFixed = totalTax(taxableFixed).total;
    var fixedInHandYear = gross - variable - employeePf - pt - taxFixed;
    var variableInHand = variable - (tax.total - taxFixed);

    var errors = [];
    if (!(ctc > 0)) errors.push('Enter a CTC greater than zero.');
    if (basicPct < 0 || basicPct > 100) errors.push('Basic must be between 0% and 100% of CTC.');
    if (variable < 0) errors.push('Variable pay cannot be negative.');
    if (ctc > 0 && variable >= gross) errors.push('Variable pay is larger than the salary left after PF and gratuity. Check the numbers.');
    if (ctc > 0 && basic + variable > gross) errors.push('Basic + variable is more than your gross salary. Check the basic % and variable amount.');

    return {
      errors: errors,
      ctc: ctc, basic: basic, pfBase: pfBase, employerPf: employerPf, gratuity: gratuity,
      gross: gross, standardDeduction: STANDARD_DEDUCTION, taxable: taxable,
      slabTax: tax.slab, rebate: tax.slab - tax.afterRebate, taxAfterRebate: tax.afterRebate,
      surcharge: tax.surcharge, cess: tax.cess, incomeTax: tax.total,
      employeePf: employeePf, professionalTax: pt,
      inHandYear: inHandYear, inHandMonthAvg: inHandYear / 12,
      fixedInHandMonth: fixedInHandYear / 12, variableInHand: variableInHand,
      inHandPctOfCtc: ctc > 0 ? inHandYear / ctc : 0
    };
  }

  var api = { slabTax: slabTax, taxAfterRebate: taxAfterRebate, totalTax: totalTax, compute: compute,
              constants: { SLABS: SLABS, STANDARD_DEDUCTION: STANDARD_DEDUCTION, REBATE_LIMIT: REBATE_LIMIT,
                           REBATE_MAX: REBATE_MAX, CESS: CESS, GRATUITY_RATE: GRATUITY_RATE } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SwitchKitTax = api;
})(this);
