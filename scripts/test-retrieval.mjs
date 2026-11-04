import assert from 'node:assert/strict';
import { selectRelevantText } from '../server/retrieval.mjs';

const section = (label, fill = 'background') => `${label}\n${`${fill} `.repeat(650)}`;
const longDocument = `${Array.from({ length: 18 }, (_, index) => section(`Section ${index + 1}`)).join('\n\n')}\nEND-OF-DOCUMENT`;

const relevantNearEnd = `${longDocument}\n\n${section('Rare appendix', 'quasar-index-token')}`;
const relevant = selectRelevantText(relevantNearEnd, 'Explain quasar-index-token from the appendix', 9000);
assert.equal(relevant.reduced, true);
assert.ok(relevant.selectedChunks >= 1);
assert.match(relevant.text, /Section 1/);
assert.match(relevant.text, /quasar-index-token/);
assert.ok(relevant.text.length <= 9000);

const generic = selectRelevantText(longDocument, 'Summarize this file', 13000);
assert.equal(generic.reduced, true);
assert.match(generic.text, /Section 1/);
assert.match(generic.text, /END-OF-DOCUMENT/);
assert.ok(generic.selectedChunks >= 2);
assert.ok(generic.text.length <= 13000);

const japaneseDocument = `${section('Introduction')}\n\n${section('検索付録', '検索エンジンの転置索引')}`;
const japanese = selectRelevantText(japaneseDocument, '転置索引について説明してください', 5000);
assert.match(japanese.text, /転置索引/);
assert.ok(japanese.text.length <= 5000);

const small = 'A short document that should pass through unchanged.';
assert.deepEqual(selectRelevantText(small, 'document', 1000), {
  text: small,
  reduced: false,
  selectedChunks: 1,
  totalChunks: 1
});

const unavailable = selectRelevantText(longDocument, 'anything', 499);
assert.equal(unavailable.text, '');
assert.equal(unavailable.reduced, true);

console.log('Retrieval: relevant, generic, CJK, budget, small-document, and tiny-budget cases passed.');
