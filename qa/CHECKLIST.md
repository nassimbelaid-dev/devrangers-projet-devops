# Checklist de validation — frontend DevRangers

> Date du test : __________  | Branche Git : __________  | Testeur : __________
>
> Cette checklist concerne **le frontend statique**. Les données des modules sont en mémoire pendant une navigation SPA ; le profil est conservé dans `localStorage`. Aucun test backend, Prisma, API, e-mail ou d'autorisation réelle n'est requis à ce stade.

## A. Écrans et responsive

Tester les pages sur les trois largeurs **1440 × 900**, **820 × 1180** et **390 × 844**. La suite Playwright réalise les tests de chargement et de débordement ; l'inspection visuelle reste indispensable.

| Page | Desktop | Tablette | Mobile | Observations |
|---|---|---|---|---|
| Tableau de bord `/en/dashboards/analytics` | ☐ | ☐ | ☐ | |
| Réunions `/en/meetings` | ☐ | ☐ | ☐ | |
| Membres `/en/members` | ☐ | ☐ | ☐ | |
| Décisions & actions `/en/actions` | ☐ | ☐ | ☐ | |
| Votes `/en/votes` | ☐ | ☐ | ☐ | |
| Documents & PV `/en/documents` | ☐ | ☐ | ☐ | |
| Ordre du jour `/en/agenda` | ☐ | ☐ | ☐ | |
| Notifications `/en/notifications` | ☐ | ☐ | ☐ | |
| Mon profil `/en/profile` | ☐ | ☐ | ☐ | |

Contrôler pour chaque page : aucun scroll horizontal global ; texte non tronqué ; clics accessibles ; formulaires utilisables ; modales sans débordement ; graphiques sans recouvrement ; tableaux défilables *dans leur conteneur* si nécessaire.

## B. Parcours intermodules (naviguer sans recharger)

- [ ] Créer une réunion, vérifier l'apparition dans la liste et le dashboard (si elle entre dans ses filtres de dates).
- [ ] Modifier une réunion, vérifier la mise à jour des détails et de la convocation fictive.
- [ ] Proposer un point d'ordre du jour, l'accepter, puis le retrouver dans Réunions.
- [ ] Réordonner les points validés, puis vérifier l'ordre dans la réunion.
- [ ] Créer une décision, puis retrouver la décision dans le module Votes.
- [ ] Clôturer un scrutin, puis vérifier le statut de la décision, selon les règles de quorum/majorité implémentées.
- [ ] Créer une action, la déplacer dans le Kanban, puis vérifier son statut dans la liste et ses statistiques.
- [ ] Marquer une notification comme lue depuis la cloche et vérifier le centre de notifications.
- [ ] Depuis Notifications, cliquer sur un lien vers son module associé ; vérifier la route.
- [ ] Tenter une suppression d'un membre, réunion ou décision encore référencé ; vérifier le message explicatif et l'intégrité des données.
- [ ] Sauvegarder le profil puis recharger : vérifier sa persistance locale ; au contraire, les collections métier en mémoire repartent de l'état initial.

## C. Formulaires, interactions et accessibilité

- [ ] Ouvrir et fermer les modales de création et de modification des Réunions, Membres, Décisions, Actions, Votes, Documents et Ordre du jour.
- [ ] Vérifier leurs champs obligatoires, leurs messages de validation, les boutons Annuler et Enregistrer, et l'absence d'envoi inopiné.
- [ ] Vérifier que les fenêtres modales ne débordent pas sur mobile, que l'en-tête et les actions restent atteignables par défilement.
- [ ] Tester tous les filtres et recherches avec un résultat et sans résultat.
- [ ] Tester les états vides, les messages d'erreur et les confirmations de suppression.
- [ ] Naviguer au clavier (Tab, Shift+Tab, Entrée, Espace, Échap), notamment dans la sidebar et les pop-ups.
- [ ] Vérifier les libellés lisibles par technologie d'assistance, les états de focus visibles et les contrastes des couleurs.
- [ ] Tester le **mode sombre** sur les pages clés, y compris pop-ups et Kanban.
- [ ] Tester les traductions réellement configurées (notamment `en` et `ar`) ; vérifier les textes et la disposition RTL si activée.
- [ ] Vérifier la présentation et l'option d'impression du procès-verbal ; les pièces jointes locales ne sont pas des fichiers hébergés.

## D. Qualité de build et sécurité de périmètre

```powershell
pnpm exec tsc --noEmit
pnpm build
node .\qa\audit-statique.cjs
pnpm exec playwright test -c qa/playwright.config.ts
```

- [ ] Pas d'erreur bloquante au typage ou au build.
- [ ] Pas d'import local cassé, de pages métier absentes ni de doublons de hooks signalés par l'audit.
- [ ] Pas de bandeau technique « démonstration frontend » dans les écrans.
- [ ] Pas de secrets `.env` commités ; vérification `git status` / `git diff --cached`.
- [ ] Aucun test ne présente le contrôle des rôles, l'envoi de mail ou la persistance métier comme effectifs en production.

## E. Fiche d'anomalie (à copier pour chaque problème)

| Champ | À renseigner |
|---|---|
| Identifiant | BUG-001 |
| Module / route | |
| Écran / largeur | |
| Étapes de reproduction | |
| Résultat attendu | |
| Résultat observé | |
| Capture / trace Playwright | |
| Priorité | Bloquant / Important / Mineur |
| Statut | Ouvert / Corrigé / Re-testé |
