const { test } = require('node:test');
const assert = require('node:assert/strict');
const { comparerVersions } = require('../src/core/utils/version');

test('comparaison numérique, pas alphabétique', () => {
  assert.equal(comparerVersions('0.10.0', '0.9.9'), 1);
  assert.equal(comparerVersions('0.9.9', '0.10.0'), -1);
  assert.equal(comparerVersions('1.0.0', '0.99.99'), 1);
});

test('le préfixe « v » est accepté', () => {
  assert.equal(comparerVersions('v0.7.0', '0.6.0'), 1);
  assert.equal(comparerVersions('v0.6.0', '0.6.0'), 0);
});

test('une version illisible ne passe jamais pour plus récente', () => {
  assert.equal(comparerVersions('v0.7.0-beta', '0.6.0'), 0);
  assert.equal(comparerVersions(undefined, '0.6.0'), 0);
  assert.equal(comparerVersions('0.7', '0.6.0'), 0);
});
