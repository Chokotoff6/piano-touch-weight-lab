# Registre des crédits « inutiles » (passif Lovable)

Comptabilisation des crédits consommés par des erreurs de diagnostic ou des corrections qui n'auraient pas dû être nécessaires.

## Référence de mesure
- Date de référence : 27/09/2026 07:09 UTC
- Solde restant à cet instant : 69,03 crédits
- Consommé sur la période de facturation (23/09 → 23/10) : 103,22 crédits

## Incidents comptabilisés

| # | Date | Incident | Crédits |
|---|------|----------|---------|
| 1 | 25/09/2026 | Menu Exporter — diagnostic à l'envers (théories successives au lieu d'inspecter les couches DOM ; cause réelle : conflit z-index nav z-[50] vs contenu z-[60]) | 33,15 |
| 2 | 27/09/2026 | Panneau « Afficher/masquer » en mode zoom sur Résultats — analyse incomplète (vue normale inspectée, sous-composant SubChart zoomé oublié) ; correction = 1 ligne | 0,71 |

**Total passif : 33,86 crédits**

## Règle de tenue
Après chaque correction d'une erreur imputable à l'agent : relever le solde via l'outil de crédits, calculer le coût de la séquence, l'ajouter au tableau, et le signaler à l'utilisateur.
