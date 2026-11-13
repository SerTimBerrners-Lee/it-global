/**
 * @typedef {{volume: number, before: number, after: number, hourly: number, operating: number, investment: number}} EffectInputs
 * @typedef {{hours: number, capacityValue: number, net: number, payback: number | null}} EffectResult
 */

/** @param {EffectInputs} inputs @returns {EffectResult | null} */
export function calculateEffect(inputs) {
  const limits = { volume: [1, 1_000_000], before: [0, 10_000], after: [0, 10_000], hourly: [0, 100_000], operating: [0, 100_000_000], investment: [0, 1_000_000_000] };

  for (const key of Object.keys(limits)) {
    const value = inputs[key];
    const [minimum, maximum] = limits[key];

    if (!Number.isFinite(value) || value < minimum || value > maximum) return null;
  }

  if (!Number.isInteger(inputs.volume)) return null;

  const hours = inputs.volume * (inputs.before - inputs.after) / 60;
  const capacityValue = hours * inputs.hourly;
  const net = capacityValue - inputs.operating;

  return { hours, capacityValue, net, payback: net > 0 ? inputs.investment / net : null };
}
