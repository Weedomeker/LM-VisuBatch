// CSV « Excel français » : séparateur « ; », BOM UTF-8, fins de ligne Windows.
const fs = require('fs');

function readCsv(file) {
  if (!file || !fs.existsSync(file)) return [];
  const [header, ...lines] = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const cols = header.split(';');
  return lines.filter(Boolean).map(l => Object.fromEntries(l.split(';').map((v, i) => [cols[i], v])));
}

function writeCsv(file, cols, rows) {
  const lines = [cols.join(';'), ...rows.map(r => cols.map(c => r[c] ?? '').join(';'))];
  fs.writeFileSync(file, '﻿' + lines.join('\r\n'), 'utf8');
}

module.exports = { readCsv, writeCsv };
