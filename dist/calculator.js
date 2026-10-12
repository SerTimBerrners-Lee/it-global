export function calculateCosts({ current, server, extra, setup }) {
  const clean = value => Math.min(10000000, Math.max(0, Number(value) || 0));
  const before = clean(current);
  const after = clean(server) + clean(extra);
  const implementation = clean(setup);
  const monthlySavings = before - after;
  const firstYear = after * 12 + implementation;
  return {
    before, after, setup: implementation, monthlySavings, firstYear,
    firstYearSavings: before * 12 - firstYear,
    factor: after > 0 ? before / after : null,
    payback: monthlySavings > 0 ? implementation / monthlySavings : null,
  };
}
