# Registre des décisions validées

Source : Journal technique Notion. Le 10 novembre 2026, Jean-Philippe a explicitement validé les 19 recommandations Q1–Q19 et les 57 recommandations D01–D57. Cette validation ne vaut pas validation finale du dictionnaire SQL complet table par table, ni autorisation de migration/implémentation.

## Q1–Q19 — décisions métier
| ID | Décision |
|---|---|
| Q1 | Une seule table entreprise en V1, pas de table établissement ; ajouter SIREN/SIRET. |
| Q2 | SIREN/SIRET facultatifs ; pas d'unicité globale ; doublons potentiels à revoir humainement. |
| Q3 | Table contact_phone pour plusieurs téléphones, avec type, source et vérification. |
| Q4 | Statuts prospect distincts des statuts candidature : to_qualify, qualified, to_contact, contacted, replied, meeting, follow_up, interested, not_interested, no_response, converted, closed, excluded. |
| Q5 | Priorités low, normal, high, urgent ; scores qualité/adéquation entiers 0–100 ; méthode à définir. |
| Q6 | Conversion prospect → candidature : conserver prospect et historique, relier au Job existant ; pipelines séparés. |
| Q7 | Pause/exclusion par campagne indépendante du statut global et des autres campagnes. |
| Q8 | Conserver fichiers Excel originaux ; staging avant import ; tracer fichier, feuille et ligne ; case cochée ne prouve pas un envoi/réponse. |
| Q9 | Historiser les informations importantes et leur provenance ; ne pas écraser silencieusement. |
| Q10 | Conserver séparément contenu IA initial et contenu final modifié/approuvé. |
| Q11 | Tracer version du prompt et méthode de génération, sans secret. |
| Q12 | PDF et DOCX dès V1 pour CV/lettres ; modèle Document versionné. |
| Q13 | Stockage local configurable V1 ; extensible OneDrive/SharePoint ; aucune intégration externe autorisée dans la phase de validation initiale. |
| Q14 | États de lot : draft, review, approved, sending, completed, partially_completed, cancelled. |
| Q15 | Validation individuelle de chaque message, même après approbation du lot ; aucun envoi implicite/autonome. |
| Q16 | Envoi incertain = unknown ; bloquer nouvelle tentative automatique jusqu'à vérification ; conserver tentatives/événements. |
| Q17 | Exclusion entreprise bloque par défaut contacts/prospects ; réactivation manuelle explicite et historisée. |
| Q18 | Prévoir archivage/dates ; ne pas inventer de durée de conservation ; politique à définir avant purge. |
| Q19 | Identifiants entiers, snake_case, UTC, DATE pour dates sans heure, SQL portable SQLite/MySQL, pas d'ENUM natif, NULL pour inconnu, transactions et préservation historique. |

## D01–D07 — fondations SQL
- D01 préserver schéma et procéder de manière additive.
- D02 identifiants entiers auto-incrémentés.
- D03 created_at/updated_at en UTC.
- D04 archivage des entités mutables importantes ; événements historiques immuables.
- D05 user_id seulement sur entités directement possédées.
- D06 nouvelles tables au singulier en snake_case ; noms historiques conservés.
- D07 types SQL portables SQLite/MySQL, longueurs explicites.

## D08–D15 — entreprises, contacts et coordonnées
- D08 enrichir entreprise : raison sociale, nom commercial, SIREN/SIRET, domaine normalisé, LinkedIn, secteur, description, tranche effectif, ville, code postal, région, pays, score qualité, date dernier enrichissement ; identifiants légaux facultatifs, non uniques globalement.
- D09 domaine = hôte minuscule sans protocole, chemin, query ni www ; index non unique.
- D10 contact avec identité facultative, poste, département, séniorité, LinkedIn, notes, actif ; pas d'unicité sur nom.
- D11 contact_phone : plusieurs numéros, numéro normalisé, type, vérification, source, principal/actif ; types professional, mobile, direct, generic, unknown.
- D12 email normalisé par trim + minuscules uniquement ; ne pas supprimer points ou suffixes +.
- D13 unicité contact_id + normalized_email ; index non unique sur normalized_email.
- D14 au plus un email principal actif par contact ; promotion/remplacement atomique.
- D15 email_event conserve rebonds ; contact_email.verification_status représente l'état courant.

## D16–D25 — prospects, statuts et campagnes
- D16 target_key unique généré par service : company:<entreprise_id> ou contact:<contact_id>.
- D17 vérifier transactionnellement que le contact appartient à l'entreprise du prospect ; éviter FK composite si non portable.
- D18 prospect_status avec les 13 statuts ; statut utilisé désactivable, jamais supprimé physiquement.
- D19 priorité VARCHAR(20) ; scores facultatifs 0–100.
- D20 prospect_event historise ancien/nouveau statut, date, origine, note.
- D21 transitions contrôlées par service et historisées, pas de matrice rigide SQL.
- D22 last_contacted_at seulement après action confirmée ; action LinkedIn déclarée manuellement effectuée peut compter.
- D23 campagne : nom, description, objectif, état, dates, paramètres, propriétaire.
- D24 campaign_prospect unique campagne/prospect ; états active, paused, excluded, completed.
- D25 actions/rappels horodatés UTC ; dates métier en DATE.

## D26–D30 — sources, imports, faits
- D26 source : type, libellé, URL, date de collecte.
- D27 import_run : nom original, hash, date, résultat ; import_row : feuille, numéro ligne, JSON brut, état, erreurs.
- D28 fichiers originaux hors base, localement ; métadonnées, clé de stockage, MIME, taille, hash en base.
- D29 entreprise_fact et contact_fact pour faits sourcés, valeur, source, collecte/vérification et validité.
- D30 suivi enrichissement : entité, source, méthode, état, date, résumé, erreur.

## D31–D37 — messages et documents
- D31 message_template par canal LinkedIn/email, nom, sujet, contenu, version, activation.
- D32 generated_message conserve contenu initial/final, canal, prospect/contact/campagne, approbation, version prompt, méthode.
- D33 generated_message_evidence relie message aux sources/faits/extraits.
- D34 document_series regroupe versions immuables ; chaque version physique a une ligne document, numéro et état actif.
- D35 métadonnées en base, fichiers locaux hors base.
- D36 relations prospect_document, campaign_document, generated_document ; email_attachment référence la version exacte.
- D37 archiver documents référencés ; suppression physique seulement si non référencé et autorisée.

## D38–D43 — lots et envois
- D38 email_batch : campagne, nom, état, dates, compteurs, approbation.
- D39 email_batch_item unique par lot/message, état individuel, approbateur, dates.
- D40 email_send = envoi logique ; email_send_attempt = tentative technique.
- D41 email_event conserve sent, accepted, delivered, bounce, reply, failure, unknown, identifiant externe et date.
- D42 unknown bloque toute nouvelle tentative automatique jusqu'à vérification.
- D43 pièce jointe référence une version documentaire immuable précise.

## D44–D49 — exclusions et intégrité
- D44 suppression pour cibles entreprise/contact/email, une cible par ligne, motif, source, date, état actif, réactivation.
- D45 exclusion entreprise bloque contacts/prospects ; réactivation manuelle et historisée.
- D46 FK RESTRICT par défaut pour données métier/historiques ; aucune cascade destructive sans justification.
- D47 index FK, statuts, dates, identifiants normalisés et clés dédup ; unicité seulement si règle métier.
- D48 inconnu = NULL, jamais chaîne vide.
- D49 transactions pour opérations multi-tables cohérentes.

## D50–D57 — migrations
- D50 Umzug + SequelizeStorage, migrations versionnées up/down.
- D51 pas de sequelize.sync() pour faire évoluer une base réelle ; sync contrôlé possible en test isolé/en mémoire.
- D52 commande npm run db:migrate explicite ; serveur sans migration automatique et vérification du schéma.
- D53 première migration additive après sauvegarde vérifiée et copie de travail ; aucun renommage/suppression.
- D54 down seulement si sûr ; après données utilisateur, préférer migration corrective à rollback destructif.
- D55 statuts de référence par migration/seed idempotent ; fixtures uniquement en test.
- D56 tests migrations SQLite temporaire, intégrité/FK et tests existants ; MySQL séparément avant affirmation de compatibilité.
- D57 PRAGMA foreign_keys=ON à chaque connexion SQLite et vérification foreign_key_check.

## Statut
Q1–Q19 validés ; D01–D57 validés. Le dictionnaire relationnel complet, les colonnes/types/nullabilités/index/FK et l'ordre des migrations restent à valider séparément. Aucun changement de code ou migration n'est autorisé par ce registre.