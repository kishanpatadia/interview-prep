import { Router } from 'express';
import { pickNextQuestion, submitAnswer } from '../services/sessionEngine.js';
import { getSessionHistory, getWeakCategories } from '../storage/db.js';
import { DailyLimitError } from '../services/usageGuard.js';

export const sessionRouter = Router();

// Get the next question to answer
sessionRouter.get('/next', (req, res) => {
  const question = pickNextQuestion();
  if (!question) {
    return res.status(404).json({ ok: false, error: 'No questions in the bank yet — run `npm run seed` first.' });
  }
  res.json({ ok: true, question: { id: question.id, question: question.question, category: question.category, source: question.source } });
});

// Submit an answer for grading
sessionRouter.post('/answer', async (req, res) => {
  const { questionId, answer } = req.body;
  if (!questionId || !answer) {
    return res.status(400).json({ ok: false, error: 'questionId and answer are required' });
  }
  try {
    const result = await submitAnswer({ questionId, userAnswer: answer });
    res.json({ ok: true, result });
  } catch (err) {
    if (err instanceof DailyLimitError) {
      return res.status(err.statusCode).json({ ok: false, error: err.message });
    }
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// View history and weak areas
sessionRouter.get('/history', (req, res) => {
  res.json({ ok: true, history: getSessionHistory(50), weakCategories: getWeakCategories(10) });
});
