# Revue de cohérence entre le frontend et la BDD

Frontend vérifié au commit `4eb461b` · Revue statique des sources, du schéma et des six migrations.

**Verdict.** Le développement backend peut commencer sur le schéma actuel. Les droits confirmés relèvent des services et de leurs tests. Les arbitrages ouverts conditionnent seulement les contrats concernés. La section 5 rend compte de la recette actuelle du frontend statique.

## 1. Règles confirmées

| Référence | Règle à appliquer |
| --- | --- |
| `MET-07` | Seul le secrétaire annule une réunion `PLANNED` en la passant à `CANCELLED`, sans nouvel attribut. Les comptes actifs des participants déjà convoqués reçoivent un avis interne. |
| `MET-08` | Le président seul approuve ou rejette les propositions d’une réunion planifiée, y compris celles déposées par le secrétaire. Tout rejet exige un motif non vide après retrait des espaces en début et en fin. Seul l’auteur peut retirer sa proposition non validée et non référencée tant que la réunion est planifiée. Le service dérive le relecteur de l’identité authentifiée. Seuls les points validés constituent l’ordre du jour officiel et seul le président peut les réordonner tant que la réunion est planifiée. |
| `MET-11` | Le président seul crée une décision `PENDING` en cours de séance. Une proposition éventuellement liée appartient à la même réunion. |
| `MET-18` | Président et secrétaire ont les mêmes droits de création, édition, attribution, réattribution et suppression des actions selon les règles de conservation. Ils gèrent les champs existants, dont titre, description, responsable, échéance, priorité et décision liée. Toute suppression d’une action figurant dans un PV signé est interdite, même après archivage du PV. |
| `MET-19` | Président et secrétaire peuvent changer le statut et l’ordre de toute carte Kanban. Le rôle `MEMBER` peut seulement changer le statut de sa propre action. Le service calcule les rangs nécessaires. |
| `MET-20` et `MET-25` | Seul le secrétaire peut créer un document, modifier un document non archivé et y déposer une nouvelle version. Le secrétaire seul valide un document ordinaire par la transition directe `DRAFT` → `APPROVED` et attribue ou modifie la visibilité des documents non archivés parmi `COMMITTEE`, `PRESIDENCY` et `ARCHIVES`. Aucun rôle ne peut supprimer un document par une opération ordinaire. Seul l’archiviste peut archiver les documents éligibles. |
| `MET-30` | Seul l’administrateur technique consulte le journal d’audit dans une liste en lecture seule. Aucun rôle ne peut modifier ni supprimer les événements. |
| Consultation | Maintenir le périmètre d’invitation et les accès métier autorisés pour les réunions. Pour les scrutins, exposer le vote propre et les résultats agrégés autorisés, sans choix nominatifs d’autrui. |
| Archives | Préserver la recherche normalisée par casse, accents et ponctuation et le fonctionnement du filtre « Procès-verbal » sur les entrées PV. Les droits de lecture restent applicables aux résultats et aux extraits. |

Les FK, unicités, exclusions, `CHECK` et triggers historiques existants restent la référence de persistance. Les droits ci-dessus n’exigent aucune nouvelle colonne ou relation.

## 2. Corrections documentaires

| Source | Correction ciblée |
| --- | --- |
| [Rôles et permissions](ROLES_ET_PERMISSIONS.md) | Matrice et recette alignées sur les droits confirmés. Extension du président signalée comme travail frontend restant. Recherche d’archives acquise distinguée du plein texte futur. |
| [MCD](database/MCD.md) et [MLD](database/MLD.md) | Ancienne autorisation de création de décision par le secrétaire retirée. Gestion des actions étendue au président. Revue de l’agenda du secrétaire explicitée. |
| [Règles d’intégrité](database/REGLES_INTEGRITE.md) et [guide d’intégration](database/GUIDE_INTEGRATION_BACKEND.md) | Contrats métier et frontières transactionnelles alignés, notamment pour l’annulation, le retrait de proposition, la suppression d’action, les documents et l’audit. |
| [Architecture actuelle](ARCHITECTURE.md) et [architecture backend](ARCHITECTURE_BACKEND.md) | État observé de la maquette, capacités de l’API cible et parité de recherche précisés. Droits confirmés retirés de la liste des arbitrages. |
| [Analyse des données](database/ANALYSE_DES_DONNEES.md) | Note ajoutée vers les règles actuelles. Les constats du commit analysé `9fde791` restent la trace de l’étude initiale. |

Le [scénario PDF](Simulation_Workflow_Comite_Scientifique.pdf) donne déjà la création des décisions au président et prévoit un acteur autorisé pour les actions. Le [dictionnaire des données](database/DICTIONNAIRE_DONNEES.md) précise l’obligation du motif pour un rejet, contrôlée par le service. Les guides d’exploitation, le seed et les tests BDD décrivent les structures et protections livrées.

## 3. Différences normales de représentation

Les priorités ci-dessous indiquent le moment de traitement. **P0** avant la première intégration du périmètre concerné, **P1** dans son lot de développement, **P2** après validation du besoin ou en durcissement. Un écart de représentation seul ne déclenche aucun chantier de correction.

| Écart | Solution | Responsable · priorité · moment |
| --- | --- | --- |
| Fixtures et stockage local d’un côté, données PostgreSQL partagées de l’autre | Conserver les fixtures pour la démonstration. Raccorder les écrans aux données réelles lors de la bascule. | Frontend et backend · P1 · intégration par domaine |
| IDs locaux, libellés FR, chaînes vides et dates affichées | Adapter UUID, enums, `null`, dates civiles, heures et instants via les DTO. Conserver les libellés localisés. | Backend et frontend · P0 · contrat DTO |
| Profil local, compte avec copie du siège et fiche à un mandat | Lire les surcharges du profil et distinguer les adresses de connexion, d’annuaire et de contact. Exposer le siège et le mandat à la date utile, ainsi que l’historique. La simulation de suppléance reste une aide de l’interface. | Backend et frontend · P1 · comptes et comité |
| Listes embarquées dans réunion, scrutin et PV brouillon | Construire les projections à partir des participations et des propositions approuvées. Conserver la distinction présence inconnue/absence et utiliser les captures pour l’historique. | Backend · P1 · réunions puis scrutins et PV |
| Bibliothèque, versions, pièces d’agenda, PV métier et écran Archives | Agréger les objets par lecture. Conserver les rattachements existants et la distinction entre la catégorie documentaire « Procès-verbal » et l’entité `MeetingMinutes`. | Backend · P1 · documents et archives |
| Booléens de notification, navigation locale, retard et statistiques calculés | Projeter les horodatages, les cibles typées et les valeurs dérivées dans les DTO. Calculer les agrégats après application des droits. | Backend et frontend · P1 · notifications et tableau de bord |
| Fixtures incompatibles avec certaines contraintes historiques | Conserver la reprise documentée. `d3`, `doc4`/`v5` et `sample-a2` sont exclus pour les motifs indiqués dans le seed. `d2` et `d4` portent `HISTORICAL_IMPORT`. Les captures reconstituées, binaires absents et instants inconnus restent lisibles comme tels. | BDD et backend · P1 · recette avec le [seed livré](database/SEED.md) |

## 4. Règles à implémenter dans le backend

| Écart ou tâche | Solution | Responsable · priorité · moment |
| --- | --- | --- |
| Connexion et permissions locales | Valider une session serveur, recharger le compte actif et autoriser chaque opération selon son rôle, l’objet et son état. Sérialiser les mutations du dernier admin actif. Préserver les références des comptes désactivés. | Backend · P0 · socle identité |
| Mandats et participants | Résoudre le mandat à la date de séance, revalider les participations planifiées lors d’une correction et protéger les mandats historiques. Appliquer les exclusions SQL existantes. | Backend · P0 · comité et réunions |
| Transitions et convocations | Vérifier dates, horaires et préconditions de démarrage et clôture. Enregistrer la convocation, ses destinataires actifs et l’audit dans une transaction. Enregistrer l’annulation et ses avis aux participants déjà convoqués dans une transaction. Distinguer relance technique et renvoi volontaire. | Backend · P0 · workflow réunions |
| Écritures d’agenda multiples et règles de revue | Utiliser le même service depuis Réunions et Agenda. Vérifier l’auteur, la réunion planifiée, le relecteur président et les références avant retrait. Réserver le retrait d’un point non validé à son auteur. Exiger un motif non vide pour chaque rejet et réserver au président le réordonnancement des seuls points validés. Couvrir validation et rejet des propositions du secrétaire. | Backend · P0 · agenda |
| Création, provenance et archivage de décision | Appliquer `MET-11`, vérifier réunion et point lié, allouer ou valider la référence canonique et dériver la provenance finale du scrutin ou de l’import contrôlé. Archiver selon le trigger existant. | Backend · P0 · décisions |
| Vote, suppléance et quorum | Dériver la provenance du vote depuis la session et les données de séance. Invalider les votes devenus inéligibles en changeant la présence, calculer les compteurs et figer le résultat avant `CLOSED`. Conserver les scrutins clos. | Backend · P0 · scrutins et tests de concurrence |
| Actions et Kanban | Appliquer `MET-18` et `MET-19`, contrôler la décision adoptée et l’échéance compatible, séparer le statut personnel des autres champs, refuser la suppression d’une action présente dans un PV signé ou archivé, réordonner les cartes transactionnellement et notifier les changements d’affectation. | Backend · P0 · actions |
| Fichiers, auteurs et versions | Vérifier type, taille et nombre de fichiers, stocker les binaires en privé, contrôler le téléchargement, numéroter les versions sous concurrence et tracer l’auteur. Réserver au secrétaire la validation directe et l’attribution de la visibilité documentaire sans étendre les lectures. Traiter explicitement les binaires historiques absents et les échecs entre stockage et SQL. | Backend et DevOps · P0 · avant les dépôts réels |
| PV et archives | Construire la capture à la soumission. Mettre à jour PV et réunion ensemble à la signature. Utiliser la capture pour la lecture, l’impression et la recherche du PV signé. Appliquer les commandes d’archivage, la visibilité et la recherche normalisée avec le filtre PV. | Backend et frontend · P0 pour la signature, P1 pour la recherche · lots PV et archives |
| Notifications, rappels et audit | Écrire les effets avec la mutation, dédupliquer par occurrence et destinataire, filtrer les retraits, vérifier l’accès à la cible et planifier les rappels côté serveur dans le fuseau du comité. Alimenter `AuditEvent` sans contenu sensible. Fournir une liste en lecture seule réservée à l’administrateur technique. | Backend et DevOps · P1 · notifications, avec audit dès les premières mutations |
| Lectures et agrégats | Partager les prédicats d’accès entre listes, détails, téléchargements, recherches et compteurs. Dissocier le total des prochaines réunions de l’extrait limité à trois. | Backend et frontend · P1 · intégration des lectures |

## 5. État du frontend statique

La recette du magasin local couvre les cinq rôles, avec les comptes titulaire et suppléant. Elle vérifie l’annulation avec et sans convocation, la revalidation des mandats, les droits de revue et de retrait de l’agenda, les mutations des actions, la projection du vote propre, la validation et la visibilité documentaires ainsi que l’archivage. Elle vérifie également la stabilité du PV signé et l’écriture des événements d’audit. [Scénario de recette](../qa/frontend.test.ts)

Les 42 tests Chromium sur le build de production ont réussi sur desktop, tablette et mobile. Ils vérifient notamment l’accès direct au journal par rôle et la persistance de l’annulation et des événements après rechargement. Une vérification ciblée a également réussi sur les trois formats pour les libellés anglais et l’affichage arabe en RTL. [Recette navigateur](../qa/e2e/committee.spec.ts)

Le tableau conserve les anomalies observées à la révision de référence.

| Anomalie observée | Solution et vérification | Responsable · priorité · moment |
| --- | --- | --- |
| Le président crée et déplace les actions, mais le magasin refuse ses autres modifications et sa suppression. L’écran regroupe plusieurs boutons sous `canManageActions`. | Aligner les capacités et les gardes d’édition et de suppression dans `static-auth.ts`, `demo-store.ts` et `decisions-actions-client.tsx`. Distinguer création, édition, suppression, déplacement et changement personnel de statut. Vérifier les deux rôles de gestion et les refus pour un membre non affecté ou modifiant un autre champ. | Frontend et QA · P0 · prochain correctif statique |
| Les écritures Agenda et Réunions n’appliquent pas toutes les mêmes gardes sur le retrait et les points après démarrage. | Unifier les contrôles d’auteur, d’état de réunion, d’état de proposition et de références dans les deux parcours. Tester validation et rejet des propositions du secrétaire sans altérer le contenu de la proposition. | Frontend et QA · P1 · avant recette agenda |
| Une correction locale de mandat peut laisser une participation d’une réunion planifiée hors période. | Revalider les réunions concernées lors de la correction ou bloquer la correction avec un motif. Reprendre le même contrôle à l’intégration serveur. | Frontend et QA · P1 · avant recette comité et réunions |
| Le message d’un conflit de décision propose de rouvrir un scrutin alors que le parcours et la protection SQL l’interdisent. | Afficher le résultat définitif et le motif de blocage sans quorum. Tester l’impossibilité de modifier un scrutin clos. | Frontend et QA · P1 · recette des votes |
| Le formulaire d’archivage du PV signé affiche un succès avant confirmation, puis le moteur refuse la transition. L’archivage d’une décision locale ne vérifie pas toujours l’état de sa réunion. | Utiliser des commandes dédiées, propager le résultat réel, aligner les préconditions sur les triggers et vérifier que le contenu signé est intact. | Frontend et QA · P0 · avant recette d’archivage |
| Des compteurs ignorent les filtres d’accès et le total des réunions à venir plafonne à trois. L’impression et la recherche du PV peuvent relire des données courantes. | Corriger les compteurs visibles et raccorder les projections autorisées à l’intégration. Vérifier que la recherche normalisée et le filtre « Procès-verbal » continuent à fonctionner, même si la lecture du PV bascule vers l’instantané. | Frontend et QA · P1 · lots archives et tableau de bord |

## 6. Évolutions BDD

| Évolution | Justification, impact et stratégie | Responsable · priorité · moment |
| --- | --- | --- |
| Droits confirmés et parité de recherche | Aucune évolution requise. Les rôles, liens, états, rangs et instantanés existent. Réutiliser les colonnes et protections livrées. | BDD et backend · P0 · revue des contrats |
| Sessions persistées, si la proposition PostgreSQL est retenue | Une session révocable a besoin d’un stockage durable. Ajouter une table technique dans une **nouvelle** migration, avec FK vers le compte, condensat unique et indexes de compte/expiration. Préserver les comptes existants et vérifier création, révocation, expiration, rejeu et attentes des tests de catalogue. | BDD et backend · P0 pour ce choix · après arbitrage Auth, avant intégration de la connexion |
| Besoins métier encore ouverts | Un second scrutin par décision ou le lien direct document–point modifieraient les relations actuelles. Une recherche plein texte indexée ou une unicité insensible à la casse en SQL peut nécessiter une migration ciblée. Démontrer le besoin, contrôler les données et collisions existantes, puis tester compatibilité et rejeu d’une migration additive ou d’une transition dédiée. | BDD avec produit et backend · P2 · après validation du besoin |

## 7. Arbitrages à valider

| Décision restante | Proposition ou point à trancher | Responsable · priorité · moment |
| --- | --- | --- |
| Authentification et exploitation | Approuver les sessions opaques PostgreSQL ou la solution retenue, leurs durées et la révocation. Prévoir le rôle SQL d’exécution et le lien avec le déploiement. | Équipe, backend et DevOps · P0 · avant la connexion réelle |
| Règles de séance et vote | Valider le traitement des sièges vacants, seuils et leur modification, décisions sans quorum, éventuel second tour, conservation des mandats. Le premier lot conserve les protections SQL actuelles. | Équipe métier et backend · P0 · avant les contrats de vote et de séance |
| Visibilité et conservation | Préciser les lectures des propositions non validées, des résultats agrégés, des archives et des profils dans les périmètres existants. Préciser les retraits de membres, mandats ou pièces, le motif de correction du PV et les autres règles de conservation des actions qui ne figurent dans aucun PV signé. | Équipe métier et backend · P0 · avant publication des routes concernées |
| Références et historique | Confirmer format, saisie ou génération des nouvelles références, capture officielle, éventuel avis de publication distinct et critères d’archivage documentaire. | Équipe métier, backend et BDD · P1 · avant les écritures de décision et de PV |
| Notifications, stockage et recherche avancée | Confirmer ciblage par rôle, fenêtres de rappel, stockage privé, formats de fichiers et lien document–point. Distinguer la recherche actuelle à préserver d’un éventuel plein texte indexé. | Équipe, backend et DevOps · P1 · avant rappels et dépôts réels. P2 pour la recherche avancée |

La séquence recommandée commence par les contrats, les contrôles d’accès et les services d’agenda, de décision et d’actions. La validation des choix techniques se fait avant l’implémentation de chaque dépendance concernée. [Architecture backend](ARCHITECTURE_BACKEND.md) · [Schéma Prisma](../prisma/schema.prisma) · [Protections SQL](database/PROTECTIONS_SQL.md)
