# Guide d’intégration backend

Le schéma, les migrations et le client serveur sont disponibles. La connexion du frontend au backend, l’authentification réelle et les API métier restent à implémenter. Préparer le poste avec le [guide d’installation](../setup.md) et exécuter `pnpm db:generate` après tout changement du schéma.

## Utiliser Prisma côté serveur

Importer `prisma` depuis `@/lib/prisma` dans des modules réservés au serveur Node.js. Le singleton configure l’adaptateur depuis `DATABASE_URL` et est réutilisé pendant le rechargement en développement. Exclure cet import des composants clients, des bundles Edge et des objets retournés au navigateur. Laisser le singleton ouvert entre requêtes. Les scripts courts le ferment dans un `finally`.

Exemples documentaires sur des modèles existants. `accountId` provient ici d’une session validée et chaque opération suppose un contrôle d’accès préalable. La création suppose l’absence de profil. La réinitialisation d’un profil est l’effacement de sa surcharge, avec conservation du compte.

```ts
import { prisma } from "@/lib/prisma"

await prisma.accountProfile.create({
  data: { account: { connect: { id: accountId } }, department: "Informatique" },
})

const account = await prisma.account.findUniqueOrThrow({
  where: { id: accountId },
  select: {
    id: true,
    firstName: true,
    role: true,
    profile: { select: { department: true } },
  },
})

await prisma.accountProfile.update({
  where: { accountId },
  data: { department: "Mathématiques" },
})

await prisma.accountProfile.delete({ where: { accountId } })
```

Employer des projections explicites pour les réponses. Ne jamais transmettre `passwordHash`. Valider la taille de page, le curseur et les filtres à la frontière de l’API. Un exemple de pagination à ordre stable par UUID pour un annuaire déjà autorisé suit.

```ts
const members = await prisma.member.findMany({
  where: { fullName: { contains: query, mode: "insensitive" } },
  orderBy: { id: "asc" },
  take: 25,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  select: { id: true, fullName: true },
})
```

Les relations se parcourent via `select` et `include`. Préférer des projections limitées et des filtres d’objet. `Decision.ballots` est une liste dans Prisma, car la relation utilise une FK composite. PostgreSQL impose un seul scrutin via l’unicité de `decision_id`. Traiter une liste vide comme une absence de scrutin. Le siège du vote est lié via le mandat, sans relation Prisma directe du vote vers `Seat`.

### Erreurs et transactions

Utiliser `prisma.$transaction(async tx => { ... })` pour les invariants entre tables. Toutes les requêtes de la transaction passent par `tx`. Pour les verrous, utiliser `tx.$queryRaw` avec paramètres liés. Garder la transaction courte et éviter les appels réseau ou effets externes pendant les tentatives.

| Signal | Traitement |
|---|---|
| `P2002` ou PostgreSQL `23505` | Conflit d’unicité. Identifier la contrainte pour choisir entre conflit utilisateur, renumérotation ou idempotence. |
| `P2003` ou `23503` | Référence invalide ou protégée. Relire l’objet réellement accessible. |
| `P2025` | Opération dépendant d’un enregistrement absent. |
| `23514` ou `23P01` | Échec de CHECK, trigger historique ou exclusion. Transformer en erreur métier adaptée. Suivant l’adaptateur, inspecter la cause et le nom de contrainte. |
| `P2034`, `40001` ou `40P01` | Conflit de concurrence ou deadlock. Rejouer toute la transaction avec de nouvelles lectures, un nombre borné de tentatives et un délai progressif. |

Une vérification différée peut échouer au commit. Intercepter donc les erreurs autour de la transaction complète. Retourner un message sûr, et journaliser seulement le code et un contexte non sensible. Chaque tentative doit être idempotente ou annuler tous ses effets. [Transactions Prisma](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions) · [Erreurs Prisma](https://www.prisma.io/docs/orm/v7/reference/error-reference)

## Authentification et comptes

`Account` porte l’email canonique unique, `passwordHash`, `role`, `isActive` et le membre facultatif. `AccountProfile` porte les surcharges de profil et garde le courriel de contact séparé du login. Rôles disponibles : `ADMIN`, `PRESIDENT`, `SECRETARY`, `ARCHIVIST`, `MEMBER`. Le rôle de connexion et la fonction du mandat sont indépendants. Refuser les connexions et actions des comptes désactivés et révoquer leurs sessions.

Le format exact du seed est `scrypt$ln=17,r=8,p=1$<sel-base64url>$<empreinte-base64url>`. Vérifier le format et les longueurs, décoder un sel de 16 octets et une empreinte de 64 octets, dériver 64 octets depuis le mot de passe UTF-8 avec `N=131072`, `r=8`, `p=1`, `maxmem=256 * 1024 * 1024`, puis comparer les octets via `timingSafeEqual`. Les sept comptes et leurs rôles sont listés dans [SEED.md](SEED.md). La limite de huit caractères concerne le seed de démonstration. L’équipe doit fixer la politique des comptes réels, le cycle de vie des sessions, la limitation des tentatives et la rotation des empreintes.

Sérialiser toutes les mutations qui peuvent retirer un administrateur actif, y compris désactivation et changement de rôle, avec un verrou commun ou une transaction `SERIALIZABLE` et une reprise bornée. Vérifier au sein de la transaction qu’il reste au moins un administrateur actif. L’invariant dépend du backend.

## Contrat par domaine

| Domaine et modèles | Garanties PostgreSQL | Travail backend et précautions API |
|---|---|---|
| `Account`, `AccountProfile`, `Member`, `Seat`, `Mandate` | Unicités, membre obligatoire hors admin, FK, dates valides et exclusions inclusives. | Créer membre et premier mandat dans une seule transaction. Contrôler permissions, hachage, dernier admin et protection des mandats historiques. |
| `Meeting`, `MeetingParticipant` | Horaires et dates de cycle cohérents si renseignées, participation unique, mandat du même membre. | Vérifier la date de validité du mandat, transitions, convocations, feuille de présence et conditions de démarrage/clôture. Seul le secrétaire annule une réunion `PLANNED` en passant à `CANCELLED`, sans nouvel attribut. Notifier en interne les comptes actifs déjà convoqués, dans la même transaction. Limiter les lectures au périmètre d’invitation et aux accès métier existants. La participation porte la présence courante à trois états. |
| `AgendaProposal` | Réunion et auteur obligatoires, ordre non négatif si renseigné. | Le président seul valide ou rejette, y compris une proposition du secrétaire. Exiger un motif non vide après retrait des espaces en début et en fin pour tout rejet. Autoriser uniquement le président à réordonner les points validés d’une réunion planifiée. Seul l’auteur retire sa proposition `PROPOSED` ou `REJECTED` non référencée en réunion `PLANNED`. Le président, le secrétaire, les titulaires et les suppléants peuvent consulter les propositions d’autrui, quel que soit leur état, dans les réunions auxquelles ils ont accès. Les droits d’écriture restent soumis à leurs propres conditions. Dériver auteur et relecteur côté serveur, contrôler période d’édition et verrouillage, et retourner uniquement les propositions validées dans l’ordre officiel. |
| `Decision`, `Ballot`, `BallotVote`, `BallotResult` | FK composites, votes uniques, arithmétique locale des résultats, contraintes différées et historique figé. | Le président seul crée une décision `PENDING` en séance. Dériver identités et provenance, puis contrôler présence, suppléance, seuils, décompte, publication et transitions. Exposer le vote propre et les résultats agrégés autorisés, sans choix nominatifs d’autrui. |
| `CommitteeAction` | Responsable obligatoire, décision facultative, ordre non négatif. | Le président et le secrétaire créent, éditent, attribuent, réattribuent, déplacent, réordonnent et suppriment selon conservation. Refuser toute suppression si l’action figure dans l’instantané d’un PV signé ou archivé. Un membre affecté modifie uniquement le statut de sa propre action. Vérifier décision adoptée et échéance compatible, et publier les événements d’affectation. |
| `Document`, `DocumentVersion`, `StoredFile` | Version unique et positive, auteur obligatoire hors reprise, taille bornée, rattachement exclusif, archivage daté. | Réserver au secrétaire la création des documents, la modification des documents non archivés et le dépôt de leurs versions. Réserver au secrétaire la validation directe `DRAFT` → `APPROVED` des documents ordinaires et l’attribution ou la modification de la visibilité des documents non archivés parmi `COMMITTEE`, `PRESIDENCY` et `ARCHIVES`. Refuser toute suppression documentaire ordinaire. Réserver l’archivage à l’archiviste selon MET-25. Appliquer la visibilité à tous les accès. Les fichiers des propositions et des versions documentaires ont chacun leur parent propre. Vérifier fichier réel, contenu et MIME, maximum cinq pièces par proposition et numérotation concurrente des versions. Le stockage physique reste à intégrer. |
| `MeetingMinutes` | PV unique par réunion, instantané obligatoire pour les états concernés, protection du contenu après signature et archivage terminal. | Vérifier rôles et conditions de soumission, de retour à `DRAFT` et de signature. Capturer le contenu à la soumission, le remplacer à la resoumission et le figer à la signature. Utiliser la capture pour la lecture et l’export du PV signé ou archivé. |
| `Notification` | Destinataire et unicité de déduplication, cible typée cohérente, retrait terminal, conservation de la ligne. | Notifications internes uniquement. Filtrer les retirées partout, valider la cible polymorphe et contrôler l’accès sur chaque ouverture. Programmer les rappels et produire des clés stables par occurrence. |
| `AuditEvent` | Acteur facultatif référencé, journal append-only, protection contre TRUNCATE. | Émettre les événements depuis les opérations autorisées. Les références historiques polymorphes survivent à la disparition de l’objet. Réserver la consultation du journal à l’administrateur technique dans une liste en lecture seule. Interdire toute modification et suppression d’événement. Exclure secrets et empreintes des détails. |

## Transactions sensibles

- **Membre et mandat.** Créer l’annuaire puis le premier mandat dans la même transaction. Pour un changement, protéger les références historiques et revalider les participations futures avant l’écriture.
- **Présence et suppléance.** Verrouiller **réunion → scrutins par UUID → lignes dépendantes**. Après acquisition des verrous, lire contexte, mandats, participations et votes. Le titulaire actif présent est prioritaire. Le suppléant actif présent représente le siège si le titulaire est absent ou vacant. Invalider dans cette transaction les votes ouverts devenus inéligibles.
- **Ouverture.** Sous verrou de réunion, vérifier une séance en cours, une décision en attente, l’absence de scrutin et l’autorisation du président. Insérer le scrutin ouvert avec ses paramètres.
- **Clôture.** Acquérir les mêmes verrous, recalculer les votes et le quorum, créer l’instantané du résultat **pendant que le scrutin est ouvert**, puis passer à `CLOSED`. Mettre à jour la décision, écrire audit et notifications, puis valider la transaction. Les triggers différés exigent exactement un résultat au commit d’un scrutin clos. Sans quorum, conserver `PENDING` et signaler l’impossibilité d’un second scrutin en V1. En cas de `40001`, recalculer après la reprise.
- **Actions.** Contrôler le rôle et le périmètre de modification côté service. Pendant un déplacement du président ou du secrétaire, mettre à jour statut et rangs ensemble. Pour un membre affecté, accepter uniquement le statut et calculer tout rang nécessaire côté serveur. Maintenir la cohérence de l’échéance et de la décision liée, avec les événements d’affectation nécessaires dans la transaction.
- **PV.** La soumission après clôture vérifie résumé et présences, puis capture le contenu. Le retour par le président rétablit le statut `DRAFT`. Le secrétaire actualise la capture à la resoumission. Pour signer, verrouiller la réunion puis le PV, vérifier état et rôle, conserver la capture soumise et écrire la signature et `MINUTES_SIGNED` ensemble. Émettre l’audit et les notifications dans la même transaction.
- **Fichier et version.** Autoriser et valider le fichier, puis écrire métadonnées et version sous verrou du document ou avec réessai d’un conflit d’unicité. Le volume ou le stockage externe a sa propre frontière. Prévoir une compensation si la transaction SQL échoue ou si la finalisation du fichier échoue.
- **Émission.** Écrire l’audit et les notifications dans la transaction métier. Distinguer le renvoi volontaire d’une relance technique. Une relance ne modifie ni ne réactive la notification existante. Aucun e-mail ni SMS n’est prévu.

Les instantanés JSONB sont versionnés par le modèle. Valider leur contenu applicatif et conserver les identités, libellés et valeurs figés. Les imports historiques contrôlés peuvent utiliser `HISTORICAL_IMPORT` et des dates ou acteurs inconnus, avec audit. Ce chemin est réservé à l’import. Les contraintes personnalisées et les triggers résident dans les migrations SQL, en complément du schéma Prisma. La base locale utilise encore son compte propriétaire. Prévoir un rôle de migration distinct et un rôle d’exécution non propriétaire avant déploiement. [Règles d’intégrité](REGLES_INTEGRITE.md) · [Protections SQL](PROTECTIONS_SQL.md) · [Dictionnaire](DICTIONNAIRE_DONNEES.md) · [Tests](TESTS_BDD.md)

