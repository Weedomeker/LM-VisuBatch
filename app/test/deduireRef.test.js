const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deduireRef } = require('../src/core/utils/deduireRef');

test('une référence numérique seule donne sa longueur exacte', () => {
  assert.deepEqual(deduireRef(['94964372']), { pattern: '\\d{8}', description: '8 chiffres' });
  assert.equal(deduireRef(['3276000123456']).pattern, '\\d{13}');
});

test('la partie commune en tête de plusieurs exemples devient fixe', () => {
  assert.deepEqual(deduireRef(['94964372', '91234567']), { pattern: '9\\d{7}', description: '8 chiffres commençant par 9' });
});

test('lettres, séparateur et chiffres', () => {
  assert.deepEqual(deduireRef(['HOKUSAID-100255']), {
    pattern: '[A-Z]+-\\d{6}',
    description: 'Des lettres majuscules, puis « - », puis 6 chiffres',
  });
  assert.equal(deduireRef(['HOKUSAID-100255', 'TROPICAL-100210']).pattern, '[A-Z]+-1002\\d{2}');
});

test('des longueurs différentes donnent un intervalle', () => {
  assert.equal(deduireRef(['1234', '123456']).pattern, '\\d{4,6}');
});

test('des exemples de formats différents sont refusés', () => {
  assert.ok(deduireRef(['94964372', 'HOKUSAID-100255']).erreur);
  assert.ok(deduireRef(['AB-12', 'AB_12']).erreur);
  assert.ok(deduireRef(['', '  ']).erreur);
});

test('le motif déduit reconnaît la référence dans un nom de fichier', () => {
  const { pattern } = deduireRef(['HOKUSAID-100255']);
  const m = 'Hokusai HOKUSAID-100255 MAT.jpg'.match(new RegExp(`\\b(${pattern})\\b`));
  assert.equal(m?.[1], 'HOKUSAID-100255');
  const { pattern: p2 } = deduireRef(['94964372', '91234567']);
  assert.ok(!new RegExp(`\\b(${p2})\\b`).test('Tropical 100x210 12345678.jpg'));
});

test('les caractères spéciaux sont échappés', () => {
  assert.equal(deduireRef(['AB.12']).pattern, '[A-Z]+\\.\\d{2}');
});
