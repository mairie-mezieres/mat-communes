/* Accueil : chiffres-clés et prochain webinaire, lus dans data/config.json.
 * Un chiffre sans valeur OU sans date n’est pas affiché : rien n’est inventé.
 * Avec ?apercu dans l’adresse, les tuiles vides apparaissent, marquées « à compléter ». */
(function () {
  'use strict';
  var M = window.MATC;

  function tuile(c) {
    var complet = c.valeur !== null && c.valeur !== '' && c.date;
    if (!complet && !M.APERCU) return null;
    var jour = complet ? M.formaterJour(c.date) : null;
    var enfants = [
      M.el('span', { classe: 'chiffre-valeur', texte: complet ? c.valeur : 'à compléter' }),
      M.el('span', { classe: 'chiffre-libelle', texte: c.libelle }),
      M.el('span', { classe: 'chiffre-date', texte: complet ? 'au ' + jour : 'data/config.json — « ' + c.id + ' »' })
    ];
    var source = complet ? M.lienSur(c.source) : null;
    if (source) enfants.push(M.el('a', { href: source, texte: 'Source' }));
    return M.el('li', { classe: 'chiffre' + (complet ? '' : ' chiffre-vide') }, enfants);
  }

  function afficherChiffres(config) {
    var liste = document.getElementById('liste-chiffres');
    var section = document.getElementById('chiffres');
    if (!liste || !section) return;
    var n = 0;
    (config.chiffresCles || []).forEach(function (c) {
      var t = tuile(c);
      if (t) { liste.appendChild(t); n++; }
    });
    if (n > 0) section.classList.remove('est-masque');
  }

  function afficherWebinaire(config) {
    var p = document.getElementById('accueil-webinaire');
    if (!p) return;
    var w = M.prochainWebinaire(config);
    p.textContent = w
      ? 'Prochaine séance : ' + w.libelle + '.' + (w.sujet ? ' Thème : ' + w.sujet + '.' : '')
      : 'Une fois par mois, en visio. Prochaine date bientôt annoncée.';
  }

  M.config.then(function (config) {
    afficherChiffres(config);
    afficherWebinaire(config);
  });
})();
