// Tests d'intégration — panneau Réglages client (couche main process)
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { LM_DEFAULTS, loadClientConfig, saveClientConfig, buildRegex, resolveCatalogue, catalogueFilename } =
  require('../src/core/utils/clientConfig');

// --- helpers ---
let tmpDir;
before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'visubatch-test-')); });
after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

const configPath = () => path.join(tmpDir, 'config.json');
const write = obj => fs.writeFileSync(configPath(), JSON.stringify(obj));
const unlink = () => { try { fs.unlinkSync(configPath()); } catch {} };

// --- 1. Pas de config.json ---
describe('loadClientConfig sans config.json', () => {
  it('retourne null si absent', () => {
    unlink();
    assert.equal(loadClientConfig(tmpDir), null);
  });
});

// --- 2. Config minimale ---
describe('loadClientConfig avec config.json minimal', () => {
  it('fusionne avec LM_DEFAULTS pour les champs manquants', () => {
    write({ client: 'ACME' });
    const cfg = loadClientConfig(tmpDir);
    assert.equal(cfg.client, 'ACME');
    assert.deepEqual(cfg.formats, LM_DEFAULTS.formats);  // hérité
    assert.deepEqual(cfg.finitions, LM_DEFAULTS.finitions);
    assert.equal(cfg.uniPrefix, LM_DEFAULTS.uniPrefix);
  });
});

// --- 3. Config complète ---
describe('loadClientConfig avec config complète', () => {
  it('utilise toutes les valeurs personnalisées', () => {
    write({
      client: 'Test Corp',
      catalogue: 'mon-catalogue.csv',
      refPattern: '\\d{6}',
      outputFolder: 'WEB-TEST',
      formats: ['80x200', '100x200'],
      finitions: ['SATINÉ', 'MAT'],
      motifPattern: 'source',
      uniPrefix: 'UTC',
    });
    const cfg = loadClientConfig(tmpDir);
    assert.equal(cfg.client, 'Test Corp');
    assert.equal(cfg.refPattern, '\\d{6}');
    assert.equal(cfg.outputFolder, 'WEB-TEST');
    assert.deepEqual(cfg.formats, ['80x200', '100x200']);
    assert.deepEqual(cfg.finitions, ['SATINÉ', 'MAT']);
    assert.equal(cfg.uniPrefix, 'UTC');
  });
});

// --- 4. Config JSON invalide ---
describe('loadClientConfig — JSON invalide', () => {
  it('lève une erreur lisible', () => {
    fs.writeFileSync(configPath(), '{ invalide json }');
    assert.throws(() => loadClientConfig(tmpDir), /config\.json invalide/);
  });
});

// --- 5. buildRegex avec config custom ---
describe('buildRegex avec config custom', () => {
  it('construit les regex depuis refPattern et finitions personnalisés', () => {
    const cfg = { refPattern: '\\d{6}', finitions: ['SATINÉ', 'MAT'], motifPattern: 'source' };
    const { refRe, finitionRe, motifRe } = buildRegex(cfg);
    assert.ok(refRe.test('123456'), 'refRe doit matcher 6 chiffres');
    assert.ok(!refRe.test('12345'), 'refRe ne doit pas matcher 5 chiffres');
    // finition accentuée — testée dans un contexte de nom de fichier réaliste
    assert.ok(finitionRe.test('BLANC 100x210 123456 SATINÉ.jpg'), 'finitionRe doit matcher SATINÉ dans un nom de fichier');
    assert.ok(finitionRe.test('BLANC 100x210 123456 mat.jpg'), 'finitionRe insensible à la casse');
    assert.ok(!finitionRe.test('BLANC 100x210 123456.jpg'), 'finitionRe ne matche pas sans finition');
    assert.ok(motifRe.test('source principal'), 'motifRe doit matcher');
    assert.ok(!motifRe.test('autre chose'), 'motifRe ne doit pas matcher');
  });
});

// --- 6. resolveCatalogue — chemin personnalisé relatif ---
describe('resolveCatalogue — chemin relatif dans config', () => {
  it('résout le chemin relatif par rapport au dossier GAMME', () => {
    const csvName = 'mon-catalogue.csv';
    const csvPath = path.join(tmpDir, csvName);
    fs.writeFileSync(csvPath, 'ref,decor\n');
    const cfg = { ...LM_DEFAULTS, catalogue: csvName };
    const result = resolveCatalogue(cfg, tmpDir, '/fallback.csv');
    assert.equal(result, csvPath);
  });
});

// --- 7. resolveCatalogue — auto-détection gamme_Client.csv ---
describe('resolveCatalogue — auto-détection', () => {
  it('trouve gamme_Test_Corp.csv dans le dossier GAMME', () => {
    const autoName = catalogueFilename('Test Corp');  // gamme_Test_Corp.csv
    const autoPath = path.join(tmpDir, autoName);
    fs.writeFileSync(autoPath, 'ref,decor\n');
    const cfg = { ...LM_DEFAULTS, client: 'Test Corp', catalogue: '' };
    const result = resolveCatalogue(cfg, tmpDir, '/fallback.csv');
    assert.equal(result, autoPath);
    fs.unlinkSync(autoPath);
  });
});

// --- 8. resolveCatalogue — fallback ---
describe('resolveCatalogue — fallback', () => {
  it('retourne le catalogue par défaut si rien trouvé', () => {
    const cfg = { ...LM_DEFAULTS, catalogue: '' };
    const result = resolveCatalogue(cfg, tmpDir, '/fallback.csv');
    assert.equal(result, '/fallback.csv');
  });
});

// --- 9. saveClientConfig (simulation write + reload) ---
describe('saveClientConfig → loadClientConfig round-trip', () => {
  it('écrit puis relit correctement la config', () => {
    unlink();
    const toSave = {
      client: 'Round Trip',
      catalogue: '',
      refPattern: 'RT\\d{4}',
      outputFolder: 'RT-WEB',
      formats: ['100x210', '150x255'],
      finitions: ['GLOSSY'],
      motifPattern: 'rt-source',
      uniPrefix: 'RT',
    };
    // Simulation du IPC handler save (écriture directe)
    fs.writeFileSync(configPath(), JSON.stringify(toSave, null, 2), 'utf8');
    const loaded = loadClientConfig(tmpDir);
    assert.equal(loaded.client, 'Round Trip');
    assert.equal(loaded.refPattern, 'RT\\d{4}');
    assert.deepEqual(loaded.finitions, ['GLOSSY']);
    assert.equal(loaded.uniPrefix, 'RT');
  });
});

// --- 10. Regex LM par défaut — cas réels ---
describe('Regex LM_DEFAULTS — cas réels', () => {
  it('refRe détecte une référence LM dans un nom de fichier', () => {
    const { refRe, finitionRe, motifRe } = buildRegex(LM_DEFAULTS);
    assert.ok(refRe.test('000 BLANC 100x210 94953622 MAT.jpg'));
    assert.ok(finitionRe.test('000 BLANC 100x210 94953622 MAT.jpg'));
    assert.ok(!finitionRe.test('000 BLANC 100x210 94953622.jpg'));
    assert.ok(motifRe.test('000 BLANC 100x210 au 10ème 94956949.jpg'));
    assert.ok(!motifRe.test('000 BLANC 100x210 94953622 MAT.jpg'));
  });
});
