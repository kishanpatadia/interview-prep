import { loadJobDescription } from '../ingestion/jdLoader.js';
import { ingestJobDescription } from '../ingestion/jdIngest.js';

const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run ingest-jd -- path/to/jd.pdf   (also accepts .txt, .md, or a URL)');
  process.exit(1);
}

loadJobDescription(source)
  .then((jdText) => ingestJobDescription(jdText))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('JD ingestion failed:', err);
    process.exit(1);
  });
