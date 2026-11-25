# Gestion du comité scientifique — Dev Rangers

Application Next.js pour le suivi des réunions, décisions, actions et documents du comité.

## Installation

Le [guide d’installation](docs/setup.md) couvre le clonage, Docker Compose, Prisma et les tests.

## Interface de démonstration

Le frontend utilise les fixtures du navigateur et une connexion statique. Utiliser les indications de la page de connexion pour la démonstration. Les comptes PostgreSQL seront utilisés après intégration du backend.

- `/fr` — français, langue par défaut.
- `/en` — anglais.
- `/ar` — arabe avec affichage RTL.

Le sélecteur conserve la page courante et la préférence dans le cookie `settings`. Le shell charge les dictionnaires depuis `src/data/dictionaries/`. La déconnexion est accessible dans le menu utilisateur.

## Base de données

PostgreSQL 18.7 est lancé avec Docker Compose sur `127.0.0.1:5433`. Prisma ORM 7.10.1 et son adaptateur PostgreSQL donnent accès aux 19 tables. Six migrations versionnées installent la structure et les protections historiques.

| Commande | Usage |
|---|---|
| `pnpm db:migrate:deploy` | Appliquer les migrations versionnées |
| `pnpm db:generate` | Générer Prisma Client |
| `pnpm db:seed` | Charger les données de démonstration |
| `pnpm db:check` ou `pnpm db:check --json` | Vérifier la connexion et les compteurs |
| `pnpm db:test` | Rejouer les migrations et tester une base isolée |

- [Guide BDD](docs/database/GUIDE_BDD.md) et [guide backend](docs/database/GUIDE_INTEGRATION_BACKEND.md).
- [Analyse](docs/database/ANALYSE_DES_DONNEES.md), [MCD](docs/database/MCD.md), [MLD](docs/database/MLD.md), [dictionnaire](docs/database/DICTIONNAIRE_DONNEES.md) et [règles d’intégrité](docs/database/REGLES_INTEGRITE.md).
- [Protections SQL](docs/database/PROTECTIONS_SQL.md), [seed](docs/database/SEED.md) et [tests BDD](docs/database/TESTS_BDD.md).
