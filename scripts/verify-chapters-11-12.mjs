import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const chapter11 = await readFile(resolve(root, 'content/chapter-11-social-search-vi.md'), 'utf8');
const chapter12 = await readFile(resolve(root, 'content/chapter-12-beyond-bag-of-words-vi.md'), 'utf8');

function close(actual, expected, tolerance = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function codeBlockContaining(markdown, language, marker) {
  const pattern = new RegExp('```' + language + '\\r?\\n([\\s\\S]*?)```', 'g');
  const block = [...markdown.matchAll(pattern)]
    .map((match) => match[1])
    .find((candidate) => candidate.includes(marker));
  assert.ok(block, `${language} block containing ${marker} was not found`);
  return block;
}

function runPython(code) {
  const commands = process.platform === 'win32'
    ? [['python', ['-c', code]], ['py', ['-3', '-c', code]]]
    : [['python3', ['-c', code]], ['python', ['-c', code]]];
  for (const [command, args] of commands) {
    const result = spawnSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONDONTWRITEBYTECODE: '1',
      },
    });
    if (!result.error) {
      assert.equal(result.status, 0, result.stderr || result.stdout);
      return result.stdout;
    }
  }
  assert.fail('Python interpreter was not found');
}

// Snippets -> filtered tokens -> frequencies -> normalized probabilities.
const snippetBlock = codeBlockContaining(chapter11, 'text', 'S1: tropical fish');
const snippets = snippetBlock.trim().split(/\r?\n/).map((line) => line.replace(/^S\d+:\s*/, ''));
const queryTerms = new Set(['tropical', 'fish']);
const stopwords = new Set(['and', 'for', 'a']);
const filteredBySnippet = snippets.map((snippet) =>
  (snippet.toLowerCase().match(/[a-z]+/g) || [])
    .filter((token) => !queryTerms.has(token) && !stopwords.has(token)));
assert.deepEqual(filteredBySnippet, [
  ['aquarium', 'care', 'feeding'],
  ['colorful', 'freshwater', 'tank'],
  ['aquarium', 'guide', 'habitats'],
]);
const snippetTokens = filteredBySnippet.flat();
const frequencies = {};
for (const token of snippetTokens) frequencies[token] = (frequencies[token] || 0) + 1;
assert.equal(snippetTokens.length, 9);
assert.equal(frequencies.aquarium, 2);
for (const token of ['care', 'feeding', 'colorful', 'freshwater', 'tank', 'guide', 'habitats']) {
  assert.equal(frequencies[token], 1);
}
close(Object.values(frequencies).reduce((sum, count) => sum + count / 9, 0), 1);
close(frequencies.aquarium / 9, 2 / 9);

// Missing-tag weights.
const tagWeight = (tf, documentFrequency, documentCount = 4) =>
  Math.log(tf + 1) * Math.log(documentCount / documentFrequency);
close(tagWeight(3, 2), 0.9609060278);
close(tagWeight(2, 2), 0.7615000104);
close(tagWeight(2, 3), 0.3160510600);
close(tagWeight(1, 2), 0.4804530139);
assert.ok(tagWeight(3, 2) > tagWeight(2, 2));
assert.ok(tagWeight(2, 2) > tagWeight(1, 2));

// HITS uses old hubs for authority, then new authorities for hubs.
const nodes = ['A', 'B', 'C', 'D', 'E'];
const edges = { A: ['C', 'D'], B: ['C'], C: ['D'], D: ['C'], E: ['C', 'D'] };
function normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
  return norm === 0 ? vector.map(() => 0) : vector.map((value) => value / norm);
}
function hitsRound(hubs) {
  const authoritiesRaw = nodes.map((target) => nodes.reduce((sum, source, index) =>
    sum + (edges[source].includes(target) ? hubs[index] : 0), 0));
  const authorities = normalize(authoritiesRaw);
  const hubsRaw = nodes.map((source) => edges[source].reduce((sum, target) =>
    sum + authorities[nodes.indexOf(target)], 0));
  return { authoritiesRaw, authorities, hubsRaw, hubs: normalize(hubsRaw) };
}
const hits1 = hitsRound([1, 1, 1, 1, 1]);
assert.deepEqual(hits1.authoritiesRaw, [0, 0, 4, 3, 0]);
close(hits1.authorities[2], 0.8);
close(hits1.authorities[3], 0.6);
close(hits1.hubs[0], 0.5937322508);
const hits2 = hitsRound(hits1.hubs);
close(hits2.authorities[2], 0.7912850014);
close(hits2.authorities[3], 0.6114475011);
close(hits2.hubs[0], 0.5948135927);
close(hits2.hubs[2], 0.2592777199);

// Dirichlet smoothing -> translation terms -> products and log scores.
const translation = {
  search: [0.70, 0.35, 0.10, 0.20],
  engine: [0.10, 0.05, 0.75, 0.45],
};
const unshownTranslationMass = [0.20, 0.60, 0.15, 0.35];
for (let index = 0; index < unshownTranslationMass.length; index++) {
  close(translation.search[index] + translation.engine[index] + unshownTranslationMass[index], 1);
}
const collection = [0.30, 0.20, 0.20, 0.30];
const candidates = { A1: [1, 1, 1, 0], A2: [1, 0, 0, 2] };
function smoothedDistribution(counts, mu = 2) {
  const length = counts.reduce((sum, value) => sum + value, 0);
  return counts.map((count, index) => (count + mu * collection[index]) / (length + mu));
}
function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}
const a1Distribution = smoothedDistribution(candidates.A1);
const a2Distribution = smoothedDistribution(candidates.A2);
[0.32, 0.28, 0.28, 0.12].forEach((expected, index) => close(a1Distribution[index], expected));
[0.32, 0.08, 0.08, 0.52].forEach((expected, index) => close(a2Distribution[index], expected));
close(a1Distribution.reduce((sum, value) => sum + value, 0), 1);
close(a2Distribution.reduce((sum, value) => sum + value, 0), 1);
const modelA1 = [dot(translation.search, a1Distribution), dot(translation.engine, a1Distribution)];
const modelA2 = [dot(translation.search, a2Distribution), dot(translation.engine, a2Distribution)];
[0.374, 0.31].forEach((expected, index) => close(modelA1[index], expected));
[0.364, 0.33].forEach((expected, index) => close(modelA2[index], expected));
close(modelA1[0] * modelA1[1], 0.11594);
close(modelA2[0] * modelA2[1], 0.12012);
close(Math.log(modelA1[0]) + Math.log(modelA1[1]), -2.1546829164);
close(Math.log(modelA2[0]) + Math.log(modelA2[1]), -2.1192649319);

function combinedProbability(counts, queryIndex, translatedWeights, beta = 0.4, mu = 2) {
  const length = counts.reduce((sum, value) => sum + value, 0);
  const translatedCount = dot(translatedWeights, counts);
  return ((1 - beta) * counts[queryIndex] + beta * translatedCount
    + mu * collection[queryIndex]) / (length + mu);
}
const a1Combined = combinedProbability(candidates.A1, 0, translation.search)
  * combinedProbability(candidates.A1, 2, translation.engine);
const a2Combined = combinedProbability(candidates.A2, 0, translation.search)
  * combinedProbability(candidates.A2, 2, translation.engine);
close(a1Combined, 0.090304);
close(a2Combined, 0.05248);
assert.ok(a1Combined > a2Combined);

// Execute the small offline CF example and verify held-out pairs stay out of training.
const collaborativeFilteringCode = codeBlockContaining(chapter11, 'python', 'TRAIN = {');
const collaborativeFilteringOutput = runPython(`${collaborativeFilteringCode}\n
for user, item, _ in TEST:
    assert item not in TRAIN[user], "test rating leaked into training data"
print("NO_TEST_LEAKAGE")
`);
for (const marker of [
  'euclidean MSE=0.277953 coverage=100.00%',
  'pearson MSE=0.090000 coverage=100.00%',
  'pearson D I3 pred=1.4000 true=2',
  'NO_TEST_LEAKAGE',
]) {
  assert.ok(collaborativeFilteringOutput.includes(marker), `Missing CF output: ${marker}`);
}

// Exercise the public-data script on a fixture, including zero variance and fallback.
const movieLensScript = resolve(root, 'scripts/movielens-cf-example.py');
const movieLensChecks = runPython(`
import importlib.util
from statistics import mean

spec = importlib.util.spec_from_file_location("movielens_cf", ${JSON.stringify(movieLensScript)})
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

rows = []
for user in range(1, 6):
    for item in range(1, 7):
        rows.append((user, item, 0.5 + ((user + item) % 10) * 0.5, user * 100 + item))
train, validation, test = module.split_rows(rows, seed=30112)
assert len(train) + len(validation) + len(test) == len(rows)
assert {(u, i) for u, i, _, _ in train}.isdisjoint({(u, i) for u, i, _, _ in test})
matrix = module.build_matrix(train)
means = {user: mean(ratings.values()) for user, ratings in matrix.items()}
global_mean = mean(r for ratings in matrix.values() for r in ratings.values())

zero_variance = {1: {1: 3.0, 2: 3.0}, 2: {1: 4.0, 2: 5.0}}
assert module.similarity(zero_variance, 1, 2, "pearson", 2) is None

prediction, fallback = module.predict(
    matrix, means, global_mean, {}, 1, 999, "pearson", 2, 2, 0.5, 5.0
)
assert fallback and 0.5 <= prediction <= 5.0

user, item, actual, timestamp = test[0]
prediction_a = module.predict(
    matrix, means, global_mean, {}, user, item, "euclidean", 2, 2, 0.5, 5.0
)[0]
changed_test = [(u, i, (0.5 if r != 0.5 else 5.0), t) for u, i, r, t in test]
prediction_b = module.predict(
    matrix, means, global_mean, {}, user, item, "euclidean", 2, 2, 0.5, 5.0
)[0]
assert prediction_a == prediction_b
assert changed_test[0][2] != actual
assert module.evaluate(matrix, test, "euclidean", 2, 2, 0.5, 5.0)["coverage"] >= 0
print("MOVIELENS_FIXTURE_OK")
`);
assert.ok(movieLensChecks.includes('MOVIELENS_FIXTURE_OK'));

// Coverage is derived from distinct query terms.
const coverageQuery = new Set(['thông tin', 'tìm kiếm', 'mô hình']);
const coverageDocuments = {
  D1: new Set(['thông tin', 'tìm kiếm', 'mô hình']),
  D2: new Set(['thông tin', 'tìm kiếm', 'mô hình']),
  D3: new Set(['mô hình']),
};
const coverage = (terms) => [...coverageQuery].filter((term) => terms.has(term)).length / coverageQuery.size;
close(coverage(coverageDocuments.D1), 1);
close(coverage(coverageDocuments.D2), 1);
close(coverage(coverageDocuments.D3), 1 / 3);
assert.ok(chapter12.includes('D3 chỉ chứa duy nhất từ `mô hình`'));

// Feature vectors + weights -> scores -> rankings -> NDCG -> candidate selection.
const validationRows = [...chapter12.matchAll(
  /^\| (V[12]) \| ([A-F]) \| `\(([^)]+)\)` \| ([0-3]) \|$/gm,
)].map((match) => ({
  query: match[1],
  document: match[2],
  features: match[3].split(',').map((value) => Number(value.trim())),
  relevance: Number(match[4]),
}));
assert.equal(validationRows.length, 6);
const weightsMatch = chapter12.match(
  /Ba ứng viên trọng số là `Λ_A = \(([^)]+)\)`, `Λ_B = \(([^)]+)\)`, `Λ_C = \(([^)]+)\)`/,
);
assert.ok(weightsMatch, 'Validation candidate weights were not found');
const validationWeights = Object.fromEntries(['A', 'B', 'C'].map((id, index) => [
  id,
  weightsMatch[index + 1].split(',').map(Number),
]));
function rankRows(rows, weights) {
  return [...rows].sort((left, right) => {
    const scoreDifference = dot(right.features, weights) - dot(left.features, weights);
    if (scoreDifference !== 0) return scoreDifference;
    return left.document < right.document ? -1 : left.document > right.document ? 1 : 0;
  });
}
function dcg(relevances) {
  return relevances.reduce((sum, relevance, index) =>
    sum + (2 ** relevance - 1) / Math.log2(index + 2), 0);
}
const validationByQuery = {};
for (const row of validationRows) {
  validationByQuery[row.query] ??= [];
  validationByQuery[row.query].push(row);
}
const candidateResults = {};
for (const [candidateId, weights] of Object.entries(validationWeights)) {
  const perQuery = {};
  for (const [query, rows] of Object.entries(validationByQuery)) {
    const ranking = rankRows(rows, weights);
    const ideal = [...rows].sort((a, b) => b.relevance - a.relevance
      || (a.document < b.document ? -1 : 1));
    perQuery[query] = {
      ranking: ranking.map((row) => row.document).join(','),
      ndcg: dcg(ranking.map((row) => row.relevance)) / dcg(ideal.map((row) => row.relevance)),
    };
  }
  candidateResults[candidateId] = {
    ...perQuery,
    mean: (perQuery.V1.ndcg + perQuery.V2.ndcg) / 2,
  };
}
assert.equal(candidateResults.A.V1.ranking, 'A,B,C');
assert.equal(candidateResults.A.V2.ranking, 'F,E,D');
assert.equal(candidateResults.B.V1.ranking, 'B,A,C');
assert.equal(candidateResults.B.V2.ranking, 'E,F,D');
assert.equal(candidateResults.C.V1.ranking, 'A,C,B');
assert.equal(candidateResults.C.V2.ranking, 'E,D,F');
close(candidateResults.A.mean, 0.8983537905);
close(candidateResults.B.mean, 0.8549048707);
close(candidateResults.C.mean, 0.9733913306);
assert.equal(
  Object.entries(candidateResults).sort((a, b) => b[1].mean - a[1].mean)[0][0],
  'C',
);

// Original tokens -> mention windows -> alias merge -> pseudo-documents -> scores.
const entityRows = [...chapter12.matchAll(/^\| `([^`]+)` \| ([^|]+?) \|$/gm)]
  .map((match) => ({ passage: match[1], mention: match[2].trim() }))
  .filter((row) => ['Gerard Salton', 'G. Salton', 'Karen Spärck Jones', 'Google'].includes(row.mention));
assert.equal(entityRows.length, 4);
const entityStopwords = new Set(['was', 'by', 'at', 'and', 'for', 'a']);
const tokenizeWords = (text) => text.toLocaleLowerCase('en-US').match(/\p{L}+/gu) || [];
function mentionWindow(passage, mention, size = 5) {
  const tokens = tokenizeWords(passage);
  const mentionTokens = tokenizeWords(mention);
  const start = tokens.findIndex((_, index) =>
    mentionTokens.every((token, offset) => tokens[index + offset] === token));
  assert.ok(start >= 0, `Mention not found: ${mention}`);
  const end = start + mentionTokens.length;
  const raw = [...tokens.slice(Math.max(0, start - size), start), ...tokens.slice(end, end + size)];
  return { raw, filtered: raw.filter((token) => !entityStopwords.has(token)) };
}
const windows = Object.fromEntries(entityRows.map((row) => [row.mention, mentionWindow(row.passage, row.mention)]));
assert.deepEqual(windows['Gerard Salton'].raw, ['information', 'retrieval', 'was', 'developed', 'by', 'at', 'cornell']);
assert.deepEqual(windows['G. Salton'].raw, ['studied', 'automatic', 'indexing', 'and', 'retrieval']);
assert.deepEqual(windows['Karen Spärck Jones'].raw, ['proposed', 'inverse', 'document', 'frequency', 'for']);
assert.deepEqual(windows.Google.raw, ['operates', 'a', 'web', 'search', 'engine']);
const aliases = {
  'Gerard Salton': 'Gerard Salton',
  'G. Salton': 'Gerard Salton',
  'Karen Spärck Jones': 'Karen Spärck Jones',
  Google: 'Google',
};
const pseudoDocuments = {};
for (const row of entityRows) {
  const canonical = aliases[row.mention];
  pseudoDocuments[canonical] ??= [];
  pseudoDocuments[canonical].push(...windows[row.mention].filtered);
}
assert.deepEqual(pseudoDocuments['Gerard Salton'], [
  'information', 'retrieval', 'developed', 'cornell',
  'studied', 'automatic', 'indexing', 'retrieval',
]);
const entityQuery = ['vector', 'retrieval'];
const entityResults = Object.entries(pseudoDocuments).map(([entity, tokens]) => ({
  entity,
  totalFrequency: entityQuery.reduce((sum, term) =>
    sum + tokens.filter((token) => token === term).length, 0),
  distinctMatches: entityQuery.filter((term) => tokens.includes(term)).length,
})).sort((a, b) => b.totalFrequency - a.totalFrequency
  || (a.entity < b.entity ? -1 : a.entity > b.entity ? 1 : 0));
assert.deepEqual(entityResults, [
  { entity: 'Gerard Salton', totalFrequency: 2, distinctMatches: 1 },
  { entity: 'Google', totalFrequency: 0, distinctMatches: 0 },
  { entity: 'Karen Spärck Jones', totalFrequency: 0, distinctMatches: 0 },
]);

// The extractive answer must be a contiguous source span.
const p1 = chapter12.match(/^\| P1 \| `([^`]+)`/m)?.[1];
const extractiveAnswer = chapter12.match(/extractive QA[^\`]+`([^`]+)`/)?.[1];
assert.ok(p1 && extractiveAnswer, 'QA source or extractive answer was not found');
assert.ok(p1.includes(extractiveAnswer), 'Extractive answer is not a contiguous source span');

const xmlBlock = codeBlockContaining(chapter12, 'xml', '<collection>');
const xmlOutput = runPython(`import xml.etree.ElementTree as ET
root = ET.fromstring(${JSON.stringify(xmlBlock)})
matches = []
for article in root.findall("article"):
    year = int(article.findtext("fm/yr"))
    if year >= 2000:
        continue
    for section in article.findall(".//sec"):
        text = " ".join(section.itertext()).lower()
        if "search engines" in text:
            matches.append(section.attrib["id"])
assert matches == ["a1-s1"], matches
print("XML_CAS_EXAMPLE_OK")
`);
assert.ok(xmlOutput.includes('XML_CAS_EXAMPLE_OK'));

for (const [chapter, required] of [
  [chapter11, ['`P(w|t)`', '`P(t|w)`', 'MovieLens']],
  [chapter12, ['XPath', 'quan hệ nhân quả', 'extractive QA']],
]) {
  for (const marker of required) assert.ok(chapter.includes(marker), `Missing lesson marker: ${marker}`);
}

console.log('Verified Chapters 11-12 (VI): snippet distribution, tag weights, HITS, QA translation, CF and MovieLens edge cases, coverage, feature-to-NDCG selection, entity windows/aliases, extractive QA, and XML CAS.');
