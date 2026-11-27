# Dictionnaire des données — Gestion du comité scientifique

**Projet :** Dev Rangers · **Version :** V1.0 (base MLD V1.1) · **Branche :** `feat/integration-bdd`

**Sources :** `MLD.md` (V1.1 corrigée), `MCD.md` (V1.1), `ANALYSE_DES_DONNEES.md`. Ce document décrit la cible, pas une base déjà installée. Les types et défauts ci-dessous complètent le MLD ; ils sont proposés pour l’implémentation, pas tous imposés par le prototype. Les arbitrages métier V1 restent à entériner.

## 1. Conventions

- UUID pour les identifiants ; génération serveur/ORM à la création (proposition : UUID v4), sauf identifiants déterministes d'import. Pas d'UUID généré pour une FK. Les références métier sont attribuées par le service, de façon concurrente sûre.
- `date` = jour civil, `time(0)` = heure civile sans fuseau, `timestamptz(3)` = instant ; fuseau métier `Africa/Algiers`. Ne jamais inventer l'heure des événements historiques.
- `text` pour chaînes libres ; limites de formulaire et normalisation par service, CHECK selon `REGLES_INTEGRITE.md`. `integer` = entier PostgreSQL 32 bits. `numeric(5,2)` = décimal exact, pas float pour les seuils. Les enums portent les codes stables du MLD (voir §3).
- Colonne « Défaut proposé » : NULL pour attribut facultatif non renseigné ; « — » = valeur fournie explicitement. Les valeurs métier (statuts, seuils, chaînes vides) sont des défauts proposés à la création normale ; le service peut les expliciter. Les imports ne doivent pas utiliser `now()` pour simuler un événement historique. Les dates historiques requises mais inconnues obligent à exclure la fixture ou à revoir explicitement le modèle.
- `updated_at` est maintenu par l'ORM ou le service ; une valeur SQL par défaut seule ne le met pas à jour. Les champs d'événement sont renseignés lors de la transition correspondante, pas automatiquement à l'insertion.
- PK, UQ, FK et règles métier : voir également `REGLES_INTEGRITE.md`. Les identifiants dans JSON ne sont pas des FK.

## 2. Colonnes par table

Les sections 2.1 à 2.19 décrivent les 19 tables métier. La section 2.20 décrit la table technique d’authentification.

### 2.1 `accounts` — Account

**Clés :** PK id ; UQ email normalisé ; UQ member_id ; FK member_id → members.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `first_name` | `text` | Non | — | Prénom de connexion, non blanc. |
| `last_name` | `text` | Non | — | Nom de connexion, non blanc. |
| `email` | `text` | Non | — | Courriel de connexion canonique, unique dans les comptes. |
| `password_hash` | `text` | Non | — | Empreinte de mot de passe, jamais le secret en clair ; non exposée par API. |
| `role` | `AccountRole` | Non | — | Rôle d'accès, distinct de la fonction du mandat. |
| `is_active` | `boolean` | Non | true | Compte autorisé à accéder au système. |
| `member_id` | `uuid` | Oui | NULL | Membre associé ; obligatoire hors ADMIN, unique si renseigné. |
| `created_at` | `timestamptz(3)` | Non | now() | Instant de création du compte. |
| `updated_at` | `timestamptz(3)` | Non | now() à la création | Instant de dernière modification ; maintenance par service/ORM. |

### 2.2 `account_profiles` — AccountProfile

**Clés :** PK id ; UQ account_id ; FK → accounts.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `account_id` | `uuid` | Non | — | Compte propriétaire ; unique. |
| `first_name` | `text` | Oui | NULL | Surcharge du prénom affiché ; NULL = valeur du compte. |
| `last_name` | `text` | Oui | NULL | Surcharge du nom affiché ; NULL = valeur du compte. |
| `contact_email` | `text` | Oui | NULL | Courriel de contact du profil ; ne change pas le login. |
| `phone` | `text` | Oui | NULL | Téléphone de profil, chaîne pour conserver préfixes. |
| `position` | `text` | Oui | NULL | Poste affiché. |
| `department` | `text` | Oui | NULL | Département affiché ; NULL = valeur initiale interface. |
| `bio` | `text` | Oui | NULL | Biographie libre. |

### 2.3 `members` — Member

**Clés :** PK id ; UQ email normalisé.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `full_name` | `text` | Non | — | Nom complet de l'annuaire, non blanc. |
| `email` | `text` | Non | — | Courriel canonique d'annuaire, unique dans members. |
| `phone` | `text` | Oui | NULL | Téléphone d'annuaire. |
| `notes` | `text` | Oui | NULL | Notes d'annuaire. |

### 2.4 `seats` — Seat

**Clés :** PK id ; UQ label (choix logique V1).

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `label` | `text` | Non | — | Libellé unique du siège, non blanc. |

### 2.5 `mandates` — Mandate

**Clés :** PK id ; FK member_id → members ; FK seat_id → seats ; UQ (id, member_id), UQ (id, seat_id) pour les FK composites de provenance.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `member_id` | `uuid` | Non | — | Membre titulaire du mandat au sens administratif. |
| `seat_id` | `uuid` | Non | — | Siège occupé. |
| `function` | `MandateFunction` | Non | — | Fonction métier pendant la période. |
| `kind` | `MandateKind` | Non | — | Qualité titulaire ou suppléant. |
| `start_date` | `date` | Non | — | Premier jour inclus. |
| `end_date` | `date` | Non | — | Dernier jour inclus, au moins start_date. |

### 2.6 `meetings` — Meeting

**Clés :** PK id.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `title` | `text` | Non | — | Titre de la séance, non blanc à la planification/démarrage. |
| `meeting_date` | `date` | Non | — | Jour civil de séance dans le fuseau métier. |
| `start_time` | `time(0)` | Non | — | Heure locale de début. |
| `end_time` | `time(0)` | Non | — | Heure locale de fin, strictement après le début. |
| `location` | `text` | Non | — | Salle ou lieu de réunion, non blanc. |
| `description` | `text` | Non | '' | Description libre. |
| `status` | `MeetingStatus` | Non | PLANNED | Cycle de vie de la réunion. |
| `invitations_sent_at` | `timestamptz(3)` | Oui | NULL | Dernier envoi volontaire de convocations. |
| `started_at` | `timestamptz(3)` | Oui | NULL | Instant du démarrage ; inconnu possible en reprise. |
| `closed_at` | `timestamptz(3)` | Oui | NULL | Instant de clôture ; inconnu possible en reprise. |

### 2.7 `meeting_participants` — MeetingParticipant

**Clés :** PK id ; UQ (meeting_id, member_id) ; FK meeting_id → meetings ; FK member_id → members ; FK (mandate_id, member_id) → mandates(id, member_id) ; UQ (id, meeting_id, mandate_id).

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `meeting_id` | `uuid` | Non | — | Réunion concernée. |
| `member_id` | `uuid` | Non | — | Membre invité ; paire réunion/membre unique. |
| `mandate_id` | `uuid` | Non | — | Mandat de ce membre applicable à la date de séance. |
| `attendance` | `boolean` | Oui | NULL | Présent=true, absent=false, inconnu=NULL. |
| `attendance_recorded_at` | `timestamptz(3)` | Oui | NULL | Instant de dernier relevé connu. |

### 2.8 `agenda_proposals` — AgendaProposal

**Clés :** PK id ; FK meeting_id → meetings ; FK author_member_id et reviewer_member_id → members ; UQ (id, meeting_id).

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `meeting_id` | `uuid` | Non | — | Réunion destinataire du point. |
| `author_member_id` | `uuid` | Non | — | Auteur membre identifié. |
| `reviewer_member_id` | `uuid` | Oui | NULL | Membre relecteur, président lors d'une revue nouvelle. |
| `title` | `text` | Non | — | Intitulé non blanc ; 150 caractères max au formulaire. |
| `description` | `text` | Non | '' | Description ; limite formulaire 1 800 caractères. |
| `created_at` | `timestamptz(3)` | Non | now() | Instant de proposition. |
| `status` | `AgendaStatus` | Non | PROPOSED | État de validation. |
| `sort_order` | `integer` | Oui | NULL | Ordre officiel non négatif ou NULL. |
| `review_note` | `text` | Oui | NULL | Note du relecteur. Pour chaque rejet, le service exige un motif non vide après retrait des espaces en début et en fin (MET-08). |
| `reviewed_at` | `timestamptz(3)` | Oui | NULL | Instant de revue connu. |

### 2.9 `decisions` — Decision

**Clés :** PK id ; UQ reference ; FK meeting_id → meetings ; FK (agenda_proposal_id, meeting_id) → agenda_proposals(id, meeting_id) ; FK archived_by_account_id → accounts ; UQ (id, meeting_id).

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `meeting_id` | `uuid` | Non | — | Réunion dont émane la décision. |
| `agenda_proposal_id` | `uuid` | Oui | NULL | Point associé facultatif de la même réunion. |
| `reference` | `text` | Non | — | Référence métier unique, distincte de id ; génération serveur. |
| `title` | `text` | Non | — | Titre non blanc ; 160 caractères max au formulaire. |
| `description` | `text` | Non | '' | Description de décision. |
| `decision_date` | `date` | Non | — | Date civile de décision ; distincte du jour de réunion. |
| `status` | `DecisionStatus` | Non | PENDING | État courant ; définitif uniquement selon provenance. |
| `final_source` | `DecisionFinalSource` | Oui | NULL | BALLOT ou HISTORICAL_IMPORT si définitive ; NULL sinon. |
| `archived_at` | `timestamptz(3)` | Oui | NULL | Instant d'archivage définitif, si connu et applicable. |
| `archived_by_account_id` | `uuid` | Oui | NULL | Compte archiviste, nullable pour reprise ancienne. |
| `archived_by_name` | `text` | Oui | NULL | Nom figé de l'archivant. |

### 2.10 `ballots` — Ballot

**Clés :** PK id ; UQ decision_id ; FK (decision_id, meeting_id) → decisions(id, meeting_id) ; UQ (id, meeting_id).

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `decision_id` | `uuid` | Non | — | Décision soumise au vote ; unique. |
| `meeting_id` | `uuid` | Non | — | Réunion de cette décision, redondance contrôlée par FK. |
| `state` | `BallotState` | Non | OPEN | Ouvert ou clos. |
| `quorum_percent` | `numeric(5,2)` | Non | 60.00 | Seuil de quorum en pourcentage, 1–100. |
| `majority_percent` | `numeric(5,2)` | Non | 50.00 | Seuil strict de majorité, 1–100. |
| `opened_at` | `timestamptz(3)` | Oui | NULL | Instant d'ouverture, NULL seulement si inconnu en reprise. |
| `closed_at` | `timestamptz(3)` | Oui | NULL | Instant de clôture, NULL si ouvert ou historique inconnu. |

### 2.11 `ballot_votes` — BallotVote

**Clés :** PK id ; UQ (ballot_id, seat_id) ; UQ (ballot_id, participation_id) ; FK (ballot_id, meeting_id) → ballots(id, meeting_id) ; FK (participation_id, meeting_id, mandate_id) → meeting_participants(id, meeting_id, mandate_id) ; FK (mandate_id, seat_id) → mandates(id, seat_id).

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `ballot_id` | `uuid` | Non | — | Scrutin concerné. |
| `meeting_id` | `uuid` | Non | — | Réunion commune au scrutin et à la participation. |
| `participation_id` | `uuid` | Non | — | Participation du votant à cette réunion. |
| `mandate_id` | `uuid` | Non | — | Mandat de la participation, redondance contrôlée. |
| `seat_id` | `uuid` | Non | — | Siège de ce mandat ; unique avec ballot_id. |
| `choice` | `VoteChoice` | Non | — | Choix nominatif du représentant. |
| `voted_at` | `timestamptz(3)` | Oui | NULL | Instant de dernière expression du vote ; inconnu en reprise. |

### 2.12 `ballot_results` — BallotResult

**Clés :** PK id ; UQ ballot_id ; FK ballot_id → ballots.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `ballot_id` | `uuid` | Non | — | Scrutin clos ; un résultat par scrutin. |
| `captured_at` | `timestamptz(3)` | Oui | NULL | Instant de capture, inconnu possible en reprise. |
| `quorum_percent` | `numeric(5,2)` | Non | — | Seuil figé à la clôture. |
| `majority_percent` | `numeric(5,2)` | Non | — | Seuil de majorité figé. |
| `rule_version` | `text` | Non | — | Version identifiant l'algorithme réellement utilisé. |
| `active_seat_count` | `integer` | Non | — | Nombre de sièges actifs, même non invités. |
| `represented_seat_count` | `integer` | Non | — | Nombre de sièges avec représentant présent. |
| `quorum_min_seats` | `integer` | Non | — | Plafond du produit actifs × seuil / 100. |
| `participation_percent` | `integer` | Non | — | Pourcentage arrondi de sièges représentés, 0 à 100. |
| `for_count` | `integer` | Non | — | Votes valides pour. |
| `against_count` | `integer` | Non | — | Votes valides contre. |
| `abstain_count` | `integer` | Non | — | Abstentions valides. |
| `votes_cast` | `integer` | Non | — | Total des votes déposés valides. |
| `uncast_count` | `integer` | Non | — | Sièges représentés sans vote déposé. |
| `expressed_count` | `integer` | Non | — | Pour + contre, sans abstentions. |
| `quorum_reached` | `boolean` | Non | — | Quorum atteint selon sièges actifs et représentés. |
| `outcome` | `BallotOutcome` | Non | — | Issue finale du scrutin, éventuellement sans quorum. |
| `snapshot_version` | `integer` | Non | — | Version positive du format des deux captures. |
| `representation_snapshot` | `jsonb` | Non | — | Tableau des sièges actifs, identités, mandats et représentants figés. |
| `presence_snapshot` | `jsonb` | Non | — | Capture des participants et présences physiques à la clôture. |

### 2.13 `actions` — CommitteeAction

**Clés :** PK id ; FK decision_id → decisions ; FK assignee_member_id → members.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `decision_id` | `uuid` | Oui | NULL | Décision adoptée liée ; NULL pour action autonome. |
| `assignee_member_id` | `uuid` | Non | — | Membre responsable. |
| `title` | `text` | Non | — | Titre non blanc ; 160 caractères max au formulaire. |
| `description` | `text` | Non | '' | Description libre. |
| `due_date` | `date` | Non | — | Échéance civile ; fin de journée locale pour rappels. |
| `priority` | `ActionPriority` | Non | NORMAL | Priorité de suivi. |
| `status` | `ActionStatus` | Non | TODO (si aucun contexte) | État Kanban ; le contexte peut choisir un autre état initial. |
| `sort_order` | `integer` | Non | — | Ordre métier dans colonne Kanban, non négatif. |

### 2.14 `documents` — Document

**Clés :** PK id ; UQ reference ; FK meeting_id → meetings ; FK archived_by_account_id → accounts.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `meeting_id` | `uuid` | Oui | NULL | Réunion de rattachement facultative. |
| `reference` | `text` | Non | — | Référence documentaire unique. |
| `title` | `text` | Non | — | Titre non blanc ; 150 caractères max au formulaire. |
| `description` | `text` | Non | '' | Description libre. |
| `type` | `DocumentType` | Non | REPORT | Catégorie documentaire. |
| `status` | `DocumentStatus` | Non | DRAFT | État du document. |
| `visibility` | `DocumentVisibility` | Non | COMMITTEE | Périmètre de consultation. |
| `updated_at` | `timestamptz(3)` | Oui | NULL | Dernière mise à jour connue ; NULL historique seulement. |
| `archived_at` | `timestamptz(3)` | Oui | NULL | Instant d'archivage, obligatoire si ARCHIVED. |
| `archived_by_account_id` | `uuid` | Oui | NULL | Compte archiviste ; inconnu possible en reprise. |
| `archived_by_name` | `text` | Oui | NULL | Nom figé de l'archivant. |

### 2.15 `document_versions` — DocumentVersion

**Clés :** PK id ; UQ (document_id, number) ; FK document_id → documents ; FK author_account_id → accounts.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `document_id` | `uuid` | Non | — | Document parent. |
| `number` | `integer` | Non | — | Numéro positif, unique par document ; attribué transactionnellement. |
| `filename` | `text` | Non | — | Nom de fichier affiché, même pour ancienne version sans binaire. |
| `note` | `text` | Non | '' | Note de version. |
| `version_date` | `date` | Oui | NULL | Jour civil de version, NULL si inconnu. |
| `author_account_id` | `uuid` | Oui | NULL | Compte auteur, obligatoire hors historique. |
| `author_name` | `text` | Oui | NULL | Nom d'auteur affiché figé. |
| `is_historical` | `boolean` | Non | false | Exception réservée à la reprise contrôlée. |

### 2.16 `stored_files` — StoredFile

**Clés :** PK id ; FK agenda_proposal_id → agenda_proposals ; FK document_version_id → document_versions ; UQ document_version_id ; UQ storage_key ; CHECK exactement un des deux rattachements non NULL.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `agenda_proposal_id` | `uuid` | Oui | NULL | Proposition propriétaire, exclusif avec document_version_id. |
| `document_version_id` | `uuid` | Oui | NULL | Version propriétaire, unique si renseigné. |
| `original_name` | `text` | Non | — | Nom original ; ne sert jamais de chemin de stockage. |
| `size_bytes` | `integer` | Non | — | Taille en octets, entre 0 et 10 485 760. |
| `mime_type` | `text` | Non | — | Type MIME validé côté serveur. |
| `storage_key` | `text` | Non | — | Clé relative opaque unique du stockage privé. |
| `checksum` | `text` | Oui | NULL | Empreinte optionnelle du binaire ; format à définir. |
| `uploaded_at` | `timestamptz(3)` | Non | now() | Instant de dépôt réel. |

### 2.17 `meeting_minutes` — MeetingMinutes

**Clés :** PK id ; UQ meeting_id ; UQ reference ; FK meeting_id → meetings ; les trois FK d'acteur → accounts.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `meeting_id` | `uuid` | Non | — | Réunion consignée ; unique. |
| `reference` | `text` | Non | — | Référence de PV unique. |
| `summary` | `text` | Non | '' | Compte rendu ; non blanc à la soumission. |
| `next_steps` | `text` | Non | '' | Suites et observations. |
| `status` | `MinutesStatus` | Non | DRAFT | Cycle de rédaction et signature. |
| `version` | `integer` | Non | 1 | Compteur positif de révision du PV. |
| `updated_at` | `timestamptz(3)` | Oui | NULL | Dernière modification connue. |
| `submitted_at` | `timestamptz(3)` | Oui | NULL | Dernière soumission connue. |
| `returned_at` | `timestamptz(3)` | Oui | NULL | Dernier retour pour correction connu. |
| `signed_at` | `timestamptz(3)` | Oui | NULL | Instant réel de signature ; NULL si historique inconnu. |
| `archived_at` | `timestamptz(3)` | Oui | NULL | Instant d'archivage ; requis si ARCHIVED. |
| `correction_note` | `text` | Oui | NULL | Motif éventuel du retour. |
| `secretary_account_id` | `uuid` | Oui | NULL | Compte secrétaire auteur ; nullable en reprise. |
| `signed_by_account_id` | `uuid` | Oui | NULL | Compte président signataire ; nullable en reprise. |
| `archived_by_account_id` | `uuid` | Oui | NULL | Compte archiviste ; nullable en reprise. |
| `secretary_name` | `text` | Oui | NULL | Nom affiché du secrétaire figé dans le contexte officiel. |
| `president_name` | `text` | Oui | NULL | Nom affiché du président prévu, distinct du signataire. |
| `signed_by_name` | `text` | Oui | NULL | Nom figé du signataire effectif. |
| `archived_by_name` | `text` | Oui | NULL | Nom figé de l'archivant. |
| `snapshot_version` | `integer` | Oui | NULL | Version positive du format, requise avec capture. |
| `official_snapshot` | `jsonb` | Oui | NULL | Contenu officiel capturé à la soumission et verrouillé à la signature. |

### 2.18 `notifications` — Notification

**Clés :** PK id ; FK recipient_account_id et sender_account_id → accounts ; UQ (recipient_account_id, dedupe_key) ; CHECK cible complète ou absente.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `recipient_account_id` | `uuid` | Non | — | Destinataire unique de la ligne ; compte actif à l'émission. |
| `sender_account_id` | `uuid` | Oui | NULL | Compte émetteur ; NULL pour système ou reprise inconnue. |
| `sender_name` | `text` | Oui | NULL | Nom d'émetteur affiché. |
| `kind` | `NotificationKind` | Non | — | Type d'événement interne. |
| `category` | `NotificationCategory` | Non | — | Catégorie fonctionnelle. |
| `priority` | `NotificationPriority` | Non | normale | Priorité d'affichage. |
| `title` | `text` | Non | — | Titre rendu à l'émission. |
| `preview` | `text` | Non | — | Aperçu du message. |
| `detail` | `text` | Non | — | Contenu détaillé. |
| `context` | `text` | Non | — | Contexte textuel de l'événement. |
| `created_at` | `timestamptz(3)` | Non | now() | Instant d'émission. |
| `read_at` | `timestamptz(3)` | Oui | NULL | Lu si renseigné ; effacé lors du retour à non lu. |
| `archived_at` | `timestamptz(3)` | Oui | NULL | Archivé si renseigné ; effacé à la restauration. |
| `deleted_at` | `timestamptz(3)` | Oui | NULL | Retrait logique définitif ; exclu de toutes les vues utilisateur. |
| `title_key` | `text` | Oui | NULL | Clé de traduction du titre. |
| `message_key` | `text` | Oui | NULL | Clé de traduction du message. |
| `template_values` | `jsonb` | Oui | NULL | Objet de paramètres de traduction, valeurs string ou number. |
| `dedupe_key` | `text` | Oui | NULL | Identifiant stable de l'occurrence, unique par destinataire même après retrait. |
| `target_type` | `NotificationTargetType` | Oui | NULL | Type de cible ; nullable avec target_id. |
| `target_id` | `uuid` | Oui | NULL | Identifiant polymorphe de cible ; pas de FK générique. |

### 2.19 `audit_events` — AuditEvent

**Clés :** PK id ; FK actor_account_id → accounts ; référence historique de l'objet sans FK polymorphe.

| Colonne | Type SQL / domaine | NULL autorisé | Défaut proposé | Signification |
|---|---|:---:|---|---|
| `id` | `uuid` | Non | UUID généré | Identifiant interne, PK immuable. |
| `actor_account_id` | `uuid` | Oui | NULL | Compte acteur ; NULL pour événement système ou import inconnu. |
| `operation` | `text` | Non | — | Code stable d'opération sensible, liste à coordonner backend. |
| `occurred_at` | `timestamptz(3)` | Non | now() | Instant réel de l'événement d'audit. |
| `entity_type` | `text` | Non | — | Code stable du type d'objet audité, à coordonner backend. |
| `entity_id` | `uuid` | Non | — | Identifiant historique de l'objet ; pas de FK polymorphe. |
| `details` | `jsonb` | Oui | NULL | Contexte minimal, provenance, changements utiles ; aucun secret. |

### 2.20 `account_sessions` — AccountSession (table technique)

| Colonne | Champ Prisma | Type SQL | NULL autorisé | Défaut | Signification |
|---|---|---|:---:|---|---|
| `id` | `id` | `uuid` | Non | `uuid()` par Prisma | Identifiant de session, PK. |
| `account_id` | `accountId` | `uuid` | Non | — | Compte propriétaire, FK vers `accounts.id`. |
| `token_hash` | `tokenHash` | `text` | Non | — | Empreinte SHA-256 unique, 64 caractères hexadécimaux minuscules. |
| `created_at` | `createdAt` | `timestamptz(3)` | Non | `CURRENT_TIMESTAMP` | Instant de création fini. |
| `expires_at` | `expiresAt` | `timestamptz(3)` | Non | — | Instant fini strictement postérieur à la création, fourni par le backend. |

La FK applique `RESTRICT` à la suppression et à la mise à jour du compte référencé. `account_id` et `expires_at` sont indexés séparément. La révocation supprime la ligne de session. Le backend transmet uniquement l’empreinte à la base. [Guide d’intégration backend](GUIDE_INTEGRATION_BACKEND.md#persistance-des-sessions-dans-authrepositoryts)

## 3. Domaines fermés (enums)
Les codes stables ci-dessous sont une convention technique ; le frontend utilise un mapping vers ses valeurs existantes et les libellés FR/EN/AR. Ne pas utiliser les libellés traduits comme clés de persistance. Les valeurs de notification existantes en kebab-case sont conservées au niveau logique (mapping Prisma enum possible).

| Domaine | Valeurs |
|---|---|
| AccountRole | ADMIN, PRESIDENT, SECRETARY, ARCHIVIST, MEMBER |
| MandateFunction | PRESIDENT, SECRETARY, MEMBER, ARCHIVIST, ADMIN |
| MandateKind | TITULAR, SUBSTITUTE |
| MeetingStatus | PLANNED, IN_PROGRESS, CLOSED, MINUTES_SIGNED, CANCELLED |
| AgendaStatus | PROPOSED, APPROVED, REJECTED |
| DecisionStatus | PENDING, ADOPTED, REJECTED |
| DecisionFinalSource | BALLOT, HISTORICAL_IMPORT |
| BallotState | OPEN, CLOSED |
| VoteChoice | FOR, AGAINST, ABSTAIN |
| BallotOutcome | ADOPTED, REJECTED, QUORUM_NOT_REACHED |
| ActionStatus | TODO, IN_PROGRESS, DONE |
| ActionPriority | LOW, NORMAL, HIGH |
| DocumentType | AGENDA, MINUTES, REPORT, INVITATION, OTHER |
| DocumentStatus | DRAFT, APPROVED, ARCHIVED |
| DocumentVisibility | COMMITTEE, PRESIDENCY, ARCHIVES |
| MinutesStatus | DRAFT, TO_SIGN, SIGNED, ARCHIVED |
| NotificationKind | convocation, reunion-modifiee, reunion-annulee, rappel-reunion, proposition-agenda, revue-agenda, echeance-action, action-attribuee, action-reattribuee, action-echeance-modifiee, rappel-action, action-en-retard, avis-decision, pv-signature, pv-correction, pv-signe, pv-archives |
| NotificationCategory | meetings, agenda, decisions, actions, minutes |
| NotificationPriority | normale, importante |
| NotificationTargetType | meeting, agenda, decision, action, ballot, minutes |
## 4. Correspondances Prisma à vérifier

| PostgreSQL | Prisma (cible) |
|---|---|
| uuid | String @db.Uuid |
| text | String @db.Text |
| boolean | Boolean |
| integer | Int |
| date | DateTime @db.Date |
| time(0) | DateTime @db.Time(0) |
| timestamptz(3) | DateTime @db.Timestamptz(3) |
| numeric(5,2) | Decimal @db.Decimal(5,2) |
| jsonb | Json @db.JsonB |
| domaines fermés | enum Prisma ; @map pour codes SQL non valides comme identifiants Prisma |

Les champs SQL en snake_case sont mappés avec `@map` et les tables avec `@@map`. La gestion date/heure civile nécessite une conversion explicite au bord API, sans conversion implicite vers un autre jour. Le mapping, les FK composites et les migrations personnalisées restent à tester sur la version Prisma retenue.

## 5. Structures JSONB

- `representation_snapshot` : tableau d'un objet par siège actif, seatId, seatLabel, titulaire/suppléant/représentant éventuels avec identifiants membre/mandat et noms figés, qualité du représentant. Inclure les sièges actifs non représentés.
- `presence_snapshot` : participants et états de présence à la clôture, indépendamment de la représentation effective. Inclure les suppléants présents non représentants.
- `official_snapshot` : informations de réunion, participants et présences, ordre du jour validé, résumé et suites, décisions et résultats, actions avec responsables/échéances, identités affichées. Capture à la soumission, remplaçable après correction puis immuable à la signature.
- `template_values` : objet de chaînes ou nombres utilisés pour le rendu de notification.
- `details` : objet de contexte d'audit, notamment provenance d'import et précision réelle des dates historiques. Ne contient jamais de secrets, mots de passe ou empreintes de mot de passe.

Les formats précis (schémas applicatifs, exemples et version initiale) sont à convenir avec le backend ; le service valide le contenu avant écriture. Les captures reconstituées indiquent leur provenance et leurs lacunes. Ne pas utiliser JSONB pour dupliquer les données courantes.

## 6. Données dérivées, hors colonnes

Statut du mandat et siège actuel (date et mandat), ordre du jour officiel (propositions validées), présence du scrutin ouvert et du PV brouillon (participations), résultat ouvert (calcul), décision bloquée sans quorum (résultat clos), retard d'action, compteurs de notifications non lues (hors retrait), archives et statistiques du tableau de bord. Traductions, filtres, thèmes, état de session et fichiers binaires ne sont pas des colonnes métier de ce modèle.

**Contrôle de couverture documentaire :** 19 tables, 199 colonnes ; les noms et nullabilités ont été comparés au MLD V1.1. Aucune validation d’exécution effectuée.
