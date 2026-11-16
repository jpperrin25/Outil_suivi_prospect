# Prospect Engine : prospects et suivi d'alternance

Une API (Express 5, TypeScript, Sequelize) et un front intégré pour recevoir des listes d'entreprises et contacts préparées dans Apollo ou Excel, contrôler les doublons, puis suivre les prospects séparément des candidatures.

Le front est servi par l'API : une seule adresse, <http://localhost:3000>.

## Lancer le projet

### Option A : Docker + MySQL (recommandé)

```bash
cp .env.example .env        # puis change JWT_SECRET et les mots de passe
docker compose up --build -d
```

Ouvre <http://localhost:3000>, crée ton compte, c'est prêt.

**Persistance** : les données MySQL sont dans le volume Docker nommé `mysql_data`.
- `docker compose stop` / `down` / redémarrage de la machine : **les données sont conservées**.
- `docker compose down -v` : **supprime le volume, donc toutes les données**. À éviter.

### Option B : un seul fichier `.db` (SQLite, le plus simple)

```bash
cp .env.example .env
docker compose -f compose.sqlite.yml up --build -d
```

Tout est dans `./data/alternance.db`. Sauvegarde = copier ce fichier.

### Option C : sans Docker

```bash
npm install
cp .env.example .env     # mets DB_DIALECT=sqlite
npm run dev
```

## Évolution de la base

Au démarrage, les tables manquantes sont créées et les statuts / types d'offre par défaut sont ajoutés **sans jamais effacer de données**.

Si tu modifies un modèle plus tard (nouvelle colonne), lance une fois avec `DB_SYNC=alter` pour adapter les tables existantes, puis remets `safe`.

> Si tu repars d'une ancienne base créée avec la version précédente du projet, ses tables n'ont pas les nouvelles colonnes : démarre une fois avec `DB_SYNC=alter`, ou supprime l'ancien volume (`docker compose down -v`) si elle ne contient rien d'important.

## Ce que fait l'appli

- **Tableau de bord** : relances en retard ou à venir, candidatures sans nouvelles depuis 14 jours, répartition par statut, taux d'entretien, intérêt moyen, envois par semaine.
- **Candidatures** : vue tableau (glisser-déposer d'une carte pour changer son statut) ou liste, recherche, filtres (statut, type, intérêt minimum), tri (dernières modifiées, intérêt, prochaine relance, date d'envoi, entreprise).
- **Fiche candidature** : poste, entreprise, intérêt, statut, dates (envoi, dernier contact, prochaine relance), contact, lien de l'offre, notes, **historique** de tous les changements de statut et relances.
- **Entreprises** : note d'intérêt modifiable en un clic.
- **Prospects** : import CSV contrôlé des entreprises et contacts, aperçu avant écriture, historique des lots, données brutes conservées, source et statut email conservés, dédoublonnage prudent et approbation manuelle.
- **Réglages** : statuts (nom, couleur, famille, ordre), types d'offre, compte, export CSV (ouvrable dans Excel).

Tout est modifiable ou supprimable à tout moment. Supprimer un statut, un type d'offre ou une entreprise utilisés demande toujours quoi faire des candidatures concernées : rien n'est perdu par accident.

## API

Toutes les routes sont sous `/api`. Sauf `/sign` et `/login`, elles exigent `Authorization: Bearer <token>`.
Réponses : `{ "status": "SUCCESS" | "FAILED" | "CONFLICT" | "ERROR", ... }`.

| Méthode | Route | Rôle |
| --- | --- | --- |
| POST | `/sign` | Inscription (`email`, `password`, `username?`). Renvoie `token` et `user` |
| POST | `/login` | Connexion (`email`, `password`). Renvoie `token` et `user` |
| GET / PUT / PATCH / DELETE | `/profile` | Compte (le DELETE supprime aussi toutes les données) |
| GET | `/stats` | Statistiques du tableau de bord |
| GET | `/prospects` | Contacts prospects. Filtres : `q`, `status` |
| GET | `/prospect-imports` | Historique des lots d'import |
| POST | `/prospect-imports/preview` | Corps CSV brut (`Content-Type: text/csv`), en-têtes `X-Import-Kind: companies\|contacts` et `X-Import-Filename`. Crée un lot de revue, sans importer les lignes dans les entreprises/prospects |
| GET | `/prospect-imports/:id` | Aperçu persistant du lot et de ses lignes |
| POST | `/prospect-imports/:id/approve` | Importe les lignes valides du lot après validation humaine |
| POST | `/prospect-imports/:id/reject` | Refuse le lot en attente |
| GET | `/job` | Liste. Filtres : `statusId`, `entrepriseId`, `offerTypeId`, `minRating`, `q`, `due=true`. Tri : `sort=recent\|rating\|company\|sendDate\|followUp`, `order=asc\|desc` |
| POST | `/job` | Crée une candidature (`job`, `entrepriseId` **ou** `entrepriseName`, `statusId?`, `offerTypeId?`, `interestRating?`, dates, contact, `jobUrl`, `notes`) |
| GET | `/job/:id` | Détail + historique |
| PUT / PATCH | `/job/:id` | Modification partielle (seuls les champs envoyés changent). Un changement de `statusId` est ajouté à l'historique (`statusNote?`) |
| POST | `/job/:id/followup` | « J'ai relancé » : `date?`, `nextFollowUpDate?`, `note?` |
| DELETE | `/job/:id` | Supprime la candidature et son historique |
| GET / POST | `/entreprise` | Liste / création (`name`, `website`, `address`, `contact`, `notes`, `interestRating`) |
| GET / PUT / PATCH / DELETE | `/entreprise/:id` | DELETE : `409` si des candidatures existent, sauf `?force=true` |
| GET / POST | `/status` | Statuts (`status`, `color`, `kind`) |
| PUT / PATCH / DELETE | `/status/:id` | DELETE : `409` si utilisé, sauf `?replaceWith=<idStatus>` |
| GET / POST | `/offer-types` | Types d'offre (`offerType`) |
| PUT / PATCH / DELETE | `/offer-types/:id` | DELETE : `409` si utilisé, sauf `?replaceWith=<idOffer>` |

Familles de statut (`kind`) : `todo`, `sent`, `progress`, `success`, `failure`. Elles servent aux statistiques.
Dates au format `YYYY-MM-DD`. Intérêt : entier de 1 à 5, `null` pour retirer la note.

## Import initial Apollo / Excel

Dans **Prospects**, choisir « Entreprises » ou « Contacts », sélectionner un CSV exporté depuis Apollo/Excel, puis examiner l'aperçu. Les lots limités à 500 lignes et 2 Mo sont gardés en attente jusqu'à l'approbation explicite. Les entreprises sont rapprochées sur leur nom exact normalisé ; les contacts sont dédoublonnés dans l'entreprise par email, URL LinkedIn ou ID fournisseur. Les colonnes inconnues restent dans la copie brute de chaque ligne.

Les colonnes reconnues incluent notamment `Account Name`, `Account Website`, `First Name`, `Last Name`, `Title`, `Email`, `Email Status`, `LinkedIn URL`, `Apollo ID`, `Source` et leurs équivalents français. Un email importé n'est jamais marqué comme délivrable : son état vient du fichier ou reste inconnu. Les valeurs existantes de site/adresse ne sont pas écrasées par un import. Les contacts importés et les lignes d'import sont liés au compte utilisateur ; les données de candidature historiques restent dans leurs tables actuelles.

La connexion Apollo initiale se fait par export CSV puis import revu dans Prospect Engine. Le plan actuellement documenté n'autorise pas la recherche de personnes via People API et le budget de départ est de 0 € ; l'application n'appelle donc pas d'API Apollo payante, ne crée aucune séquence et n'envoie aucun message. Les outils Apollo connectés à ChatGPT ne peuvent pas être réutilisés comme identifiants d'une application locale. Pour activer une future API directe, vérifier l'accès du compte et stocker une clé locale hors Git uniquement après accord explicite.

## Tests

```bash
npm test          # tests de bout en bout sur SQLite en mémoire
npm run typecheck
```

## Configuration

Voir `.env.example`. En production (`NODE_ENV=production`), `JWT_SECRET` est obligatoire.
