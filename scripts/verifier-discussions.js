#!/usr/bin/env node
/*
 * Vérifie que chaque lien du site vers une catégorie des Discussions désigne une
 * catégorie qui EXISTE, et que chaque formulaire .github/DISCUSSION_TEMPLATE/<x>.yml
 * porte le nom (slug) d’une catégorie existante.
 *
 *   GH_TOKEN=… GITHUB_REPOSITORY=mairie-mezieres/mat-communes node scripts/verifier-discussions.js
 *
 * Pourquoi : l’adresse d’une catégorie (…/discussions/categories/<slug>) est fixée par
 * GitHub, pas par nous. Une catégorie renommée ou recréée peut changer d’adresse ;
 * le lien du site mène alors à une page introuvable, sans que rien ne le signale.
 * Les Discussions n’ont pas d’API REST : la liste se lit en GraphQL, ce qui demande
 * un jeton — d’où un script à part, lancé par la CI avec le jeton du dépôt.
 * Sans jeton (poste local), le script le dit et s’arrête sans échec.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const jeton = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const depot = process.env.GITHUB_REPOSITORY || 'mairie-mezieres/mat-communes';

function lister(dossier, acc = []) {
  for (const nom of fs.readdirSync(dossier)) {
    if (nom === '.git' || nom === 'node_modules') continue;
    const plein = path.join(dossier, nom);
    if (fs.statSync(plein).isDirectory()) lister(plein, acc);
    else if (/\.(html|json|ya?ml|md)$/.test(nom)) acc.push(plein);
  }
  return acc;
}

/* Les liens attendus : …/<depot>/discussions/categories/<slug> */
function slugsCites() {
  const attendus = new Map();
  const motif = new RegExp(`github\\.com/${depot.replace('/', '\\/')}/discussions/categories/([^/"'\\s)#?]+)`, 'g');
  for (const f of lister(RACINE)) {
    const t = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = motif.exec(t)) !== null) {
      const slug = decodeURIComponent(m[1]);
      if (!attendus.has(slug)) attendus.set(slug, new Set());
      attendus.get(slug).add(path.relative(RACINE, f));
    }
  }
  const gabarits = path.join(RACINE, '.github/DISCUSSION_TEMPLATE');
  if (fs.existsSync(gabarits)) {
    for (const nom of fs.readdirSync(gabarits)) {
      const slug = nom.replace(/\.ya?ml$/, '');
      if (!attendus.has(slug)) attendus.set(slug, new Set());
      attendus.get(slug).add(`.github/DISCUSSION_TEMPLATE/${nom}`);
    }
  }
  return attendus;
}

async function categories() {
  const [owner, name] = depot.split('/');
  const reponse = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${jeton}`, 'Content-Type': 'application/json', 'User-Agent': 'mat-communes-controles' },
    body: JSON.stringify({
      query: 'query($owner:String!,$name:String!){repository(owner:$owner,name:$name){hasDiscussionsEnabled discussionCategories(first:50){nodes{name slug}}}}',
      variables: { owner, name },
    }),
  });
  if (!reponse.ok) throw new Error(`GraphQL : HTTP ${reponse.status}`);
  const corps = await reponse.json();
  if (corps.errors) throw new Error(`GraphQL : ${corps.errors.map((e) => e.message).join(' ; ')}`);
  return corps.data.repository;
}

(async () => {
  const attendus = slugsCites();
  if (!jeton) {
    console.log(`ℹ️ Pas de jeton GitHub : vérification des ${attendus.size} catégories citées laissée à la CI.`);
    return;
  }
  const depotInfos = await categories();
  if (!depotInfos.hasDiscussionsEnabled) {
    console.error('✗ Les Discussions ne sont pas activées sur le dépôt : tous les liens de l’entraide sont cassés.');
    process.exit(1);
  }
  const existants = new Map(depotInfos.discussionCategories.nodes.map((c) => [c.slug, c.name]));
  console.log('Catégories existantes : ' + [...existants].map(([s, n]) => `${n} (${s})`).join(', '));
  const manquants = [...attendus].filter(([slug]) => !existants.has(slug));
  if (manquants.length) {
    console.error(`✗ ${manquants.length} catégorie(s) citée(s) mais inexistante(s) :`);
    for (const [slug, fichiers] of manquants) console.error(`  « ${slug} » — cité dans ${[...fichiers].join(', ')}`);
    process.exit(1);
  }
  console.log(`✓ Les ${attendus.size} catégories citées existent.`);
})().catch((e) => { console.error('✗ ' + e.message); process.exit(1); });
