# Guide d'installation — Gestion du comité scientifique

**Équipe : Dev Rangers** | **Plateformes : Windows 10/11 et Linux (Ubuntu/Debian)**

Ce guide distingue le frontend statique actuellement disponible et l'environnement full-stack à préparer. Les versions proposées doivent être confirmées dans `package.json`, `pnpm-lock.yaml` et les futurs fichiers Docker du dépôt. Ne pas mettre à niveau les dépendances existantes pour suivre ce guide.

## 1. Prérequis

| Outil | Version / choix proposé | Usage |
|---|---|---|
| Git | Version stable | Obligatoire |
| Node.js | 22 LTS, dernier correctif de la branche 22 | Obligatoire |
| pnpm | Version exacte du champ `packageManager` du projet | Obligatoire |
| Next.js, React, TypeScript, shadcn/ui | Versions du dépôt | Installés par pnpm |
| PostgreSQL | 17, dernier correctif | Backend à venir |
| pgAdmin 4 | Version stable | Facultatif, interface graphique SQL |
| Docker + Compose v2 | Versions compatibles avec le système | DevOps |
| VS Code | Version stable | Facultatif |
| Playwright | Version du dépôt | Tests, si configurés |

Un seul environnement Node.js suffit pour le frontend et le backend Next.js (architecture proposée : Route Handlers et logique serveur). Aucun serveur Express, Apache ou XAMPP n'est nécessaire.

## 2. Windows — installation des outils

Dans PowerShell :

```powershell
winget install --id Git.Git -e
winget install --id Microsoft.VisualStudioCode -e
```

Installer Node.js 22 depuis https://nodejs.org/en/download (sélectionner la branche 22 et l'installateur Windows adapté). Fermer puis rouvrir PowerShell.

```powershell
node --version
npm --version
git --version
```

Si winget est indisponible, utiliser https://git-scm.com/downloads et https://code.visualstudio.com/download. Si PowerShell bloque un script npm/pnpm, utiliser `npm.cmd` et `pnpm.cmd` ou un terminal CMD plutôt que de désactiver globalement la politique de sécurité.

## 3. Linux — installation des outils

Exemples pour Ubuntu/Debian ; sur Fedora/Arch, utiliser le gestionnaire de paquets adapté.

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential
```

Installer nvm en suivant https://github.com/nvm-sh/nvm#installing-and-updating puis rouvrir le terminal (ou charger nvm selon sa documentation).

```bash
nvm install 22
nvm use 22
nvm alias default 22
node --version
npm --version
git --version
```

VS Code (facultatif) : https://code.visualstudio.com/docs/setup/linux.

Sous Windows avec WSL2, appliquer les instructions Linux dans WSL et conserver le dépôt dans le système de fichiers Linux, par exemple `~/projects`. Ne pas partager `node_modules` entre Windows natif et WSL.

## 4. Récupérer le projet et installer ses dépendances

Les commandes suivantes s'appliquent aux deux systèmes. Remplacer l'URL illustrative par l'URL réelle du dépôt GitHub de l'équipe.

```bash
git clone https://github.com/ORGANISATION/devrangers-projet-devops.git
cd devrangers-projet-devops
git branch -a
```

Si le travail se poursuit sur la branche de refactoring et que celle-ci est publiée :

```bash
git switch refactoring/nettoyage-shadboard
```

Lire les versions déclarées :

```bash
node -p "require('./package.json').packageManager"
node -p "JSON.stringify(require('./package.json').engines)"
```

Installer pnpm à la version exacte indiquée dans `packageManager` (remplacer X.Y.Z ; ne pas inclure un éventuel suffixe d'intégrité) :

```bash
npm install -g pnpm@X.Y.Z
pnpm --version
pnpm install --frozen-lockfile
```

Si le champ `packageManager` est absent, l'équipe doit convenir d'une version compatible avec le lockfile puis la déclarer avant de généraliser le setup. Ne pas régénérer le lockfile pour contourner une erreur sans accord de l'équipe.

Ne pas lancer `create-next-app`, ni installer Next.js ou React globalement : ils font déjà partie du projet.

## 5. Lancer le frontend actuel

```bash
pnpm dev
```

Ouvrir http://localhost:3000 (ou le port indiqué par le terminal). Utiliser les comptes de démonstration documentés dans le README ou affichés sur la page de connexion. Le frontend statique n'a pas besoin de PostgreSQL tant qu'il utilise le magasin de démonstration local.

Pour arrêter : Ctrl+C. Si le port 3000 est occupé, identifier le processus ou utiliser `pnpm exec next dev -p 3001` si le projet utilise le serveur Next.js standard. Utiliser un seul serveur par environnement pour éviter les conflits.

## 6. PostgreSQL — environnement backend à préparer

Choisir **une seule** des deux méthodes : Docker (recommandé) ou installation native. Ne pas lancer deux serveurs sur le même port. pgAdmin est un client graphique, pas le serveur de base de données.

### Option A — Docker (recommandée pour l'équipe DevOps)

Windows : installer WSL2 si nécessaire (`wsl --install` dans PowerShell administrateur, sous réserve de compatibilité du système), puis Docker Desktop : https://docs.docker.com/desktop/setup/install/windows-install/. Activer le moteur WSL2, démarrer Docker Desktop et, si nécessaire, l'intégration avec la distribution WSL.

Linux : installer Docker Engine et le plugin Compose v2 via https://docs.docker.com/engine/install/ (choisir la distribution). Suivre les instructions officielles concernant les permissions ; l'appartenance au groupe docker confère des privilèges élevés. Éviter d'exécuter les outils Node.js en root.

```bash
docker --version
docker compose version
docker info
```

Si aucun fichier Compose n'existe encore, voici une proposition à intégrer dans un futur `compose.yaml` à la racine (ne pas écraser un fichier existant) :

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: ${POSTGRES_DB:?required}
      POSTGRES_USER: ${POSTGRES_USER:?required}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?required}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 10
volumes:
  postgres_data:
```

Créer un fichier `.env` local non versionné pour Compose (valeurs de développement uniquement) :

```dotenv
POSTGRES_DB=comite_scientifique
POSTGRES_USER=comite_dev
POSTGRES_PASSWORD=REMPLACER_PAR_UN_MOT_DE_PASSE_LOCAL
```

Le compte créé par l'image est un compte d'administration du cluster de développement. Prévoir un compte applicatif à privilèges limités avant tout déploiement réel.

```bash
docker compose up -d db
docker compose ps
docker compose logs db
docker compose exec db psql -U comite_dev -d comite_scientifique -c "SELECT version();"
```

Arrêter sans perdre les données : `docker compose stop db`. Ne pas utiliser `docker compose down -v` sauf si la suppression définitive de la base locale est souhaitée. Les variables d'initialisation ne recréent pas les comptes d'un volume déjà initialisé.

### Option B — PostgreSQL natif

**Windows :** https://www.postgresql.org/download/windows/ — sélectionner PostgreSQL 17, installer le serveur et les outils de ligne de commande ; pgAdmin est facultatif. Choisir un mot de passe pour le compte `postgres` et conserver le port 5432 si disponible. Si `psql` n'est pas reconnu, ajouter le dossier `bin` de PostgreSQL au PATH ou utiliser SQL Shell (psql).

**Ubuntu/Debian :** suivre https://www.postgresql.org/download/linux/ubuntu/ ou https://www.postgresql.org/download/linux/debian/ pour activer le dépôt PGDG si nécessaire, puis :

```bash
sudo apt update
sudo apt install -y postgresql-17 postgresql-client-17
sudo systemctl enable --now postgresql
sudo -u postgres psql
```

Si systemd est indisponible (certains environnements WSL), utiliser la méthode de démarrage adaptée à la distribution, par exemple `sudo service postgresql start`.

Sous Windows, ouvrir SQL Shell ou lancer `psql -U postgres -h localhost`. Dans psql, créer le compte et la base une seule fois :

```sql
CREATE ROLE comite_dev LOGIN;
\password comite_dev
CREATE DATABASE comite_scientifique OWNER comite_dev;
\q
```

Tester depuis le terminal :

```bash
psql -h localhost -p 5432 -U comite_dev -d comite_scientifique -c "SELECT version();"
```

## 7. Client graphique — pgAdmin 4 (facultatif)

Télécharger sur https://www.pgadmin.org/download/ et suivre les instructions propres au système. DBeaver Community (https://dbeaver.io/download/) est une alternative ; un seul client graphique suffit.

Dans pgAdmin : Register > Server. Renseigner les paramètres suivants :

| Paramètre | Valeur locale |
|---|---|
| Name | Comité scientifique — Local |
| Host | localhost |
| Port | 5432 |
| Maintenance database | comite_scientifique |
| Username | comite_dev |
| Password | Mot de passe choisi |

Ces paramètres supposent que pgAdmin tourne sur la machine hôte. Si pgAdmin est lui-même dans le même réseau Compose, utiliser `db` comme hôte. Ne pas exposer PostgreSQL publiquement.

## 8. Variables d'environnement et backend (à venir)

Lorsque l'équipe aura intégré la couche de données, créer `.env.local` à la racine à partir du futur `.env.example`. Sous PowerShell : `Copy-Item .env.example .env.local` ; sous Linux : `cp .env.example .env.local` (si le modèle existe).

Exemple de configuration cible, non requise pour le frontend statique :

```dotenv
DATABASE_URL=postgresql://comite_dev:MOT_DE_PASSE_ENCODE@localhost:5432/comite_scientifique
```

Encoder les caractères spéciaux du mot de passe dans l'URL. Si Next.js tourne lui aussi dans Compose, remplacer `localhost` par `db`. `DATABASE_URL` et les secrets d'authentification restent exclusivement côté serveur : jamais de préfixe `NEXT_PUBLIC_` pour ces valeurs.

Vérifier que `.env` et `.env.local` sont ignorés par Git, et que `.env.example` ne contient que des valeurs fictives. Ne pas écraser les configurations locales existantes.

Le choix du pilote SQL/ORM, des migrations, du système d'authentification et du stockage des pièces jointes n'est pas confirmé. Ne pas installer Prisma ou une autre bibliothèque individuellement avant la décision de l'équipe. Les commandes de migration, seed et lancement backend devront être ajoutées à ce document dès leur implémentation. Si l'architecture Next.js full-stack est retenue, `pnpm dev` lancera à la fois le frontend et les routes serveur ; il n'y aura pas de deuxième serveur à démarrer.

## 9. Vérifications et tests

Lister les scripts réellement disponibles :

```bash
pnpm run
```

Selon les scripts déclarés dans le projet :

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm test
```

Ne lancer `pnpm test` ou `pnpm lint` que si le script correspondant existe. Le build de production peut nécessiter les variables d'environnement lorsque le backend sera intégré.

Si Playwright est déjà installé et configuré :

```bash
pnpm exec playwright install
pnpm exec playwright test
```

Sous Ubuntu/Debian, installer les dépendances système des navigateurs si nécessaire : `pnpm exec playwright install --with-deps`. Utiliser la configuration réelle du dépôt si elle est située hors de la racine. L'audit statique connu du projet peut être exécuté avec `node qa/audit-statique.cjs` si le fichier existe.

## 10. Règles communes DevOps

- Utiliser les mêmes versions Node.js, pnpm et PostgreSQL sur tous les postes et dans la CI.
- Conserver et versionner `pnpm-lock.yaml` ; utiliser `pnpm install --frozen-lockfile` en CI.
- Ne pas versionner les secrets, `node_modules`, `.next` ou les fichiers de données locaux.
- Utiliser les branches de travail et les pull requests avec revue.
- Prévoir un `.node-version` ou `.nvmrc`, un champ `packageManager` et un `.env.example` communs.
- Compléter ce guide après validation du backend : migrations, seed, démarrage Compose complet, stockage des documents, tests d'intégration et déploiement.

## 11. Checklist d'installation

- [ ] Git installé et accès au dépôt confirmé.
- [ ] Node.js et pnpm aux versions communes.
- [ ] Dépendances installées sans modifier le lockfile.
- [ ] Frontend accessible et connexion de démonstration testée.
- [ ] Docker et Compose opérationnels (ou PostgreSQL natif pour le développement local).
- [ ] PostgreSQL accessible et requête SQL de test réussie.
- [ ] Variables locales configurées lorsque le backend sera disponible.
- [ ] Tests et build exécutés selon les scripts existants.

## Documentation officielle

- Node.js : https://nodejs.org/en/download
- pnpm : https://pnpm.io/installation
- Next.js : https://nextjs.org/docs
- PostgreSQL : https://www.postgresql.org/download/
- pgAdmin : https://www.pgadmin.org/download/
- Docker : https://docs.docker.com/engine/install/
- Docker Compose : https://docs.docker.com/compose/
- Playwright : https://playwright.dev/docs/intro

> Statut : guide préparatoire. Les commandes propres au dépôt et les versions exactes doivent être vérifiées par l'équipe sur le code source réel avant validation définitive sous Windows et Linux.
