# Tests automatisés PostgreSQL

`pnpm db:test` lance Node Test Runner via tsx. Les tests utilisent PostgreSQL et Prisma Client réels. Aucun service métier, pipeline CI ou paquet supplémentaire n’est nécessaire.

## Préparation et exécution

Depuis la racine du dépôt, créer le fichier privé `.env` à partir de `.env.example` au premier clonage, puis renseigner les paramètres Compose. Ajouter ou compléter cette ligne dans `.env` avec le mot de passe PostgreSQL local encodé pour une URL.

```dotenv
TEST_DATABASE_URL=postgresql://comite_dev:MOT_DE_PASSE_ENCODE@localhost:5433/comite_scientifique_test
```

La suite charge `.env` automatiquement au démarrage. `.env.local` est utilisé par le frontend et ne suffit pas pour ce script. Une variable PowerShell déjà définie prime sur le fichier. Si une ancienne valeur est présente dans le terminal, la retirer avec `Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue` pour utiliser `.env`. Git ignore ce fichier et `.env.example` contient une valeur vide.

Démarrer le conteneur et préparer une seule fois la base de contrôle. Cette commande PowerShell fonctionne également si la base existe déjà.

```powershell
docker compose up -d --wait db
@'
SELECT 'CREATE DATABASE comite_scientifique_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'comite_scientifique_test')
\gexec
'@ | docker compose exec -T db psql -X -v ON_ERROR_STOP=1 -U comite_dev -d postgres
```

Après `pnpm install --frozen-lockfile`, générer Prisma Client puis lancer les tests. Les exécutions suivantes se résument à `pnpm db:test` tant que Docker est démarré.

```bash
pnpm db:generate
pnpm exec tsc -p tests/database/tsconfig.json --noEmit
pnpm db:test
```

La suite exige une URL PostgreSQL explicite vers `comite_scientifique_test`, sur l’interface locale et le port 5433, avec le compte `comite_dev`. Elle refuse la base de développement, les hôtes distants, les options d’URL et `NODE_ENV=production`. PostgreSQL confirme le nom, le rôle, le port interne et l’absence de réplication avant la préparation. La suite ne lit jamais `DATABASE_URL` comme solution de repli.

Le test de Prisma Client utilise `db:check --json`. Il compare le nom de la base renvoyé par PostgreSQL et les 20 compteurs (19 tables métier et une table technique) à des lectures SQL indépendantes de la base de rejeu.

Chaque exécution crée une base vérifiée vide à partir de `template0`, nommée `comite_scientifique_test_<suffixe>`. Les sept migrations sont rejouées et le seed reçoit une valeur aléatoire propre au test, transmise aux sous-processus. Les bases de rejeu sont conservées pour inspection, y compris les données des scénarios qui nécessitent un vrai `COMMIT`. La suite ne supprime aucune base ni volume. Sur un runner éphémère, la disparition de l’instance suit le cycle de vie du runner.

## Organisation et couverture

| Fichier | Couverture |
|---|---|
| `environment.ts`, `fixtures.ts` | Isolation, vérification de la cible, migrations et seed. Connexions fermées systématiquement, transactions annulées et savepoints pour les refus attendus. |
| `suite.test.ts` | 19 tables métier, une table technique, sept migrations terminées et leurs empreintes, PK/FK, index, 29 `CHECK` métier et deux techniques, trois exclusions, `btree_gist` et 16 triggers. Colonnes de la table des sessions, vérification du seed et de son idempotence, scrypt, refus en production et lecture des 20 modèles avec Prisma Client. |
| `domains.ts` | Comptes, membres, sièges, mandats, réunions et agenda. Provenance, unicités, quorum et majorité des scrutins, actions autonomes. Versions documentaires, fichiers exclusifs, PV, déduplication, cibles polymorphes et références d’audit. |
| `sessions.ts` | Relation obligatoire au compte avec FK restrictive, sessions multiples, révocation ciblée, unicité globale de l’empreinte, format hexadécimal et expiration finie strictement postérieure à la création. |
| `history.ts` | Audit append-only, immutabilité des décisions, scrutins, votes, résultats et PV, archivage et retrait. Refus au `COMMIT` des deux états incohérents d’un scrutin, clôture transactionnelle légitime et deux ordres possibles de concurrence avec le vote. |

Les refus attendus sont vérifiés par SQLSTATE et, pour les contraintes nommées, par nom de contrainte lorsque pertinent. Les tests courants annulent leurs modifications. Les scénarios à validation réelle utilisent des références de fixture distinctes dans la base de rejeu. Les tests concurrents attendent un blocage observé dans PostgreSQL et disposent de délais de connexion, de verrou et de requête.

## Résultats de validation

| Exécution | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Six premières migrations, deux passages sur des bases vierges (par passage) | 24 | 0 | 0 |
| Sept migrations avec les sessions, PostgreSQL 18.7 | 27 | 0 | 0 |

Après le rejeu des sept migrations sur une base vierge, le seed a inséré 84 lignes. Sa réexécution a inséré zéro ligne et l’empreinte du contenu est restée identique. La table technique est vide après le seed. `db:validate`, `db:generate`, `db:migrate:status`, `db:check` et le contrôle TypeScript ciblé ont réussi. Sur la base de développement, les sept empreintes des migrations concordent avec l’historique PostgreSQL et l’empreinte du contenu des 19 tables métier est identique avant et après l’intervention.

## Privilèges et limites

Les tests soumettent `TRUNCATE` sur les sept tables protégées et un `TRUNCATE accounts CASCADE`. Les triggers doivent refuser ces opérations ordinaires, même avec le compte local qui en a le privilège. Ils ne constituent pas une protection contre le DDL privilégié. Le propriétaire peut modifier les objets et le superutilisateur dispose de moyens de contourner les triggers. Aucun contournement n’est exécuté par la suite. La séparation des rôles de migration et d’exécution reste à qualifier avant déploiement.

Restent à tester avec le futur backend : permissions et ciblage, dernier administrateur actif, revalidation des mandats et présence à la date de réunion, priorité du titulaire et invalidation de votes, contenu réel des instantanés, orchestration de la clôture et de la signature, validité des actions liées hors seed, visibilité et persistance physique des fichiers, filtrage des notifications, planificateur et exclusion des secrets de l’audit. Les tests actuels couvrent les invariants SQL et la cohérence des fixtures importées.

## Future CI/CD

Utiliser une instance PostgreSQL 18.7 éphémère avec `btree_gist`, exposée en loopback sur 5433, et un compte de test `comite_dev` capable de créer une base. Créer la base de contrôle, fournir `TEST_DATABASE_URL` via les secrets du runner, installer avec le lockfile et générer Prisma Client. Exécuter le contrôle TypeScript ciblé et `pnpm db:test`. Un échec du runner de tests ou de la préparation retourne un code non nul. Aucun identifiant de développement ou de production ne doit être fourni au job.
