# Règles d’intégrité — Gestion du comité scientifique

**Projet :** Dev Rangers · **Version :** V1.0 (base MLD V1.1) · **Branche :** `feat/integration-bdd`

**Références :** `MCD.md` V1.1 §6, `MLD.md` V1.1 §2 et §5–10, `ANALYSE_DES_DONNEES.md` §4 et §7, `DICTIONNAIRE_DONNEES.md`.

**Statut :** spécification de la cible, non encore implémentée ni testée. Les arbitrages métier V1 restent à entériner. Les expressions SQL ci-dessous servent de contrat pour les migrations ; elles ne constituent pas un script autonome exécutable. Les règles d’autorisation restent obligatoires côté serveur même si une protection SQL existe.

## 1. Répartition des responsabilités

| Niveau | Responsabilité | Responsable de réalisation |
|---|---|---|
| SQL déclaratif | PK, FK, NOT NULL, UNIQUE, CHECK, EXCLUDE, enums | BDD : schéma Prisma et migrations SQL personnalisées |
| Transaction métier | Autorisation, statut, invariants inter-tables, vérification temporelle, snapshots, concurrence, notifications | Backend : services transactionnels, en coordination BDD |
| Renforcement SQL | Immutabilité, audit append-only, défense contre accès direct | BDD + backend : stratégie de privilèges et, si retenus, triggers testés |
| Interface | Formulaires, labels FR/EN/AR, messages d'erreur | Frontend : ne se substitue jamais au serveur |

Ne pas présenter une règle seulement documentée ou contrôlée par le service comme une contrainte SQL déjà effective. Les migrations et les tests sont les preuves d'exécution.

## 2. Clés, références et unicités — contraintes SQL obligatoires

Les 19 tables ont `id uuid PRIMARY KEY`. Nullabilité conforme au dictionnaire et au MLD. Les références métier sont uniques dans chaque domaine. Les UUID sont immuables ; actions référentielles `ON DELETE RESTRICT ON UPDATE RESTRICT` par défaut, ou `NO ACTION` si explicitement justifié. Pas de cascade destructrice. Les FK facultatives sont détachées par une mutation métier autorisée. Les contraintes SQL suivantes doivent être effectivement créées, y compris celles non représentables dans le DSL Prisma.

| Table | Clés et contraintes du MLD |
|---|---|
| `accounts` | PK id ; UQ email normalisé ; UQ member_id ; FK member_id → members |
| `account_profiles` | PK id ; UQ account_id ; FK → accounts |
| `members` | PK id ; UQ email normalisé |
| `seats` | PK id ; UQ label (choix logique V1) |
| `mandates` | PK id ; FK member_id → members ; FK seat_id → seats ; UQ (id, member_id), UQ (id, seat_id) pour les FK composites de provenance |
| `meetings` | PK id |
| `meeting_participants` | PK id ; UQ (meeting_id, member_id) ; FK meeting_id → meetings ; FK member_id → members ; FK (mandate_id, member_id) → mandates(id, member_id) ; UQ (id, meeting_id, mandate_id) |
| `agenda_proposals` | PK id ; FK meeting_id → meetings ; FK author_member_id et reviewer_member_id → members ; UQ (id, meeting_id) |
| `decisions` | PK id ; UQ reference ; FK meeting_id → meetings ; FK (agenda_proposal_id, meeting_id) → agenda_proposals(id, meeting_id) ; FK archived_by_account_id → accounts ; UQ (id, meeting_id) |
| `ballots` | PK id ; UQ decision_id ; FK (decision_id, meeting_id) → decisions(id, meeting_id) ; UQ (id, meeting_id) |
| `ballot_votes` | PK id ; UQ (ballot_id, seat_id) ; UQ (ballot_id, participation_id) ; FK (ballot_id, meeting_id) → ballots(id, meeting_id) ; FK (participation_id, meeting_id, mandate_id) → meeting_participants(id, meeting_id, mandate_id) ; FK (mandate_id, seat_id) → mandates(id, seat_id) |
| `ballot_results` | PK id ; UQ ballot_id ; FK ballot_id → ballots |
| `actions` | PK id ; FK decision_id → decisions ; FK assignee_member_id → members |
| `documents` | PK id ; UQ reference ; FK meeting_id → meetings ; FK archived_by_account_id → accounts |
| `document_versions` | PK id ; UQ (document_id, number) ; FK document_id → documents ; FK author_account_id → accounts |
| `stored_files` | PK id ; FK agenda_proposal_id → agenda_proposals ; FK document_version_id → document_versions ; UQ document_version_id ; UQ storage_key ; CHECK exactement un des deux rattachements non NULL |
| `meeting_minutes` | PK id ; UQ meeting_id ; UQ reference ; FK meeting_id → meetings ; les trois FK d'acteur → accounts |
| `notifications` | PK id ; FK recipient_account_id et sender_account_id → accounts ; UQ (recipient_account_id, dedupe_key) ; CHECK cible complète ou absente |
| `audit_events` | PK id ; FK actor_account_id → accounts ; référence historique de l'objet sans FK polymorphe |

### 2.1. Provenance des votes (B1)

Chaîne obligatoire de FK composites :

```text
meeting_participants(mandate_id, member_id) → mandates(id, member_id)
ballots(decision_id, meeting_id) → decisions(id, meeting_id)
ballot_votes(ballot_id, meeting_id) → ballots(id, meeting_id)
ballot_votes(participation_id, meeting_id, mandate_id)
    → meeting_participants(id, meeting_id, mandate_id)
ballot_votes(mandate_id, seat_id) → mandates(id, seat_id)
mandates(seat_id) → seats(id)
```

Les cibles possèdent les UQ composites correspondantes. Les colonnes partagées sont déduites côté serveur, jamais fournies librement par le client. `UNIQUE(meeting_id, member_id)` et `UNIQUE(ballot_id, participation_id)` garantissent au plus un vote par membre dans ce scrutin ; `UNIQUE(ballot_id, seat_id)` garantit au plus un vote par siège. La présence, la date de validité et le droit effectif à représenter le siège restent des contrôles transactionnels.

La FK `decisions(agenda_proposal_id, meeting_id)` → `agenda_proposals(id, meeting_id)` utilise MATCH SIMPLE, avec une FK distincte obligatoire de `meeting_id` vers meetings. Ainsi une proposition renseignée appartient à la même réunion. Ne pas utiliser `SET NULL` global sur la FK composite (meeting_id est obligatoire).

### 2.2. Unicités avec NULL

PostgreSQL accepte plusieurs NULL dans une contrainte UNIQUE ordinaire : `accounts.member_id`, `stored_files.document_version_id` et `notifications(recipient_account_id, dedupe_key)` utilisent ce comportement. Ne pas utiliser `NULLS NOT DISTINCT` sur ces contraintes. L'unicité de déduplication couvre toutes les notifications, y compris les lignes retirées logiquement.

## 3. Contraintes CHECK et EXCLUDE (contrat SQL)

Les expressions sont à traduire en contraintes nommées dans les migrations. Les types enum doivent correspondre aux noms/valeurs SQL réellement générés. Un CHECK qui vaut NULL n'est pas un rejet en PostgreSQL : utiliser NOT NULL pour les champs obligatoires, `IS NULL`/`IS NOT NULL` et conditions explicites pour les relations conditionnelles.

| ID | Table(s) | Expression / invariant à garantir |
|---|---|---|
| SQL-01 | accounts, members | `email <> '' AND email = lower(btrim(email))` ; UQ dans chaque table. Normaliser et valider la forme de courriel côté serveur. |
| SQL-02 | accounts | `role = 'ADMIN' OR member_id IS NOT NULL`. Le rôle d'accès ne dérive pas de la fonction du mandat. |
| SQL-03 | mandates | `start_date <= end_date` ; exclusions de recouvrement inclusif (voir §3.1). |
| SQL-04 | meetings | `start_time < end_time` ; `started_at IS NULL OR closed_at IS NULL OR started_at <= closed_at`. Les transitions et instants nouveaux requis relèvent du service. |
| SQL-05 | agenda_proposals | `sort_order IS NULL OR sort_order >= 0` ; auteur obligatoire par FK ; relecteur requis pour revue nouvelle par service, pas d'acteur fictif pour import. |
| SQL-06 | decisions | `(status = 'PENDING' AND final_source IS NULL) OR (status IN ('ADOPTED','REJECTED') AND final_source IS NOT NULL)` ; `archived_at IS NULL OR status IN ('ADOPTED','REJECTED')`. La validité réelle de la provenance est inter-tables. |
| SQL-07 | ballots, ballot_results | `quorum_percent BETWEEN 1 AND 100` et `majority_percent BETWEEN 1 AND 100`. Pour ballots : `opened_at IS NULL OR closed_at IS NULL OR opened_at <= closed_at`. |
| SQL-08 | ballot_results | Cohérence arithmétique et issue finale (§3.2) ; snapshot_version positif (complément technique proposé). |
| SQL-09 | actions | `sort_order >= 0` ; FK responsable non nullable. |
| SQL-10 | document_versions | `number > 0` ; `is_historical OR author_account_id IS NOT NULL`. Présence effective d'un fichier pour toute nouvelle version vérifiée par service. |
| SQL-11 | stored_files | `size_bytes BETWEEN 0 AND 10485760` ; `(agenda_proposal_id IS NOT NULL) <> (document_version_id IS NOT NULL)` ; storage_key unique. |
| SQL-12 | documents, meeting_minutes | `(status = 'ARCHIVED') = (archived_at IS NOT NULL)`. Import avec date d'archive imprécise : exclure ou faire évoluer explicitement le modèle, pas d'instant inventé. |
| SQL-13 | meeting_minutes | `version > 0` ; `(snapshot_version IS NULL) = (official_snapshot IS NULL)` ; `status NOT IN ('TO_SIGN','SIGNED','ARCHIVED') OR official_snapshot IS NOT NULL`. Version de capture positive si renseignée (complément proposé). |
| SQL-14 | notifications | `(target_type IS NULL) = (target_id IS NULL)` ; destinataire obligatoire ; UQ de déduplication non partielle. |

Les champs de texte obligatoires ne signifient pas automatiquement texte non blanc. Les noms, titres, références, salle et résumé soumis sont validés selon les règles de création/transitions du service. Des CHECK non blancs supplémentaires peuvent être retenus si compatibles avec la reprise et documentés ; ne pas imposer de nouvelles limites arbitraires. Limites de formulaire observées : titre agenda/document 150, titre décision/action 160, description agenda 1 800 caractères.

### 3.1. Exclusion des chevauchements de mandats

Dans la migration du lot 1, avant les exclusions, y compris sur base de validation :

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE mandates ADD CONSTRAINT mandates_seat_kind_no_overlap
  EXCLUDE USING gist (seat_id WITH =, kind WITH =,
    daterange(start_date, end_date, '[]') WITH &&);
ALTER TABLE mandates ADD CONSTRAINT mandates_member_no_overlap
  EXCLUDE USING gist (member_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&);
ALTER TABLE mandates ADD CONSTRAINT mandates_function_no_overlap
  EXCLUDE USING gist (function WITH =,
    daterange(start_date, end_date, '[]') WITH &&)
  WHERE (function IN ('PRESIDENT', 'SECRETARY', 'ARCHIVIST'));
```

Exemple indicatif, vérifier noms/types et SQL généré. Bornes inclusives : deux mandats de même qualité sur un même siège ne peuvent pas partager le dernier/premier jour. Titulaire et suppléant distincts peuvent coexister sur ce siège. Le membre ne peut pas cumuler des mandats simultanés (choix V1) ; un président, secrétaire ou archiviste à la fois pour une même fonction. Une période non occupée est autorisée. Les FK et EXCLUDE n'imposent pas à elles seules au moins un mandat par membre : création et conservation dans une transaction métier.

### 3.2. Cohérence du résultat définitif

Tous les compteurs non négatifs ; seuils décimaux exacts ; expressions PostgreSQL proposées (à assembler en CHECK nommés). Éviter la division par zéro et les calculs flottants à la frontière de majorité.

```sql
represented_seat_count <= active_seat_count
for_count + against_count = expressed_count
expressed_count + abstain_count = votes_cast
votes_cast + uncast_count = represented_seat_count
quorum_min_seats = ceil(active_seat_count * quorum_percent / 100)
quorum_reached = (active_seat_count > 0 AND represented_seat_count >= quorum_min_seats)
participation_percent = CASE WHEN active_seat_count = 0 THEN 0
  ELSE round(100::numeric * represented_seat_count / active_seat_count) END
```

L'issue est déterminée exactement ainsi :

```sql
CASE
  WHEN NOT quorum_reached THEN outcome = 'QUORUM_NOT_REACHED'
  WHEN expressed_count > 0
    AND 100::numeric * for_count > majority_percent * expressed_count
    THEN outcome = 'ADOPTED'
  ELSE outcome = 'REJECTED'
END
```

Ces checks valident la cohérence d'une ligne, pas la correspondance avec les bulletins et mandats réels. Le service calcule les compteurs et les captures dans une transaction cohérente, puis vérifie les seuils de la capture contre ceux du scrutin. À 100 % de majorité stricte, aucune adoption possible (choix V1 conservant le comportement observé). Les abstentions comptent dans les votes déposés mais pas dans les exprimés. Le quorum est basé sur les sièges actifs et représentés, non sur le nombre de bulletins déposés.

## 4. Règles métier transactionnelles — contrat backend

Toutes les opérations requièrent une session valide, un compte actif, les permissions et, le cas échéant, l'identité membre liée. L'admin n'est pas un super-rôle métier. Les mutations reçoivent des commandes métier et non des champs d'état arbitraires. Les erreurs d'intégrité doivent être traduites en réponses explicites sans révéler de données privées.

### 4.1. Comptes, annuaire et mandats

| ID | Contrôle obligatoire côté service |
|---|---|
| MET-01 | Admin seul pour créer/modifier les comptes, rôles et annuaire. Associer les comptes non-admin à un membre unique ; compte et annuaire ont des courriels indépendants. Normalisation avant écriture. Profil modifiable uniquement par son propriétaire ; contact_email n'altère pas le login. |
| MET-02 | Désactivation plutôt que suppression physique des comptes ; révoquer sessions, refuser authentification et accès des inactifs. Au moins un admin actif doit subsister, y compris en cas de mutations concurrentes de rôle ou d'activation. |
| MET-03 | Créer membre + premier mandat dans la même transaction ; interdiction de supprimer le dernier mandat d'un membre. Les renouvellements créent de nouvelles lignes. Respecter les exclusions SQL. |
| MET-04 | Mandat référencé par séance démarrée ou historique définitif immuable et non supprimable. Corrections de mandats avant démarrage : revalider les participations futures, et retirer les votes ouverts devenus invalides si une mutation d'éligibilité légitime les affecte. Refuser toute modification invalidant une référence historique. Ne pas supprimer de membre référencé. |

### 4.2. Réunions, convocations et agenda

| ID | Contrôle obligatoire côté service |
|---|---|
| MET-05 | Secrétaire crée PLANNED et modifie uniquement une réunion planifiée. Titre, date, heures et salle valides ; pas de séance traversant minuit. Toute modification du jour ou d'un mandat revalide les participants et leurs mandats couvrant ce jour (bornes inclusives). |
| MET-06 | Secrétaire envoie/renvoie les convocations d'une réunion planifiée aux comptes actifs liés aux participants. Refuser si aucun destinataire. Enregistrer le dernier envoi et les notifications ensemble. Une modification significative après convocation notifie l'union des anciens et nouveaux participants actifs ; simple réordre de l'agenda exclu. |
| MET-07 | Président démarre uniquement PLANNED avec titre/date/horaires/salle complets, au moins un participant et un point validé. Puis données de séance et agenda verrouillés. Président clôture uniquement IN_PROGRESS, sans scrutin ouvert. Inscrire started_at/closed_at aux transitions. Pas de réouverture ni d'annulation implémentée en V1 (CANCELLED réservé). |
| MET-08 | Président, secrétaire, membre proposent sous leur propre identité membre. Auteur modifie sa proposition PROPOSED/REJECTED uniquement tant que la réunion est planifiée. Président examine, valide/rejette, identifie relecteur et ordonne les points officiels ; retrait éventuel avant démarrage, interdit si référencé. Aucun changement d'agenda après démarrage, quelle que soit la voie d'écriture. |
| MET-09 | Les propositions APPROVED seules composent l'ordre du jour officiel ; tri par sort_order puis critère stable. Les propositions rejetées/proposées restent séparées. Aucune copie de l'agenda dans meetings. |
| MET-10 | Une participation par réunion/membre, mandat du même membre applicable au jour de séance. Président ou secrétaire seuls relèvent la présence pendant IN_PROGRESS. NULL signifie non renseignée. Après clôture, présence verrouillée. Toute perte de représentation invalide le vote correspondant dans tous les scrutins ouverts de cette réunion, dans la même transaction que la mise à jour. |

### 4.3. Scrutins, votes et décisions (B1 et B2)

| ID | Contrôle obligatoire côté service |
|---|---|
| MET-11 | Président ou secrétaire crée une décision PENDING pendant IN_PROGRESS (extension au président proposée V1). Réunion obligatoire ; proposition facultative mais de même réunion. Référence métier unique générée atomiquement. Aucun client ne fixe un statut définitif ou une provenance d'import. |
| MET-12 | Président seul ouvre un scrutin si réunion IN_PROGRESS, décision PENDING et aucun scrutin préalable (même clos sans quorum). Enregistrer OPEN, seuils valides, opened_at ; pas de résultat définitif. |
| MET-13 | Siège actif si au moins un mandat couvre le jour de réunion, indépendamment des invités. Titulaire actif présent prioritaire ; sinon suppléant actif présent, y compris en l'absence de titulaire actif (choix V1). Les deux peuvent être présents sans deux votes. |
| MET-14 | Déposer/modifier/retirer son propre vote : compte de rôle PRESIDENT, SECRETARY ou MEMBER, actif, membre lié, participation de la réunion et mandat correspondant au siège, actif à la date, membre présent représentant effectivement son siège, réunion IN_PROGRESS, scrutin OPEN. Les identifiants de provenance sont dérivés par le serveur. Seule exception au retrait par l'auteur : invalidation automatique d'un vote devenu inéligible pendant ouverture. |
| MET-15 | Président seul clôture un scrutin OPEN pendant IN_PROGRESS. Verrouiller contexte, recalculer représentation et votes valides ; appliquer §3.2 ; enregistrer exactement un résultat et ses captures, fermer scrutin, mettre à jour décision, audit et notifications de publication dans une transaction. |
| MET-16 | Scrutin OPEN : aucun résultat définitif en état stable ; CLOSED : exactement un résultat. Après clôture, interdire toute modification des seuils/paramètres, réouverture, suppression du scrutin, INSERT/UPDATE/DELETE des votes et des résultats. Exception de création historique réservée à un import contrôlé, jamais via CRUD ordinaire. |
| MET-17 | Une nouvelle décision devient ADOPTED ou REJECTED exclusivement via clôture avec quorum, final_source=BALLOT. Sans quorum : PENDING, final_source=NULL, visible comme bloquée (dérivé), aucun second scrutin, action liée ou archivage définitif. Exception historique sans scrutin : final_source=HISTORICAL_IMPORT, procédure contrôlée et audit. Les décisions définitives restent immuables hors archivage. |

### 4.4. Actions de suivi

| ID | Contrôle obligatoire côté service |
|---|---|
| MET-18 | Secrétaire crée, modifie, attribue et supprime les actions selon conservation. Membre responsable existant. Action autonome permise ; si décision liée, elle est ADOPTED et son jour est au plus celui de l'échéance. Réciproquement une décision liée à une action reste adoptée. |
| MET-19 | Seul un compte MEMBER affecté peut modifier le statut de sa propre action dans le cadre de ce droit ; le secrétaire garde les droits de gestion. Réordonner les colonnes Kanban transactionnellement si nécessaire. Le retard est dérivé : action non DONE et échéance dépassée (fin de journée Africa/Algiers). L'évolution des actions ne modifie jamais un PV signé. |

### 4.5. Documents, fichiers, PV et archives

| ID | Contrôle obligatoire côté service |
|---|---|
| MET-20 | Secrétaire crée/modifie les documents non archivés. Création sans version permise ; une nouvelle version exige fichier durable et auteur authentifié, numéro unique (allocation sous verrou ou retry). Version ancienne sans binaire uniquement via import is_historical. Pas de suppression documentaire ordinaire ; archive immuable. |
| MET-21 | Au plus cinq pièces d'agenda par proposition, maximum 10 Mio chacune ; extensions observées PDF, DOC, DOCX, PNG, JPG, TXT pour l'agenda. Contrôler contenu et MIME, nom/clé sans traversée de chemin, autorisation au téléchargement. Stockage privé sur volume Docker persistant ; gérer compensation entre BDD et fichiers en cas d'échec ; ne pas créer de faux binaires historiques. |
| MET-22 | Appliquer les droits de lecture à la liste, au détail, à la recherche, aux archives, au téléchargement et à l'export (matrice §5). Les liens directs ne contournent jamais la visibilité. |
| MET-23 | Secrétaire crée un PV unique en réunion IN_PROGRESS ou CLOSED. Modifie seulement DRAFT ; présence dérivée de la feuille. Soumission seulement après clôture, résumé non blanc et au moins un présent. Capturer le contenu officiel, versionner, passer TO_SIGN, enregistrer date et acteur, audit et notification. |
| MET-24 | Président seul depuis TO_SIGN sur réunion CLOSED : retour DRAFT avec date/motif éventuel ou signature unique. Resoumission remplace la capture non signée. Signature préserve la capture soumise, enregistre signataire authentifié/nom/instant et met la réunion à MINUTES_SIGNED atomiquement avec audit et notifications. Signature métier, non cryptographique. |
| MET-25 | PV SIGNED/ARCHIVED : interdire modification du contenu et suppression physique. Export et consultation utilisent la capture signée. Archiviste seul archive PV SIGNED, décisions définitives de séance CLOSED/MINUTES_SIGNED, documents autorisés hors modification de séance en cours ; métadonnées d'archivage uniquement, audit. Pas de désarchivage des objets métier. |

### 4.6. Notifications et audit

| ID | Contrôle obligatoire côté service |
|---|---|
| MET-26 | Notification individuelle pour chaque destinataire actif lors de l'événement. Émettre dans la transaction métier (ou événement durable si architecture ultérieure asynchrone). Vérifier cible polymorphe type/UUID à l'émission ; à la lecture du lien, revérifier les droits d'accès à l'objet. Émetteur facultatif pour système. |
| MET-27 | Seul destinataire peut lire/modifier l'état de sa notification. Marquer lu renseigne read_at ; non lu l'efface ; archive renseigne archived_at ; restauration l'efface. Retrait renseigne deleted_at de manière terminale. Exclure ces lignes de toutes vues, détails, archives et compteurs ; pas de réactivation ordinaire. |
| MET-28 | Clé stable d'occurrence par destinataire pour événement automatique. Relance technique identique réutilise clé et ne réactive jamais une notification retirée. Nouvelle mutation réelle ou renvoi volontaire = nouvelle occurrence. UQ non partielle et aucune purge physique de lignes dédupliquées V1. |
| MET-29 | Planificateur serveur (à implémenter) : rappel réunion planifiée dans 24 h, action non terminée dans 48 h avant échéance, retard après échéance locale en fin de journée ; déduplication par événement, échéance/occurrence et destinataire. Aucun e-mail ni SMS. |
| MET-30 | Audit append-only des opérations sensibles : acteur authentifié si humain, instant réel, code d'opération, type/id objet et contexte minimal sans secrets ; import historique tracé. Protéger UPDATE/DELETE ordinaires. Les références d'audit survivent à la disparition légitime d'un objet. |

## 5. Accès et ciblage

### 5.1. Lecture documentaire

| Visibilité / état | ADMIN | PRESIDENT | SECRETARY | ARCHIVIST | MEMBER |
|---|:---:|:---:|:---:|:---:|:---:|
| Document COMMITTEE | Oui | Oui | Oui | Oui | Oui |
| Document PRESIDENCY | Oui | Oui | Oui | Oui | Non |
| Document ARCHIVES | Oui | Oui | Non | Oui | Non |
| PV DRAFT / TO_SIGN | Non | Oui | Oui | Non | Non |
| PV SIGNED / ARCHIVED | Oui | Oui | Oui | Oui | Oui |

Sous réserve du compte actif et du périmètre autorisé. Les archives conservent les droits d'origine ; ne pas confondre visibilité ARCHIVES et statut ARCHIVED. L'admin n'acquiert pas les droits d'écriture métier du président/secrétaire/archiviste.

### 5.2. Notifications internes par événement

Les événements sont émis à l’issue d’une opération réussie, dans la même transaction que la mutation (ou via un événement durable transactionnel). Aucun courriel ni SMS. Les comptes destinataires sont actifs au moment de l’émission et associés aux personnes concernées si nécessaire. Pour les événements de rôle, **choix V1** : tous les comptes actifs du rôle concerné, plutôt que le premier compte trouvé par le prototype.

| Événement | Destinataires |
|---|---|
| Convocation / renvoi | Comptes des participants invités. |
| Modification d’une réunion après convocation | Union des anciens et nouveaux participants concernés. |
| Annulation | Type conservé ; émission à prévoir si le workflow d’annulation est implémenté. |
| Rappel réunion planifiée dans les 24 h | Comptes des participants. |
| Nouvelle proposition d’agenda | Président(s). |
| Validation ou rejet de proposition | Compte de l’auteur. |
| Décision devenue adoptée ou rejetée | Comptes des participants à la réunion ; une occurrence de publication par résultat. |
| Attribution d’action non terminée | Compte du responsable. |
| Réattribution | Comptes de l’ancien et du nouveau responsable, si actifs. |
| Modification d’échéance, rappel dans les 48 h ou retard | Compte du responsable de l’action non terminée. |
| Soumission / resoumission du PV | Président(s). |
| Retour pour correction du PV | Secrétaire(s). |
| Signature du PV | Secrétaire(s) ; notification distincte de disponibilité aux archivistes. |

Les événements identiques mais correspondant à deux mutations réelles distinctes ne doivent pas être confondus ; la clé de déduplication identifie l’occurrence et le destinataire, pas seulement le type. Les rappels se fondent sur l’occurrence de l’échéance ou de la réunion et le destinataire ; aucune répétition à chaque passage du planificateur. L’ouverture de la cible réapplique les droits d’accès à l’objet.

## 6. Atomicité, concurrence et protections historiques

**Proposition d'implémentation :** convenir d'une stratégie commune de transactions sérialisables avec retry borné sur conflits, ou verrous explicites dans un ordre unique. Ne pas mélanger des chemins d'écriture qui ignorent les mêmes invariants. Exemples de frontières obligatoires :

| Mutation | À réaliser atomiquement / sous contrôle de concurrence |
|---|---|
| Désactivation/changement rôle | Verrou commun des mutations admin (ou SERIALIZABLE), revérifier au moins un admin actif avant commit. |
| Membre / mandat | Création avec mandat, revalidation des participations, contraintes d'exclusion. |
| Présence | Mise à jour feuille + revalidation et retrait des votes ouverts invalides. |
| Vote / ouverture / clôture | Verrouiller réunion puis scrutin dans un ordre partagé ; empêcher dépôt concurrent après clôture ; résultat, décision, audit, notifications dans même transaction de clôture. |
| Version documentaire | Allocation du numéro + métadonnées + vérification du fichier ; gérer compensation stockage hors transaction SQL (suppression du fichier temporaire/orphelin ou retry). |
| Soumission / signature PV | État réunion et PV cohérents, capture, audit, notifications. Une seule signature réussit. |
| Notifications | Insertion idempotente avec UQ destinataire/clé ; conflit traité sans réactivation ou écrasement. |

**Protection historique :** service obligatoire pour toutes les mutations. Des triggers et privilèges SQL peuvent renforcer l'interdiction INSERT/UPDATE/DELETE sur votes et résultats clos, la suppression de scrutins clos ou PV signés/archivés, et les mutations du journal d'audit. Le choix des triggers doit être documenté et testé. Un trigger de fermeture doit permettre la transaction de création du résultat puis passage à CLOSED, sans accepter un résultat sur scrutin OPEN en état stable ; une simple FK/UNIQUE ne suffit pas. Pas de promesse de protection contre SQL direct si seuls les services sont implémentés. Restreindre l'accès aux identifiants de BDD, ne pas exposer un CRUD direct contournant les services. Séparer les droits de migration et les droits d'exécution si possible. La procédure d'import contrôlé ne doit pas offrir de contournement aux utilisateurs ordinaires.

## 7. Ordre des migrations et contrôles

| Lot | Tables | Contrôles à livrer avec le lot |
|---|---|---|
| 1 | members, seats, mandates, accounts, account_profiles | PK/FK/UQ, SQL-01–03, btree_gist avant EXCLUDE |
| 2 | meetings, meeting_participants, agenda_proposals | FK composites mandat/membre, uniques, SQL-04–05 |
| 3 | decisions, ballots, ballot_votes, ballot_results, actions | FK composites de provenance, uniques, SQL-06–09, arithmétique résultat |
| 4 | documents, document_versions, stored_files, meeting_minutes | FK/UQ, SQL-10–13, rattachement exclusif fichier |
| 5 | notifications, audit_events | FK/UQ, SQL-14, index de consultation, conservation de la déduplication |

Utiliser `relationMode = "foreignKeys"` (ou son comportement par défaut vérifié) ; valider le mapping des FK composites qui partagent des colonnes avec la version Prisma choisie. Inspecter et compléter chaque SQL avant application. Les CHECK/EXCLUDE personnalisés restent versionnés dans les migrations ; vérifier leur conservation lors d'une migration ultérieure. Activer `btree_gist` dans la migration, pas uniquement manuellement ; vérifier droits/disponibilité sur base locale, CI, staging et shadow database. Le seed s'exécute après tous les lots pour disposer de l'audit ; ne pas modifier les migrations déjà partagées.

Contrôles d'exécution attendus : `prisma validate`, rejeu sur base vierge dédiée, inspection de `pg_constraint`/`pg_indexes` et `pg_extension`, vérification des actions FK, test de toutes les contraintes négatives et seed cohérent. Ne pas réinitialiser une base partagée ou de production pour faire ces vérifications.

## 8. Scénarios de recette à implémenter

Les tests ci-dessous sont des cas attendus, pas des résultats d'exécution. Prévoir une base de test isolée et des dates de référence déterministes.

| ID | Niveau | Scénario | Attendu |
|---|---|---|---|
| T01 | SQL | Deux emails canoniques identiques dans accounts ; email non canonique direct | Refus UQ/CHECK ; même courriel dans members et accounts permis. |
| T02 | SQL/service | Compte non-admin sans membre ; deux comptes liés au même membre | Refus ; compte admin non lié permis. |
| T03 | Service/concurrence | Désactiver ou changer le rôle des deux derniers admins actifs simultanément | Au moins un reste actif. |
| T04 | SQL | Mandat fin antérieure au début ; recouvrement inclusif même siège/qualité, même membre ou fonction unique | Refus CHECK/EXCLUDE. |
| T05 | SQL/service | Titulaire et suppléant distincts même siège, périodes simultanées ; renouvellement non chevauchant | Accepté ; historique conservé. |
| T06 | SQL/service | Deux participations même réunion/membre ; mandat d'un autre membre ; mandat hors jour de séance | Refus UQ/FK pour les deux premiers, refus service pour le troisième. |
| T07 | Service | Démarrage sans participant ou point validé ; clôture avec scrutin ouvert | Refus ; état inchangé. |
| T08 | Service | Éditer une proposition d'autrui ou après démarrage ; secrétaire tente validation | Refus ; auteur peut modifier sa proposition admissible planifiée. |
| T09 | SQL | Décision liée à une proposition d'une autre réunion | Refus FK composite ; lien agenda NULL autorisé. |
| T10 | SQL | Vote utilisant participation d'une autre réunion, mandat discordant ou siège différent | Refus FK composite, même si chaque identifiant existe. |
| T11 | SQL | Deux votes pour même siège ou même participation dans un scrutin | Refus UQ. |
| T12 | Service | Titulaire présent et suppléant présent ; suppléant tente de voter | Refus suppléant ; si titulaire absent, suppléant actif présent autorisé. |
| T13 | Service | Suppléant vote puis titulaire devient présent avant clôture | Vote devenu invalide retiré atomiquement. |
| T14 | SQL/service | Seuil hors 1–100 ; résultat incohérent ; zéro siège actif | Refus CHECK si incohérent ; quorum faux lorsque zéro actif. |
| T15 | Service | 5 actifs, quorum 60 %, 2 représentés | Minimum 3 ; résultat sans quorum ; décision PENDING bloquée, sans second scrutin ni action liée. |
| T16 | Service | 4 représentés, quorum atteint, votes 2 pour, 1 contre, 1 abstention, majorité 50 % | 3 exprimés ; décision adoptée, capture cohérente. |
| T17 | Service | Égalité au seuil, zéro exprimé ou majorité stricte 100 % | Pas d'adoption ; si quorum atteint, rejet. |
| T18 | Service/concurrence | Dépôt concurrent avec clôture ; deux demandes de clôture | Un état cohérent, un seul résultat, aucun vote après clôture. |
| T19 | Service (+ SQL si renforcé) | INSERT/UPDATE/DELETE vote/résultat ou suppression/réouverture scrutin clos | Refus ; snapshot inchangé. |
| T20 | Service | Nouvelle décision adoptée directement ; import historique définitif sans scrutin | Refus voie ordinaire ; import contrôlé autorisé et audité. |
| T21 | Service | Action liée décision non adoptée ou échéance antérieure ; retirer statut adopté d'une décision liée | Refus ; action autonome acceptée. |
| T22 | SQL/service | Fichier sans propriétaire ou deux propriétaires ; doublon de version ; fichier > 10 Mio ; six pièces d'agenda | Refus SQL pour propriétaire/version/taille, service pour quantité. |
| T23 | Service | Deux créations de version concurrentes ; version nouvelle sans binaire ou auteur | Numéros distincts ou conflit géré ; aucune version nouvelle incomplète. |
| T24 | Service | Lecture directe d'un document PRESIDENCY ou ARCHIVES par MEMBER, y compris après archivage | Refus sur toutes voies ; droits d'origine préservés. |
| T25 | SQL/service | Deux PV même réunion ; soumission avant clôture, résumé vide ou zéro présent | Refus UQ et contrôles de transition. |
| T26 | Service/concurrence | PV soumis, retourné, resoumis puis double demande de signature | Capture remplacée avant signature, une signature, réunion MINUTES_SIGNED. |
| T27 | Service (+ SQL si renforcé) | Modifier/supprimer PV signé ou archivé ; changer action source après signature | Refus mutation PV ; contenu figé indépendant ; archivage dédié seul autorisé. |
| T28 | SQL/service | Notification cible partielle ; destinataire différent tente de lire/retirer | Refus CHECK et autorisation. |
| T29 | Service/SQL | Retirer notification dédupliquée, rejouer même occurrence, puis nouvelle occurrence | Aucune recréation/réactivation de l'ancienne ; nouvelle occurrence permise. |
| T30 | Service | Archiver puis restaurer notification non retirée ; lire puis non lu ; compteur | Dates correctement nullées, lignes retirées exclues. |
| T31 | Service | Rappels dans 24 h / 48 h, retard d'action non terminée, répétition planificateur | Bon ciblage, pas de doublon, aucun rappel d'action DONE. |
| T32 | Service (+ SQL si renforcé) | Modifier/supprimer audit via voie ordinaire ; tentative d'inclure un secret | Refus ou exclusion du secret ; audit append-only. |
| T33 | Migration/seed | Rejouer tous lots sur BDD vierge et réexécuter seed | Contraintes présentes, références cohérentes, absence d'écrasement et import historique tracé. |

## 9. Arbitrages et limites à communiquer

- Les choix V1 du MCD/MLD restent à approuver : mono-comité, non-cumul des mandats, représentation sans titulaire actif, droit de création de décision au président, scrutin obligatoire pour nouvelles décisions définitives, blocage sans quorum, pas de réouverture/second tour, visibilité, archivage métier définitif, stockage privé et snapshots.
- Le retrait logique terminal et la conservation de la clé de déduplication sont protégés par PostgreSQL. Le filtrage de `deleted_at` dans les requêtes utilisateur reste au backend.
- Les versions d’instantanés positives sont contrôlées dans les migrations. La structure des données JSONB reste à valider dans les services.
- Les sessions, la politique de hachage des comptes réels, les codes d’audit et l’attribution des références métier restent à coordonner. Le [seed](SEED.md) documente le hachage des seuls comptes de démonstration.
- La sixième migration fournit les [protections historiques](PROTECTIONS_SQL.md). Les [tests BDD](TESTS_BDD.md) couvrent les contraintes SQL, le rejeu et les courses vote–clôture. Le [guide backend](GUIDE_INTEGRATION_BACKEND.md) détaille les règles encore applicatives.
