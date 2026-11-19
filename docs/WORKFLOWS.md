# Prospect Engine — Domaines fonctionnels et workflows

Ce document décrit les comportements attendus ; il ne signifie pas qu'ils sont tous implémentés.

## Objets métier
- Entreprise : organisation cible ; une seule table entreprise V1, pas d'établissement séparé.
- Contact : personne rattachée à une entreprise ; plusieurs contacts par entreprise.
- Prospect : cible entreprise ou contact suivie dans un pipeline.
- Campagne : segment/action ; un prospect peut appartenir à plusieurs campagnes.
- Job : candidature à un poste ; reste séparée du pipeline de prospection.
- Interaction : événement réellement survenu.
- Task/rappel : action future, distincte d'une interaction passée.
- Source/fait/enrichissement : provenance et historique des informations.
- Message généré : proposition, puis version éditée/approuvée.
- Document : CV, lettre ou fichier versionné.
- Email batch : lot de messages, avec validation individuelle de chaque message.

## Sourcing et import
1. Définir segment et critères.
2. Découvrir entreprises et contacts via sources autorisées.
3. Tracer source, URL, date, identifiant fournisseur.
4. Importer d'abord en staging.
5. Conserver fichier, hash, feuille et ligne d'origine.
6. Normaliser sans détruire les données brutes.
7. Détecter doublons et conflits ; revue humaine pour correspondances approximatives.
8. Prévisualiser nouveaux, mis à jour, doublons, incomplets, rejetés et erreurs.
9. Approuver explicitement avant application.
10. Conserver historique et permettre reprise idempotente.

Notion décrit une base consolidée V1 de 152 contacts uniques, 84 entreprises et 80 pistes LinkedIn, issue de six classeurs. Les sources historiques sont conservées. Les emails présents ne sont pas automatiquement vérifiés ou autorisés à l'envoi. Aucun import de ces classeurs n'est autorisé par cette documentation.

## Entreprises, contacts et coordonnées
- Plusieurs contacts par entreprise.
- Pas d'unicité fondée sur le nom de personne seul.
- Plusieurs emails et téléphones par contact.
- Normalisation email limitée à trim + minuscules.
- Une seule adresse principale active par contact.
- SIREN/SIRET facultatifs ; doublons potentiels soumis à revue humaine.
- Qualité, source, date et vérification explicites.
- Exclusion entreprise bloque par défaut contacts/prospects ; réactivation manuelle et historisée.

## Pipeline prospect
Statuts validés : to_qualify, qualified, to_contact, contacted, replied, meeting, follow_up, interested, not_interested, no_response, converted, closed, excluded.

Priorités : low, normal, high, urgent. Scores facultatifs de 0 à 100 ; méthode de calcul à définir. Transitions contrôlées par le service et historisées. last_contacted_at uniquement après action confirmée.

Pause/exclusion par campagne indépendante du statut global et des autres campagnes. Conversion en candidature : conserver prospect et historique et le relier au Job existant.

## Recherche et personnalisation
Documenter activité, produits/services, projets, actualités, enjeux et métiers utiles. Conserver URL, date, source et niveau de preuve. Distinguer vérifié, déclaratif, hypothèse et inconnu. Ne jamais inventer un besoin ou une information ; si les preuves sont insuffisantes, demander recherche complémentaire ou rester prudent.

## Messages et Email Engine
1. Modèle de référence et prompt versionnés.
2. Générer un message par cible.
3. Conserver séparément proposition IA et version finale modifiée/approuvée.
4. Conserver les sources/faits justifiant la personnalisation.
5. Préparer des lots, historiquement par 10.
6. Relire le lot et valider chaque message individuellement.
7. Autoriser correction ou exclusion individuelle.
8. Vérifier destinataire, contenu et pièce jointe/version exacte.
9. Préparer brouillons Outlook.
10. Envoyer uniquement après approbation explicite ; journaliser tentatives et résultats.
11. Si résultat unknown, bloquer nouvelle tentative automatique jusqu'à vérification.
12. Suivre réponses et préparer relances sans envoi autonome.

## CV et lettres
- Plusieurs CV spécialisés et versionnés (ex. développement, Data/BI, IA).
- Sélection adaptée au poste ; joindre une version précise.
- PDF et DOCX dès V1.
- Fichiers hors base ; métadonnées, clé, MIME, taille et hash en base.
- Lettre issue d'une copie du modèle maître Figma ; ne jamais modifier le maître.
- Archiver documents référencés ; suppression physique seulement si non référencé et explicitement autorisée.

## Outlook
Outlook/Microsoft 365 est le canal retenu. Vérifier séparément permissions de lecture, brouillons, pièces jointes, envoi approuvé et récupération des réponses. Ne pas confondre gestion des brouillons et permission d'envoi. Aucun envoi autonome n'est autorisé.

## Sources Notion
- Mémoire projet : https://app.notion.com/p/4147c14284a1813fb034cf17ad3d7ad8
- Journal décisions Q/D : https://app.notion.com/p/4147c14284a18184840fc73963313e58
- Master plan : https://app.notion.com/p/4147c14284a18177b776ffde4f6b0935
- Base consolidée : https://app.notion.com/p/4167c14284a181f993c8d06eaa5cc2fb
- Sources/API : https://app.notion.com/p/4157c14284a181ca9b7dd32bb28e8ddb
- Modèle lettre : https://app.notion.com/p/4177c14284a1819a8dfcf2cf941cea02