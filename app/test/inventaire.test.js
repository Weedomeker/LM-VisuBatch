const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildRegex, LM_DEFAULTS } = require('../src/core/utils/clientConfig');

const inventaire = require('../src/core/inventaire');

test('parse reconnaît une référence LM standard', () => {
  const regex = buildRegex(LM_DEFAULTS);
  const r = inventaire._parse('000 BLANC 100x210 94953622 MAT.jpg', regex);
  assert.ok(r, 'doit retourner un objet');
  assert.equal(r.ref, '94953622');
  assert.equal(r.finition, 'MAT');
  assert.equal(r.largeur, '100');
  assert.equal(r.hauteur, '210');
  assert.equal(r.isMotif, false);
});

test('parse reconnaît un motif au 10ème', () => {
  const regex = buildRegex(LM_DEFAULTS);
  const r = inventaire._parse('000 BLANC 100x210 au 10ème 94956949.jpg', regex);
  assert.ok(r);
  assert.equal(r.isMotif, true);
});

test('parse utilise un refPattern custom', () => {
  const config = { ...LM_DEFAULTS, refPattern: 'REF-\\d{5}', finitions: ['LISSE', 'TEXTURÉ'] };
  const regex = buildRegex(config);
  const r = inventaire._parse('MON_DECOR 100x210 REF-12345 LISSE.jpg', regex);
  assert.ok(r);
  assert.equal(r.ref, 'REF-12345');
  assert.equal(r.finition, 'LISSE');
});

test('parse retourne null si pas de dimension', () => {
  const regex = buildRegex(LM_DEFAULTS);
  assert.equal(inventaire._parse('fichier_sans_dimension.jpg', regex), null);
});

test('FORMATS est exporté et correspond aux LM_DEFAULTS', () => {
  assert.deepEqual(inventaire.FORMATS, LM_DEFAULTS.formats);
});
