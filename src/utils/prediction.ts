import { getConfidenceFromCount } from './formulas';

export type PredictionConfidence = 'cold_start' | 'low' | 'medium' | 'high';

export function resolvePredictionConfidence(
  feedbackCount: number,
  hasWeatherSignal: boolean,
): PredictionConfidence {
  if (!hasWeatherSignal) return 'cold_start';
  return getConfidenceFromCount(feedbackCount);
}
