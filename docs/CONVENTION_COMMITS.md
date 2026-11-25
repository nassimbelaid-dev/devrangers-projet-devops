# Convention des commits Git — Dev Rangers

**Projet :** Gestion du comité scientifique du département d'informatique  
**Périmètre :** frontend, backend, base de données, intégration, tests et DevOps.

Cette convention s'applique aux quatre membres de l'équipe. Elle vise à maintenir un historique Git clair, homogène et exploitable lors des revues de code et des releases.

## 1. Format obligatoire

Nous adoptons une convention inspirée de [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/), avec des descriptions en français.

```text
type(scope): description courte
```

Le périmètre (`scope`) est facultatif, mais recommandé lorsqu'un commit concerne un module précis.

```text
feat(reunions): ajouter la gestion des convocations internes
fix(votes): empêcher le double vote sur un même siège
docs: mettre à jour le guide d'installation
```

- Le type et le scope sont écrits en minuscules, sans accents ni espaces.
- Ne pas mettre d'espace avant les deux-points ; mettre un espace après.
- Rédiger la description en français, à l'infinitif, avec des accents si nécessaire.
- Commencer la description par une minuscule et ne pas ajouter de point final.
- Viser 72 caractères maximum pour la première ligne, sans sacrifier la clarté.
- Décrire ce que le commit change, et non simplement le fichier modifié.

> Cette convention remplace, pour les prochains commits, l'ancien format `feat : ...`. Il n'est pas nécessaire de réécrire l'historique existant.

## 2. Types de commits autorisés

| Type | Utilisation | Exemple |
| --- | --- | --- |
| `feat` | Ajouter une fonctionnalité ou un comportement métier | `feat(pv): ajouter la soumission pour signature` |
| `fix` | Corriger un bug ou une incohérence | `fix(mandats): empêcher le chevauchement des mandats` |
| `refactor` | Restructurer le code sans changer son comportement | `refactor(api): séparer les services métier des routes` |
| `style` | Modifier uniquement le formatage du code | `style(frontend): harmoniser le formatage Prettier` |
| `docs` | Ajouter ou modifier la documentation | `docs: documenter les rôles et permissions` |
| `test` | Ajouter ou modifier des tests | `test(votes): couvrir les règles de suppléance` |
| `build` | Modifier les dépendances ou le système de build | `build(deps): corriger une dépendance manquante` |
| `ci` | Modifier les pipelines d'intégration ou de déploiement | `ci: ajouter les vérifications sur les pull requests` |
| `chore` | Effectuer une tâche de maintenance sans changement fonctionnel | `chore: nettoyer les fichiers temporaires de QA` |
| `perf` | Améliorer les performances sans changer le comportement attendu | `perf(bdd): optimiser les requêtes des réunions` |
| `revert` | Annuler un commit antérieur | `revert: annuler la modification des filtres de réunion` |

**Attention :** `style` concerne le formatage du code (indentation, espaces, fins de ligne). Une correction visuelle de l'interface relève de `fix` ; une nouvelle fonctionnalité d'interface relève de `feat`.

## 3. Périmètres recommandés (scopes)

Utiliser un périmètre stable, correspondant au domaine principalement concerné.

| Scope | Domaine |
| --- | --- |
| `auth` | Authentification, sessions et déconnexion |
| `permissions` | Rôles, RBAC et autorisations |
| `utilisateurs` | Comptes utilisateurs |
| `membres` | Membres du comité et sièges |
| `mandats` | Mandats, titulaires et suppléants |
| `reunions` | Réunions, convocations et présences |
| `agenda` | Ordre du jour collaboratif |
| `votes` | Scrutins, quorum, majorité et résultats |
| `decisions` | Décisions du comité |
| `actions` | Suivi des actions et échéances |
| `documents` | Documents et pièces jointes |
| `pv` | Procès-verbaux, rédaction et signature |
| `archives` | Archivage et historique |
| `notifications` | Notifications internes et rappels |
| `dashboard` | Tableau de bord |
| `profil` | Profil utilisateur |
| `i18n` | Traductions FR/EN/AR et RTL |
| `ui` | Composants et interfaces partagés |
| `frontend` | Changements transversaux du frontend |
| `backend` | Changements transversaux du backend |
| `api` | Routes, contrats et intégration API |
| `bdd` | PostgreSQL, schéma, migrations et seeds |
| `docker` | Docker et Docker Compose |
| `deps` | Dépendances du projet |
| `qa` | Tests et assurance qualité |
| `devops` | Outillage DevOps transversal |

Si un commit concerne plusieurs modules pour une seule opération cohérente, choisir le scope principal ou omettre le scope. Ne pas multiplier les scopes dans le même en-tête.

## 4. Exemples adaptés au projet

Ces exemples illustrent la convention ; ils ne constituent pas un historique de commits effectivement réalisés.

### Frontend

```text
feat(notifications): ajouter le filtrage par catégorie
fix(ui): corriger la largeur des fenêtres modales
fix(i18n): corriger l'alignement des menus en RTL
refactor(documents): simplifier les composants de consultation
```

### Backend et intégration

```text
feat(auth): implémenter l'authentification serveur
feat(api): ajouter les routes de gestion des membres
fix(permissions): bloquer la signature des PV par les membres
feat(reunions): connecter le formulaire à l'API
refactor(backend): centraliser les validations métier
```

### Base de données

```text
feat(bdd): créer le schéma des réunions et des participants
feat(bdd): ajouter les migrations des mandats
fix(bdd): garantir l'unicité du vote par scrutin et par siège
feat(bdd): ajouter les données initiales de démonstration
```

### Tests et DevOps

```text
test(votes): vérifier le remplacement d'un titulaire absent
test(qa): couvrir le workflow de signature d'un PV
build(docker): conteneuriser l'application Next.js
build(docker): configurer PostgreSQL dans Docker Compose
ci: automatiser le lint, les tests et le build
ci: configurer le déploiement de l'environnement de staging
docs: ajouter les instructions d'installation Linux et Windows
chore: ignorer les rapports de tests générés
```

## 5. Commits complexes et changements incompatibles

Si la description courte ne suffit pas, ajouter un corps de message après une ligne vide pour expliquer la motivation et les conséquences du changement.

```text
fix(votes): figer les résultats à la clôture du scrutin

Conserver les résultats historiques afin qu'un changement de mandat
ou de siège ne modifie pas un scrutin déjà clôturé.

Refs: #42
```

`Refs: #42` associe le commit à une issue GitHub existante (numéro illustratif). Utiliser `Closes #42` seulement lorsque l'issue est réellement résolue et doit être fermée lors de l'intégration à la branche par défaut. Pour Trello, utiliser une référence ou un lien de carte lorsque pertinent, sans inclure d'informations sensibles.

Un changement incompatible dans un contrat API, une interface publique ou un schéma utilisé par l'équipe doit être signalé par `!` et expliqué dans un pied de message `BREAKING CHANGE:`.

```text
feat(api)!: modifier le contrat de création des scrutins

BREAKING CHANGE: le client doit désormais fournir l'identifiant
de la décision au lieu de son intitulé.
```

Prévenir les membres concernés avant d'intégrer ce type de changement. Pour une migration de base de données, documenter également les étapes nécessaires et les conséquences sur les données existantes.

## 6. Règles de collaboration

1. Un commit correspond à une modification logique et cohérente. Éviter de mélanger une fonctionnalité, un refactoring sans rapport et des corrections de formatage.
2. Faire des commits réguliers et compréhensibles, plutôt qu'un seul commit regroupant plusieurs jours de travail.
3. Vérifier la branche active et le diff avant chaque commit. Ne sélectionner que les fichiers concernés.
4. Vérifier le fonctionnement des modifications et exécuter les tests pertinents. Signaler explicitement les contrôles bloqués ou non exécutés dans la pull request.
5. Ne jamais commiter de secrets, de fichiers `.env` contenant des identifiants réels, de `node_modules/`, de `.next/`, ni d'artefacts de tests générés. Un `.env.example` sans secret peut être versionné.
6. Versionner les migrations, les fichiers de configuration nécessaires et le lockfile `pnpm-lock.yaml` lorsqu'une dépendance change.
7. Travailler sur la branche convenue pour la tâche et intégrer les changements via une pull request avec revue d'un autre membre. Ne pas pousser directement sur `main` ni réécrire l'historique partagé sans accord de l'équipe.
8. Si une pull request est fusionnée par squash, son message final doit respecter la même convention.

## 7. Commandes Git usuelles

Ces commandes fonctionnent sous Windows (PowerShell ou Git Bash) et sous Linux. Exemple pour une modification du module réunions :

```bash
git branch --show-current
git status
git diff
git add src/features/meetings/meetings-client.tsx
git diff --cached
git commit -m "fix(reunions): corriger la gestion des participants"
git push -u origin HEAD
```

Adapter le fichier sélectionné à la modification réelle. Ajouter individuellement les autres fichiers nécessaires au même commit. `git push -u origin HEAD` publie la branche courante ; vérifier sa destination avant de l'exécuter.

Pour un commit comportant un titre et une explication :

```bash
git commit -m "fix(votes): figer les résultats des scrutins" -m "Empêcher les modifications de mandat de recalculer un résultat clôturé."
```

## 8. Messages à éviter

| À éviter | À utiliser |
| --- | --- |
| `update` | `fix(reunions): corriger la date de convocation` |
| `modification du code` | `refactor(api): extraire la logique de validation` |
| `bug corrigé` | `fix(auth): corriger la redirection après connexion` |
| `feat : ajout` | `feat(actions): ajouter les rappels d'échéance` |
| `final version` | `docs: finaliser le guide de démonstration` |
| `backend + front + fixes` | Plusieurs commits distincts et explicites |

## 9. Checklist avant un commit

- [ ] Je suis sur la bonne branche.
- [ ] Le commit correspond à une modification cohérente.
- [ ] Le diff ne contient aucun secret, fichier généré ou changement sans rapport.
- [ ] Les vérifications pertinentes ont été effectuées, ou leurs blocages sont identifiés.
- [ ] Le type et le scope correspondent à la modification.
- [ ] La description est claire, courte et en français.

## 10. Application de la convention

La convention s'applique aux nouveaux commits dès son adoption par l'équipe. Aucun outil supplémentaire n'est obligatoire. Un contrôle automatisé des messages (par exemple Commitlint) pourra être ajouté ultérieurement si l'équipe le juge utile.

**Format à retenir :** `type(scope): description en français`
