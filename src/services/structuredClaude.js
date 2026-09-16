import { ChatAnthropic } from '@langchain/anthropic';
import { QuestionsResponseSchema, GradeSchema } from '../schemas/questionSchemas.js';
import { config } from '../config.js';

const baseModel = new ChatAnthropic({
  apiKey: config.anthropic.apiKey,
  model: config.anthropic.model,
});

// .withStructuredOutput() binds the zod schema as a tool call under the hood
// — Claude's response is constrained to match the schema directly, so there
// is no free-text JSON to parse or repair. This replaces the older
// StructuredOutputParser + OutputFixingParser pattern, which LangChain JS
// dropped in its v1.x line in favor of this approach.
const questionModel = baseModel.withStructuredOutput(QuestionsResponseSchema, {
  name: 'interview_questions',
});
const gradeModel = baseModel.withStructuredOutput(GradeSchema, {
  name: 'answer_grade',
});

export async function invokeQuestionGeneration({ system, user }) {
  return questionModel.invoke([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
}

export async function invokeGrading({ system, user }) {
  return gradeModel.invoke([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
}
