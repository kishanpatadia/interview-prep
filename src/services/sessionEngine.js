import { embed } from './embeddings.js';
import { similaritySearch } from './vectorStore.js';
import { gradeAnswer } from './claudeClient.js';
import {
  getAllQuestions,
  getWeakCategories,
  getAnsweredQuestionIds,
  recordSession,
  insertQuestion,
  getQuestionById,
} from '../storage/db.js';

/**
 * Picks the next question: prefers categories the user is weak in, then
 * JD-sourced questions, then falls back to anything unanswered/random.
 */
export function pickNextQuestion() {
  const all = getAllQuestions();
  if (all.length === 0) return null;

  const answeredIds = new Set(getAnsweredQuestionIds());
  const weakCategories = getWeakCategories(3).map((c) => c.category);

  const unanswered = all.filter((q) => !answeredIds.has(q.id));
  const pool = unanswered.length > 0 ? unanswered : all;

  const weakMatches = pool.filter((q) => weakCategories.includes(q.category));
  const jdMatches = pool.filter((q) => q.source === 'jd');

  const prioritized = weakMatches.length > 0 ? weakMatches
    : jdMatches.length > 0 ? jdMatches
    : pool;

  return prioritized[Math.floor(Math.random() * prioritized.length)];
}

/**
 * Grades an answer using retrieval: pulls similar questions/answers from the
 * bank as extra reference context, not just the single model answer.
 */
export async function submitAnswer({ questionId, userAnswer }) {
  const question = getQuestionById(questionId);
  if (!question) throw new Error(`Question ${questionId} not found`);

  const queryEmbedding = await embed(question.question, 'query');
  const similar = similaritySearch(queryEmbedding, 3, [question.id]);
  const referenceContext = similar
    .map((s) => `Q: ${s.question}\nA: ${s.model_answer}`)
    .join('\n\n');

  const result = await gradeAnswer({
    question: question.question,
    modelAnswer: question.model_answer,
    userAnswer,
    referenceContext,
  });

  recordSession({
    questionId: question.id,
    userAnswer,
    score: result.score,
    feedback: result.feedback,
  });

  // Grow the bank: embed this Q + the user's own answer as a session record,
  // so future retrieval can surface "how you personally answered this before".
  const sessionEmbedding = await embed(`${question.question}\n${userAnswer}`, 'document');
  insertQuestion({
    question: question.question,
    category: question.category,
    modelAnswer: `[Your answer, scored ${result.score}]: ${userAnswer}\n\nFeedback: ${result.feedback}`,
    source: 'session',
    embedding: sessionEmbedding,
  });

  return { question, ...result };
}
