/* FAQ : questions lues dans data/faq.json, recherche instantanée, filtre par catégorie.
 * Tout texte du JSON est posé par textContent (MATC.el) : jamais interprété comme du HTML.
 * Une question s’ouvre directement par son ancre : faq.html#q-<id>. */
(function () {
  'use strict';
  var M = window.MATC;
  var champ = document.getElementById('recherche-faq');
  var filtres = document.getElementById('faq-filtres');
  var liste = document.getElementById('faq-liste');
  var etat = document.getElementById('faq-etat');
  var categorieActive = 'toutes';
  var fiches = [];

  function bloc(q, libelleCategorie) {
    var corps = [];
    (q.reponse || []).forEach(function (p) { corps.push(M.el('p', { texte: p })); });
    var liens = (q.liens || []).map(function (l) {
      var href = M.lienSur(l.url);
      return href ? M.el('li', {}, [M.el('a', { classe: 'lien-fort', href: href, texte: l.texte })]) : null;
    }).filter(Boolean);
    if (liens.length) corps.push(M.el('ul', { classe: 'faq-liens' }, liens));
    if (q.aValider) {
      corps.push(M.el('p', { classe: 'faq-a-valider', texte: 'Réponse en cours de validation par la commune de Mézières-lez-Cléry.' }));
    }
    var details = M.el('details', { classe: 'faq-question', id: 'q-' + q.id }, [
      M.el('summary', {}, [
        M.el('span', { classe: 'faq-categorie', texte: libelleCategorie }),
        M.el('span', { classe: 'faq-intitule', texte: q.question })
      ]),
      M.el('div', { classe: 'faq-reponse' }, corps)
    ]);
    return details;
  }

  function filtrer() {
    var mots = M.normaliser(champ.value).split(' ').filter(Boolean);
    var n = 0;
    fiches.forEach(function (f) {
      var okCat = categorieActive === 'toutes' || f.categorie === categorieActive;
      var okMots = mots.every(function (m) { return f.index.indexOf(m) !== -1; });
      var visible = okCat && okMots;
      f.noeud.classList.toggle('est-masque', !visible);
      if (visible) n++;
    });
    var total = fiches.length;
    if (n === 0) {
      etat.textContent = 'Aucune question ne correspond. Essayez un autre mot, ou posez votre question dans l’entraide.';
    } else if (n === total) {
      etat.textContent = total + ' questions.';
    } else {
      etat.textContent = n + (n > 1 ? ' questions trouvées' : ' question trouvée') + ' sur ' + total + '.';
    }
  }

  function boutonFiltre(id, libelle) {
    var b = M.el('button', { type: 'button', classe: 'faq-filtre', 'aria-pressed': id === categorieActive ? 'true' : 'false', 'data-categorie': id, texte: libelle });
    b.addEventListener('click', function () {
      categorieActive = id;
      Array.prototype.forEach.call(filtres.querySelectorAll('button'), function (x) {
        x.setAttribute('aria-pressed', x.getAttribute('data-categorie') === id ? 'true' : 'false');
      });
      filtrer();
    });
    return b;
  }

  function ouvrirAncre() {
    var id = decodeURIComponent((window.location.hash || '').slice(1));
    if (!/^q-[\w-]+$/.test(id)) return;
    var d = document.getElementById(id);
    if (!d) return;
    d.classList.remove('est-masque');
    d.open = true;
    d.querySelector('summary').focus();
  }

  M.chargerJSON('data/faq.json').then(function (faq) {
    var libelles = {};
    filtres.appendChild(boutonFiltre('toutes', 'Toutes'));
    (faq.categories || []).forEach(function (c) {
      libelles[c.id] = c.libelle;
      filtres.appendChild(boutonFiltre(c.id, c.libelle));
    });
    (faq.questions || []).forEach(function (q) {
      var noeud = bloc(q, libelles[q.categorie] || '');
      liste.appendChild(noeud);
      fiches.push({
        noeud: noeud,
        categorie: q.categorie,
        index: ' ' + M.normaliser([q.question, libelles[q.categorie]].concat(q.reponse || []).join(' ')) + ' '
      });
    });
    champ.disabled = false;
    champ.addEventListener('input', filtrer);
    filtrer();
    ouvrirAncre();
    window.addEventListener('hashchange', ouvrirAncre);
  }).catch(function (e) {
    console.warn('[MAT communes] faq.json illisible :', e.message);
    etat.textContent = 'Les questions n’ont pas pu être chargées. Réessayez dans un instant, ou posez votre question dans l’entraide.';
  });
})();
