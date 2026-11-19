# Prospect Engine — Brief projet

## Objectif
Faire évoluer l'application existante en outil personnel de prospection d'alternance : sourcing d'entreprises et contacts, qualification, recherche sourcée, déduplication, personnalisation, gestion des CV et lettres, préparation Outlook, validation humaine, suivi des réponses et relances. Le dépôt est le référentiel applicatif central ; les fournisseurs externes ne deviennent pas des sources de vérité concurrentes.

## Contexte candidat à préserver
- Pré-MSc informatique à Epitech Rennes.
- Reconversion vers les métiers du numérique.
- Plus de dix années d'expérience en approvisionnement, supply chain, logistique et opérations.
- Recherche d'alternance à partir du 21 décembre 2026.
- Modèle de lettre Notion : durée 33 mois, rythme 3 semaines entreprise / 1 semaine formation. Vérifier l'actualité de ces paramètres avant génération.

Ne jamais inventer compétence, technologie maîtrisée, expérience, résultat, projet, besoin entreprise ou lien avec l'entreprise.

## Périmètre fonctionnel cible
1. Sourcing et enrichissement d'entreprises et contacts.
2. Qualification, scoring, segmentation et priorisation.
3. Prospects entreprise et contact avec cycles distincts des candidatures.
4. Campagnes et appartenance multi-campagne.
5. Import Excel/CSV en staging, revue, traçabilité et approbation.
6. Recherche entreprise avec sources, dates et niveau de preuve.
7. Modèles, prompts versionnés, messages générés et corrections humaines.
8. Bibliothèque de CV spécialisés et documents PDF/DOCX versionnés.
9. Outlook : brouillons, pièces jointes, envoi approuvé et suivi.
10. Dashboard, relances, réponses, entretiens et conversions.

## Sources et outils envisagés
- Apollo : sourcing/enrichissement ; démarrage historique par export CSV, sans People API payante.
- Clay : enrichissement complémentaire ciblé, crédits surveillés.
- Le Poool : découverte écosystème local.
- Pappers, SocieteInfo, Pharow, Dropcontact, Clara : sources potentielles, accès, tarifs, quotas, droits et endpoints à vérifier.
- Outlook/Microsoft 365 : canal de messagerie retenu, permissions à vérifier par opération.
- Figma : modèle maître de lettre ; travailler sur une copie, jamais sur le maître.
- GitHub : code et documentation.
- Notion : mémoire, décisions, journal et références.

Un plugin ChatGPT connecté ne fournit pas automatiquement des identifiants réutilisables par l'application locale.

## Garde-fous
- Budget initial 0 € ; aucun achat, abonnement, crédit ou appel potentiellement payant sans accord explicite.
- Aucun envoi email ou LinkedIn autonome.
- Validation de chaque message, même dans un lot.
- Destinataire, contenu et pièce jointe vérifiables avant envoi.
- Provenance, date et fiabilité conservées ; pas d'écrasement silencieux.
- Oppositions, exclusions et désinscriptions respectées.
- Aucun secret dans Git, les documents ou rapports.
- Préserver code, données et relations historiques.
- Pas de migration destructive, changement de moteur ou refonte sans validation.
- Fixtures synthétiques isolées des données réelles.

## Collaboration
ChatGPT coordonne cadrage, prompts et revues. Kilo exécute uniquement le périmètre explicitement autorisé. Une mission précise doit avoir objectif, limites, critères de sortie et rapport. Aucun passage automatique de l'audit à l'implémentation.

## Phases
Audit initial reçu ; proposition Kilo reçue mais non validée ; réconciliation à finaliser ; dictionnaire SQL final non validé ; migrations et implémentation non autorisées.

## Sources Notion
- Mémoire projet : https://app.notion.com/p/4147c14284a1813fb034cf17ad3d7ad8
- Journal technique : https://app.notion.com/p/4147c14284a18184840fc73963313e58
- Master plan V1 : https://app.notion.com/p/4147c14284a18177b776ffde4f6b0935
- Chantier Kilo : https://app.notion.com/p/41d7c14284a1813cb62ed0d5c08f58a6
- Base prospects : https://app.notion.com/p/4167c14284a181f993c8d06eaa5cc2fb
- Apollo et sources : https://app.notion.com/p/4157c14284a181ca9b7dd32bb28e8ddb
- Modèle de lettre : https://app.notion.com/p/4177c14284a1819a8dfcf2cf941cea02