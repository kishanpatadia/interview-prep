import { getTodayUsageCount, recordUsage } from '../storage/db.js';
import { config } from '../config.js';

export class DailyLimitError extends Error {
  constructor(kind, limit) {
    super(`Demo daily limit reached for ${kind} (${limit}/day) — please try again tomorrow.`);
    this.name = 'DailyLimitError';
    this.statusCode = 429;
  }
}

/**
 * Call this immediately before any Claude API call (generation or grading).
 * Throws DailyLimitError if today's cap is already hit — caller should not
 * proceed to the actual API call in that case.
 */
export function guardClaudeCall() {
  const count = getTodayUsageCount('claude');
  if (count >= config.demo.dailyClaudeCallLimit) {
    throw new DailyLimitError('Claude', config.demo.dailyClaudeCallLimit);
  }
  recordUsage('claude');
}

/**
 * Same idea for Voyage embedding calls, tracked separately since they're a
 * different budget/provider.
 */
export function guardVoyageCall() {
  const count = getTodayUsageCount('voyage');
  if (count >= config.demo.dailyClaudeCallLimit) {
    throw new DailyLimitError('Voyage', config.demo.dailyClaudeCallLimit);
  }
  recordUsage('voyage');
}
