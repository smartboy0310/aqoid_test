export function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  return arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
}

/**
 * Cronbach alpha — testning ichki izchilligi (reliability).
 * itemScores[i] — i-savol bo'yicha har bir talabaning 0/1 natijasi.
 * alpha = (k/(k-1)) * (1 - sum(item variance) / total variance)
 */
export function cronbachAlpha(itemScores: number[][]): number | null {
  const k = itemScores.length;
  if (k < 2) return null;
  const n = itemScores[0]?.length ?? 0;
  if (n < 2) return null;

  const itemVariances = itemScores.map(variance);
  const totalScores: number[] = [];
  for (let i = 0; i < n; i++) {
    totalScores.push(itemScores.reduce((s, item) => s + item[i], 0));
  }
  const totalVariance = variance(totalScores);
  if (totalVariance === 0) return null;

  const sumItemVariance = itemVariances.reduce((s, v) => s + v, 0);
  const alpha = (k / (k - 1)) * (1 - sumItemVariance / totalVariance);
  return Math.round(alpha * 1000) / 1000;
}

export function difficultyIndex(correctCount: number, totalAnswered: number): number {
  if (totalAnswered === 0) return 0;
  return Math.round((correctCount / totalAnswered) * 1000) / 1000;
}

/** Yuqori/past 27% guruh usuli (Kelley, 1939) */
export function discriminationIndex(upperCorrect: number, lowerCorrect: number, groupSize: number): number {
  if (groupSize === 0) return 0;
  return Math.round((upperCorrect / groupSize - lowerCorrect / groupSize) * 1000) / 1000;
}
