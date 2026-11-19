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

### D66 — historisation des changements d’état des campagnes

- La table `campaign` conserve l’état courant de chaque campagne.
- Chaque transition d’état du cycle de vie est enregistrée dans une table append-only `campaign_event` ; l’historique ne remplace jamais l’état courant et ne doit pas être écrasé.
- La création d’une campagne produit immédiatement un premier événement représentant la transition `NULL → draft`.
- Les changements ultérieurs (par exemple activation, mise en pause, reprise, clôture ou réouverture) sont également historisés.
- Chaque événement conserve au minimum la campagne concernée, l’état précédent, le nouvel état et la date/heure de survenue en UTC. L’origine de l’action (`user` ou `system`) et une note facultative peuvent être conservées pour la traçabilité.
- La mise à jour de l’état courant de `campaign` et l’insertion correspondante dans `campaign_event` doivent être réalisées dans une même transaction : si l’une échoue, les deux opérations sont annulées.
- `campaign_event` concerne l’historique des transitions d’état de la campagne. Il reste distinct de `campaign_prospect_event`, qui concerne la participation d’un prospect à une campagne, et de `prospect_event`, qui conserve l’historique global du prospect.
- Cette décision porte sur les transitions d’état du cycle de vie de la campagne ; elle ne signifie pas que chaque modification de champ (nom, description ou paramètres, par exemple) doit être enregistrée dans `campaign_event`.

**À préciser dans le dictionnaire SQL avant le DDL :** noms et types définitifs des colonnes, FK et règles de conservation, acteur éventuel, valeurs autorisées pour l’origine, index et tests de cohérence. Cette décision ne valide pas l’ensemble du dictionnaire relationnel et n’autorise aucune migration.

**Statut :** décision validée par l’utilisateur le 19 novembre 2026. D66 complète les décisions antérieures ; elle ne vaut pas validation du dictionnaire SQL complet ni autorisation de migration ou d’implémentation.

### D67 — nouvelle tentative après échec définitif d’un envoi e-mail

- Un envoi logique (`email_send`) appartient à un seul élément de lot (`email_batch_item`) ; les tentatives techniques correspondantes restent rattachées à cet envoi logique.
- Si un envoi échoue de manière définitive et qu’une nouvelle tentative volontaire est décidée ultérieurement, créer un nouvel élément dans un nouveau lot, puis un nouvel envoi logique.
- Conserver intégralement l’ancien élément de lot, l’ancien envoi logique, ses tentatives techniques et ses événements ; ne pas réinitialiser, réutiliser ni écraser l’historique précédent.
- Un résultat `unknown` reste bloquant : cette décision ne permet pas de relancer tant que l’issue n’a pas été vérifiée.
- Cette règle concerne une nouvelle opération d’envoi après échec définitif ; elle ne remplace pas la distinction entre tentatives techniques d’un même envoi logique.
- Le traitement reste soumis à l’approbation humaine individuelle déjà prévue pour chaque message.

**Statut :** décision validée par l’utilisateur le 19 novembre 2026. D67 complète les décisions antérieures ; elle ne valide pas les détails SQL restants et n’autorise aucune migration ou implémentation.

### D68 — responsabilités et source d’autorité des états d’envoi e-mail

- `email_event` est le journal append-only des faits observés ou reçus (par exemple sent, accepted, delivered, bounce, reply, failure, unknown). Les événements ne sont jamais écrasés.
- `email_send_attempt` conserve le résultat propre à chaque tentative technique.
- `email_send.status` représente une projection de l’état courant de l’envoi logique, calculée à partir des tentatives et des événements disponibles ; cette projection doit pouvoir être recalculée et ne remplace pas les faits historiques.
- `email_batch_item` porte le workflow humain de l’élément individuel : préparation, validation, approbation et prise en charge.
- `email_batch.status` représente l’état global du lot, déterminé à partir de l’état de ses éléments.
- Chaque niveau conserve ainsi une responsabilité distincte ; les différentes colonnes d’état ne doivent pas devenir des sources de vérité concurrentes pour un même fait.

**À préciser dans le dictionnaire SQL et les services :** valeurs exactes des états, règles de projection/réconciliation de `email_send.status`, transitions du workflow de `email_batch_item`, agrégation de `email_batch.status`, gestion des événements reçus dans le désordre et éventuelle matérialisation/recalcul. Cette décision ne valide pas les détails SQL restants et n’autorise aucune migration ou implémentation.

**Statut :** décision validée par l’utilisateur le 19 novembre 2026. D68 complète les décisions antérieures ; elle ne vaut pas validation du dictionnaire SQL complet ni autorisation de migration ou d’implémentation.

### D69 — lots d’e-mails mono-campagne

- Un `email_batch` est rattaché à une seule campagne au maximum.
- Tous les `email_batch_item` d’un même lot doivent référencer des messages rattachés à cette même campagne.
- Un lot sans campagne peut contenir des messages sans campagne ; il ne peut pas mélanger des messages associés à une campagne avec des messages sans campagne ni des messages issus de campagnes différentes.
- Le service doit contrôler cette cohérence avant l’ajout d’un élément au lot et refuser tout mélange.
- Le modèle V1 est donc mono-campagne ; le support de lots multi-campagnes n’est pas retenu.

**À préciser dans le dictionnaire SQL et les services :** comportement exact des messages sans campagne, contraintes réalisables en base et vérifications transactionnelles lors de l’ajout/modification d’un élément. Cette décision ne valide pas les détails SQL restants et n’autorise aucune migration ou implémentation.

**Statut :** décision validée par l’utilisateur le 19 novembre 2026. D69 complète les décisions antérieures ; elle ne vaut pas validation du dictionnaire SQL complet ni autorisation de migration ou d’implémentation.

### D70 — source manuelle réutilisable par utilisateur

- Les tables `entreprise_fact`, `contact_fact` et `enrichment` doivent pouvoir référencer une source même lorsque l’information a été saisie manuellement.
- Prévoir une source de type `manual` par utilisateur et la réutiliser pour l’ensemble de ses saisies manuelles.
- Ne pas créer une nouvelle ligne `source` à chaque saisie ou modification.
- Maintenir `source_id` obligatoire dans les tables de faits et d’enrichissement concernées ; la source `manual` fournit la provenance des informations saisies par l’utilisateur.
- Distinguer explicitement cette provenance des sources externes telles qu’Apollo, Pappers ou d’autres fournisseurs.

**À préciser dans le dictionnaire SQL et les services :** unicité et rattachement de la source `manual` par utilisateur, création idempotente, comportement en cas de source absente et règles de validation des faits/enrichissements. Cette décision ne valide pas les détails SQL restants et n’autorise aucune migration ou implémentation.

**Statut :** décision validée par l’utilisateur le 19 novembre 2026. D70 complète les décisions antérieures ; elle ne vaut pas validation du dictionnaire SQL complet ni autorisation de migration ou d’implémentation.

### D71 — cloisonnement des preuves avec partage contrôlé du contexte entreprise

- Le cloisonnement des preuves est la règle par défaut : un message ou document généré pour un prospect ne peut pas utiliser des informations propres à un autre contact ou à un autre prospect.
- Une exception contrôlée est autorisée pour les informations réellement communes à l’entreprise : les faits et recherches au niveau `entreprise` peuvent être réutilisés pour plusieurs contacts rattachés à cette même entreprise.
- Cette réutilisation ne vaut pas autorisation de partager les informations propres à un contact, son poste, ses responsabilités, son parcours, ses coordonnées ou son historique d’échanges avec un autre contact.
- Les éléments communs à l’entreprise servent de contexte partagé ; l’angle, les arguments, les bénéfices mis en avant et la formulation doivent être adaptés au rôle et à l’interlocuteur ciblé (par exemple direction technique, RH ou CEO).
- Les preuves et contenus doivent donc conserver une distinction claire entre le périmètre entreprise, le périmètre contact et le périmètre prospect/message. Le service doit vérifier qu’une preuve réutilisée est bien une information d’entreprise et que le contact ciblé appartient à cette entreprise.
- Toute preuve spécifique à un contact ou à un prospect reste strictement limitée à son périmètre autorisé ; aucune fusion implicite de contextes entre deux personnes.

**À préciser dans le dictionnaire SQL et les services :** représentation des portées entreprise/contact/prospect, règles de rattachement et de réutilisation des preuves, contrôles transactionnels de cohérence entreprise-contact, et traçabilité des preuves effectivement utilisées pour chaque génération. Cette décision ne valide pas les détails SQL restants et n’autorise aucune migration ou implémentation.

**Statut :** décision validée par l’utilisateur le 19 novembre 2026. D71 complète la règle de cloisonnement des preuves en autorisant uniquement le partage du contexte commun à une même entreprise ; elle ne vaut pas validation du dictionnaire SQL complet ni autorisation de migration ou d’implémentation.

### D72 — fermeture du compte et conservation des données

- La fermeture du compte ne déclenche pas de suppression physique automatique des données métier ou de l’historique.
- Le compte peut être désactivé afin de bloquer les nouvelles opérations ; les données historiques restent conservées selon une politique de conservation qui devra être définie.
- La décision de clôture définitive, d’export ou de suppression éventuelle appartient explicitement à l’utilisateur ; aucune purge automatique ne doit être déclenchée sans son choix.
- Les éventuelles opérations de clôture définitive devront être explicites, informées et encadrées par une procédure dédiée.

**À préciser :** états du compte, procédure d’export, durée et périmètre de conservation, anonymisation éventuelle et conditions de suppression définitive. Cette décision ne valide pas les détails SQL restants et n’autorise aucune suppression ou implémentation.

**Statut :** principe de contrôle utilisateur validé le 19 novembre 2026. D72 complète les décisions antérieures ; les modalités techniques et la politique de conservation restent ouvertes.

### D73 — messages d’erreur actionnables et décisions utilisateur

- Lorsqu’une anomalie métier ou une donnée bloquante est détectée, l’application doit afficher un message explicite et contextualisé, sous forme de modal lorsque l’intervention de l’utilisateur est nécessaire.
- Le message doit expliquer le problème détecté et ses conséquences concrètes, puis demander à l’utilisateur quelle action entreprendre lorsque plusieurs traitements sont possibles.
- Exemples de situations à couvrir : prospect non qualifié, adresse e-mail obsolète ou invalide, contact injoignable, données incohérentes ou preuve manquante.
- Ne pas supprimer, ignorer, remplacer, réactiver ou contourner automatiquement une donnée ou un prospect sur la seule base de l’erreur détectée ; l’action métier revient à l’utilisateur lorsque le choix a un impact sur les données ou la prospection.
- Les options proposées doivent être adaptées au cas détecté, par exemple corriger l’adresse, rechercher une autre adresse, mettre le prospect en attente, le marquer comme exclu/à revoir ou annuler l’opération. Ne proposer que les actions réellement sûres et disponibles.
- Les messages doivent distinguer les erreurs bloquantes, les avertissements et les simples informations ; une opération non sûre ne doit pas se poursuivre tant que le problème n’est pas résolu ou explicitement traité.
- Les décisions prises depuis ces modals doivent être historisées lorsque cela modifie l’état du prospect, du contact, d’une adresse ou d’une opération.

**À préciser :** catalogue des erreurs et codes, formulation des messages, niveau de gravité, options par scénario, conditions de blocage, accessibilité et journalisation des choix. Cette décision valide le principe UX/métier ; elle ne constitue pas encore une spécification exhaustive des modals ni une autorisation d’implémentation.

**Statut :** besoin fonctionnel validé par l’utilisateur le 19 novembre 2026. D73 complète les décisions antérieures ; les scénarios et textes détaillés restent à concevoir.


### D73 — messages d’erreur actionnables et décisions utilisateur

- Lorsqu’une anomalie métier ou une donnée bloquante est détectée, l’application doit afficher un message explicite et contextualisé, sous forme de modal lorsque l’intervention de l’utilisateur est nécessaire.
- Le message doit expliquer le problème détecté et ses conséquences concrètes, puis demander à l’utilisateur quelle action entreprendre lorsque plusieurs traitements sont possibles.
- Exemples de situations à couvrir : prospect non qualifié, adresse e-mail obsolète ou invalide, contact injoignable, données incohérentes ou preuve manquante.
- Ne pas supprimer, ignorer, remplacer, réactiver ou contourner automatiquement une donnée ou un prospect sur la seule base de l’erreur détectée ; l’action métier revient à l’utilisateur lorsque le choix a un impact sur les données ou la prospection.
- Les options proposées doivent être adaptées au cas détecté, par exemple corriger l’adresse, rechercher une autre adresse, mettre le prospect en attente, le marquer comme exclu/à revoir ou annuler l’opération. Ne proposer que les actions réellement sûres et disponibles.
- Les messages doivent distinguer les erreurs bloquantes, les avertissements et les simples informations ; une opération non sûre ne doit pas se poursuivre tant que le problème n’est pas résolu ou explicitement traité.
- Les décisions prises depuis ces modals doivent être historisées lorsque cela modifie l’état du prospect, du contact, d’une adresse ou d’une opération.

**À préciser :** catalogue des erreurs et codes, formulation des messages, niveau de gravité, options par scénario, conditions de blocage, accessibilité et journalisation des choix. Cette décision valide le principe UX/métier ; elle ne constitue pas encore une spécification exhaustive des modals ni une autorisation d’implémentation.

**Statut :** besoin fonctionnel validé par l’utilisateur le 19 novembre 2026. D73 complète les décisions antérieures ; les scénarios et textes détaillés restent à concevoir.


### D74 — proposition et validation du nom de campagne

- Lors de la création d'une campagne, l'application génère une proposition de nom à partir des informations disponibles sur la campagne (par exemple type, zone géographique, cible/secteur et période).
- Avant de créer la campagne, l'application présente cette proposition dans une modale formulée explicitement comme une suggestion : « Je vous propose ce nom pour votre campagne : [nom]. Est-ce que ce nom vous convient ? »
- L'utilisateur doit choisir de valider le nom proposé, de le modifier ou d'annuler la création. La campagne n'est pas créée tant que le nom n'a pas été validé.
- Le générateur doit vérifier l'unicité avant de présenter la proposition : il ne doit jamais proposer un nom déjà utilisé, y compris par une campagne archivée.
- Si un nom candidat existe déjà, le générateur doit poursuivre sa logique de génération et produire un autre nom disponible avant d'ouvrir la modale. Un doublon présenté à l'utilisateur constitue une anomalie de conception ou de paramétrage, pas un choix à lui soumettre.
- Le nom reste modifiable par l'utilisateur avant validation. Toute modification manuelle est soumise au même contrôle d'unicité ; l'interface doit empêcher la validation d'un nom déjà utilisé et proposer une correction claire.
- Au clic sur « Valider », le système effectue un dernier contrôle atomique/cohérent au moment de l'enregistrement. En cas de collision exceptionnelle apparue depuis la proposition (par exemple création concurrente), ne pas créer la campagne : régénérer un nom disponible et présenter une nouvelle proposition à valider.

**À préciser dans le dictionnaire et la conception UX :** composition exacte du nom, algorithme de génération garantissant la recherche d'un nom disponible, comportement en cas de collision concurrente et textes/actions définitifs de la modale. Cette décision fixe le principe de proposition unique suivie d'une validation humaine ; elle ne valide pas les détails SQL et n'autorise aucune migration ou implémentation.

**Statut :** décision validée par l'utilisateur le 19 novembre 2026. D74 complète D62 et D73 ; elle ne vaut pas validation du dictionnaire SQL complet ni autorisation de migration ou d'implémentation.


### D75 — composition du nom de campagne

- Le format de nom proposé pour une campagne suit cinq éléments, dans cet ordre : type de campagne, zone géographique, secteur ou cible, période de création et numéro distinctif.
- Format de référence : `PROS – RENNES – IA DATA – NOV 2026 – 001`.
- Les éléments sont séparés visuellement par ` – ` afin de rendre le nom lisible et facilement identifiable.
- Le numéro distinctif permet de différencier les campagnes lorsque les autres éléments du nom sont identiques.
- Le nom généré reste soumis aux règles D62 et D74 : unicité par utilisateur, contrôle avant proposition, validation humaine et contrôle final à l'enregistrement.
- Cette structure est le format de référence validé ; les règles précises d'incrémentation du numéro et les adaptations lorsque certaines informations sont absentes restent à définir.

**Statut :** structure en cinq éléments validée par l'utilisateur le 19 novembre 2026. Cette décision complète D62 et D74 ; elle n'autorise aucune migration ou implémentation.

### D76 — présentation tabulaire des critères de requête

- Les critères utilisés pour construire ou paramétrer une requête doivent être présentés sous forme de tableau lorsque cela améliore leur lecture, leur vérification et leur modification.
- Le tableau doit rendre visibles les critères et leurs valeurs, plutôt que de les dissimuler dans une formulation textuelle compacte.
- Cette présentation s'applique notamment aux requêtes de recherche et de filtrage utilisées dans le parcours de prospection.
- La forme exacte du tableau (colonnes, opérateurs, regroupements et édition) sera définie selon le type de requête ; cette décision ne fige pas prématurément un schéma d'interface unique.

**Statut :** préférence UX validée par l'utilisateur le 19 novembre 2026. Cette décision exprime un principe de présentation ; elle n'autorise aucune implémentation.


### D77 — moteur de requêtes avec logique ET/OU

- Le moteur de recherche et de filtrage doit prendre en charge les opérateurs logiques ET et OU dès la conception V1.
- Les critères doivent pouvoir être regroupés afin de construire des combinaisons de conditions, et pas uniquement une liste plate de conditions reliées par ET.
- La représentation des critères doit rester lisible et vérifiable sous forme de tableau, conformément à D76.
- L'interface pourra exposer progressivement les possibilités avancées, mais le modèle du moteur doit prévoir ET/OU dès le départ.
- La syntaxe exacte des groupes, la gestion des parenthèses/niveaux d'imbrication, les opérateurs disponibles par type de champ et les limites de complexité restent à spécifier.

**Statut :** prise en charge de ET/OU validée par l'utilisateur le 19 novembre 2026. Cette décision fixe la capacité fonctionnelle attendue ; elle n'autorise aucune implémentation.


### D78 — groupes de requêtes ET/OU imbriqués

- Le moteur de requêtes doit prendre en charge des groupes de conditions ET/OU imbriqués dès la V1.
- Une requête peut combiner plusieurs groupes, par exemple : (Localisation = Rennes ET Secteur = Data) OU (Secteur = Cyber ET Effectif > 50).
- La structure doit permettre de représenter explicitement les regroupements et leur logique, sans ambiguïté de priorité entre ET et OU.
- L'affichage des critères et groupes doit rester lisible et modifiable sous forme de tableau, conformément à D76.
- La profondeur maximale d'imbrication, les limites de complexité, la syntaxe interne et les règles de validation restent à définir.

**Statut :** groupes ET/OU imbriqués validés par l'utilisateur le 19 novembre 2026. Cette décision fixe la capacité fonctionnelle attendue ; elle n'autorise aucune implémentation.


### D79 — bibliothèque de filtres enregistrés

- L'utilisateur doit pouvoir enregistrer une requête de recherche/filtrage comme filtre réutilisable dès la V1.
- Un filtre enregistré possède un nom et conserve sa définition complète, y compris les groupes ET/OU imbriqués.
- L'utilisateur peut relancer un filtre enregistré sans reconstruire ses critères.
- L'utilisateur peut modifier un filtre enregistré ou travailler sur une copie sans altérer l'original.
- Les règles de nommage, de versionnement, de partage (si pertinent), de suppression/archivage et le comportement lorsqu'un champ ou une valeur n'existe plus restent à définir.

**Statut :** bibliothèque de filtres enregistrés validée par l'utilisateur le 19 novembre 2026. Cette décision fixe la capacité fonctionnelle attendue ; elle n'autorise aucune implémentation.
