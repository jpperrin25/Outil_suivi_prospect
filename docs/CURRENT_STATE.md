# État actuel du dépôt — constat GitHub

Date de consultation : 19 novembre 2026  
Dépôt : https://github.com/jpperrin25/Outil_suivi_prospect  
Branche : main  
Commit : 50c419132111afd856a0a59dc35bd6f5fc364c57 — test: cover prospect interaction history

Cette fiche décrit les fichiers distants observés. Aucun test, build, serveur ou script de fixture n'a été lancé pendant cette inspection.

## Stack
- Package alternance-tracker 2.0.0, ESM.
- Node.js, TypeScript, Express 5.2.1, Sequelize 6.37.7.
- SQLite 5.1.7 et MySQL2 3.17.2.
- JWT, bcrypt, Helmet, CORS, dotenv.
- Front vanilla HTML/CSS/JavaScript servi par Express.
- Docker Compose MySQL et SQLite.
- node:test et Supertest.
- Scripts : dev, start, fixtures, import-linkedin, typecheck, test.

## Arborescence
- public/app.js, public/index.html, public/style.css
- src/config/env.ts
- src/db/sequelize.ts et src/db/fixtures/*
- src/middleware/*
- src/models/*
- src/modules/Controller/*
- src/modules/Routes/*
- src/utils/*
- tests/api.test.ts, tests/prospectInteraction.test.ts

## Modèles observés dans le code
User, Entreprise, Job, Status, OfferType, JobStatusHistory, Prospect, ProspectImport, ProspectImportRow et ProspectInteraction. ProspectImport.ts expose deux classes Sequelize (lot et ligne).

Relations observées dans src/models/index.ts :
- User possède entreprises, candidatures, prospects, imports et interactions.
- Entreprise possède plusieurs Job et plusieurs Prospect.
- Job est relié à Entreprise, Status, OfferType, User et JobStatusHistory.
- Prospect est relié à Entreprise, User et ProspectInteraction.
- ProspectImport possède plusieurs ProspectImportRow.

Les politiques de suppression actuelles sont mixtes. Les nouvelles relations doivent suivre les décisions D04/D46 et être examinées avant toute modification.

## Prospect actuel
Le modèle Prospect courant est obligatoirement rattaché à une entreprise. Il contient prénom, nom, poste, un email, un statut email, LinkedIn URL, statut simple (to_qualify, qualified, to_contact, contacted, replied, excluded), source, URL source, identifiant externe, date de collecte et données brutes.

Ce modèle ne couvre pas encore le modèle métier cible complet : contacts canoniques, emails/téléphones multiples, campagnes, faits sourcés, enrichissements, documents versionnés, exclusions et moteur d'envoi.

## Candidatures
Job représente une candidature, pas un prospect. Il contient notamment job, sendDate, notes, jobUrl, contactPerson, contactEmail, lastContactDate, nextFollowUpDate et les FK vers entreprise, statut, type d'offre et utilisateur.

Ne pas détourner Job pour représenter prospect entreprise, prospect contact ou campagne. La conversion d'un prospect en candidature doit conserver le prospect et son historique, puis le relier au Job.

## Imports et interactions
Le README documente un import CSV contrôlé : aperçu/staging, approbation ou rejet, lignes brutes conservées, historique de lots et dédoublonnage prudent. Routes documentées : POST /api/prospect-imports/preview, GET /api/prospect-imports/:id, POST /api/prospect-imports/:id/approve, POST /api/prospect-imports/:id/reject et GET /api/prospects.

Un import local idempotent d'interactions LinkedIn depuis un fichier JSON privé est documenté ; il ne contacte pas LinkedIn et n'envoie aucun message.

## Configuration et migration
Le README décrit une création des tables manquantes au démarrage et un mode DB_SYNC=alter explicite. Le journal Notion rapporte qu'au 10 novembre 2026 l'environnement local utilisait SQLite et DB_SYNC=safe ; ce n'est pas une preuve de la configuration actuelle de toute installation.

Décisions D50–D57 : Umzug/SequelizeStorage, migrations versionnées et explicites, pas de sync pour faire évoluer une base réelle, sauvegarde vérifiée, migrations additives, tests SQLite temporaire et MySQL séparés, PRAGMA foreign_keys=ON.

## Limites de preuve
- Aucun test/build/runtime n'a été lancé dans l'inspection GitHub.
- La base locale data/alternance.db n'a pas été ouverte.
- Le dépôt ne montre pas de connecteur direct Apollo, Clay, Outlook/Graph ou Figma ; cela ne prouve pas que les comptes externes ou ressources existent/ n'existent pas.
- CV et classeurs de prospection ont été fournis séparément et ne sont pas dans l'arbre observé.
- Le premier audit Kilo rapportait six modèles, mais le code distant actuel montre les modèles Prospect et Import/Interaction supplémentaires. Privilégier le code du dépôt pour l'état implémenté.