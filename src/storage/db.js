import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const dir = path.dirname(config.app.dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(config.app.dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    category TEXT,
    model_answer TEXT,
    source TEXT,              -- 'seed' | 'jd' | 'session'
    embedding TEXT NOT NULL,  -- JSON-encoded float array
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    user_answer TEXT,
    score INTEGER,           -- 0-100
    feedback TEXT,
    weak_area INTEGER,       -- 1 if score < threshold
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,        -- 'YYYY-MM-DD', local server date
    kind TEXT NOT NULL,       -- 'claude' | 'voyage'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export function insertQuestion({ question, category, modelAnswer, source, embedding }) {
  const stmt = db.prepare(`
    INSERT INTO questions (question, category, model_answer, source, embedding)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(question, category, modelAnswer, source, JSON.stringify(embedding));
  return info.lastInsertRowid;
}

export function getAllQuestions() {
  return db.prepare('SELECT * FROM questions').all().map((row) => ({
    ...row,
    embedding: JSON.parse(row.embedding),
  }));
}

export function getQuestionById(id) {
  const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, embedding: JSON.parse(row.embedding) };
}

export function recordSession({ questionId, userAnswer, score, feedback, weakThreshold = 70 }) {
  db.prepare(`
    INSERT INTO sessions (question_id, user_answer, score, feedback, weak_area)
    VALUES (?, ?, ?, ?, ?)
  `).run(questionId, userAnswer, score, feedback, score < weakThreshold ? 1 : 0);
}

export function getWeakCategories(limit = 5) {
  return db.prepare(`
    SELECT q.category, AVG(s.score) as avgScore, COUNT(*) as attempts
    FROM sessions s
    JOIN questions q ON q.id = s.question_id
    GROUP BY q.category
    ORDER BY avgScore ASC
    LIMIT ?
  `).all(limit);
}

export function getAnsweredQuestionIds() {
  return db.prepare('SELECT DISTINCT question_id FROM sessions').all().map((r) => r.question_id);
}

export function getSessionHistory(limit = 50) {
  return db.prepare(`
    SELECT s.*, q.question, q.category
    FROM sessions s JOIN questions q ON q.id = s.question_id
    ORDER BY s.created_at DESC
    LIMIT ?
  `).all(limit);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

export function getTodayUsageCount(kind = 'claude') {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM usage_log WHERE day = ? AND kind = ?'
  ).get(todayKey(), kind);
  return row.count;
}

export function recordUsage(kind = 'claude') {
  db.prepare('INSERT INTO usage_log (day, kind) VALUES (?, ?)').run(todayKey(), kind);
}

export default db;
