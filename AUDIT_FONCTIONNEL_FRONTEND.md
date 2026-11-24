# Audit fonctionnel du frontend — comité scientifique

**Branche auditée :** `refactoring/nettoyage-shadboard`  
**Périmètre :** interface frontend avec données fictives, avant backend. Aucun fichier source n’a été modifié.  
**Méthode :** lecture des routes, composants, magasins de données et utilitaires ; exécution de `node qa/audit-statique.cjs`. Les tests Playwright déjà présents dans `qa/qa/rapports` sont des traces antérieures, en échec sur plusieurs pages ; ils ne sont pas considérés comme preuve d’exécution sur cet état. Les parcours fonctionnels ci-dessous sont donc vérifiés par lecture du code, sauf l’audit statique.

## Légende

- **Fonctionnelle (code)** : interaction et mise à jour d’état identifiables dans le code ; non validée en navigateur.
- **Partielle** : une partie du parcours existe, ou dépend d’une simulation/limitation importante.
- **Absente** : aucune implémentation fonctionnelle identifiée.
- **Non vérifiée** : les éléments examinés ne suffisent pas à conclure.

## Résumé exécutif

Le frontend possède des écrans métier et plusieurs scénarios locaux utilisables : membres/mandats, séances, agenda soumis à validation, documents, procès-verbaux, scrutins, actions et notifications. L’état métier est centralisé par `src/lib/demo-store.ts`, et plusieurs changements sont synchronisés entre modules durant la session et sauvegardés en `localStorage`.

Les limites importantes sont les suivantes : pas de rôle « suppléant » ni « administration » distincts dans l’authentification ; les permissions sont des contrôles d’interface dans une maquette et ne constituent pas une autorisation sécurisée ; les notifications ne sont pas créées automatiquement par les autres modules ; les pièces jointes sont locales et leur contenu fichier n’est pas persisté ; la recherche plein texte demandée dans les PV et décisions n’est pas identifiée ; l’archivage est partiel ; la clôture d’une réunion et la signature du PV ne forment pas un workflow automatiquement synchronisé.

## Détail par exigence

| Fonctionnalité | État | Interface | Fichiers et responsables | Comportement et limites |
|---|---|---|---|---|
| Rôles métier des membres | **Partielle** | Membres → Annuaire | `src/features/members/members-client.tsx`, `member-form.tsx`, `types.ts`, `mock-data.ts` | Les membres ont une fonction, un type titulaire/suppléant, un siège et des dates de mandat. Ce rôle de fonction n’est pas le rôle de connexion. Pas de contrôle d’unicité de fonction président/secrétaire relevé. |
| Mandats | **Fonctionnelle (code)** | Membres → Annuaire | `members-client.tsx`, `member-form.tsx`, `utils.ts` | Dates de début/fin, état et filtres ; `mandateStatus` et validation de périodes alimentent l’annuaire et les statistiques. La règle d’interdiction de chevauchement titulaire/suppléant se fait au niveau du siège et des dates (voir validation `validateMemberSeat`). À valider par exécution. |
| Suppléants et sièges | **Fonctionnelle (simulation)** | Membres → Sièges et suppléances | `src/features/members/seats-panel.tsx`, `members-client.tsx`, `src/features/votes/utils.ts` | La présence est simulée par membre. `seatRepresentations` choisit le titulaire présent, sinon son suppléant présent ; un siège ne peut fournir qu’un représentant. L’état de présence du panneau Membres est local au composant et n’est pas la présence du scrutin. |
| Remplacement d’un titulaire absent | **Partielle** | Sièges et suppléances ; Votes | `seats-panel.tsx`, `src/features/votes/votes-client.tsx`, `src/features/votes/utils.ts`, `src/features/votes/ballot-panel.tsx` | Le calcul du vote substitue correctement le suppléant présent dans le siège. La simulation de présence indépendante dans Membres ne se propage pas au scrutin ; le remplacement doit être refait dans le scrutin. |
| Interdiction du double vote | **Fonctionnelle (code)** | Votes → scrutin | `votes-client.tsx` (`changeVote`, `changePresence`), `utils.ts` (`removeStaleVotes`, `calculateBallot`), `ballot-panel.tsx` | Bulletins stockés par siège et comptés seulement si leur auteur est le représentant choisi ; changement de présence invalide les bulletins devenus obsolètes. L’interface et les règles métier locales préviennent le double comptage, sans garantie serveur. |
| Réunion : date, salle, participants | **Fonctionnelle (code)** | Réunions → création/détails | `src/features/meetings/meetings-client.tsx`, `meeting-form.tsx`, `meeting-details.tsx`, `types.ts` | Formulaire avec date/heure, lieu, participants et détails ; données ajoutées/modifiées dans le magasin commun. Exécution non vérifiée. |
| Ordre du jour lié à une réunion | **Partielle** | Réunions et Ordre du jour | `src/features/agenda/agenda-client.tsx`, `agenda-form.tsx`, `meetings-client.tsx`, `meeting-details.tsx`, `src/lib/demo-business.ts` | Les propositions validées peuvent alimenter l’ordre du jour d’une réunion. Vérifier les contraintes de statut et la synchronisation après édition par parcours navigateur. |
| Convocations | **Partielle** | Réunions ; Notifications | `meeting-form.tsx`, `src/features/notifications/*`, `src/lib/demo-business.ts` | Les participants et informations de réunion sont gérés, mais aucune livraison d’e-mail n’est prévue. Aucun déclenchement automatique de notification de convocation n’est observé ; le centre contient et simule des notifications locales. |
| Proposition collaborative de points | **Partielle** | Ordre du jour | `src/features/agenda/agenda-client.tsx`, `agenda-form.tsx`, `mock-data.ts`, `types.ts` | Création de proposition et états de validation/rejet sont présents. Le rôle membre peut proposer selon `rolePermissions`. Le contrôle d’approbation président est au niveau UI ; la collaboration multi-utilisateur réelle n’existe pas sans backend. |
| Validation/rejet par le président | **Partielle** | Ordre du jour | `agenda-client.tsx`, `src/lib/static-auth.ts` (`rolePermissions`, `hasPermission`) | L’approbation est associée à la permission `approve` du président. Dépend du profil de démonstration actif ; contrôle client uniquement. |
| Dépôt de pièces jointes | **Partielle** | Documents | `src/features/documents/document-form.tsx`, `documents-client.tsx`, `document-details.tsx`, `types.ts`, `src/lib/demo-store.ts` | Métadonnées et fichiers sélectionnés manipulés dans l’interface. `demo-store.persist` retire les propriétés `file` lors de la sérialisation : contenu fichier non durable après rechargement ; stockage local limité. |
| Rapports/demandes, association réunion et point | **Partielle** | Documents | `documents-client.tsx`, `document-form.tsx`, `document-details.tsx`, `mock-data.ts`, `types.ts` | Types et formulaires proposent les catégories/références métier ; l’association dépend des identifiants disponibles. Pas de stockage serveur ni vérification exhaustive des liens cassés. |
| Compte-rendu / PV | **Partielle** | Documents → Procès-verbaux | `src/features/documents/minutes-editor.tsx`, `minutes-preview.tsx`, `documents-client.tsx`, `types.ts` | Éditeur et aperçu permettent de rédiger/éditer un PV simulé. Le contenu est dans l’état démo local. Les permissions secrétaire sont prévues au niveau module Documents. |
| Signature simulée par président | **Partielle** | Documents/PV et réunion | `minutes-editor.tsx`, `documents-client.tsx`, `meetings-client.tsx`, `src/lib/static-auth.ts` | Des actions d’approbation/signature simulée existent et affichent qu’aucune signature réelle n’est réalisée. La propagation du statut signé vers la réunion n’est pas un workflow atomique démontré. |
| Votes pour/contre/abstention | **Fonctionnelle (code)** | Votes | `src/features/votes/votes-client.tsx`, `ballot-panel.tsx`, `utils.ts`, `types.ts` | Saisie par représentant de siège, calcul des totaux et résultat en clôture ; les abstentions comptent pour le quorum, pas dans le dénominateur de majorité exprimée. À éprouver en navigation réelle. |
| Quorum paramétrable | **Fonctionnelle (code)** | Votes → paramètres du scrutin | `votes-client.tsx`, `utils.ts`, `mock-data.ts` | Pourcentage configurable ; seuil en nombre de sièges actifs calculé par plafond. Quorum non atteint bloque l’adoption à la clôture. |
| Majorité paramétrable | **Fonctionnelle (code)** | Votes → paramètres du scrutin | `votes-client.tsx`, `utils.ts`, `types.ts` | Seuil paramétrable ; règle actuelle stricte `pour * 100 / exprimés > majorité`, donc égalité au seuil = rejet. Aucune vérification des règles statutaires réelles. |
| Suivi des actions : responsable, échéance, statut | **Fonctionnelle (code)** | Décisions et actions | `src/features/decisions/decisions-actions-client.tsx`, `action-form.tsx`, `actions-kanban.tsx`, `types.ts` | Création, responsable, échéance, statuts À faire/En cours/Terminée et déplacement de cartes ; magasin partagé. |
| Identification des retards | **Fonctionnelle (code)** | Tableau de bord ; Actions | `src/features/dashboard/dashboard-data.ts`, `decisions-actions-client.tsx` | Retard dérivé de `dueDate < DEMO_REFERENCE_DATE` pour actions non terminées. Les données statiques peuvent devenir obsolètes ; la date de référence dashboard est établie au chargement du module. |
| Notifications internes (convocation, rappel, décision) | **Partielle** | Cloche ; Notifications | `src/features/notifications/notifications-client.tsx`, `notification-simulator.tsx`, `notification-details.tsx`, `src/lib/demo-business.ts` | Lecture, archivage/classement, recherche et création simulée sont présents. Le code UI précise que les changements réunions/actions/décisions ne créent pas automatiquement de notifications. Aucun e-mail envoyé, conformément au périmètre. |
| Archivage PV signés et décisions | **Partielle** | Documents | `documents-client.tsx`, `minutes-editor.tsx`, `src/lib/static-auth.ts`, `documents/types.ts` | Permissions `archive` affectées au profil archiviste, mais la revue ne confirme pas un parcours complet d’archivage des décisions et PV avec consultation durable. Les données restent modifiables localement. |
| Consultation de l’historique | **Partielle** | Réunions, Documents, Décisions | composants listés ci-dessus et `demo-store.ts` | Listes et données existantes constituent un historique de démonstration ; aucune journalisation d’événements/audit trail n’est relevée. |
| Recherche plein texte PV et décisions | **Absente** | Documents ; Décisions/actions | `src/features/documents/documents-client.tsx`, `minutes-editor.tsx`, `src/features/decisions/decisions-actions-client.tsx` | Recherche simple des listes existantes, lorsqu’elle existe, sur des champs d’affichage. Pas d’index/recherche confirmée dans le contenu texte complet des PV et décisions. |
| Tableau de bord : réunions à venir/statistiques | **Partielle** | Tableau de bord | `src/features/dashboard/dashboard-overview.tsx`, `dashboard-data.ts` | Réunions planifiées futures, nombres d’actions/décisions/membres actifs et notifications viennent du magasin démo. Dépend de filtres et date locale ; les statistiques ne sont pas toutes reliées à un flux événementiel complet. |
| Workflow planifiée → en cours → clôturée → PV signé | **Partielle** | Réunions et Documents | `meetings-client.tsx`, `meeting-form.tsx`, `minutes-editor.tsx`, `documents-client.tsx`, `types.ts` | Les valeurs de statut existent et les réunions sont filtrables ; transitions valides et séquencées ne sont pas imposées de bout en bout. `saveMeeting` empêche une transition directe vers « PV signé » si le statut précédent n’était pas signé, mais n’établit pas les étapes de déroulement/clôture. |
| Acteurs : membre, président, secrétaire, administration, administrateur, suppléant | **Partielle** | Connexion ; Utilisateurs | `src/lib/static-auth.ts`, `src/features/users/users-client.tsx`, `src/components/auth/static-sign-in.tsx` | Comptes/rôles de connexion : `admin`, `president`, `secretary`, `archivist`, `member`. Pas de rôles de connexion `administration` ni `suppléant`; le suppléant est une catégorie de membre. Le mot « admin » ne couvre pas une distinction formalisée administration/administrateur. |
| Permissions par acteur | **Partielle** | Toutes pages, menus conditionnels | `src/lib/static-auth.ts`, `src/components/auth/static-auth-guard.tsx`, chaque `*-client.tsx` | Masquage/activation conditionnelle des actions et garde de route. Contrôles client contournables, permissions incohérentes possibles (ex. admin voit Votes en lecture seule), rôle stocké dans `localStorage`. Pas une sécurité de production. |
| Cohérence/synchronisation des données fictives | **Partielle** | Intermodules | `src/lib/demo-store.ts`, `src/lib/demo-business.ts`, toutes les collections `mock-data.ts` | Magasin externe commun, persisté en localStorage et synchronisé dans la navigation SPA ; `applyDemoChange` conserve certaines références métier. Fichiers joints exclus, stockage par navigateur et aucune synchro entre utilisateurs. Les données ne sont pas « indépendantes », contrairement à certaines copies de libellés possiblement périmées. |

## Synchronisation importante à contrôler

Le store possède les collections `meetings`, `members`, `decisions`, `actions`, `ballots`, `documents`, `minutes`, `agenda` et `notifications`. L’interface utilise `useDemoCollection` et les modifications sont transmises à `applyDemoChange` (`src/lib/demo-business.ts`). Les consommateurs du tableau de bord lisent `useDemoData`. C’est une synchronisation locale, pas une synchronisation multi-session/appareil. Les règles de suppression/références, la propagation d’une décision vers un scrutin, d’un PV signé vers une réunion et la cohérence des notifications doivent être validées par parcours.

## Vérifications par exécution

| Vérification | Résultat |
|---|---|
| `node qa/audit-statique.cjs` | **Réussi** : 9 pages, 213 fichiers source, 680 imports locaux examinés, 0 erreur et 0 avertissement. Ce script vérifie la structure et les imports, pas le comportement métier. Il a généré/actualisé `qa/rapports/audit-statique.json` (artefact d’audit, aucun fichier source touché). |
| Parcours Playwright dans cette exécution | **Non exécutés**. Les rapports déjà présents dans `qa/qa/rapports/playwright-results` montrent des échecs de chargement/responsive historiques sur plusieurs pages ; faute de résultat frais, ils ne permettent pas d’attribuer ces échecs à l’état exact actuel. |
| Interactions métier listées dans ce rapport | **Lecture du code uniquement**, non vérifiées en navigateur. |

## Checklist des tâches restantes, par priorité

### P0 — Bloquant avant de présenter les exigences comme couvertes

- [ ] Ajouter/clarifier les profils attendus « administration » et « suppléant » et définir leur matrice de droits ; aligner fonctions de membre et rôles de compte.
- [ ] Enforcer côté UI un workflow contrôlé : planifiée → en cours → clôturée → PV signé, avec conditions, acteur responsable et mise à jour coordonnée réunion/PV.
- [ ] Vérifier l’interdiction de vote double avec scénarios titulaire/suppléant, changement de présence, mandat expiré et siège vacant ; confirmer que tous les chemins de vote passent par la règle commune.
- [ ] Définir puis vérifier la règle de majorité (égalité au seuil, abstentions) et le quorum par rapport aux exigences exactes du professeur.
- [ ] Ajouter une recherche dans le contenu complet du PV et des décisions, pas seulement dans les colonnes/listes.
- [ ] Vérifier dans un navigateur les parcours de création/édition/référence intermodule et les permissions de tous les rôles.

### P1 — Fonctionnalités fonctionnelles incomplètes

- [ ] Relier la présence/indisponibilité d’un membre dans la réunion à la représentation et aux votes du scrutin.
- [ ] Déclencher des notifications internes cohérentes à la création/modification d’une convocation, d’un rappel et à la publication d’une décision ; conserver l’absence d’envoi d’e-mail.
- [ ] Compléter archivage PV signés/décisions/documents et écran de consultation historique ; préciser si l’historique est une liste ou une piste d’audit.
- [ ] Rendre la signature simulée du président et l’édition du secrétaire cohérentes avec l’état de réunion et les droits définis.
- [ ] Vérifier dépôt, remplacement, aperçu et persistance des pièces jointes ; le contenu fichier n’est actuellement pas sérialisé au rechargement.
- [ ] Contrôler la validation des associations documents↔réunions↔points d’ordre du jour et la protection contre les suppressions référencées.

### P2 — Validation et qualité

- [ ] Exécuter une suite Playwright fraîche couvrant chaque rôle, les états de workflow, filtres/recherche, formulaires, erreurs, responsive et synchronisation intermodules.
- [ ] Vérifier les traductions et interactions en français, anglais et arabe/RTL pour les parcours métier.
- [ ] Vérifier limites de stockage `localStorage`, rechargement, remise à zéro et cohérence de date pour les retards/réunions à venir.
- [ ] Distinguer clairement dans l’interface les simulations locales des opérations persistées/validées.

## Conclusion

Le frontend fournit une maquette métier riche, avec plusieurs interactions réellement codées dans l’état local. Il ne couvre pas encore de façon exhaustive et démontrée tous les parcours annoncés : les lacunes les plus nettes concernent les rôles supplémentaires attendus, le workflow réunion/PV, les notifications automatiques, l’archivage/historique, la recherche plein texte et la persistance des pièces jointes. La validation navigateur reste nécessaire avant de conclure que les parcours sont utilisables.
