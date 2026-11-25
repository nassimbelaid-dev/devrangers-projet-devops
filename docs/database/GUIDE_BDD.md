# Guide BDD

Pour préparer un poste neuf, suivre le [guide d’installation](../setup.md). Pour intégrer l’application à la base, consulter le [guide backend](GUIDE_INTEGRATION_BACKEND.md).

## Architecture et fichiers

PostgreSQL 18.7 tourne dans le service Compose `db`. Il est publié sur `127.0.0.1:5433`, avec le volume nommé `postgres_data`. Prisma 7.10.1 accède à PostgreSQL via `@prisma/adapter-pg` et `pg`. Le singleton serveur se trouve dans [src/lib/prisma.ts](../../src/lib/prisma.ts). Le frontend de démonstration utilise encore ses fixtures.

| Fichier ou emplacement | Rôle |
|---|---|
| [compose.yaml](../../compose.yaml), [.env.example](../../.env.example) | Service Docker et modèle de configuration locale |
| [prisma.config.ts](../../prisma.config.ts), [schema.prisma](../../prisma/schema.prisma) | URL du CLI, chemin des migrations et du seed, modèles et génération du client |
| [prisma/migrations/](../../prisma/migrations/) | Six migrations SQL versionnées et historique appliqué enregistré dans `_prisma_migrations` |
| [prisma/seed.ts](../../prisma/seed.ts), [prisma/seed/data.ts](../../prisma/seed/data.ts) | Import transactionnel des fixtures et transformation historique |
| [scripts/db-check.ts](../../scripts/db-check.ts), [tests/database/](../../tests/database/) | Compteurs Prisma, rejeu et tests PostgreSQL isolés |
| `src/generated/prisma/` | Client généré et exclu de Git |

## Les 19 tables

| Domaine | Tables et rôle |
|---|---|
| Identité | `accounts` porte la connexion et le rôle. `account_profiles` porte les surcharges du profil. `members` est l’annuaire. `seats` représente les sièges. `mandates` décrit leurs occupations datées. |
| Réunions | `meetings` porte les séances. `meeting_participants` relie la réunion, le membre et son mandat avec la présence courante. `agenda_proposals` porte les points et leur revue. |
| Décisions et votes | `decisions` porte la provenance et l’état. `ballots` porte le scrutin, `ballot_votes` le bulletin par siège, `ballot_results` le résultat figé. `actions` porte le suivi avec responsable et décision facultative. |
| Documents et PV | `documents` porte la bibliothèque, `document_versions` ses versions, `stored_files` les métadonnées des pièces et `meeting_minutes` les PV et leur instantané. |
| Traçabilité | `notifications` est la boîte interne individuelle. `audit_events` est le journal append-only. |

Les cinq premières migrations créent les tables par domaine. La sixième installe les protections historiques. La structure comporte 33 FK, 29 `CHECK`, trois exclusions GiST via `btree_gist` et 16 triggers. Les exclusions empêchent les chevauchements incompatibles de mandats. Les triggers protègent l’audit, les scrutins, décisions définitives, PV signés et notifications. Les contraintes différées valident l’existence du résultat au commit. Voir les [règles d’intégrité](REGLES_INTEGRITE.md) et les [protections SQL](PROTECTIONS_SQL.md).

## Commandes disponibles

| Commande | Usage |
|---|---|
| `pnpm db:validate` | Valider le schéma Prisma |
| `pnpm db:format` | Formater le schéma Prisma |
| `pnpm db:generate` | Régénérer Prisma Client |
| `pnpm db:migrate:dev` | Développer et tester des migrations avec une base shadow |
| `pnpm db:migrate:deploy` | Appliquer les migrations versionnées en attente |
| `pnpm db:migrate:status` | Contrôler les migrations locales et appliquées |
| `pnpm db:studio` | Ouvrir Prisma Studio pour la cible locale configurée |
| `pnpm db:seed` | Charger les fixtures sur une base locale migrée |
| `pnpm db:check` | Vérifier la connexion et afficher les 19 compteurs |
| `pnpm db:check --json` | Afficher le nom de la base et les compteurs sous forme JSON |
| `pnpm db:test` | Rejouer migrations et seed sur une base vierge isolée, puis tester |

Le mode machine pur est `pnpm --silent db:check --json`. Avant d’ouvrir Studio, vérifier la cible avec ce mode. Studio peut écrire et les protections PostgreSQL s’appliquent. Pour consulter en lecture seule, utiliser des requêtes `SELECT` avec un compte dédié quand il sera disponible, ou démarrer une transaction `BEGIN READ ONLY` dans un client SQL. Éviter de sélectionner `password_hash` dans des exports. Le [guide du seed](SEED.md) détaille ses 84 lignes et son idempotence.

## Modifier ou récupérer une migration

1. Vérifier la branche, la cible locale et `pnpm db:migrate:status`.
2. Modifier `prisma/schema.prisma`, puis lancer `pnpm db:format` et `pnpm db:validate`.
3. Lancer `pnpm db:migrate:dev --create-only --name nom_explicite`. Relire le SQL et compléter, si nécessaire, les contraintes que Prisma ne représente pas. Pour une évolution purement SQL, créer le dossier de migration horodaté suivant avec `migration.sql` si le CLI ne produit pas de brouillon.
4. Appliquer et relire la migration sur une cible locale de développement avec `pnpm db:migrate:dev`. Vérifier le rejeu shadow, régénérer le client et adapter les tests de catalogue s’ils doivent suivre une évolution du contrat.
5. Partager ensemble le schéma, le SQL de migration et les tests concernés. Lorsqu’un collègue récupère cette évolution, il applique les migrations versionnées avec `pnpm db:migrate:deploy`, vérifie l’état, puis régénère le client.

`migrate dev` peut créer des migrations et détecter les dérives via la shadow database. `migrate deploy` applique les fichiers existants et ne vérifie pas cette dérive. Ne jamais réécrire une migration déjà appliquée ou partagée. En cas de divergence, arrêter, sauvegarder si nécessaire et convenir d’une correction dans une nouvelle migration. Éviter les propositions de reset sur une base qui contient des données à conserver. [Prisma Migrate](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)

## Bases de rejeu et persistance

La suite lit uniquement `TEST_DATABASE_URL`, vérifie la base de contrôle, crée chaque fois une base `comite_scientifique_test_<suffixe>` et laisse les bases créées pour inspection. Leur accumulation consomme le même volume Docker. Identifier la base exacte et son usage avant toute maintenance. Préférer une instance éphémère dédiée lors d’une future exécution CI. Éviter de supprimer les bases ou le volume d’un collègue. Voir [les tests BDD](TESTS_BDD.md).

Pour faire évoluer le modèle, consulter le [MCD](MCD.md), le [MLD](MLD.md) et le [dictionnaire des données](DICTIONNAIRE_DONNEES.md).

