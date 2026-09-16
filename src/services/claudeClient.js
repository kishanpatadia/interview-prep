import { guardClaudeCall } from './usageGuard.js';
import { invokeQuestionGeneration, invokeGrading } from './structuredClaude.js';

/**
 * Generates a batch of interview questions + model answers on a given topic.
 * Used for the initial seed and for JD-targeted ingestion. Output is
 * guaranteed schema-conforming via LangChain's withStructuredOutput (native
 * Claude tool-calling) — no text parsing or fixing pass required.
 */
export async function generateQuestions({ topic, count, extraContext = '' }) {
  guardClaudeCall(); // throws DailyLimitError if today's cap is hit

  const system = `
You are an expert technical interviewer for senior Adobe Commerce (Magento)
Architect-level roles. Generate high-quality, realistic interview questions
with concise model answers. Cover a mix of categories: architecture & DI,
performance & caching, ACCS/App Builder & SaaS migration, B2B, integrations
(ERP/PIM), DevOps/CI-CD, and open-ended system design scenarios.
`.trim();

  const user = `
Generate ${count} interview questions about: ${topic}
${extraContext ? `\nAdditional context to target:\n${extraContext}` : ''}
`.trim();

  try {
    const result = await invokeQuestionGeneration({ system, user });
    return result.questions;
  } catch (err) {
    console.error('Question generation failed:', err.message);
    return [];
  }
}

/**
 * Grades a user's answer against the model answer and any additional
 * retrieved reference material (other similar Q&As from the bank).
 */
export async function gradeAnswer({ question, modelAnswer, userAnswer, referenceContext = '' }) {
  guardClaudeCall();

  const system = `
You are grading a candidate's answer to a Magento/Adobe Commerce Architect
interview question. Be fair but rigorous — this is practice, so clear,
actionable feedback matters more than encouragement. Ground your grading in
the provided model answer and reference context, not just general knowledge.
For weakArea, name the specific concept the candidate should review, or
return an empty string if the answer was strong.
`.trim();

  const user = `
Question: ${question}

Model answer (reference): ${modelAnswer}

${referenceContext ? `Related reference material from past questions:\n${referenceContext}\n` : ''}

Candidate's answer:
${userAnswer}
`.trim();

  try {
    return await invokeGrading({ system, user });
  } catch (err) {
    console.error('Grading failed:', err.message);
    return { score: 0, feedback: 'Grading failed.', weakArea: '' };
  }
}
