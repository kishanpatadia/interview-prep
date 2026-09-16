import { Router } from 'express';
import { seedQuestionBank } from '../ingestion/seedQuestionBank.js';
import { getAllQuestions } from '../storage/db.js';
import { config } from '../config.js';

export const adminRouter = Router();

// One-off seeding trigger for platforms without shell access (e.g. Render free
// tier). Requires ADMIN_SEED_SECRET to be set — refuses to run without it.
adminRouter.post('/seed', async (req, res) => {
  if (!config.admin.seedSecret) {
    return res.status(503).json({ ok: false, error: 'ADMIN_SEED_SECRET is not configured on the server.' });
  }
  if (req.get('x-seed-secret') !== config.admin.seedSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  if (getAllQuestions().length > 0 && req.query.force !== 'true') {
    return res.status(409).json({ ok: false, error: 'Question bank already has entries. Pass ?force=true to reseed anyway.' });
  }

  try {
    await seedQuestionBank();
    res.json({ ok: true, count: getAllQuestions().length });
  } catch (err) {
    console.error('Admin seed failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
