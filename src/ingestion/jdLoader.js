import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

/**
 * Loads a job description from a PDF file, a plain text/markdown file, or a
 * URL (e.g. a job posting page), and returns clean, chunk-normalized text
 * ready to hand to Claude.
 *
 * Implemented directly (pdf-parse + cheerio) rather than via LangChain's
 * document loaders — @langchain/community, which hosted PDFLoader and
 * CheerioWebBaseLoader, has been sunset by the LangChain team (the repo is
 * archived as of May 2026), and their own guidance is that hand-rolling
 * simple loaders like this directly in application code is now the
 * recommended path rather than depending on that package.
 */
export async function loadJobDescription(source) {
  let rawText;

  if (/^https?:\/\//i.test(source)) {
    rawText = await loadFromUrl(source);
  } else {
    const ext = path.extname(source).toLowerCase();
    rawText = ext === '.pdf' ? await loadFromPdf(source) : await fs.readFile(source, 'utf-8');
  }

  // Chunk defensively (long JD, or a scraped page with a lot of surrounding
  // company content) and rejoin — keeps things normalized even though we
  // pass the full text to Claude rather than doing chunk-level retrieval here.
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 4000, chunkOverlap: 200 });
  const chunks = await splitter.splitText(rawText);

  return chunks.join('\n\n').trim();
}

async function loadFromPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function loadFromUrl(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  const html = await res.text();

  const $ = cheerio.load(html);
  $('script, style, nav, footer, header').remove();
  const text = $('body').text();

  // Collapse excessive whitespace left behind by stripped tags
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
