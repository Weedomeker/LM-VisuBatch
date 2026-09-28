// Comparaison de numéros de version « MAJEUR.MINEUR.CORRECTIF » (préfixe « v » accepté).

const lire = v => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v ?? '').trim());
  return m ? m.slice(1).map(Number) : null;
};

// -1 si a < b, 1 si a > b, 0 si égales ou si l'une est illisible (jamais de fausse nouvelle version).
function comparerVersions(a, b) {
  const va = lire(a);
  const vb = lire(b);
  if (!va || !vb) return 0;
  for (let i = 0; i < 3; i++) if (va[i] !== vb[i]) return va[i] > vb[i] ? 1 : -1;
  return 0;
}

module.exports = { comparerVersions };
