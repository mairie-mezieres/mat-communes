/* MAT · entraide entre communes — outils communs à toutes les pages.
 *
 * Règles du site (contrôlées par scripts/controles.js) :
 *  - aucun innerHTML : tout texte venu d’un JSON est posé par textContent,
 *    donc échappé par construction (MATC.el) ;
 *  - affichage piloté par classList (.est-masque), jamais par style ;
 *  - addEventListener uniquement.
 *
 * Chargé en `defer` AVANT le script propre à la page, qui peut donc compter sur MATC.
 */
(function () {
  'use strict';

  var APERCU = (function () {
    try { return new URLSearchParams(window.location.search).has('apercu'); }
    catch (e) { return false; }
  })();

  /* Lien accepté : https://…, une page du site (faq.html#ancre), une ancre, ou mailto:.
   * Tout le reste (javascript:, data:, http: en clair…) est refusé. */
  function lienSur(url) {
    if (typeof url !== 'string') return null;
    var u = url.trim();
    if (/^https:\/\/[^\s"<>]+$/i.test(u)) return u;
    if (/^[a-z0-9-]+\.html(#[\w-]+)?$/i.test(u)) return u;
    if (/^#[\w-]+$/.test(u)) return u;
    if (/^mailto:[^\s"<>]+$/i.test(u)) return u;
    return null;
  }

  /* Fabrique d’élément : le texte passe TOUJOURS par textContent. */
  function el(balise, attributs, enfants) {
    var n = document.createElement(balise);
    var a = attributs || {};
    Object.keys(a).forEach(function (cle) {
      var v = a[cle];
      if (v === null || v === undefined || v === false) return;
      if (cle === 'texte') n.textContent = String(v);
      else if (cle === 'classe') n.className = String(v);
      else if (cle === 'href') {
        var sur = lienSur(v);
        if (sur) n.setAttribute('href', sur);
      } else n.setAttribute(cle, v === true ? '' : String(v));
    });
    (enfants || []).forEach(function (e) {
      if (e === null || e === undefined) return;
      n.appendChild(typeof e === 'string' ? document.createTextNode(e) : e);
    });
    return n;
  }

  function chargerJSON(chemin) {
    return fetch(chemin, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(chemin + ' : HTTP ' + r.status);
      return r.json();
    });
  }

  /* Pour la recherche : minuscules, sans accents, apostrophes et ponctuation → espace. */
  function normaliser(texte) {
    return String(texte || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  var FUSEAU = 'Europe/Paris';

  /* « jeudi 5 novembre 2026 à 18 h 00 », toujours à l’heure de Paris. */
  function formaterDateHeure(date) {
    var jour = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSEAU
    }).format(date);
    var heure = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: FUSEAU
    }).format(date).replace(':', ' h ');
    return jour.replace(/ 1 /, ' 1er ') + ' à ' + heure;
  }

  /* « 2026-10-01 » → « 1er octobre 2026 » (date seule, sans fuseau qui la décale). */
  function formaterJour(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
    var t = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    return t.replace(/^1 /, '1er ');
  }

  /* État du prochain webinaire, à partir de la SEULE variable config.webinaire.prochaineDate.
   * Renvoie null si aucune date, date illisible, ou séance déjà terminée. */
  function prochainWebinaire(config, maintenant) {
    var w = config && config.webinaire;
    if (!w || !w.prochaineDate) return null;
    var debut = new Date(w.prochaineDate);
    if (isNaN(debut.getTime())) {
      console.warn('[MAT communes] webinaire.prochaineDate illisible :', w.prochaineDate);
      return null;
    }
    var duree = Number(w.dureeMinutes) > 0 ? Number(w.dureeMinutes) : 60;
    var fin = new Date(debut.getTime() + duree * 60000);
    if ((maintenant || new Date()) > fin) return null;
    return {
      debut: debut,
      fin: fin,
      enCours: (maintenant || new Date()) >= debut,
      libelle: formaterDateHeure(debut),
      dureeMinutes: duree,
      sujet: typeof w.sujet === 'string' && w.sujet.trim() ? w.sujet.trim() : null,
      lienInscription: lienSur(w.lienInscription),
      lienVisio: lienSur(w.lienVisio)
    };
  }

  /* Emplacements d’images : l’image n’apparaît que si le fichier existe.
   * <figure class="emplacement est-masque" data-fichier="assets/img/x.webp" data-alt="…">
   * data-alt="" = image décorative. */
  function activerEmplacements() {
    var figures = document.querySelectorAll('.emplacement[data-fichier]');
    Array.prototype.forEach.call(figures, function (fig) {
      var fichier = fig.getAttribute('data-fichier');
      var sonde = new Image();
      sonde.addEventListener('load', function () {
        var img = el('img', {
          src: fichier,
          alt: fig.getAttribute('data-alt') || '',
          width: sonde.naturalWidth,
          height: sonde.naturalHeight,
          loading: 'lazy',
          decoding: 'async'
        });
        fig.insertBefore(img, fig.firstChild);
        fig.classList.remove('est-masque');
      });
      sonde.addEventListener('error', function () {
        if (!APERCU) return;
        fig.insertBefore(el('div', {
          classe: 'emplacement-apercu',
          texte: 'Emplacement réservé : ' + fichier + (fig.getAttribute('data-alt') ? ' — « ' + fig.getAttribute('data-alt') + ' »' : '')
        }), fig.firstChild);
        fig.classList.remove('est-masque');
      });
      sonde.src = fichier;
    });
  }

  window.MATC = {
    APERCU: APERCU,
    el: el,
    lienSur: lienSur,
    chargerJSON: chargerJSON,
    normaliser: normaliser,
    formaterDateHeure: formaterDateHeure,
    formaterJour: formaterJour,
    prochainWebinaire: prochainWebinaire
  };

  activerEmplacements();
})();
