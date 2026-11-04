const stopWords = new Set([
  'about', 'and', 'document', 'explain', 'file', 'from', 'please', 'summarize', 'summary', 'the', 'this', 'with',
  'của', 'giải', 'hãy', 'này', 'tài', 'thích', 'tóm', 'tắt', 'liệu', 'và', 'về'
]);

function normalize(value) { return String(value ?? '').normalize('NFKC').toLocaleLowerCase(); }

function queryTerms(query) {
  const value = normalize(query).slice(-12000);
  const terms = new Set((value.match(/[\p{L}\p{N}]{2,40}/gu) ?? []).filter((term) => !stopWords.has(term)));
  for (const run of value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{3,}/gu) ?? []) {
    for (let index = 0; index < run.length - 1 && terms.size < 100; index++) terms.add(run.slice(index, index + 2));
  }
  return [...terms].slice(0, 100);
}

export function chunkText(text, chunkSize = 4000, overlap = 400) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + chunkSize);
    if (end < text.length) {
      const candidates = [text.lastIndexOf('\n\n', end), text.lastIndexOf('\n', end), text.lastIndexOf(' ', end)];
      const boundary = Math.max(...candidates);
      if (boundary > start + Math.floor(chunkSize * 0.65)) end = boundary;
    }
    const value = text.slice(start, end).trim();
    if (value) chunks.push({ index: chunks.length, start, end, text: value });
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

function scoreChunk(chunk, terms) {
  const haystack = normalize(chunk.text);
  let score = 0;
  for (const term of terms) {
    let position = 0, matches = 0;
    while (matches < 8 && (position = haystack.indexOf(term, position)) !== -1) {
      matches += 1;
      position += term.length;
    }
    score += matches * Math.min(term.length, 12);
  }
  return score;
}

function evenlySpacedIndexes(length, count) {
  if (count >= length) return Array.from({ length }, (_, index) => index);
  if (count <= 1) return [0];
  return Array.from({ length: count }, (_, index) => Math.round(index * (length - 1) / (count - 1)));
}

export function selectRelevantText(text, query, maxChars) {
  if (!text || maxChars < 500) return { text: '', reduced: Boolean(text), selectedChunks: 0, totalChunks: 0 };
  if (text.length <= maxChars) return { text, reduced: false, selectedChunks: 1, totalChunks: 1 };
  const chunks = chunkText(text);
  const terms = queryTerms(query);
  const scored = chunks.map((chunk) => ({ ...chunk, score: scoreChunk(chunk, terms) }));
  const approximateCount = Math.max(1, Math.floor((maxChars - 300) / 4100));
  let indexes;
  if (!terms.length || scored.every((chunk) => chunk.score === 0)) indexes = evenlySpacedIndexes(chunks.length, approximateCount);
  else {
    const ranked = [...scored].sort((left, right) => right.score - left.score || left.index - right.index);
    const rankedIndexes = ranked.map((chunk) => chunk.index);
    indexes = approximateCount === 1
      ? rankedIndexes.slice(0, 1)
      : [0, ...rankedIndexes].filter((value, index, values) => values.indexOf(value) === index).slice(0, approximateCount);
  }
  indexes.sort((left, right) => left - right);
  let selected = indexes.map((index) => chunks[index]);
  const format = () => selected.map((chunk) => `[Excerpt ${chunk.index + 1}/${chunks.length}]\n${chunk.text}`).join('\n\n');
  while (selected.length > 1 && format().length > maxChars) selected.pop();
  return { text: format().slice(0, maxChars), reduced: true, selectedChunks: selected.length, totalChunks: chunks.length };
}
