import { z } from 'zod';

export const QuestionSchema = z.object({
  question: z.string(),
  category: z.enum([
    'architecture',
    'performance',
    'accs-saas',
    'b2b',
    'integrations',
    'devops',
    'system-design',
  ]),
  modelAnswer: z.string(),
});

export const QuestionArraySchema = z.array(QuestionSchema);

// Anthropic's tool-calling (used under the hood by withStructuredOutput)
// requires a top-level object schema, not a bare array — so generation
// uses this wrapper and the caller unwraps `.questions`.
export const QuestionsResponseSchema = z.object({
  questions: QuestionArraySchema,
});

export const GradeSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
  weakArea: z.string(),
});
