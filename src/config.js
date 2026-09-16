import 'dotenv/config';

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
  },
  voyage: {
    apiKey: process.env.VOYAGE_API_KEY,
    model: process.env.VOYAGE_MODEL || 'voyage-3-lite',
  },
  app: {
    port: Number(process.env.PORT || 3000),
    dbPath: process.env.DB_PATH || './data/prep.db',
  },
  seed: {
    topic: process.env.SEED_TOPIC || 'Adobe Commerce (Magento) Architect-level interview prep',
    count: Number(process.env.SEED_COUNT || 70),
  },
  demo: {
    dailyClaudeCallLimit: Number(process.env.DAILY_CLAUDE_CALL_LIMIT || 50),
    rateLimitPerIpPerHour: Number(process.env.RATE_LIMIT_PER_IP_PER_HOUR || 15),
  },
};
