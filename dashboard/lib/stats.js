export function mean(nums) {
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

export function stdDev(nums) {
  const m = mean(nums);
  const variance = mean(nums.map((n) => (n - m) ** 2));
  return Math.sqrt(variance);
}

export function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

export function iqrBounds(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  return { q1, q3, lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
}

export function zScore(value, sample) {
  const sd = stdDev(sample);
  return sd === 0 ? 0 : (value - mean(sample)) / sd;
}
