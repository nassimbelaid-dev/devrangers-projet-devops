# Installer le projet Gestion du comité scientifique

Ce guide prépare Next.js et la base PostgreSQL de Dev Rangers. Le frontend et sa connexion statique utilisent encore les fixtures du navigateur. L’intégration serveur est décrite dans le [guide backend](database/GUIDE_INTEGRATION_BACKEND.md).

## 1. Installer les prérequis

| Outil | Version vérifiée ou attendue |
|---|---|
| Git | Version stable |
| Node.js | 22 LTS, vérifié avec 22.23.2 |
| pnpm | 10.8.1, fixé dans `package.json` |
| Docker | Docker Desktop sous Windows, Docker Engine et plugin Compose sous Linux |
| Dépendances du projet | Next.js 15.2.8, React 19.1.3, TypeScript 5.9.3 et Prisma ORM 7.10.1 |
| PostgreSQL | 18.7, fourni par le conteneur |

Démarrer Docker Desktop ou le moteur Docker. Activer WSL2 si le moteur Windows l’exige. Sous WSL, garder un checkout distinct de celui de Windows pour éviter de partager `node_modules`. Si PowerShell bloque `pnpm.ps1`, utiliser `pnpm.cmd`. VS Code et pgAdmin sont facultatifs. [Node.js](https://nodejs.org/en/download) · [pnpm](https://pnpm.io/installation) · [Docker Desktop](https://docs.docker.com/desktop/) · [Docker Engine](https://docs.docker.com/engine/install/)

```powershell
git --version
node --version
pnpm --version
docker compose version
```

## 2. Cloner le dépôt

Remplacer le marqueur par l’URL du dépôt de l’équipe. Avant fusion, utiliser la branche de livraison. Une fois la base intégrée à `main`, cloner la branche convenue.

```powershell
git clone --branch feat/integration-bdd "<URL_DU_DEPOT>"
Set-Location devrangers-projet-devops
```

## 3. Installer les dépendances

```powershell
pnpm install --frozen-lockfile
```

Lancer les commandes suivantes à la racine du dépôt.

## 4. Configurer les fichiers d’environnement

```powershell
if (-not (Test-Path -LiteralPath .env)) {
  Copy-Item -LiteralPath .env.example -Destination .env
}
```

- `.env.example` est le modèle versionné sans secret réel.
- `.env` est privé et ignoré par Git. Compose, Prisma CLI et les tests le chargent depuis la racine.
- `.env.local` est privé. Next.js l’utilise pour ses surcharges et le seed peut y chercher `SEED_DEMO_PASSWORD` en dernier recours. Les tests BDD lisent `TEST_DATABASE_URL` dans le processus ou `.env`.
- Les variables du processus priment. Garder les identifiants côté serveur et hors des variables `NEXT_PUBLIC_*`.

## 5. Configurer PostgreSQL

Compléter le bloc PostgreSQL dans `.env` en gardant les autres paramètres locaux.

```dotenv
POSTGRES_DB=comite_scientifique
POSTGRES_USER=comite_dev
POSTGRES_PASSWORD=REMPLACER_PAR_UN_SECRET_LOCAL
POSTGRES_PORT=5433
DATABASE_URL=postgresql://comite_dev:MOT_DE_PASSE_POSTGRES_ENCODE@localhost:5433/comite_scientifique
TEST_DATABASE_URL=postgresql://comite_dev:MOT_DE_PASSE_POSTGRES_ENCODE@localhost:5433/comite_scientifique_test
SEED_DEMO_PASSWORD=
```

Encoder les caractères spéciaux du mot de passe PostgreSQL dans les deux URL. Avant le seed, renseigner un mot de passe de démonstration privé et distinct, d’au moins **8 caractères après trim** et d’au plus 1 024 octets.

Le service `db` publie `127.0.0.1:5433` vers le port interne 5432. Le fuseau est `Africa/Algiers`. Le volume `postgres_data` est monté sur `/var/lib/postgresql`. Les données persistent après `docker compose stop db`. Un volume déjà initialisé conserve ses identifiants. Éviter `docker compose down -v`, qui supprime le volume.

## 6. Démarrer Docker Compose

```powershell
docker compose config --quiet
docker compose up -d --wait db
docker compose ps db
```

Pour pgAdmin ou `psql` sur l’hôte, se connecter à `localhost:5433` avec la base et l’utilisateur de `.env`. Dans le réseau Compose, utiliser `db:5432`.

## 7. Appliquer les migrations

```powershell
pnpm db:migrate:deploy
pnpm db:migrate:status
```

`deploy` applique les migrations versionnées. Pour créer une migration ou traiter une dérive, suivre le [guide BDD](database/GUIDE_BDD.md).

## 8. Générer Prisma Client

```powershell
pnpm db:generate
```

Le client généré dans `src/generated/prisma` est ignoré par Git. Régénérer le client après une évolution du schéma.

## 9. Initialiser les données de démonstration

```powershell
pnpm db:seed
```

Sur une base vierge migrée, le seed charge 84 lignes, dont sept comptes PostgreSQL. Un second passage préserve les lignes et les empreintes déjà importées. Voir [SEED.md](database/SEED.md).

## 10. Vérifier la connexion

```powershell
pnpm db:validate
pnpm db:check
pnpm db:check --json
```

Le tableau présente les 19 compteurs. Le JSON inclut le nom de la base lu dans PostgreSQL. Pour recevoir uniquement le JSON, utiliser `pnpm --silent db:check --json`.

## 11. Démarrer l’application

```powershell
pnpm dev
```

Ouvrir [localhost:3000/fr/sign-in](http://localhost:3000/fr/sign-in). La page indique comment accéder à la démonstration statique. Les comptes seedés dans PostgreSQL seront utilisés après l’intégration de l’authentification serveur.

## 12. Configurer et exécuter les tests BDD

Après avoir renseigné `TEST_DATABASE_URL`, préparer une fois la base de contrôle. Cette commande PowerShell est réexécutable.

```powershell
@'
SELECT 'CREATE DATABASE comite_scientifique_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'comite_scientifique_test')
\gexec
'@ | docker compose exec -T db psql -X -v ON_ERROR_STOP=1 -U comite_dev -d postgres
pnpm db:test
```

Chaque passage crée une base de test vierge, rejoue les six migrations, insère les fixtures de test et exécute les 24 tests. Les bases de rejeu sont conservées. La suite refuse une URL absente ou incompatible et ne se replie jamais sur `DATABASE_URL`. Voir [TESTS_BDD.md](database/TESTS_BDD.md).

### Dépannage

| Symptôme | Vérification |
|---|---|
| Docker inaccessible | Démarrer le moteur et vérifier `docker compose ps db`. |
| Port 5433 occupé | Identifier le service qui utilise le port. Les garde-fous du seed et des tests attendent 5433. |
| Authentification PostgreSQL refusée | Vérifier l’encodage URL et les identifiants du volume existant. Changer `.env` ne change pas le mot de passe de PostgreSQL dans ce volume. |
| `Configurez TEST_DATABASE_URL` | Vérifier `.env` à la racine. Pour enlever une ancienne surcharge du terminal, utiliser `Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue`. |
| Base de contrôle absente | Reprendre la préparation de l’étape 12. |
| Client Prisma absent | Lancer `pnpm db:generate`. |
| Contrôle TypeScript global bloqué | Utiliser `pnpm exec tsc -p tests/database/tsconfig.json --noEmit` pour la BDD. Le contrôle global signale des erreurs frontend préexistantes et un conflit de typage de `NODE_ENV` dans le lanceur de tests avec les types Next.js. |

[Guide BDD](database/GUIDE_BDD.md) · [Intégration backend](database/GUIDE_INTEGRATION_BACKEND.md) · [Protections SQL](database/PROTECTIONS_SQL.md)
