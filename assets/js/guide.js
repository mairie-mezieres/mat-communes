/* Guide pas à pas : une étape par écran.
 * Sans JavaScript, toutes les étapes s’affichent l’une sous l’autre et les boutons
 * « Étape suivante » sont de simples ancres : le guide reste utilisable.
 * Avec JavaScript, seule l’étape demandée par l’adresse (#etape-N) est visible ;
 * les boutons Précédent / Suivant du navigateur fonctionnent donc aussi.
 * La dernière étape vue est mémorisée sur l’appareil, pour reprendre plus tard. */
(function () {
  'use strict';
  var etapes = Array.prototype.slice.call(document.querySelectorAll('.etape'));
  if (!etapes.length) return;
  var CLE = 'matc_guide_etape';
  var liensSommaire = document.querySelectorAll('.sommaire-liste a');

  function memoriser(n) { try { localStorage.setItem(CLE, String(n)); } catch (e) { /* stockage indisponible */ } }
  function relire() { try { return parseInt(localStorage.getItem(CLE), 10); } catch (e) { return NaN; } }

  function numeroDepuisAdresse() {
    var m = /^#etape-(\d+)$/.exec(window.location.hash || '');
    var n = m ? parseInt(m[1], 10) : NaN;
    return n >= 0 && n < etapes.length ? n : null;
  }

  function afficher(n, donnerFocus) {
    etapes.forEach(function (e, i) { e.classList.toggle('est-masque', i !== n); });
    Array.prototype.forEach.call(liensSommaire, function (a) {
      if (a.getAttribute('href') === '#etape-' + n) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });
    if (n > 0) memoriser(n);
    if (donnerFocus) {
      var titre = document.getElementById('titre-etape-' + n);
      if (titre) {
        titre.focus({ preventScroll: true });
        etapes[n].scrollIntoView({ block: 'start' });
      }
    }
  }

  window.addEventListener('hashchange', function () {
    var n = numeroDepuisAdresse();
    if (n !== null) afficher(n, true);
  });

  var depart = numeroDepuisAdresse();
  if (depart !== null) {
    afficher(depart, true);
  } else {
    afficher(0, false);
    var vue = relire();
    if (vue > 0 && vue < etapes.length) {
      var titre = document.getElementById('titre-etape-' + vue);
      document.getElementById('guide-reprendre-texte').textContent =
        'La dernière fois, vous étiez à l’étape ' + vue + ' : « ' + (titre ? titre.textContent : '') + ' ».';
      document.getElementById('guide-reprendre-lien').setAttribute('href', '#etape-' + vue);
      document.getElementById('guide-reprendre').classList.remove('est-masque');
    }
  }

  /* Impression du seul carnet de route. */
  var bouton = document.getElementById('imprimer-carnet');
  if (bouton) {
    bouton.addEventListener('click', function () {
      document.body.classList.add('impression-carnet');
      window.print();
    });
    window.addEventListener('afterprint', function () { document.body.classList.remove('impression-carnet'); });
  }
})();
