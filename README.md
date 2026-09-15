# Interview Prep Agent (RAG + agentic)

A RAG-based interview prep tool: no manual question bank required — Claude
generates the initial set, JD-targeted questions get added on top, and every
session you complete grows the bank further (embedded back in as reference
material). Grading retrieves similar past Q&As rather than judging from
Claude's memory alone.

## How it works

1. **Seed** (`npm run seed`): Claude generates ~70 Adobe Commerce Architect
   -level questions + model answers across categories (architecture, performance,
   ACCS/SaaS, B2B, integrations, DevOps, system design). Each gets embedded
   (Voyage AI) and stored in SQLite.
2. **JD ingestion** (`npm run ingest-jd -- path/to/jd.txt`): paste a job
   description, Claude generates 15-20 targeted questions, embedded and
   tagged `source: jd`.
3. **Session loop**: `GET /session/next` picks a question — weighted toward
   your weak categories (tracked from past scores), then JD-relevant
   questions, then general. You answer via `POST /session/answer`.
4. **Grading with retrieval**: before grading, the engine embeds the
   question and does a similarity search over the whole bank, so Claude
   grades against related reference material — not just the one model
   answer.
5. **Self-growing bank**: your answer + the grading feedback get embedded
   and stored as a new `source: session` entry, so future retrieval can
   surface "here's how you answered this before and what you got wrong."

## Project structure

```
interview-prep-agent/
├── package.json
├── .env.example
├── README.md
└── src/
    ├── index.js                  # Express entrypoint
    ├── config.js
    ├── cli/
    │   ├── seed.js                # npm run seed
    │   └── ingestJd.js            # npm run ingest-jd -- path/to/jd.txt
    ├── ingestion/
    │   ├── seedQuestionBank.js    # generate + embed the initial bank
    │   └── jdIngest.js            # generate + embed JD-targeted questions
    ├── services/
    │   ├── claudeClient.js        # question generation + answer grading
    │   ├── embeddings.js          # Voyage AI embeddings client
    │   ├── vectorStore.js         # in-process cosine similarity search
    │   └── sessionEngine.js       # pick next question, grade, grow bank
    ├── routes/
    │   └── session.js             # GET /next, POST /answer, GET /history
    └── storage/
        └── db.js                  # SQLite: questions+embeddings, sessions
```

## Setup

```bash
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY and VOYAGE_API_KEY (free tier at voyageai.com)

npm run seed                              # one-time: builds the general bank
npm run ingest-jd -- path/to/jd.txt       # optional: add JD-targeted questions

npm run dev
```

Open `http://localhost:3000/` for the web UI (question → answer → grade →
next, plus a weak-areas panel), or hit the API directly:

Try it:
```bash
curl http://localhost:3000/session/next
curl -X POST http://localhost:3000/session/answer \
  -H "Content-Type: application/json" \
  -d '{"questionId": 1, "answer": "..."}'
curl http://localhost:3000/session/history
```

## Notes on the RAG design

- **Vector store**: implemented as in-process cosine similarity over
  embeddings stored in SQLite, not a separate Chroma/Qdrant server — keeps
  this deployable as a single Node service with no extra infra. Fine for a
  personal bank (hundreds–low thousands of questions); swap in a real vector
  DB if the corpus grows much larger.
- **Embeddings**: Voyage AI (`voyage-3-lite`), a natural pairing with Claude
  and has its own free tier.
- **Nothing is hardcoded content** — the entire bank starts empty and is
  generated, which was the point given there's no existing question set to
  seed from.

## Demo safety (rate limits + daily budget)

Since this hits your own Anthropic and Voyage API keys, it includes two
layers of protection so a public demo can't blow through your daily budget:

- **Daily call cap** (`DAILY_CLAUDE_CALL_LIMIT`, default 50/day): every
  Claude and Voyage call is counted in SQLite (`usage_log` table) and reset
  by calendar day. Once hit, further calls throw a `DailyLimitError` and the
  API returns `429` with a friendly message instead of calling out.
- **Per-IP rate limit** (`RATE_LIMIT_PER_IP_PER_HOUR`, default 15/hour): via
  `express-rate-limit`, stops one visitor from eating the whole day's budget
  alone.

Also set a **spend limit directly on your Anthropic API key** (in the
Console) as a hard backstop independent of the app logic.

## Deploying to Render (free tier)

1. Push this project to a GitHub repo.
2. In Render: **New → Blueprint**, point it at the repo — it reads `render.yaml`
   automatically and creates the web service.
3. In the Render dashboard, set the two secret env vars manually (left blank
   in `render.yaml` on purpose): `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY`.
4. Deploy. Render will run `npm install` then `npm start`.
5. **Seed the bank once, post-deploy**: open a Render Shell for the service
   and run `npm run seed` (there's no bank until you do this — the render
   free tier has no build-time step for it since it needs live API calls).

**Free-tier caveat — ephemeral disk:** Render's free plan wipes local disk
on redeploys/restarts, which includes the SQLite file (`data/prep.db`) — so
your question bank, session history, and usage-log counts reset each time
the service restarts or you push a new deploy. For a demo/trial this is
usually fine (just re-run `npm run seed` after a redeploy); if you want the
bank and history to persist long-term, upgrade to Render's persistent disk
add-on or swap SQLite for Render's free PostgreSQL (90-day free tier).

## Where LangChain is used

Two targeted additions, not a full rewrite of the RAG loop (which stays
custom — Voyage embeddings + in-process cosine search — since it's simple
enough that LangChain's abstractions wouldn't earn their weight here):

- **Structured output** (`services/structuredClaude.js`): question generation
  and grading use `ChatAnthropic.withStructuredOutput(zodSchema)`, which
  binds the schema as a native Claude tool call — output is guaranteed to
  match the schema directly, no free-text JSON parsing or "fixing" pass
  needed. (LangChain's older `StructuredOutputParser`/`OutputFixingParser`
  pattern was dropped in the v1.x line in favor of this approach.)
- **JD ingestion** (`ingestion/jdLoader.js`): `npm run ingest-jd` accepts a
  PDF, a `.txt`/`.md` file, or a URL (e.g. a live job posting page). This is
  implemented directly with `pdf-parse` and `cheerio` rather than through
  LangChain's document-loader wrappers — `@langchain/community`, which
  hosted `PDFLoader`/`CheerioWebBaseLoader`, was sunset by the LangChain
  team in May 2026, and their own migration guidance is to hand-roll simple
  loaders like this in application code rather than depend on that package.
  `@langchain/textsplitters` (a standalone, actively maintained package) is
  still used for chunk-normalizing the loaded text.

All of the above was installed and boot-tested in-sandbox: clean `npm
install`, server starts, and the JD loader was run end-to-end against a
live URL.

## Next steps

- Add a simple CLI or web UI for the Q&A loop instead of raw curl/Postman.
- Track score trends per category over time (not just latest weak areas).
- Add a "mock interview" mode: string several questions together with a
  running score, closer to a real interview session.
