import { generateQuestions } from '../services/claudeClient.js';
import { embedBatch } from '../services/embeddings.js';
import { insertQuestion } from '../storage/db.js';

export async function ingestJobDescription(jdText, count = 18) {
  console.log('Generating JD-targeted questions...');
  const questions = await generateQuestions({
    topic: 'this specific job description',
    count,
    extraContext: jdText,
  });

  if (questions.length === 0) {
    console.error('No questions generated from JD.');
    return [];
  }

  const embeddings = await embedBatch(questions.map((q) => q.question));

  questions.forEach((q, i) => {
    insertQuestion({
      question: q.question,
      category: q.category,
      modelAnswer: q.modelAnswer,
      source: 'jd',
      embedding: embeddings[i],
    });
  });

  console.log(`Ingested ${questions.length} JD-targeted questions.`);
  return questions;
}
