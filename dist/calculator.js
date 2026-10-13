/**
 * @typedef {Object} CostInput
 * @property {number | string} current
 * @property {'single' | 'bundle'} plan
 * @property {boolean} needsVds
 */

/**
 * @typedef {Object} CostCalculation
 * @property {'single' | 'bundle'} plan
 * @property {boolean} needsVds
 * @property {number} before
 * @property {number} after
 * @property {number} setup
 * @property {number} monthlySavings
 * @property {number} annualBefore
 * @property {number} annualServer
 * @property {number} firstYear
 * @property {number} firstYearBalance
 * @property {number} firstYearSavings
 * @property {number} firstYearExtraCost
 * @property {number | null} payback
 */

/** @param {CostInput} input @returns {CostCalculation} */
export function calculateCosts({ current, plan, needsVds }) {
  const before = Math.min(1000000, Math.max(1000, Number(current) || 1000));
  const selectedPlan = plan === "single" ? "single" : "bundle";
  const serverRequired = needsVds === true;
  const after = serverRequired ? 3000 : 0;
  const setup = selectedPlan === "single" ? 9900 : 49900;
  const monthlySavings = before - after;
  const annualBefore = before * 12;
  const annualServer = after * 12;
  const firstYear = annualServer + setup;
  const firstYearBalance = annualBefore - firstYear;

  return {
    plan: selectedPlan,
    needsVds: serverRequired,
    before,
    after,
    setup,
    monthlySavings,
    annualBefore,
    annualServer,
    firstYear,
    firstYearBalance,
    firstYearSavings: Math.max(0, firstYearBalance),
    firstYearExtraCost: Math.max(0, -firstYearBalance),
    payback: monthlySavings > 0 ? setup / monthlySavings : null,
  };
}
