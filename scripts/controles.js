#!/usr/bin/env node
/*
 * Contrôles du site « MAT · entraide entre communes ».
 * Lancé avant chaque commit (à la main) et par la CI (.github/workflows/controles.yml).
 *
 *   node scripts/controles.js
 *
 * Aucun module externe : Node seul. Code de sortie 1 au premier défaut trouvé
 * (tous les défauts sont listés avant de sortir).
 *
 * Ce que ces contrôles garantissent, et pourquoi :
 *  1. JSON valides — un JSON cassé vide la FAQ ou le bloc webinaire, sans erreur visible.
 *  2. Apostrophe typographique (’) dans les libellés — jamais l’apostrophe droite.
 *  3. Aucun gestionnaire en ligne (onclick=…) — addEventListener uniquement.
 *  4. Aucun « display:none » en style en ligne — l’affichage passe par classList.
 *  5. Aucun innerHTML / insertAdjacentHTML / document.write — tout texte venu d’un
 *     JSON est posé par textContent, donc échappé par construction.
 *  6. Aucune ressource externe (script, feuille de style, image, police).
 *  7. Aucun secret (clé d’API, jeton) dans le dépôt.
 *  8. Chaque page : lang="fr", titre, lien d’évitement, <main id="contenu">,
 *     menu et pied de page IDENTIQUES d’une page à l’autre, ids uniques.
 *  9. La mention d’accessibilité du pied de page dit la même chose que la déclaration.
 * 10. Taille de texte : aucune déclaration CSS sous 16 px.
 * 11. Liens internes : tout fichier cité existe.
 * 12. Schéma de data/faq.json et data/config.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const IGNORES = new Set(['.git', 'node_modules', '.lighthouseci']);
const erreurs = [];

function lister(dossier, acc = []) {
  for (const nom of fs.readdirSync(dossier)) {
    if (IGNORES.has(nom)) continue;
    const plein = path.join(dossier, nom);
    const st = fs.statSync(plein);
    if (st.isDirectory()) lister(plein, acc);
    else acc.push(plein);
  }
  return acc;
}

const rel = (f) => path.relative(RACINE, f);
const lire = (f) => fs.readFileSync(f, 'utf8');
const ligneDe = (texte, index) => texte.slice(0, index).split('\n').length;
function signaler(fichier, ligne, message) {
  erreurs.push(`${rel(fichier)}${ligne ? ':' + ligne : ''} — ${message}`);
}
function chercher(fichier, texte, regex, message) {
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  let m;
  while ((m = re.exec(texte)) !== null) {
    signaler(fichier, ligneDe(texte, m.index), `${message} : « ${m[0].trim().slice(0, 80)} »`);
    if (m[0].length === 0) re.lastIndex++;
  }
}

const tous = lister(RACINE);
const BINAIRES = /\.(woff2?|png|jpe?g|webp|gif|ico|pdf)$/i;
const texte = tous.filter((f) => !BINAIRES.test(f));
const parExt = (ext) => texte.filter((f) => f.endsWith(ext));
const html = parExt('.html');
const jsTous = parExt('.js');
// Les contrôles de code (5) ne portent pas sur ce script, qui cite les motifs qu’il cherche.
const js = jsTous.filter((f) => !f.startsWith(path.join(RACINE, 'scripts')));
const css = parExt('.css');
const json = parExt('.json');
const yml = texte.filter((f) => /\.ya?ml$/.test(f));

/* 1. JSON valides */
const donnees = {};
for (const f of json) {
  try { donnees[rel(f)] = JSON.parse(lire(f)); }
  catch (e) { signaler(f, 0, `JSON invalide : ${e.message}`); }
}

/* 2. Apostrophe droite entre deux lettres (libellés français) — même motif que
 *    grep -nP "[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]". Les formulaires GitHub (.yml) sont aussi
 *    des libellés lus par les communes : ils sont contrôlés. */
const APOSTROPHE = /[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/;
for (const f of [...html, ...jsTous, ...json, ...yml]) {
  chercher(f, lire(f), APOSTROPHE, 'apostrophe droite (utiliser ’)');
}

/* 3, 4, 6. HTML : gestionnaires en ligne, display:none en ligne, ressources externes */
for (const f of html) {
  const t = lire(f);
  chercher(f, t, /<[^>]*\son[a-z]+\s*=/i, 'gestionnaire en ligne interdit (addEventListener)');
  chercher(f, t, /style\s*=\s*["'][^"']*display\s*:\s*none/i, 'display:none en ligne interdit (classList)');
  chercher(f, t, /<script\b[^>]*\bsrc\s*=\s*["']?(https?:)?\/\//i, 'script externe interdit');
  chercher(f, t, /<link\b[^>]*\bhref\s*=\s*["']?(https?:)?\/\//i, 'ressource <link> externe interdite');
  chercher(f, t, /<(img|source|iframe|video|audio)\b[^>]*\bsrc\s*=\s*["']?(https?:)?\/\//i, 'média externe interdit');
}
/* 5. JS : injection de HTML interdite, affichage par classList uniquement */
for (const f of js) {
  const t = lire(f);
  chercher(f, t, /\.(innerHTML|outerHTML)\s*[+]?=|insertAdjacentHTML|document\.write/, 'injection de HTML interdite (textContent)');
  chercher(f, t, /\.style\.display|setProperty\(\s*["']display/, 'affichage piloté par style interdit (classList)');
  chercher(f, t, /\.on(click|keydown|keyup|change|input|submit|load|error)\s*=/, 'gestionnaire par propriété interdit (addEventListener)');
}
/* 6. CSS : aucune ressource externe */
for (const f of css) {
  const t = lire(f);
  chercher(f, t, /url\(\s*["']?(https?:)?\/\//i, 'ressource CSS externe interdite');
  chercher(f, t, /@import/i, '@import interdit');
}

/* 7. Secrets */
const SECRETS = [
  /sk-ant-api[0-9A-Za-z_-]{20,}/, /sk-[A-Za-z0-9]{40,}/, /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{30,}/, /AIza[0-9A-Za-z_-]{30,}/, /xox[abpr]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /https:\/\/[a-f0-9]{32}@[a-z0-9.]*sentry\.io/,
  /ATTA[A-Za-z0-9]{40,}/, /EAA[A-Za-z0-9]{60,}/, /re_[A-Za-z0-9]{20,}/,
];
for (const f of texte) {
  if (f === __filename) continue;
  const t = lire(f);
  for (const re of SECRETS) chercher(f, t, re, 'motif de secret détecté');
}

/* 8, 9. Structure commune des pages */
function bloc(t, re) { const m = t.match(re); return m ? m[0] : null; }
const normaliser = (s) => s.replace(/\saria-current="page"/g, '').replace(/\s+/g, ' ').trim();
let menuRef = null, piedRef = null;
for (const f of html) {
  const t = lire(f);
  if (!/<html lang="fr"/.test(t)) signaler(f, 0, 'attribut lang="fr" absent');
  if (!/<meta name="viewport"/.test(t)) signaler(f, 0, 'meta viewport absente');
  if (!/<title>[^<]{3,}<\/title>/.test(t)) signaler(f, 0, 'titre de page absent');
  if (!/href="#contenu"/.test(t)) signaler(f, 0, 'lien d’évitement absent');
  if (!/<main id="contenu"/.test(t)) signaler(f, 0, '<main id="contenu"> absent');
  if (!/<h1[\s>]/.test(t)) signaler(f, 0, 'titre h1 absent');

  const ids = [...t.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const vus = new Set();
  for (const id of ids) { if (vus.has(id)) signaler(f, 0, `id en double : ${id}`); vus.add(id); }

  const menu = bloc(t, /<nav class="nav-principale"[\s\S]*?<\/nav>/);
  const pied = bloc(t, /<footer class="pied"[\s\S]*?<\/footer>/);
  if (!menu) signaler(f, 0, 'menu principal absent');
  else if (menuRef === null) menuRef = { f, v: normaliser(menu) };
  else if (normaliser(menu) !== menuRef.v) signaler(f, 0, `menu différent de celui de ${rel(menuRef.f)}`);
  if (!pied) signaler(f, 0, 'pied de page absent');
  else if (piedRef === null) piedRef = { f, v: normaliser(pied) };
  else if (normaliser(pied) !== piedRef.v) signaler(f, 0, `pied de page différent de celui de ${rel(piedRef.f)}`);
}
const decl = path.join(RACINE, 'accessibilite.html');
if (fs.existsSync(decl) && piedRef) {
  const etat = (lire(decl).match(/<strong id="etat-conformite">([^<]+)<\/strong>/) || [])[1];
  const mention = (piedRef.v.match(/Accessibilité : ([^<]+)</) || [])[1];
  if (!etat) signaler(decl, 0, 'état de conformité introuvable (<strong id="etat-conformite">)');
  else if (!mention) signaler(piedRef.f, 0, 'mention « Accessibilité : … » absente du pied de page');
  else if (etat.trim() !== mention.trim()) {
    signaler(piedRef.f, 0, `la mention du pied de page (« ${mention.trim()} ») contredit la déclaration (« ${etat.trim()} »)`);
  }
}

/* 10. Plancher typographique : 16 px */
for (const f of css) {
  const t = lire(f);
  const re = /font-size\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const v = m[1].trim();
    const n = parseFloat(v);
    let tropPetit = false;
    if (/^(x{0,2}-small|smaller)$/.test(v)) tropPetit = true;
    else if (/px$/.test(v) && n < 16) tropPetit = true;
    else if (/^[\d.]+r?em$/.test(v) && n < 1) tropPetit = true;
    else if (/%$/.test(v) && n < 100) tropPetit = true;
    if (tropPetit) signaler(f, ligneDe(t, m.index), `texte sous 16 px : font-size: ${v}`);
  }
}

/* 11. Liens internes */
for (const f of [...html, ...css]) {
  const t = lire(f);
  const re = /(?:href|src)\s*=\s*"([^"]+)"|url\(\s*["']?([^"')]+)["']?\s*\)/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const cible = (m[1] || m[2] || '').trim();
    if (!cible || /^(https?:|mailto:|tel:|#|data:)/.test(cible)) continue;
    const fichier = path.resolve(path.dirname(f), cible.split(/[?#]/)[0]);
    if (!fs.existsSync(fichier)) signaler(f, ligneDe(t, m.index), `lien interne cassé : ${cible}`);
  }
}

/* 12. Schémas */
const faq = donnees['data/faq.json'];
if (faq) {
  const f = path.join(RACINE, 'data/faq.json');
  const cats = new Set((faq.categories || []).map((c) => c.id));
  if (!Array.isArray(faq.categories) || cats.size === 0) signaler(f, 0, 'categories absentes');
  if (!Array.isArray(faq.questions) || faq.questions.length < 10) signaler(f, 0, 'au moins 10 questions attendues');
  const ids = new Set();
  for (const q of faq.questions || []) {
    const nom = q.id || '(sans id)';
    if (!q.id || ids.has(q.id)) signaler(f, 0, `id de question absent ou en double : ${nom}`);
    ids.add(q.id);
    if (!cats.has(q.categorie)) signaler(f, 0, `${nom} : catégorie inconnue « ${q.categorie} »`);
    if (typeof q.question !== 'string' || !q.question.trim()) signaler(f, 0, `${nom} : question vide`);
    if (!Array.isArray(q.reponse) || !q.reponse.length) signaler(f, 0, `${nom} : réponse vide`);
    if (typeof q.aValider !== 'boolean') signaler(f, 0, `${nom} : champ aValider (booléen) absent`);
    for (const l of q.liens || []) {
      if (!l.texte || !/^(https:\/\/|[a-z0-9-]+\.html(#[\w-]+)?$)/.test(l.url || '')) {
        signaler(f, 0, `${nom} : lien invalide (https:// ou page du site attendus)`);
      }
    }
  }
}
const config = donnees['data/config.json'];
if (config) {
  const f = path.join(RACINE, 'data/config.json');
  const w = config.webinaire;
  if (!w || !('prochaineDate' in w)) signaler(f, 0, 'webinaire.prochaineDate absent');
  else if (w.prochaineDate !== null) {
    const ok = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(w.prochaineDate)
      && !Number.isNaN(Date.parse(w.prochaineDate));
    if (!ok) signaler(f, 0, `webinaire.prochaineDate illisible : « ${w.prochaineDate} » (ex. 2026-11-05T18:00:00+01:00)`);
  }
  const dossierImg = path.join(RACINE, 'assets/img');
  const declarees = new Set(config.imagesDeposees || []);
  for (const nom of declarees) {
    if (!fs.existsSync(path.join(dossierImg, nom))) signaler(f, 0, `imagesDeposees : « ${nom} » absent de assets/img/`);
  }
  for (const nom of fs.existsSync(dossierImg) ? fs.readdirSync(dossierImg) : []) {
    if (/\.(webp|jpe?g|png|avif)$/i.test(nom) && !declarees.has(nom)) {
      signaler(f, 0, `image « assets/img/${nom} » déposée mais absente de imagesDeposees : elle ne s’affichera pas`);
    }
  }
  for (const c of config.chiffresCles || []) {
    if (c.valeur !== null && c.date === null) signaler(f, 0, `chiffre « ${c.id} » sans date : il ne sera pas affiché`);
    if (c.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) signaler(f, 0, `chiffre « ${c.id} » : date attendue au format AAAA-MM-JJ`);
  }
}

if (erreurs.length) {
  console.error(`✗ ${erreurs.length} défaut(s) :\n  ` + erreurs.join('\n  '));
  process.exit(1);
}
console.log(`✓ Contrôles OK — ${html.length} pages, ${jsTous.length} scripts, ${json.length} JSON, ${css.length} CSS, ${texte.length} fichiers texte.`);
