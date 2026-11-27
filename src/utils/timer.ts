export function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0 soniya';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m === 0 ? `${s} soniya` : `${m} daqiqa ${s} soniya`;
}
