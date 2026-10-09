/* Webinaire : affiche la prochaine séance d’après la SEULE variable
 * data/config.json → webinaire.prochaineDate. Pas de date, date illisible ou
 * séance terminée : le texte « prochaine date annoncée ici » reste affiché. */
(function () {
  'use strict';
  var M = window.MATC;

  M.config.then(function (config) {
    var w = M.prochainWebinaire(config);
    if (!w) return;
    document.getElementById('webi-date').textContent = w.libelle.charAt(0).toUpperCase() + w.libelle.slice(1);
    document.getElementById('webi-duree').textContent = 'Durée prévue : ' + w.dureeMinutes + ' minutes.';
    if (w.enCours) document.getElementById('webi-encours').classList.remove('est-masque');
    if (w.sujet) {
      var sujet = document.getElementById('webi-sujet');
      sujet.textContent = 'Thème : ' + w.sujet;
      sujet.classList.remove('est-masque');
    }
    var boutons = document.getElementById('webi-boutons');
    if (w.lienInscription) boutons.appendChild(M.el('a', { classe: 'bouton bouton-clair', href: w.lienInscription, texte: 'S’inscrire' }));
    if (w.lienVisio) boutons.appendChild(M.el('a', { classe: 'bouton', href: w.lienVisio, texte: 'Rejoindre la visio' }));
    if (!w.lienInscription && !w.lienVisio) {
      boutons.appendChild(M.el('p', { texte: 'Le lien pour rejoindre la séance sera publié ici.' }));
    }
    document.getElementById('webi-aucun').classList.add('est-masque');
    document.getElementById('webi-detail').classList.remove('est-masque');
  });
})();
