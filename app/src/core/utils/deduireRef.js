// Déduit le motif (regex) des références d'un client à partir d'exemples saisis par l'utilisateur.
// Chargé à la fois par Node (require) et par l'interface (balise <script>, expose window.deduireRef).
(function (racine) {
  const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Découpe une référence en blocs : chiffres (d), lettres (l) ou autres caractères (x).
  function decouper(ref) {
    return (ref.match(/\d+|[A-Za-z]+|[^A-Za-z\d]+/g) || []).map(texte => ({
      type: /\d/.test(texte[0]) ? 'd' : /[A-Za-z]/.test(texte[0]) ? 'l' : 'x',
      texte,
    }));
  }

  function prefixeCommun(textes) {
    let p = textes[0];
    for (const t of textes) while (!t.startsWith(p)) p = p.slice(0, -1);
    return p;
  }

  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  // Un bloc de même position dans tous les exemples → { motif, description }.
  function deduireBloc(blocs, plusieurs) {
    const textes = blocs.map(b => b.texte);
    const type = blocs[0].type;
    if (type === 'x') return { motif: echapper(textes[0]), description: `« ${textes[0]} »` };
    if (plusieurs && textes.every(t => t === textes[0])) return { motif: echapper(textes[0]), description: `« ${textes[0]} »` };
    if (type === 'l') {
      const maj = textes.every(t => t === t.toUpperCase());
      const min = textes.every(t => t === t.toLowerCase());
      return {
        motif: maj ? '[A-Z]+' : min ? '[a-z]+' : '[A-Za-z]+',
        description: maj ? 'des lettres majuscules' : min ? 'des lettres minuscules' : 'des lettres',
      };
    }
    // Chiffres : partie commune en tête fixe (plusieurs exemples de même longueur), le reste généralisé.
    const memeLongueur = textes.every(t => t.length === textes[0].length);
    const prefixe = plusieurs && memeLongueur ? prefixeCommun(textes) : '';
    const longueurs = textes.map(t => t.length - prefixe.length);
    const min = Math.min(...longueurs),
      max = Math.max(...longueurs);
    const total = prefixe.length + min;
    const quantite = min === max ? `{${min}}` : `{${min},${max}}`;
    const nombre = min === max ? pluriel(total, 'chiffre') : `${total} à ${prefixe.length + max} chiffres`;
    return {
      motif: prefixe + (max > 0 ? `\\d${quantite}` : ''),
      description: prefixe ? `${nombre} commençant par ${prefixe}` : nombre,
    };
  }

  /**
   * @param {string[]} exemples références saisies (au moins une)
   * @returns {{ pattern: string, description: string } | { erreur: string }}
   */
  function deduireRef(exemples) {
    const refs = exemples.map(e => String(e).trim()).filter(Boolean);
    if (!refs.length) return { erreur: 'Saisissez au moins une référence.' };
    const decoupes = refs.map(decouper);
    const modele = decoupes[0];
    const coherent = decoupes.every(
      d => d.length === modele.length && d.every((b, i) => b.type === modele[i].type && (b.type !== 'x' || b.texte === modele[i].texte)),
    );
    if (!coherent) return { erreur: "Les exemples n'ont pas le même format." };
    const blocs = modele.map((_, i) =>
      deduireBloc(
        decoupes.map(d => d[i]),
        refs.length > 1,
      ),
    );
    const description = blocs.map(b => b.description).join(', puis ');
    return { pattern: blocs.map(b => b.motif).join(''), description: description[0].toUpperCase() + description.slice(1) };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { deduireRef };
  else racine.deduireRef = deduireRef;
})(globalThis);
