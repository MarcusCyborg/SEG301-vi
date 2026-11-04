import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const root = resolve(import.meta.dirname, '..');
const terms = JSON.parse(await readFile(resolve(root, 'content/terms.json'), 'utf8'));

const termsMap = new Map();
const byEn = new Map();
const byVi = new Map();

for (const t of terms) {
  termsMap.set(t.id, t);
  byEn.set(t.en.toLowerCase(), t);
  byVi.set(t.vi.toLowerCase(), t);
  for (const a of t.aliases) {
    byEn.set(a.toLowerCase(), t);
  }
}

// Ensure specific canonical overrides
byEn.set('information retrieval', termsMap.get('information-retrieval'));
byEn.set('ir', termsMap.get('information-retrieval'));
byEn.set('learning to rank', termsMap.get('ltr'));
byEn.set('ltr', termsMap.get('ltr'));

// Protected literal fragments from tests - NEVER mutate lines containing these!
const protectedLiterals = [
  'D9 | 1 | 1',
  '`[3,2,2,1,1]`',
  '11.2103186260',
  '0.7966478792',
  '0.109375',
  'REFERENCE_DATE = date(2026, 9, 28)',
  'def first_metric_int(response):',
  '0.9231',
  '0.5488',
  'a_i>0',
  'các điểm nằm trong margin hoặc bị phân loại sai',
  '5.7778',
  'S1: tropical fish',
  'TRAIN = {',
  '`P(w|t)`',
  '`P(t|w)`',
  'MovieLens',
  'D3 chỉ chứa duy nhất từ `mô hình`',
  'Ba ứng viên trọng số là `Λ_A =',
  'XPath',
  'quan hệ nhân quả',
  'extractive QA',
  'Gerard Salton',
  'Karen Spärck Jones'
];

const dir = resolve(root, 'content');
const chapterFiles = readdirSync(dir).filter(f => f.startsWith('chapter-') && f.endsWith('-vi.md')).sort();

let totalReplacements = 0;
const report = [];

for (const file of chapterFiles) {
  const filePath = resolve(dir, file);
  const content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');
  let fileReplacements = 0;

  let inFencedBlock = false;
  let inFormulaBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      inFencedBlock = !inFencedBlock;
      continue;
    }
    if (inFencedBlock) continue;

    if (line.includes('<div class="formula-block">')) inFormulaBlock = true;
    if (inFormulaBlock) {
      if (line.includes('</div>')) inFormulaBlock = false;
      continue;
    }

    // Skip heading lines (anchors like {#...} must never have markers)
    if (line.startsWith('#')) continue;

    // Skip protected lines
    if (protectedLiterals.some(p => line.includes(p))) continue;

    let newLine = line;

    // 1. Bold term definitions e.g. **Truy xuất thông tin (Information Retrieval, IR)**
    // or **truy vấn (query)** or **Tài liệu (document):**
    const boldPattern = /\*\*([^*]+)\*\*/g;
    newLine = newLine.replace(boldPattern, (match, boldText) => {
      // If already a marker, skip
      if (boldText.startsWith('{{term:')) return match;

      const colonSuffix = boldText.endsWith(':') ? ':' : '';
      const cleanBold = boldText.replace(/:$/, '').trim();

      // Check pattern: "ViText (EnText...)"
      const parenMatch = cleanBold.match(/^([^(]+)\(([^)]+)\)$/);
      if (parenMatch) {
        const viCandidate = parenMatch[1].trim();
        const enCandidate = parenMatch[2].split(',')[0].trim();
        const term = byEn.get(enCandidate.toLowerCase()) || byVi.get(viCandidate.toLowerCase());
        if (term) {
          fileReplacements++;
          return `**{{term:${term.id}}}${colonSuffix}**`;
        }
      }

      // Check exact direct match (especially preserveEnglish like PageRank, BM25, etc.)
      const directTerm = termsMap.get(cleanBold.toLowerCase()) || byEn.get(cleanBold.toLowerCase()) || byVi.get(cleanBold.toLowerCase());
      if (directTerm) {
        // Only replace if it's a known standalone technical term
        if (directTerm.preserveEnglish || cleanBold.toLowerCase() === directTerm.vi.toLowerCase()) {
          fileReplacements++;
          return `**{{term:${directTerm.id}}}${colonSuffix}**`;
        }
      }

      return match;
    });

    // 2. Prose bilingual pairs: e.g. "nhu cầu thông tin (information need)"
    // Avoid inline code, urls, existing markers
    if (!newLine.includes('`') && !newLine.includes('http') && !newLine.includes('{{term:')) {
      const bilingualPattern = /([A-ZÀ-Ỹa-zà-ỹ\s-]+)\s*\(([A-Za-z\s-]+)\)/g;
      newLine = newLine.replace(bilingualPattern, (match, viCandidate, enCandidate) => {
        const viTrim = viCandidate.trim();
        const enTrim = enCandidate.trim();
        const term = byEn.get(enTrim.toLowerCase());
        if (term && (term.vi.toLowerCase() === viTrim.toLowerCase() || term.en.toLowerCase() === enTrim.toLowerCase())) {
          fileReplacements++;
          // Preserve preceding whitespace
          const leadingSpace = viCandidate.startsWith(' ') ? ' ' : '';
          return `${leadingSpace}{{term:${term.id}}}`;
        }
        return match;
      });
    }

    lines[i] = newLine;
  }

  totalReplacements += fileReplacements;
  report.push({ file, replacements: fileReplacements });
  await writeFile(filePath, lines.join('\n'), 'utf8');
}

console.log('--- Marker Injection Summary ---');
for (const r of report) {
  console.log(`${r.file}: ${r.replacements} markers injected`);
}
console.log(`Total markers injected: ${totalReplacements}`);
