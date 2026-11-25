# Tests automatisés PostgreSQL

`pnpm db:test` lance Node Test Runner via tsx. Les tests utilisent PostgreSQL et Prisma Client réels. Aucun service métier, pipeline CI ou paquet supplémentaire n’est nécessaire.

## Préparation et exécution

1. Démarrer PostgreSQL avec `docker compose up -d db`.
2. Créer une fois la base de contrôle dédiée si elle n’existe pas. Avec les outils PostgreSQL locaux, `createdb -h 127.0.0.1 -p 5433 -U comite_dev comite_scientifique_test` demande le mot de passe au besoin. Si cette base existe déjà, la conserver.
3. Définir `TEST_DATABASE_URL` dans l’environnement du processus ou dans le fichier privé `.env`. Utiliser la même connexion locale que pour Docker avec la base `comite_scientifique_test`. Le modèle à remplir figure dans `.env.example`.
4. Générer Prisma Client puis lancer les tests.

```bash
pnpm db:generate
pnpm exec tsc -p tests/database/tsconfig.json --noEmit
pnpm db:test
```

La suite exige une URL PostgreSQL explicite vers `comite_scientifique_test`, sur l’interface locale et le port 5433, avec le compte `comite_dev`. Elle refuse la base de développement, les hôtes distants, les options d’URL et `NODE_ENV=production`. PostgreSQL confirme le nom, le rôle, le port interne et l’absence de réplication avant la préparation. La suite ne lit jamais `DATABASE_URL` comme solution de repli.

Chaque exécution crée une base vérifiée vide à partir de `template0`, nommée `comite_scientifique_test_<suffixe>`. Les six migrations sont rejouées et le seed reçoit une valeur aléatoire propre au test, transmise aux sous-processus. Les bases de rejeu sont conservées pour inspection, y compris les données des scénarios qui nécessitent un vrai `COMMIT`. La suite ne supprime aucune base ni volume. Sur un runner éphémère, la disparition de l’instance suit le cycle de vie du runner.

## Organisation et couverture

| Fichier | Couverture |
|---|---|
| `environment.ts`, `fixtures.ts` | Isolation, vérification de la cible, migrations et seed. Connexions fermées systématiquement, transactions annulées et savepoints pour les refus attendus. |
| `suite.test.ts` | 19 tables, six migrations terminées et checksums, PK/FK, index, 29 `CHECK`, trois exclusions, `btree_gist` et 16 triggers. Vérifications des données du seed, idempotence, scrypt, refus en production et lecture des 19 modèles avec Prisma Client. |
| `domains.ts` | Comptes, membres, sièges, mandats, réunions et agenda. Provenance, unicités, quorum et majorité des scrutins, actions autonomes. Versions documentaires, fichiers exclusifs, PV, déduplication, cibles polymorphes et références d’audit. |
| `history.ts` | Audit append-only, immutabilité des décisions, scrutins, votes, résultats et PV, archivage et retrait. Refus au `COMMIT` des deux états incohérents d’un scrutin, clôture transactionnelle légitime et deux ordres possibles de concurrence avec le vote. |

Les refus attendus sont vérifiés par SQLSTATE et, pour les contraintes nommées, par nom de contrainte lorsque pertinent. Les tests courants annulent leurs modifications. Les scénarios à validation réelle utilisent des références de fixture distinctes dans la base de rejeu. Les tests concurrents attendent un blocage observé dans PostgreSQL et disposent de délais de connexion, de verrou et de requête.

## Résultats de validation

| Exécution finale | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| Premier passage sur base vierge | 24 | 0 | 0 |
| Second passage sur une autre base vierge | 24 | 0 | 0 |

Chaque passage a rejoué six migrations, inséré 84 lignes, puis vérifié une réexécution du seed sans écriture. `db:validate`, `db:generate`, `db:migrate:status`, `db:check` et le contrôle TypeScript ciblé ont réussi. Le lancement sans `TEST_DATABASE_URL` a été refusé. L’empreinte du contenu des 19 tables de développement, calculée en lecture seule, est identique avant et après. Les essais initiaux ont permis d’isoler deux erreurs dans les données et requêtes de test. La suite corrigée confirme les contraintes visées sans modification SQL.

## Privilèges et limites

Les tests soumettent `TRUNCATE` sur les sept tables protégées et un `TRUNCATE accounts CASCADE`. Les triggers doivent refuser ces opérations ordinaires, même avec le compte local qui en a le privilège. Ils ne constituent pas une protection contre le DDL privilégié. Le propriétaire peut modifier les objets et le superutilisateur dispose de moyens de contourner les triggers. Aucun contournement n’est exécuté par la suite. La séparation des rôles de migration et d’exécution reste à qualifier avant déploiement.

Restent à tester avec le futur backend : permissions et ciblage, dernier administrateur actif, revalidation des mandats et présence à la date de réunion, priorité du titulaire et invalidation de votes, contenu réel des instantanés, orchestration de la clôture et de la signature, validité des actions liées hors seed, visibilité et persistance physique des fichiers, filtrage des notifications, planificateur et exclusion des secrets de l’audit. Les tests actuels couvrent les invariants SQL et la cohérence des fixtures importées.

## Future CI/CD

Utiliser une instance PostgreSQL 18.7 éphémère avec `btree_gist`, exposée en loopback sur 5433, et un compte de test `comite_dev` capable de créer une base. Créer la base de contrôle, fournir `TEST_DATABASE_URL` via les secrets du runner, installer avec le lockfile et générer Prisma Client. Exécuter le contrôle TypeScript ciblé et `pnpm db:test`. Un échec du runner de tests ou de la préparation retourne un code non nul. Aucun identifiant de développement ou de production ne doit être fourni au job.
