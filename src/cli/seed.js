import { seedQuestionBank } from '../ingestion/seedQuestionBank.js';

seedQuestionBank()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
