import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const termsPath = resolve(root, 'content/terms.json');
const contentDir = resolve(root, 'content');

const validCategories = new Set([
  'core-concept',
  'information-retrieval',
  'web-search',
  'indexing-ranking-evaluation',
  'algorithm-model-formula',
  'acronym',
  'tech-library-name'
]);

const allowedProperNounPrefixes = [
  'porter', 'krovetz', 'rocchio', 'viterbi', 'zipf', 'heaps',
  'levenshtein', 'damerau', 'jelinek', 'dirichlet', 'laplace',
  'pearson', 'kendall', 'elias', 'golomb', 'naive', 'ranking svm',
  'markov', 'hidden markov', 'dice', 'cas', 'kl divergence', 'kullback'
];

const errors = [];
const warnings = [];

// 1. Validate content/terms.json
let terms = [];
try {
  const termsRaw = await readFile(termsPath, 'utf8');
  terms = JSON.parse(termsRaw);
} catch (err) {
  console.error(`Failed to read or parse content/terms.json: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(terms) || terms.length === 0) {
  errors.push('content/terms.json must be a non-empty array');
}

const termsMap = new Map();
const seenIds = new Set();

for (let i = 0; i < terms.length; i++) {
  const record = terms[i];
  const prefix = `Term record #${i + 1}`;

  // Check ID
  if (!record.id || typeof record.id !== 'string') {
    errors.push(`${prefix}: missing or invalid 'id'`);
    continue;
  }

  const id = record.id.trim();
  if (id !== record.id) {
    errors.push(`${prefix} (${id}): 'id' has leading/trailing whitespace`);
  }

  if (!/^[a-z0-9-]+$/.test(id)) {
    errors.push(`${prefix} (${id}): 'id' must be slug format (lowercase letters, numbers, hyphens)`);
  }

  if (seenIds.has(id)) {
    errors.push(`${prefix} (${id}): duplicate ID '${id}' detected`);
  }
  seenIds.add(id);

  // Check en
  if (!record.en || typeof record.en !== 'string' || record.en.trim() === '') {
    errors.push(`${prefix} (${id}): 'en' must be a non-empty string`);
  } else if (record.en.trim() !== record.en) {
    errors.push(`${prefix} (${id}): 'en' has leading/trailing whitespace`);
  }

  // Check vi
  if (!record.vi || typeof record.vi !== 'string' || record.vi.trim() === '') {
    errors.push(`${prefix} (${id}): 'vi' must be a non-empty string`);
  } else if (record.vi.trim() !== record.vi) {
    errors.push(`${prefix} (${id}): 'vi' has leading/trailing whitespace`);
  }

  if (!record.preserveEnglish && (!record.vi || typeof record.vi !== 'string' || record.vi.trim() === '')) {
    errors.push(`${prefix} (${id}): 'preserveEnglish' is false but 'vi' is empty or missing`);
  }

  // Check category
  if (!record.category || !validCategories.has(record.category)) {
    errors.push(`${prefix} (${id}): invalid category '${record.category}'. Allowed: ${[...validCategories].join(', ')}`);
  }

  // Check preserveEnglish
  if (typeof record.preserveEnglish !== 'boolean') {
    errors.push(`${prefix} (${id}): 'preserveEnglish' must be a boolean`);
  } else if (record.preserveEnglish) {
    if (record.en && record.vi && record.en.toLowerCase() !== record.vi.toLowerCase()) {
      warnings.push(`${prefix} (${id}): preserveEnglish is true but en ('${record.en}') != vi ('${record.vi}')`);
    }
  }

  // Check aliases
  if (!Array.isArray(record.aliases)) {
    errors.push(`${prefix} (${id}): 'aliases' must be an array`);
  } else {
    for (let a = 0; a < record.aliases.length; a++) {
      const alias = record.aliases[a];
      if (typeof alias !== 'string' || alias.trim() === '') {
        errors.push(`${prefix} (${id}): alias at index ${a} must be a non-empty string`);
      } else if (alias.trim() !== alias) {
        errors.push(`${prefix} (${id}): alias '${alias}' has leading/trailing whitespace`);
      }
    }
  }

  // Casing consistency check for common nouns
  if (record.category !== 'acronym' && record.category !== 'tech-library-name' && !record.preserveEnglish && record.en) {
    const firstChar = record.en.charAt(0);
    const lower = record.en.toLowerCase();
    const isAllowedProperPrefix = allowedProperNounPrefixes.some((p) => lower.startsWith(p));
    if (!isAllowedProperPrefix && firstChar !== firstChar.toLowerCase()) {
      warnings.push(`${prefix} (${id}): common noun 'en' starts with uppercase: '${record.en}'`);
    }
  }

  termsMap.set(id, record);
}

// 2. Scan Markdown files for markers and check validity & forbidden zones
function findForbiddenRanges(source) {
  const ranges = [];

  // Fenced code blocks ```...```
  const fencedRegex = /```[\s\S]*?```/g;
  let match;
  while ((match = fencedRegex.exec(source)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length, type: 'fenced-code-block' });
  }

  // HTML formula blocks <div class="formula-block"[\s\S]*?<\/div>
  const formulaBlockRegex = /<div class="formula-block"[\s\S]*?<\/div>/g;
  while ((match = formulaBlockRegex.exec(source)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length, type: 'formula-block' });
  }

  // Display math $$...$$
  const displayMathRegex = /\$\$[\s\S]*?\$\$/g;
  while ((match = displayMathRegex.exec(source)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length, type: 'display-math' });
  }

  // Inline math $...$ (ensure not double $$)
  const inlineMathRegex = /(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g;
  while ((match = inlineMathRegex.exec(source)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length, type: 'inline-math' });
  }

  // Inline code `...`
  const inlineCodeRegex = /`[^`\n]+`/g;
  while ((match = inlineCodeRegex.exec(source)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length, type: 'inline-code' });
  }

  // Link URLs ](url) or ![alt](url)
  const linkTargetRegex = /\]\(([^)\n]+)\)/g;
  while ((match = linkTargetRegex.exec(source)) !== null) {
    // Only the URL portion inside parentheses is forbidden
    const openParenIndex = match.index + match[0].indexOf('(');
    ranges.push({ start: openParenIndex, end: match.index + match[0].length, type: 'link-url' });
  }

  // Heading anchors {#...}
  const anchorRegex = /\{#[a-z0-9-]+\}/gi;
  while ((match = anchorRegex.exec(source)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length, type: 'heading-anchor' });
  }

  return ranges;
}

function getLineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

const entries = await readdir(contentDir);
const markdownFiles = entries
  .filter((name) => name.endsWith('.md'))
  .sort();

let totalMarkersFound = 0;
const markersByFile = new Map();

for (const fileName of markdownFiles) {
  const filePath = resolve(contentDir, fileName);
  const source = await readFile(filePath, 'utf8');
  const forbiddenRanges = findForbiddenRanges(source);

  const markerRegex = /\{\{term:([^}]*)\}\}/g;
  let m;
  let fileMarkerCount = 0;

  while ((m = markerRegex.exec(source)) !== null) {
    totalMarkersFound++;
    fileMarkerCount++;
    const rawTermId = m[1];
    const markerIndex = m.index;
    const line = getLineNumber(source, markerIndex);

    if (!rawTermId || rawTermId.trim() === '') {
      errors.push(`${fileName}:${line}: empty marker ID '{{term:${rawTermId}}}'`);
      continue;
    }
    if (rawTermId.trim() !== rawTermId) {
      errors.push(`${fileName}:${line}: marker ID '{{term:${rawTermId}}}' has leading/trailing whitespace`);
    }

    const termId = rawTermId.trim();

    // Check if ID exists
    if (!termsMap.has(termId)) {
      errors.push(`${fileName}:${line}: marker references nonexistent ID '{{term:${termId}}}'`);
    } else {
      const term = termsMap.get(termId);
      if (!term.preserveEnglish && (!term.vi || typeof term.vi !== 'string' || term.vi.trim() === '')) {
        errors.push(`${fileName}:${line}: marker '{{term:${termId}}}' references term missing Vietnamese translation`);
      }
    }

    // Check if marker inside forbidden range
    for (const range of forbiddenRanges) {
      if (markerIndex >= range.start && markerIndex < range.end) {
        errors.push(`${fileName}:${line}: marker '{{term:${termId}}}' is inside forbidden zone (${range.type})`);
        break;
      }
    }
  }

  markersByFile.set(fileName, fileMarkerCount);
}

// 3. Print report
console.log('--- Terminology & Marker Validation Report ---');
console.log(`Dictionary terms validated: ${terms.length}`);
console.log(`Markdown files scanned:     ${markdownFiles.length}`);
console.log(`Total markers detected:     ${totalMarkersFound}`);

for (const [file, count] of markersByFile.entries()) {
  if (count > 0) {
    console.log(`  - ${file}: ${count} markers`);
  }
}

if (warnings.length > 0) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.slice(0, 10).forEach((w) => console.warn(`  [WARN] ${w}`));
  if (warnings.length > 10) console.warn(`  ... and ${warnings.length - 10} more warnings`);
}

if (errors.length > 0) {
  console.error(`\nValidation FAILED with ${errors.length} error(s):`);
  errors.forEach((e) => console.error(`  [ERROR] ${e}`));
  process.exit(1);
} else {
  console.log('\nValidation PASSED: Dictionary structure, IDs, and markers conform to specifications.');
  process.exit(0);
}
