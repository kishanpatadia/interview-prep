import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { sessionRouter } from './routes/session.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Per-IP rate limit — protects the daily Claude/Voyage budget from a single visitor
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.demo.rateLimitPerIpPerHour,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests from this IP — please try again later.' },
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/session', demoLimiter, sessionRouter);

app.listen(config.app.port, () => {
  console.log(`Interview Prep Agent listening on port ${config.app.port}`);
  console.log(`UI: http://localhost:${config.app.port}/`);
  console.log(`GET /session/next, POST /session/answer, GET /session/history`);
});
