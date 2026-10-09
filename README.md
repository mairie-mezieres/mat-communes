# MAT · entraide entre communes

Site d’entraide pour les communes qui veulent reprendre **MAT — Mézières Avec Toi**,
l’application municipale de Mézières-lez-Cléry (Loiret), Territoria d’Or 2026.

➡️ **https://mairie-mezieres.github.io/mat-communes/**

Public : élus et secrétaires de mairie de petites communes, souvent non techniques.
Objectif : que les questions trouvent leur réponse ici — FAQ, guide pas à pas,
entraide entre communes, webinaire — plutôt qu’en sollicitation individuelle.

## Une seule source de vérité

Ce site **ne recopie pas** la documentation technique de MAT : il la complète et y renvoie.

| Contenu | Source unique |
|---|---|
| Procédure technique de mise en ligne, comptes, clés | [`app-mezieres/docs/DEPLOIEMENT.md`](https://github.com/mairie-mezieres/app-mezieres/blob/main/docs/DEPLOIEMENT.md) |
| Liste complète des variables d’environnement | [`chatbot-mairie-mezieres/.env.example`](https://github.com/mairie-mezieres/chatbot-mairie-mezieres/blob/main/.env.example) |
| Questionnaire « créer un site avec l’IA » et simulateur de coût | [`partager.html`](https://mezieres-lez-clery.fr/partager.html) (dépôt `app-mezieres`) |
| Parcours pour non-techniciens, carnet de route | `guide.html` (ici) |
| Questions fréquentes | `data/faq.json` (ici) |
| Date du prochain webinaire, chiffres-clés | `data/config.json` (ici) |

## Les pages

| Page | Fichier | Contenu |
|---|---|---|
| Accueil | `index.html` | Badge Territoria d’Or, présentation de MAT, chiffres-clés, appels à l’action |
| Répliquer MAT | `guide.html` | Choix du chemin, 11 étapes (une par écran), carnet de route à imprimer |
| Questions fréquentes | `faq.html` | Recherche instantanée, 6 catégories |
| Entraide | `entraide.html` | Lien vers les Discussions, 5 catégories, créer un compte GitHub en 3 écrans |
| Webinaire | `webinaire.html` | Prochaine séance |
| Nous rejoindre | `rejoindre.html` | Formulaire GitHub « Demande d’une commune » |
| Licence | `licence.html` | L’EUPL 1.2 en cinq points |
| Accessibilité | `accessibilite.html` | Déclaration d’accessibilité (obligatoire) |

## Mettre à jour le site — sans toucher au code

Tout se fait sur GitHub, dans le navigateur : ouvrir le fichier, cliquer sur le crayon
(*Edit this file*), modifier, puis *Commit changes*. Le site se met à jour en quelques minutes.

### Chaque mois : la date du webinaire

Dans `data/config.json`, une seule ligne :

```json
"prochaineDate": "2026-11-05T18:00:00+01:00",
```

`+01:00` en hiver, `+02:00` en été (heure de Paris). `null` affiche « prochaine date
bientôt annoncée ». Une séance passée disparaît toute seule. Facultatif dans le même
bloc : `sujet`, `lienInscription`, `lienVisio` (adresses en `https://` uniquement).

### Les chiffres-clés de l’accueil

Dans `data/config.json`, bloc `chiffresCles` : un chiffre ne s’affiche que s’il a une
`valeur` **et** une `date` (`AAAA-MM-JJ`). Un chiffre sans date se lit comme un chiffre
du jour — c’est ainsi qu’un dossier a annoncé un taux d’accessibilité périmé
(voir `ETAT_DES_LIEUX.md` de `app-mezieres`). Tant que tout est à `null`, la section
n’apparaît pas. Pour voir les emplacements vides : ajouter `?apercu` à l’adresse
(ex. `…/mat-communes/?apercu`).

### Les photos et les mascottes

1. Déposer l’image dans `assets/img/` (ou `assets/img/captures/` pour le guide), au
   format `.webp`, sous le nom attendu.
2. Ajouter son nom dans `imagesDeposees` de `data/config.json`.

Sans l’étape 2, l’image ne s’affiche pas (c’est ce qui évite une erreur à chaque visite
tant qu’un emplacement est vide) ; le contrôle automatique signale l’oubli. Le texte
alternatif est déjà écrit dans la page. Liste des emplacements : ouvrir chaque page
avec `?apercu`.

| Fichier attendu | Page |
|---|---|
| `mat-et-mel.webp` | Accueil (bandeau) |
| `capture-accueil-mat.webp` | Accueil |
| `commune-mezieres.webp`, `remise-territoria.webp` | Accueil |
| `captures/etape-01.webp` … `captures/etape-11.webp` | Guide |
| `captures/compte-01.webp` … `captures/compte-03.webp` | Entraide |

### Les questions fréquentes

`data/faq.json` : texte brut uniquement (une balise HTML s’afficherait telle quelle).
`"aValider": true` affiche « réponse en cours de validation » ; passer à `false` une
fois la réponse relue. Les liens : `https://…` ou une page du site (`guide.html`).

## Règles du dépôt (contrôlées automatiquement)

`node scripts/controles.js` — lancé par la CI à chaque modification, refuse :

- un JSON invalide ;
- l’apostrophe droite dans un libellé : toujours **’** (U+2019) ;
- `onclick=""` et autres gestionnaires en ligne (`addEventListener` uniquement) ;
- `style="display:none"` (l’affichage passe par `classList`, classe `.est-masque`) ;
- `innerHTML` : tout texte venu d’un JSON est posé par `textContent`, donc échappé ;
- toute ressource externe (script, feuille de style, police, image) ;
- un motif de clé ou de jeton ;
- un texte sous 16 px ;
- un lien interne cassé, un menu ou un pied de page différent d’une page à l’autre ;
- une mention d’accessibilité qui contredirait la déclaration.

La CI exécute ensuite **Lighthouse** sur les 9 pages : l’accessibilité doit rester à **100**.

Aucun framework, aucun bundler, aucune dépendance : HTML, CSS et JavaScript, polices
auto-hébergées (`assets/fonts/`, licence OFL).

### Voir le site sur son ordinateur

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

(Ouvrir directement le fichier `index.html` ne suffit pas : la FAQ et la date du
webinaire sont lues dans des fichiers JSON, que le navigateur refuse de charger depuis
le disque.)

## Mise en service (une fois)

1. **Pages** : *Settings → Pages → Deploy from a branch*, branche `main`, dossier `/ (root)`.
2. **Discussions** : *Settings → Features → Discussions*, puis créer les catégories
   **Questions** (format *Question / Answer*), **Entraide**, **Idées**,
   **Communes ambassadrices** et **Annonces** (format *Announcement* : seuls les
   mainteneurs y publient). Vérifier que leurs adresses correspondent aux liens de
   `entraide.html` (`…/discussions/categories/questions`, `…/idees`,
   `…/communes-ambassadrices`…) et que le formulaire
   `.github/DISCUSSION_TEMPLATE/questions.yml` porte le nom de la catégorie Questions.
3. **Étiquette** : *Issues → Labels → New label* `demande-commune` (utilisée par le
   formulaire « Nous rejoindre »).

## Licence

Site sous [EUPL 1.2](LICENSE) (voir `licence.html`). L’application MAT elle-même reste
sous licence MIT. Polices Nunito : [SIL OFL 1.1](assets/fonts/OFL.txt).
