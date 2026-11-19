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

## Décisions complémentaires validées le 19 novembre 2026

Ces décisions complètent Q1–Q19 et D01–D57. Elles précisent des règles métier et des exigences d'intégrité ; elles ne valent pas validation exhaustive du dictionnaire SQL, des types/contraintes physiques, ni autorisation générale de migration ou d'implémentation.

### D58 — granularité et rattachement des prospects entreprise/contact

- `contact.entreprise_id` est obligatoire : un contact appartient à une entreprise.
- Un prospect entreprise possède `entreprise_id` renseigné et `contact_id = NULL`.
- Un prospect contact possède `entreprise_id` et `contact_id` tous deux renseignés.
- Pour un prospect contact, le service doit vérifier transactionnellement que l'entreprise du prospect est exactement celle du contact (`contact.entreprise_id = prospect.entreprise_id`).
- Un prospect entreprise et un ou plusieurs prospects contact peuvent coexister pour la même entreprise ; ils représentent des démarches distinctes et conservent chacun leur statut et leur historique.
- Ne jamais transformer le prospect entreprise en prospect contact. Avant de créer un prospect contact, rechercher un prospect existant pour ce contact et le réutiliser afin de préserver son historique.
- La règle métier est validée ; les contraintes SQL exactes restent à préciser dans le dictionnaire consolidé.

### D59 — suppression confirmée d'une adresse e-mail et anonymisation historique

- La suppression d'une adresse e-mail non conforme exige une confirmation humaine explicite ; aucune suppression automatique sur simple suspicion ou résultat incertain.
- Après confirmation, retirer l'adresse de la fiche active `contact_email`.
- Anonymiser les copies historiques de l'adresse, y compris les snapshots de destinataire et les données d'événements qui la contiennent : ne pas conserver l'adresse en clair dans les traces historiques.
- Conserver les événements techniques et la traçabilité non identifiante utiles (par exemple contact lié si cela reste pertinent, type d'événement, date, résultat, identifiant fournisseur non identifiant et trace qu'une adresse a été supprimée).
- Ne pas conserver de donnée ou de mécanisme permettant de reconstituer l'adresse supprimée. Si une adresse correcte est retrouvée plus tard, elle est saisie de nouveau manuellement.
- Cette règle distingue la suppression de l'adresse de la conservation du contact et de son historique métier non identifiant.

### D60 — intégrité référentielle des oppositions et exclusions

- La représentation polymorphe seule (`target_type` + `target_id` sans FK réelle) n'est pas suffisante.
- Le modèle doit relier explicitement chaque opposition à une cible typée (entreprise, contact ou adresse e-mail) au moyen de relations contrôlables par la base.
- Une ligne d'opposition correspond à une seule cible ; l'intégrité doit empêcher les cibles ambiguës ou multiples sur une même ligne.
- Chaque épisode d'opposition est conservé : une levée/clôture termine l'épisode existant ; une opposition ultérieure crée une nouvelle ligne, sans réutiliser ni écraser l'ancienne.
- La réactivation est une action humaine explicite et historisée.
- Pour une adresse e-mail supprimée, conserver la trace d'opposition sous une forme anonymisée qui ne réintroduit pas l'adresse en clair.
- Le choix exact de la structure physique (FK typées, contraintes portables ou tables spécialisées) doit être arrêté dans le dictionnaire SQL consolidé après vérification SQLite/MySQL ; cette décision valide l'exigence d'intégrité, pas un DDL précis.

### D61 — séparation du cycle de vie des envois e-mail

- `email_send` représente l'intention/l'envoi logique d'un message.
- `email_send_attempt` représente chaque tentative technique liée à cet envoi logique ; plusieurs tentatives peuvent être historisées.
- `email_event` conserve les faits reçus ou constatés (sent, accepted, delivered, bounce, reply, failure, unknown, etc.) sous forme d'événements append-only.
- Les événements ne sont pas écrasés et ne doivent pas être forcés dans une succession linéaire : un événement différé (par exemple bounce après delivered) peut survenir ; les faits sont conservés tels quels.
- L'état courant est une projection/calcul dérivé des tentatives et événements disponibles ; il ne remplace jamais le journal historique.
- Un résultat `unknown` bloque toute nouvelle tentative automatique tant que le résultat n'a pas été vérifié.
- Les règles de priorité/réconciliation de la projection courante et les champs matérialisés éventuels doivent être documentés dans le dictionnaire et les services.

### D62 — unicité des noms de campagne

- Le nom d'une campagne est unique dans le périmètre d'un utilisateur, pas globalement entre utilisateurs.
- La comparaison s'effectue sur une forme normalisée au minimum par suppression des espaces superflus et comparaison insensible à la casse.
- Une campagne archivée conserve son nom et continue de participer à la règle d'unicité.
- La suppression physique ne doit pas servir à contourner la règle d'unicité.
- La clé normalisée et la contrainte/index portables correspondants restent à définir dans le dictionnaire consolidé.

### D63 — rapprochement obligatoire avant intégration des imports

- Aucun import ne doit écrire directement dans les tables métier sans passer par une étape préalable de staging, de rapprochement et de validation.
- Conserver le fichier original intact et enregistrer chaque opération dans `import_run`, avec ses métadonnées, puis chaque ligne dans `import_row` avec fichier, feuille, numéro de ligne, données brutes, état et erreurs.
- Comparer les lignes entrantes aux entreprises, contacts et prospects existants avant toute intégration.
- Réutiliser les identifiants métier existants lorsque la correspondance est certaine ; ne pas recréer des entités déjà présentes.
- Toute correspondance incertaine ou ambiguë est mise en attente d'une validation humaine ; aucune fusion approximative ou écrasement silencieux.
- Conserver la provenance du fichier, de la feuille et de la ligne, ainsi que la décision de rapprochement et son résultat.
- L'intégration dans les tables métier ne peut intervenir qu'après validation du rapprochement selon les règles approuvées.
- Le processus doit être idempotent et prévenir la réimportation involontaire d'une même source ; les clés et contrôles techniques exacts restent à préciser dans le plan d'import.

## Portée et statut des décisions D58–D63

D58–D63 sont des décisions métier/architecture validées par l'utilisateur le 19 novembre 2026. Elles complètent les décisions antérieures sans les remplacer. Les détails SQL, contraintes exactes, index, projections d'état, règles de rapprochement automatiques et dépendances de migrations doivent encore être consolidés et relus avant toute migration. Aucune migration, import ou modification de base n'est autorisé par ces décisions seules.
