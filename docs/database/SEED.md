# Seed PostgreSQL de développement

Le seed initialise le scénario fictif du comité dans la base Docker locale. Il importe les fixtures du frontend sans les modifier. Il s’exécute uniquement avec le compte local `comite_dev` sur le port 5433 et refuse `NODE_ENV=production`.

## Exécution

Configurer `DATABASE_URL` dans le fichier local `.env`. Renseigner impérativement `SEED_DEMO_PASSWORD` **avant la première exécution** de `pnpm db:seed`. La variable est lue dans l’environnement du processus, puis dans `.env` et, si elle y est absente, dans `.env.local`. Comme pour la réinitialisation locale, `.env` prime donc sur `.env.local`. Une valeur vide doit être supprimée ou remplacée. Conserver la valeur en privé pour pouvoir utiliser les comptes importés. Elle doit contenir au moins 8 caractères après retrait des espaces de début et de fin et au plus 1 024 octets. Le hachage utilise la valeur originale. La variable vide dans `.env.example` sert de repère.

```bash
docker compose up -d db
pnpm db:migrate:deploy
pnpm db:generate
pnpm db:validate
pnpm db:seed
pnpm db:check
```

## Données importées

| Table | Lignes | Table | Lignes |
|---|---:|---|---:|
| accounts | 7 | account_profiles | 0 |
| members | 7 | seats | 6 |
| mandates | 7 | meetings | 3 |
| meeting_participants | 13 | agenda_proposals | 8 |
| decisions | 4 | actions | 6 |
| ballots | 2 | ballot_votes | 8 |
| ballot_results | 2 | documents | 3 |
| document_versions | 4 | stored_files | 0 |
| meeting_minutes | 1 | notifications | 0 |
| audit_events | 3 | | |

| Compte | Rôle |
|---|---|
| `admin@comite.test` | ADMIN |
| `president@comite.test` | PRESIDENT |
| `secretaire@comite.test` | SECRETARY |
| `archives@comite.test` | ARCHIVIST |
| `membre@comite.test` | MEMBER titulaire |
| `yanis@comite.test` | MEMBER titulaire |
| `sara@comite.test` | MEMBER suppléante |

Les caractères et accents des noms sont conservés. Le profil utilise les données du compte par défaut. Aucune surcharge de profil ni notification initiale n’existe dans les fixtures. Les exemples du simulateur de notifications ne sont pas des messages déjà émis.

## Adaptations des fixtures

| Source | Adaptation |
|---|---|
| Réunions et agenda | Les propositions collaboratives sont importées une seule fois. La proposition encore en attente de `r1` reste une proposition historique hors de l’ordre du jour officiel. Les instants de démarrage, clôture et convocation absents restent NULL. |
| Participations | Les quatre présences de `r3` concordent dans le PV et les deux scrutins. Les neuf autres participations ont une présence inconnue. Les mandats de chaque invité couvrent la date de sa réunion. |
| Décisions | `d3` est un sujet annoncé pour la réunion planifiée `r2` et est exclue. `d2` et `d4`, adoptées sans scrutin dans les fixtures, sont importées avec `HISTORICAL_IMPORT` et un événement d’audit chacune. Les deux décisions soutenues par les scrutins portent `BALLOT`. Aucun lien vers un point n’est déduit du titre. |
| Votes | Les deux scrutins clos sont reconstruits avec les mandats valides à la date de séance, les présences et l’algorithme du prototype. Les résultats adoptée et rejetée sont conservés, ainsi que les sièges actifs sans représentant. Les dates d’ouverture, de clôture, de vote et de capture inconnues restent NULL. |
| Documents et pièces | Le document `doc4` est exclu avec sa version `v5`, car sa date d’archivage manque. La date de mise à jour au jour seul ne fournit aucun instant d’archivage. Les quatre versions restantes sont historiques et conservent leur date civile et leur nom d’auteur. Aucun compte historique ni fichier physiquement disponible n’est déduit de ces libellés. La pièce d’agenda `sample-a2` est exclue faute de binaire. Les dates de mise à jour documentaires au jour seul restent consultables dans les fixtures. |
| PV | Le PV signé est distinct de `doc4`. Son instantané de format 1 reconstitue la séance, les présences, l’ordre du jour validé, les textes, les décisions et résultats, les actions associées et les noms. Les heures et identités authentifiées inconnues restent NULL. Les dates civiles de signature et de modification sont conservées dans la capture. L’état exact des actions au moment de la signature reste inconnu. Un audit trace cette reprise. |

## Hachage et réexécution

Le format stocké est `scrypt$ln=17,r=8,p=1$<sel-base64url>$<empreinte-base64url>`. Pour vérifier un mot de passe, décoder le sel de 16 octets et l’empreinte de 64 octets à partir de Base64URL sans remplissage. Dériver 64 octets à partir du mot de passe UTF-8 avec `N=2^17=131072`, `r=8` et `p=1`, puis comparer les deux empreintes binaires avec `timingSafeEqual`. Le seed utilise `maxmem=256 * 1024 * 1024` et un sel aléatoire distinct par compte. Les mots de passe du frontend sont ignorés.

Les UUIDv5 identifient chaque ligne selon son type et sa clé source. L’import s’effectue dans une transaction PostgreSQL sérialisable. Si toutes les lignes sont déjà présentes, l’exécution ne fait aucune écriture. Elle conserve les modifications métier et les empreintes existantes. Une empreinte partielle du seed ou une collision sur une clé naturelle arrête l’import avec un diagnostic et annule les insertions. Le seed ne restaure pas des lignes supprimées et ne sert pas à faire tourner les mots de passe. Les horodatages de création des comptes et des audits indiquent l’instant réel de l’import.
