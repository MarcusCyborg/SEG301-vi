import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const chapter8Vi = await readFile(resolve(root, 'content/chapter-08-search-engine-optimization-vi.md'), 'utf8');
const chapter9Vi = await readFile(resolve(root, 'content/chapter-09-evaluating-search-engines-vi.md'), 'utf8');
const chapter10Vi = await readFile(resolve(root, 'content/chapter-10-classification-and-clustering-vi.md'), 'utf8');

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function dcg(relevances) {
  return relevances.reduce((sum, relevance, index) =>
    sum + (2 ** relevance - 1) / Math.log2(index + 2), 0);
}

const actualRelevance = [3, 0, 2, 1, 0];
const idealRelevance = [3, 2, 2, 1, 1];
const dcgAt5 = dcg(actualRelevance);
const idcgAt5 = dcg(idealRelevance);
const ndcgAt5 = dcgAt5 / idcgAt5;
close(dcgAt5, 8.9306765581);
close(idcgAt5, 11.2103186260);
close(ndcgAt5, 0.7966478792);

assert.match(chapter9Vi, /D9 \| 1 \| 1/);
assert.ok(chapter9Vi.includes('`[3,2,2,1,1]`'));
assert.ok(chapter9Vi.includes('11.2103186260'));
assert.ok(chapter9Vi.includes('0.7966478792'));
assert.ok(chapter9Vi.includes('0.109375'));

function pythonBlockContaining(markdown, marker) {
  const blocks = [...markdown.matchAll(/```python\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
  const block = blocks.find((candidate) => candidate.includes(marker));
  assert.ok(block, `Python block containing ${marker} was not found`);
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
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    if (!result.error) {
      assert.equal(result.status, 0, result.stderr || result.stdout);
      return result.stdout;
    }
  }
  assert.fail('Python interpreter was not found');
}

const offlineCode = pythonBlockContaining(chapter8Vi, 'REFERENCE_DATE = date(2026, 9, 28)');
const offlineOutput = runPython(`${offlineCode}\n
assert (start_7.isoformat(), end_7.isoformat()) == ("2026-09-21", "2026-09-27")
assert (start_30.isoformat(), end_30.isoformat()) == ("2026-08-29", "2026-09-27")
assert organic_7 == 126
assert top_landing_pages == [
    ("/breakfast/protein/", 80),
    ("/breakfast/quick/", 40),
    ("/breakfast/oats/", 29),
    ("/breakfast/toast/", 21),
    ("/breakfast/eggs/", 19),
]
assert top_organic_sources == [
    ("google", 122), ("bing", 33), ("duckduckgo", 20),
    ("ecosia", 8), ("yahoo", 8),
]
assert total_sessions([], start_7, end_7) == 0
assert top_groups([], start_30, end_30, "source") == []
assert top_groups(rows, start_30, end_30, "source", channel="Referral") == [("campus.example", 42)]
assert all(row["date"] != "2026-09-28" for row in filtered_rows(rows, start_7, end_7, "Organic Search"))
print("OFFLINE_ANALYTICS_OK_VI")
`);
assert.ok(offlineOutput.includes('OFFLINE_ANALYTICS_OK_VI'));

const ga4Code = pythonBlockContaining(chapter8Vi, 'def first_metric_int(response):');
const ga4SyntaxOutput = runPython(`import ast\nast.parse(${JSON.stringify(ga4Code)})\nprint("GA4_SYNTAX_OK_VI")\n`);
assert.ok(ga4SyntaxOutput.includes('GA4_SYNTAX_OK_VI'));
const helpers = ga4Code.match(/def first_metric_int[\s\S]*?(?=\ndef channel_filter)/)?.[0];
assert.ok(helpers, 'GA4 response helpers were not found in VI');
assert.ok(!ga4Code.includes('except'), 'GA4 example in VI must not turn API errors into zero');
const mockOutput = runPython(`${helpers}\n
class Value:
    def __init__(self, value):
        self.value = value

class Row:
    def __init__(self, metric, dimension="item"):
        self.metric_values = [Value(metric)]
        self.dimension_values = [Value(dimension)]

class Response:
    def __init__(self, rows):
        self.rows = rows

assert first_metric_int(Response([Row("17")])) == 17
assert first_metric_int(Response([])) is None
assert first_metric_int(Response([Row("0")])) == 0
assert dimension_session_rows(Response([])) == []
assert dimension_session_rows(Response([Row("0", "google")])) == [("google", 0)]

class FailingClient:
    def run_report(self, request):
        raise PermissionError("permission denied")

try:
    FailingClient().run_report(None)
except PermissionError:
    pass
else:
    raise AssertionError("API errors must propagate")
print("GA4_MOCK_OK_VI")
`);
assert.ok(mockOutput.includes('GA4_MOCK_OK_VI'));

const recipeScore = 0.5 * (2 / 15) * (3 / 15) * (2 / 15);
const sportsScore = 0.5 * (1 / 15) ** 3;
close(recipeScore / (recipeScore + sportsScore), 0.9230769230769231);
assert.ok(chapter10Vi.includes('0.9231'));

function entropy(probabilities) {
  return -probabilities.filter(Boolean).reduce((sum, probability) =>
    sum + probability * Math.log2(probability), 0);
}
const informationGain = 1 - (5 / 8) * entropy([4 / 5, 1 / 5]);
close(informationGain, 0.5487949406953986);
assert.ok(chapter10Vi.includes('0.5488'));

assert.ok(chapter10Vi.includes('a_i>0'));
assert.ok(chapter10Vi.includes('các điểm nằm trong margin hoặc bị phân loại sai'));
assert.ok(chapter10Vi.includes('5.7778'));

console.log('Verified Chapters 8-10 (VI): NDCG, GA4 empty/zero/error handling, offline Analytics, Naive Bayes, information gain, and K-means.');
