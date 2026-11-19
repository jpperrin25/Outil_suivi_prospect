# Prospect Engine — Documentation de référence pour Kilo

Dépôt canonique : https://github.com/jpperrin25/Outil_suivi_prospect

Lire dans cet ordre :
1. PROJECT_BRIEF.md — objectif, périmètre et garde-fous.
2. CURRENT_STATE.md — état réellement observé dans le dépôt.
3. DECISIONS.md — décisions Q1–Q19 et D01–D57 validées.
4. WORKFLOWS.md — domaines et parcours métier.
5. DATA_MODEL.md — modèle actuel, cible de conception et points à réconcilier.

## Priorité des sources
- Le code du dépôt décrit l'état implémenté.
- Les décisions de conception décrivent les exigences, pas l'implémentation.
- Q1–Q19 et D01–D57 ont été explicitement validées le 10 novembre 2026.
- Le dictionnaire SQL complet n'a pas reçu sa validation finale.
- En cas de contradiction, documenter et demander arbitrage ; ne jamais trancher silencieusement.

Kilo doit lire ces documents avant chaque mission, puis inspecter les fichiers du dépôt concernés. Distinguer faits observés, décisions validées, propositions et hypothèses.

La documentation n'autorise pas à elle seule une implémentation, une migration, un import ou un appel externe.