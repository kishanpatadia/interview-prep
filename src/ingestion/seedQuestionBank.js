import { generateQuestions } from '../services/claudeClient.js';
import { embedBatch } from '../services/embeddings.js';
import { insertQuestion } from '../storage/db.js';
import { config } from '../config.js';

export async function seedQuestionBank() {
  console.log(`Generating ${config.seed.count} questions on: ${config.seed.topic}`);
  const questions = await generateQuestions({
    topic: config.seed.topic,
    count: config.seed.count,
  });

  if (questions.length === 0) {
    console.error('No questions generated — check ANTHROPIC_API_KEY / model response.');
    return;
  }

  console.log(`Embedding ${questions.length} questions...`);
  const embeddings = await embedBatch(questions.map((q) => q.question));

  questions.forEach((q, i) => {
    insertQuestion({
      question: q.question,
      category: q.category,
      modelAnswer: q.modelAnswer,
      source: 'seed',
      embedding: embeddings[i],
    });
  });

  console.log(`Seeded ${questions.length} questions into the bank.`);
}
