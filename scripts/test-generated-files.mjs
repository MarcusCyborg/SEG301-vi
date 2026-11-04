import assert from 'node:assert/strict';
import { extractCsvArtifact, wantsCsvFile } from '../server/generated-files.mjs';

assert.equal(wantsCsvFile('Hãy xuất kết quả ra file CSV giúp tôi'), true);
assert.equal(wantsCsvFile('Create and download a CSV file'), true);
assert.equal(wantsCsvFile('CSV là gì?'), false);

const artifact = extractCsvArtifact('Đã tạo file.\n\nCSV_FILE: điểm số 2026.csv\n```csv\nname,score\nAn,9\nBinh,8\n```');
assert.deepEqual(artifact, {
  name: 'điểm số 2026.csv',
  mediaType: 'text/csv',
  text: 'name,score\nAn,9\nBinh,8\n'
});

const sanitized = extractCsvArtifact('CSV_FILE: ../../bad:name\n```csv\na,b\n1,2\n```');
assert.equal(sanitized.name, '.._.._bad_name.csv');
assert.equal(extractCsvArtifact('```javascript\nconsole.log(1)\n```'), null);
assert.equal(extractCsvArtifact('```csv\n\n```'), null);

console.log('Generated CSV files: request detection, extraction, naming, and rejection cases passed.');
