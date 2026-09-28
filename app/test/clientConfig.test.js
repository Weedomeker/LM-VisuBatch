const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { toSlug, catalogueFilename, buildRegex, loadClientConfig, resolveCatalogue, LM_DEFAULTS } = require('../src/core/utils/clientConfig');

test('toSlug normalise les noms de client', () => {
  assert.equal(toSlug('Leroy Merlin'), 'Leroy_Merlin');
  assert.equal(toSlug('Villeroy & Boch'), 'Villeroy_Boch');
  assert.equal(toSlug('  Espaces  '), 'Espaces');
});

test('catalogueFilename construit le nom du fichier', () => {
  assert.equal(catalogueFilename('Leroy Merlin'), 'gamme_Leroy_Merlin.csv');
  assert.equal(catalogueFilename('Villeroy & Boch'), 'gamme_Villeroy_Boch.csv');
});

test('LM_DEFAULTS contient les 8 champs requis', () => {
  const champs = ['client', 'catalogue', 'refPattern', 'outputFolder', 'formats', 'finitions', 'motifPattern', 'uniPrefix'];
  for (const c of champs) assert.ok(c in LM_DEFAULTS, `champ manquant : ${c}`);
});

test('buildRegex construit les regex depuis la config', () => {
  const { refRe, finitionRe, motifRe } = buildRegex(LM_DEFAULTS);
  assert.ok(refRe.test('94953622'), 'refRe doit matcher une référence LM');
  assert.ok(!refRe.test('12345678'), 'refRe ne doit pas matcher un nombre sans 9');
  assert.ok(finitionRe.test('MAT'), 'finitionRe doit matcher MAT');
  assert.ok(finitionRe.test('brillant'), 'finitionRe doit matcher brillant (casse)');
  assert.ok(motifRe.test('au 10ème'), 'motifRe doit matcher au 10ème');
  assert.ok(motifRe.test('au 10éme'), 'motifRe doit matcher au 10éme (faute)');
});

test('loadClientConfig retourne null si pas de config.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  assert.equal(loadClientConfig(tmp), null);
  fs.rmdirSync(tmp);
});

test('loadClientConfig charge et fusionne avec LM_DEFAULTS', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  fs.writeFileSync(path.join(tmp, 'config.json'), JSON.stringify({ client: 'Test', uniPrefix: 'TST' }));
  const config = loadClientConfig(tmp);
  assert.equal(config.client, 'Test');
  assert.equal(config.uniPrefix, 'TST');
  assert.deepEqual(config.formats, LM_DEFAULTS.formats, 'les formats LM sont gardés par défaut');
  fs.rmSync(tmp, { recursive: true });
});

test('resolveCatalogue — chemin personnalisé absolu', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  const csvPath = path.join(tmp, 'mon_catalogue.csv');
  fs.writeFileSync(csvPath, 'dossier;uni\n');
  const config = { ...LM_DEFAULTS, catalogue: csvPath };
  assert.equal(resolveCatalogue(config, tmp, '/fallback.csv'), csvPath);
  fs.rmSync(tmp, { recursive: true });
});

test('resolveCatalogue — auto-détection gamme_Client.csv', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  const autoPath = path.join(tmp, 'gamme_Test_Client.csv');
  fs.writeFileSync(autoPath, 'dossier;uni\n');
  const config = { ...LM_DEFAULTS, client: 'Test Client', catalogue: '' };
  assert.equal(resolveCatalogue(config, tmp, '/fallback.csv'), autoPath);
  fs.rmSync(tmp, { recursive: true });
});

test('resolveCatalogue — fallback si rien trouvé', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-'));
  const config = { ...LM_DEFAULTS, client: 'Inconnu', catalogue: '' };
  assert.equal(resolveCatalogue(config, tmp, '/fallback.csv'), '/fallback.csv');
  fs.rmdirSync(tmp);
});
