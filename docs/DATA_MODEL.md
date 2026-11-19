# Prospect Engine — Modèle de données et réconciliation

## Statut
Le dépôt possède déjà un modèle Sequelize actif. Q1–Q19 et D01–D57 sont validés, mais pas le dictionnaire SQL final table par table. Une base de travail historique mentionne six tables historiques conservées + 31 nouvelles tables envisagées (37 au total) ; ce total est un repère de conception, pas un schéma final autorisé.

La proposition Mission 01 de Kilo est simplifiée et ne remplace ni le dictionnaire historique ni les décisions validées.

## Modèle courant
Voir CURRENT_STATE.md. Modèles observés : User, Entreprise, Job, Status, OfferType, JobStatusHistory, Prospect, ProspectImport, ProspectImportRow et ProspectInteraction.

Le Prospect courant est obligatoirement rattaché à une entreprise et porte un seul email. Le modèle métier cible doit aussi permettre une cible entreprise ou contact, des coordonnées multiples, des campagnes, des faits sourcés et l'historisation.

## Domaines cibles identifiés dans les décisions
- Entreprise enrichie ; Contact ; contact_phone ; contact_email ; email_event.
- Prospect ; prospect_status ; prospect_event.
- Campaign ; campaign_prospect.
- Source ; import_run ; import_row.
- entreprise_fact ; contact_fact ; suivi des enrichissements.
- message_template ; generated_message ; generated_message_evidence.
- document_series ; document ; prospect_document ; campaign_document ; generated_document.
- email_batch ; email_batch_item ; email_send ; email_send_attempt ; email_event ; email_attachment.
- suppression.

Cette liste est un regroupement conceptuel des noms cités dans les décisions. Elle n'est pas le dictionnaire exhaustif des tables ; vérifier le dictionnaire complet, les responsabilités et les noms exacts avant de figer le modèle.

## Règles relationnelles
- Une entreprise peut avoir plusieurs contacts.
- Un prospect cible une entreprise ou un contact ; target_key unique généré par service : company:<entreprise_id> ou contact:<contact_id>.
- Vérifier transactionnellement que le contact du prospect appartient à l'entreprise liée.
- Un prospect peut appartenir à plusieurs campagnes.
- Statut global indépendant de l'état par campagne.
- Conversion en candidature : conserver prospect/historique et relier au Job existant.
- Job reste une candidature.
- Interaction passée distincte d'une tâche future.
- Faits sourcés historisés ; pas d'écrasement silencieux.
- Messages : proposition initiale, version finale, prompt/méthode et preuves.
- Documents immuables/versionnés ; envoi attaché à une version précise.

## Historique et suppressions
Événements historiques immuables ; archivage des entités mutables importantes ; RESTRICT par défaut ; aucune cascade destructive non justifiée ; exclusions historisées ; inconnu = NULL ; transactions multi-tables.

## Migration validée en principe
Umzug + SequelizeStorage ; migrations versionnées up/down ; pas de sync pour évoluer une base réelle ; commande explicite, pas de migration au démarrage ; première migration additive après sauvegarde vérifiée ; aucun renommage/suppression ; rollback uniquement sûr ; seeds idempotents ; tests SQLite temporaire et MySQL séparément ; foreign_keys activées à chaque connexion SQLite.

## Réconciliation obligatoire
Kilo doit comparer :
1. modèles, colonnes, associations et contraintes réellement dans le dépôt ;
2. décisions Q1–Q19 et D01–D57 ;
3. dictionnaire relationnel historique complet ;
4. proposition Mission 01 ;
5. workflows métier.

Matrice attendue : existant / décision source / cible historique / proposition Kilo / recommandation / données à préserver / risque / statut.

Points sensibles :
- Prospect existe déjà et ne doit pas être ignoré.
- Prospect courant est entreprise-only et email-simple.
- Job.contactPerson et Job.contactEmail sont historiques ; maintenir compatibilité.
- Statuts Prospect courants ne couvrent pas les 13 statuts validés.
- Les CASCADE actuels doivent être comparés à D04/D46.
- Distinguer email_event des événements d'envoi/rebond pour éviter collision sémantique.
- Vérifier configuration réelle et schéma SQLite avant tout plan d'exécution.

## Points encore ouverts
- Récupérer/relire le dictionnaire complet table/colonne/type/nullabilité/index/FK.
- Confirmer périmètre exact des six tables historiques.
- Résoudre sémantique et nommage des événements email.
- Définir évolution de Prospect sans casser les données déjà importées.
- Vérifier propriété utilisateur selon D05.
- Définir déduplication et arbitrage des conflits de sources.
- Vérifier base physique et configuration locale.
- Valider ordre de migration et stratégie de sauvegarde/restauration.

Aucune table, colonne, migration ou modification de code ne doit être créée sur la seule base de ce document. Soumettre la cible consolidée à Jean-Philippe pour validation explicite.