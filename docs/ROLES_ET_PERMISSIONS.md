# Gestion des rôles et des permissions

**Projet :** Gestion du comité scientifique — Dev Rangers  
**Révision frontend vérifiée** `ab88bba`

**Objet** Référentiel fonctionnel des droits d’accès et des contrôles à reprendre dans le backend Next.js / PostgreSQL.

La matrice s’appuie sur les règles métier validées, les capacités de rôle, les projections de lecture et les contrôles de mutation du frontend statique. La [revue de cohérence](REVUE_COHERENCE_FRONTEND_BDD.md) précise les décisions qui restent ouvertes pour les API.

## 1. Principes généraux

L'application distingue deux notions :

- **Rôle du compte utilisateur :** détermine les modules accessibles et les opérations autorisées.
- **Qualité de membre du comité :** détermine notamment la fonction, le type titulaire ou suppléant, le siège, le mandat et les conditions d'éligibilité au vote.

Les permissions doivent respecter le principe du moindre privilège. Un acteur ne peut pas effectuer une opération réservée à un autre acteur au seul motif qu'il possède un rôle d'administration technique.

Les autorisations dépendent également de l'état de l'objet métier (réunion, scrutin, PV, archive), de ses relations et, lorsque nécessaire, de l'identité du propriétaire ou du responsable.

Le système actuel est un prototype frontend : les sessions, les comptes et les collections sont simulés dans le navigateur. Les contrôles d'interface et du magasin local ne constituent pas une sécurité serveur.

## 2. Acteurs et responsabilités

| Acteur fonctionnel                        | Rôle de connexion | Responsabilités principales                                                                                                                                                                                                                                                             |
| ----------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Président                                 | `president`       | Valider ou rejeter les propositions avec un motif pour chaque rejet, réordonner les points validés d’une réunion planifiée, diriger les réunions, gérer les présences, créer les décisions, organiser les scrutins, gérer les actions et contrôler et signer les PV. Voter si éligible. |
| Secrétaire                                | `secretary`       | Préparer les réunions, gérer participants, convocations, présences et actions, créer et modifier les documents non archivés et déposer leurs versions, puis rédiger et soumettre les PV. Voter si éligible.                                                                             |
| Membre titulaire                          | `member`          | Consulter les informations autorisées, proposer des points, voter si éligible et suivre ses actions.                                                                                                                                                                                    |
| Membre suppléant                          | `member`          | Mêmes droits généraux qu'un membre titulaire, avec un droit de vote conditionné au remplacement effectif du titulaire.                                                                                                                                                                  |
| Administration / responsable des archives | `archivist`       | Consulter les informations nécessaires à l'archivage et archiver les PV signés, les décisions et les documents autorisés.                                                                                                                                                               |
| Administrateur technique                  | `admin`           | Administrer les comptes, les rôles, les membres et les mandats. Consulter le journal d’audit en lecture seule.                                                                                                                                                                          |

**Distinctions essentielles :**

- `archivist` représente l'administration chargée des archives au sens du sujet du professeur. Il ne s'agit pas du rôle `admin`.
- Le suppléant n'est pas un sixième rôle technique. Il partage le rôle `member` et est distingué par son type de membre et son siège.
- Le président et le secrétaire ne disposent pas d'un vote supplémentaire en raison de leur fonction : ils restent soumis aux règles de mandat, de siège et de présence.
- L'administrateur technique ne valide pas l'ordre du jour, ne conduit pas les réunions, ne vote pas, ne signe pas les PV et n'archive pas en lieu et place des acteurs métier.

## 3. Matrice des droits

### 3.1. Convention de lecture

| Symbole | Signification                                                                  |
| ------- | ------------------------------------------------------------------------------ |
| `O`     | Autorisé pour un compte actif ayant accès au module.                           |
| `C`     | Autorisé sous conditions d’état, de visibilité, d’identité ou de conservation. |
| `—`     | Aucune permission dans le périmètre documenté.                                 |

Les colonnes **Tit.** et **Sup.** représentent deux catégories du même rôle de connexion `member`. Les droits de consultation sont toujours limités aux modules et aux données autorisés ; `O` n'implique pas une visibilité sur toutes les données de l'application.

### 3.2. Matrice principale — réunions, ordre du jour, votes et PV

| Action                                                                                                         | Président | Secrétaire | Tit. | Sup. | Archives | Admin |
| -------------------------------------------------------------------------------------------------------------- | :-------: | :--------: | :--: | :--: | :------: | :---: |
| Consulter les modules métier autorisés                                                                         |     O     |     O      |  O   |  O   |    O     |   O   |
| Créer et planifier une réunion                                                                                 |     —     |     C      |  —   |  —   |    —     |   —   |
| Modifier une réunion planifiée                                                                                 |     —     |     C      |  —   |  —   |    —     |   —   |
| Annuler une réunion planifiée (`CANCELLED`)                                                                    |     —     |     C      |  —   |  —   |    —     |   —   |
| Envoyer / renvoyer les convocations internes                                                                   |     —     |     C      |  —   |  —   |    —     |   —   |
| Proposer un point en son nom dans une réunion planifiée et accessible                                          |     C     |     C      |  C   |  C   |    —     |   —   |
| Consulter les points validés d’une réunion accessible                                                          |     C     |     C      |  C   |  C   |    C     |   C   |
| Consulter les propositions proposées ou rejetées d’autrui dans une réunion accessible                          |     C     |     C      |  C   |  C   |    —     |   —   |
| Retirer sa propre proposition proposée ou rejetée, sans référence métier, dans une réunion planifiée           |     C     |     C      |  C   |  C   |    —     |   —   |
| Valider ou rejeter une proposition, y compris celle du secrétaire (motif non vide obligatoire pour tout rejet) |     C     |     —      |  —   |  —   |    —     |   —   |
| Réordonner les points validés de l’ordre du jour tant que la réunion est planifiée                             |     C     |     —      |  —   |  —   |    —     |   —   |
| Démarrer une réunion                                                                                           |     C     |     —      |  —   |  —   |    —     |   —   |
| Gérer les présences pendant la réunion                                                                         |     C     |     C      |  —   |  —   |    —     |   —   |
| Organiser et paramétrer un scrutin                                                                             |     C     |     —      |  —   |  —   |    —     |   —   |
| Déposer, modifier ou retirer son propre vote                                                                   |     C     |     C      |  C   |  C   |    —     |   —   |
| Consulter les choix de vote nominatifs des autres votants                                                      |     —     |     —      |  —   |  —   |    —     |   —   |
| Clôturer une réunion                                                                                           |     C     |     —      |  —   |  —   |    —     |   —   |
| Rédiger et soumettre un PV                                                                                     |     —     |     C      |  —   |  —   |    —     |   —   |
| Demander une correction du PV                                                                                  |     C     |     —      |  —   |  —   |    —     |   —   |
| Signer le PV                                                                                                   |     C     |     —      |  —   |  —   |    —     |   —   |
| Archiver les PV, décisions et documents éligibles                                                              |     —     |     —      |  —   |  —   |    C     |   —   |
| Gérer les comptes, rôles et paramètres utilisateur                                                             |     —     |     —      |  —   |  —   |    —     |   O   |
| Consulter le journal d’audit en lecture seule                                                                  |     —     |     —      |  —   |  —   |    —     |   O   |
| Modifier ou supprimer un événement d’audit                                                                     |     —     |     —      |  —   |  —   |    —     |   —   |

### 3.3. Matrice complémentaire — administration, réunions et documents

Les droits documentaires suivent les [règles MET-20 et MET-25](database/REGLES_INTEGRITE.md#45-documents-fichiers-pv-et-archives).

| Action                                                                                      | Président | Secrétaire | Tit. | Sup. | Archives | Admin |
| ------------------------------------------------------------------------------------------- | :-------: | :--------: | :--: | :--: | :------: | :---: |
| Consulter l’annuaire et les mandats affichés                                                |     O     |     O      |  O   |  O   |    O     |   O   |
| Ajouter, modifier ou retirer un membre selon les règles de conservation                     |     —     |     —      |  —   |  —   |    —     |   C   |
| Gérer les mandats et l’association des sièges                                               |     —     |     —      |  —   |  —   |    —     |   C   |
| Gérer les participants d’une réunion planifiée                                              |     —     |     C      |  —   |  —   |    —     |   —   |
| Modifier sa propre proposition proposée ou rejetée dans une réunion planifiée et accessible |     C     |     C      |  C   |  C   |    —     |   —   |
| Créer un document                                                                           |     —     |     C      |  —   |  —   |    —     |   —   |
| Modifier un document non archivé                                                            |     —     |     C      |  —   |  —   |    —     |   —   |
| Déposer une nouvelle version d’un document non archivé                                      |     —     |     C      |  —   |  —   |    —     |   —   |
| Valider un document ordinaire (`DRAFT` → `APPROVED`)                                        |     —     |     C      |  —   |  —   |    —     |   —   |
| Attribuer ou modifier la visibilité d’un document non archivé                               |     —     |     C      |  —   |  —   |    —     |   —   |
| Supprimer un document par une opération ordinaire                                           |     —     |     —      |  —   |  —   |    —     |   —   |
| Imprimer / exporter en PDF un PV consultable                                                |     C     |     C      |  C   |  C   |    C     |   C   |
| Consulter les archives autorisées                                                           |     C     |     C      |  C   |  C   |    C     |   C   |
| Rechercher dans les archives autorisées avec les filtres existants                          |     C     |     C      |  C   |  C   |    C     |   C   |
| Rechercher dans les champs affichés des PV et décisions accessibles                         |     C     |     C      |  C   |  C   |    C     |   C   |

L’impression PDF est accessible depuis l’éditeur de tout PV consultable. La recherche porte sur les champs exposés, dont le résumé, les notes et les éléments de séance d’un PV ainsi que le titre, la référence et la description d’une décision. Les archives appliquent le périmètre de lecture des objets et normalisent la casse, les accents et la ponctuation. Le filtre « Procès-verbal » couvre les entrées de type PV. Le périmètre d’une éventuelle recherche plein texte indexée reste à définir.

### 3.4. Matrice complémentaire — décisions, actions et espace personnel

Les droits de création de décision et de gestion des actions ci-dessous sont confirmés. Le moteur local applique les mêmes contrôles de gestion des actions au président et au secrétaire.

| Action                                                                                       | Président | Secrétaire | Tit. | Sup. | Archives | Admin |
| -------------------------------------------------------------------------------------------- | :-------: | :--------: | :--: | :--: | :------: | :---: |
| Créer une décision en attente pendant la séance                                              |     C     |     —      |  —   |  —   |    —     |   —   |
| Ouvrir ou clôturer le scrutin d’une décision                                                 |     C     |     —      |  —   |  —   |    —     |   —   |
| Créer et attribuer une action de suivi                                                       |     C     |     C      |  —   |  —   |    —     |   —   |
| Éditer les champs de gestion ou réattribuer une action                                       |     C     |     C      |  —   |  —   |    —     |   —   |
| Déplacer ou réordonner toute carte Kanban, avec changement de statut                         |     C     |     C      |  —   |  —   |    —     |   —   |
| Changer uniquement le statut d’une action qui lui est attribuée                              |     C     |     C      |  C   |  C   |    —     |   —   |
| Supprimer une action selon les règles de conservation, hors capture d’un PV signé ou archivé |     C     |     C      |  —   |  —   |    —     |   —   |
| Consulter ses notifications                                                                  |     C     |     C      |  C   |  C   |    C     |   C   |
| Marquer ses notifications comme lues ou non lues                                             |     C     |     C      |  C   |  C   |    C     |   C   |
| Archiver, restaurer ou retirer ses propres notifications                                     |     C     |     C      |  C   |  C   |    C     |   C   |
| Consulter son profil                                                                         |     O     |     O      |  O   |  O   |    O     |   O   |
| Modifier les champs de son profil personnel                                                  |     C     |     C      |  C   |  C   |    C     |   C   |
| Modifier son propre rôle ou mandat via le profil                                             |     —     |     —      |  —   |  —   |    —     |   —   |

La clôture du scrutin détermine l’issue et déclenche l’avis de décision finale. Une commande de publication distincte, si elle est requise, reste à arbitrer. Les lectures documentaires suivent la [matrice de visibilité](database/REGLES_INTEGRITE.md#51-lecture-documentaire). Tous les rôles accèdent à leur propre profil. Le formulaire du prototype permet de modifier le prénom, le nom, l’adresse e-mail de contact, le téléphone, la fonction affichée, le département et la présentation. L’adresse de connexion, le rôle et le mandat sont gérés séparément.

## 4. Logique métier par domaine

### 4.1. Comptes, membres, mandats et sièges

- La connexion et les pages privées nécessitent un compte valide et actif. L’administrateur gère les comptes, les rôles, l’annuaire et les données de mandat et de siège.
- Le compte de connexion et le membre sont deux objets distincts, reliés par `memberId` lorsqu'une correspondance est nécessaire.
- Un mandat possède une période de validité. Le module Membres contrôle les périodes et les sièges. Le retrait d’un membre référencé est bloqué. Le contrat de conservation des membres et mandats non référencés reste à préciser côté serveur.
- La présence n'est pas un attribut global permanent du membre : elle est propre à une réunion. Le siège, le type de membre et le mandat déterminent la représentation possible.
- Un compte sans membre rattaché ne doit pas voter en tant que membre. Une association absente doit aussi être prise en compte lors du ciblage des convocations.
- Pour le backend, garantir l'intégrité des relations compte–membre–mandat–siège. PostgreSQL interdit déjà le chevauchement des mandats de même fonction de président, de secrétaire ou d’archiviste.
- Un changement de rôle, de mandat ou de siège ne doit pas réécrire les résultats et documents historiques.

### 4.2. Cycle de vie des réunions

Le statut initial d'une nouvelle réunion est `Planifiée`. Le statut ne doit pas être modifiable librement depuis un formulaire générique. Les transitions doivent passer par des commandes métier dédiées.

| Transition              | Acteur     | Conditions et effets                                                                                                                          |
| ----------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Création → Planifiée    | Secrétaire | Renseigner les informations de réunion ; préparer participants et ordre du jour.                                                              |
| `PLANNED` → `CANCELLED` | Secrétaire | Utiliser le statut existant. Envoyer un avis interne aux comptes actifs des participants déjà convoqués. Conserver la réunion et ses données. |
| Planifiée → En cours    | Président  | Titre, date, horaires et salle renseignés, au moins un participant et un point validé. Enregistrer le démarrage effectif.                     |
| En cours → Clôturée     | Président  | Aucun scrutin associé ne doit rester ouvert. Enregistrer la clôture effective et verrouiller les opérations de séance.                        |
| Clôturée → PV signé     | Président  | Uniquement en signant le PV associé, après soumission par le secrétaire. Mettre à jour les deux états de manière cohérente.                   |

Règles à conserver :

- Aucun saut d'étape ni retour arbitraire vers un état antérieur.
- Pendant la planification, le secrétaire peut préparer la réunion et envoyer ses convocations. Le président peut valider ou rejeter les propositions et réordonner les points validés de l’ordre du jour.
- L’annulation passe par une commande dédiée, sans nouvel attribut d’annulation. Elle reste possible avant toute convocation et ne produit alors aucun avis.
- Le prototype donne au président et au secrétaire accès aux réunions, et aux autres comptes accès aux réunions où leur membre figure parmi les participants. L’archiviste accède aussi aux réunions clôturées ou avec PV signé. Les listes, le calendrier, le détail et les liens directs suivent ce périmètre.
- Pendant la séance, le président et le secrétaire peuvent renseigner les présences. Les membres éligibles votent. L'ordre du jour officiel et les informations initiales ne doivent plus être librement modifiables.
- Après clôture, aucun nouveau scrutin ne peut être lancé ; les présences, résultats et éléments de séance doivent être préservés.
- La signature du PV ne met pas fin au suivi des actions issues de la réunion.
- L'archivage est distinct du statut de réunion : une réunion au statut `PV signé` peut avoir un PV non encore archivé.

### 4.3. Ordre du jour collaboratif

- Le président, le secrétaire, les titulaires et les suppléants peuvent proposer en leur nom pendant la planification. Ils peuvent aussi consulter les propositions des autres membres dans chaque réunion accessible, y compris celles qui sont proposées ou rejetées. Les droits de modification, de retrait, de revue et de réordonnancement suivent leurs règles propres. Dans les réunions accessibles, l’admin et l’archiviste voient les propositions d’autrui qui ont été validées. Toute extension de cette lecture à leurs rôles reste à arbitrer.
- Chaque proposition identifie son auteur, son contenu et sa réunion.
- Seul le président peut valider ou rejeter une proposition, y compris une proposition créée par le secrétaire. Tout rejet exige un motif non vide après retrait des espaces en début et en fin.
- Seules les propositions validées figurent à l’ordre du jour officiel. Seul le président peut les réordonner, et uniquement tant que la réunion est planifiée.
- L’auteur peut modifier le contenu de sa proposition proposée ou rejetée tant que la réunion est planifiée et accessible. Le magasin synchronise les points validés avec la réunion.
- Seul l’auteur peut retirer sa propre proposition `PROPOSED` ou `REJECTED` tant que la réunion est `PLANNED` et qu’aucune décision ni autre donnée métier ne dépend de la proposition. Les références historiques de l’audit et des notifications sont conservées lors du retrait.
- Le démarrage de la réunion fige l’ordre des points validés.

### 4.4. Présences, suppléance et vote

La présence est gérée depuis les détails de la réunion ou le module Votes et résultats. Les deux interfaces partagent la même information métier. Seuls le président et le secrétaire gèrent les présences pendant une réunion en cours ; après clôture, elles sont consultables uniquement.

Un vote est autorisé si les conditions suivantes sont remplies :

1. Le compte correspond à un membre habilité à voter, avec mandat actif selon la date pertinente de la séance.
2. Le membre est présent et représente effectivement son siège.
3. La réunion est en cours et le scrutin est ouvert.
4. Le vote porte sur un scrutin autorisé et ne conduit pas à un double vote pour le même siège.

**Règle de représentation :**

| Situation                                   | Représentant du siège    |
| ------------------------------------------- | ------------------------ |
| Titulaire actif et présent                  | Titulaire                |
| Titulaire absent et suppléant actif présent | Suppléant                |
| Titulaire et suppléant présents             | Titulaire uniquement     |
| Aucun représentant éligible présent         | Aucun vote pour ce siège |

Le prototype applique aussi la suppléance lorsqu’aucun titulaire n’a de mandat actif à la date de la réunion. Le référentiel BDD décrit ce cas comme un choix V1 à entériner.

Le votant peut déposer, modifier ou retirer son propre vote tant que les conditions d’éligibilité sont réunies. Le vote est enregistré par siège. Lorsque les présences changent, seuls les scrutins ouverts sont actualisés et les bulletins devenus invalides sont retirés. Un scrutin clôturé conserve son état historique, ses participants et son résultat.

La consultation présente le vote propre et les résultats agrégés autorisés. Aucun rôle ne peut consulter les choix nominatifs des autres membres.

**Quorum et majorité :** le président paramètre le scrutin. D'après l'audit, le quorum est calculé à partir des sièges représentés par rapport aux sièges actifs (seuil entier arrondi au supérieur). Les abstentions ne sont pas comptées dans les suffrages exprimés servant à la majorité. La règle auditée est strictement supérieure au seuil : `pour × 100 / (pour + contre) > seuilMajorité`. Une égalité ne suffit donc pas à adopter une décision selon cette règle ; aucun suffrage exprimé ou quorum non atteint ne doit conduire à une adoption. Vérifier ces modalités avec les exigences du professeur et tester les cas limites avant leur implémentation serveur.

La projection locale ne transmet à l’écran que le bulletin du compte courant et les résultats agrégés. Le serveur devra dériver l’identité du votant de la session et appliquer cette même confidentialité au détail, aux exports et à l’audit.

### 4.5. Décisions et actions

- Seul le président crée une décision en attente pendant une réunion en cours. Un point de l’ordre du jour de cette réunion peut être lié à la décision. Tous les points ne nécessitent pas un vote.
- Le résultat d'une décision issue d'un scrutin doit être cohérent avec le résultat clôturé. Une décision rejetée ne doit pas apparaître comme adoptée.
- Une action possède un responsable, une échéance et un statut. Elle peut être autonome ou liée à une décision adoptée dont la date est au plus égale à l’échéance.
- Le président et le secrétaire peuvent créer, éditer les champs existants, attribuer, réattribuer, déplacer, réordonner et supprimer les actions selon les règles de conservation. Un compte `member` affecté peut modifier uniquement le statut de son action.
- Le suivi des actions reste possible après clôture, signature et archivage des documents de séance. Le contenu historique d'un PV signé ne doit pas évoluer rétroactivement lorsque les actions avancent.
- Aucun rôle ne peut supprimer une action qui figure dans l’instantané d’un PV signé, y compris après archivage du PV.
- Les suppressions ne doivent pas casser les références entre réunions, points, scrutins, décisions et actions.

Le calcul des retards utilise une date de référence commune. Une action terminée sort du suivi des retards courants.

### 4.6. Documents de séance

Un document de la bibliothèque peut être associé à une réunion. Son fichier appartient à une version documentaire. Les pièces d’agenda sont déposées directement sur la proposition et sont distinctes de la bibliothèque.

- Seul le secrétaire peut créer un document, modifier un document non archivé et y déposer une nouvelle version. Un document peut être créé sans version. Tout nouveau dépôt de version exige un fichier durable et un auteur authentifié.
- Seul le secrétaire valide un document ordinaire en le faisant passer de `DRAFT` à `APPROVED`, sans circuit d’approbation supplémentaire.
- Seul le secrétaire attribue et modifie la visibilité des documents non archivés avec l’une des trois valeurs existantes `COMMITTEE`, `PRESIDENCY` et `ARCHIVES`. Cette permission ne confère aucun accès de lecture supplémentaire, y compris pour la visibilité `ARCHIVES`.
- Aucun rôle ne peut supprimer un document par une opération ordinaire, quel que soit son statut. Un document archivé est immuable.
- Seul l’archiviste peut archiver un document éligible selon les conditions de la section 4.8. L’archivage passe par une action dédiée.
- La consultation et le téléchargement sont soumis aux mêmes autorisations que l'accès au document. Un lien direct ne doit pas contourner ces droits.
- Les métadonnées sont persistées localement dans la version actuelle, mais pas le contenu binaire des pièces jointes. Le stockage et le contrôle d'accès aux fichiers seront à implémenter côté serveur.

### 4.7. Procès-verbaux : rédaction, correction et signature

Le secrétaire saisit uniquement les notes et informations complémentaires nécessaires. Le PV est généré à partir du modèle structuré et des données disponibles de la réunion : participants, présences, ordre du jour, décisions, résultats, actions et clôture. Ne pas inventer des informations manquantes.

| État du PV           | Secrétaire                                                                            | Président                                   | Archiviste            |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------- |
| Brouillon (`DRAFT`)  | Rédiger, corriger, prévisualiser, soumettre ou resoumettre si la réunion est clôturée | Consulter                                   | —                     |
| À signer (`TO_SIGN`) | Consulter la version soumise                                                          | Consulter, retourner au brouillon ou signer | —                     |
| Signé (`SIGNED`)     | Consulter                                                                             | Consulter                                   | Consulter et archiver |
| Archivé (`ARCHIVED`) | Consulter                                                                             | Consulter                                   | Consulter             |

Le retour pour correction renvoie le PV au statut Brouillon et renseigne `returnedAt`. La soumission intervient après clôture avec un résumé non vide et au moins un présent. Elle capture le contenu officiel. Chaque resoumission actualise la capture, que la signature fige.

- Seul le président signe le PV soumis d’une réunion clôturée. Le frontend simule cette validation métier.
- Enregistrer l'identité du signataire et l'horodatage ; coordonner la signature et le passage de la réunion à `PV signé`.
- L’aperçu, l’impression et la recherche des PV soumis, signés ou archivés s’appuient sur la capture officielle pour les données reprises de la séance. Les modifications ultérieures des membres, décisions, résultats ou actions ne réécrivent pas le contenu signé.
- Le frontend propose l’impression et l’export PDF du navigateur.

### 4.8. Archivage et historique

Seul l’archiviste (`archivist`) archive les PV signés, les décisions et les documents autorisés. Les métadonnées d'archivage (`archivedAt`, `archivedBy` ou équivalents) conservent la date et l'auteur de l'opération.

- Un PV non signé ne peut pas être archivé.
- Les éléments archivés sont consultables mais non modifiables via les opérations ordinaires. La restauration ou la désarchivation n'est pas une permission établie : ne pas l'introduire sans décision explicite.
- Seules les décisions définitives d’une réunion clôturée ou avec PV signé sont éligibles. Le prototype autorise l’archivage d’un document consultable, non archivé, sans réunion ou rattaché à une réunion planifiée, clôturée ou avec PV signé. Les critères serveur pour les documents de réunion planifiée restent à préciser. [Règle MET-25](database/REGLES_INTEGRITE.md#45-documents-fichiers-pv-et-archives)
- Les archives sont une vue de consultation et de filtrage du module Documents/PV. Ne pas supposer qu'elles constituent une collection ou une table SQL distincte.
- La recherche plein texte future doit appliquer les mêmes filtres d'accès que la consultation, y compris pour les extraits de résultats.

### 4.9. Notifications internes

Les notifications sont exclusivement internes à l'application. Aucun e-mail, SMS ou service de notification externe n'est prévu.

| Événement documenté                | Destinataire                                                              |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Envoi ou renvoi de convocations    | Comptes associés aux participants concernés                               |
| Annulation d’une réunion planifiée | Comptes actifs des participants déjà convoqués, une fois par destinataire |
| Soumission / resoumission du PV    | Président                                                                 |
| Demande de correction du PV        | Secrétaire                                                                |
| Signature du PV                    | Secrétaire                                                                |
| PV disponible pour archivage       | Responsable des archives                                                  |

Les notifications ciblées sont stockées avec un `recipientId`. La cloche et le centre filtrent selon le compte courant. Chaque compte doit agir uniquement sur ses notifications (lecture, archivage, restauration selon les fonctions disponibles). L'administrateur ne doit pas recevoir automatiquement les notifications des autres utilisateurs. Le lien vers l'objet métier ne confère aucun droit supplémentaire.

Le moteur local émet aussi des avis de modification significative de réunion, de revue de proposition, de résultat de décision et de suivi des actions. Les rappels sont calculés pendant l’utilisation de la maquette. L’exécution à application fermée relève du backend.

### 4.10. Tableau de bord, navigation et internationalisation

- La navigation, les raccourcis et les boutons doivent refléter les permissions. Un accès interdit doit rester interdit même par URL directe.
- Le tableau de bord ne doit afficher que les informations et statistiques autorisées ; sa personnalisation détaillée selon les rôles est une amélioration proposée, non une fonctionnalité intégralement confirmée.
- Les trois langues FR, EN et AR utilisent les mêmes règles d'autorisation. Le changement de langue ne modifie ni les droits ni les données métier.
- Traduire uniquement les libellés, catégories prédéfinies, statuts et messages système ; ne pas traduire automatiquement les saisies utilisateur ni les données fictives. Préserver le RTL arabe.

### 4.11. Journal d’audit

Seul l’administrateur technique (`admin`) peut consulter le journal d’audit. Le frontend expose une liste chronologique en lecture seule avec la date, l’acteur, l’opération et l’objet concerné. Aucun rôle, y compris l’administrateur technique, ne peut modifier ni supprimer un événement.

## 5. Emplacement de la logique dans le projet

| Fichier / dossier                                     | Responsabilité actuelle                                                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/lib/static-auth.ts`                              | Comptes et session fictifs, rôles, association compte–membre, `rolePermissions`, `hasPermission`, mapping route–module. |
| `src/components/auth/static-auth-guard.tsx`           | Garde des pages privées côté client.                                                                                    |
| `src/middleware.ts`                                   | Routage localisé et contrôle du cookie de démonstration.                                                                |
| `src/features/users/users-client.tsx`                 | Gestion des comptes par l'administrateur.                                                                               |
| `src/lib/demo-store.ts`                               | Collections partagées, contrôle des mutations par acteur, persistance locale et appel des règles métier.                |
| `src/lib/demo-visibility.ts`                          | Périmètre de lecture des réunions, propositions, PV, décisions, actions et scrutins.                                    |
| `src/lib/demo-business.ts`                            | Transitions réunion/PV, convocations, synchronisations, notifications et contrôles transversaux.                        |
| `src/features/members/utils.ts`                       | Validations des mandats et sièges.                                                                                      |
| `src/features/votes/utils.ts`                         | `seatRepresentations`, `calculateBallot`, règles de représentation et calcul des résultats.                             |
| `src/features/meetings/`                              | Formulaire, détail, convocations, feuille de présence et workflow.                                                      |
| `src/features/agenda/`                                | Proposition, validation et rattachement des points.                                                                     |
| `src/features/votes/`                                 | Organisation, participation, paramètres et résultats des scrutins.                                                      |
| `src/features/decisions/`                             | Décisions, attribution et suivi des actions.                                                                            |
| `src/features/documents/`                             | Dépôt, PV, aperçu, signature et archives.                                                                               |
| `src/features/notifications/`                         | Centre, types, utilitaires, filtrage et interactions sur les notifications.                                             |
| `src/components/layout/notification-dropdown.tsx`     | Cloche, compteur et accès rapide aux notifications.                                                                     |
| `src/data/navigations.ts` et `src/components/layout/` | Navigation et affichage conditionnel des modules.                                                                       |
| `src/features/ui-text.ts`, dictionnaires FR/EN/AR     | Libellés localisés, dont les rôles et messages d'autorisation.                                                          |

Routes métier localisées par `/fr`, `/en` ou `/ar` : `/members`, `/meetings`, `/agenda`, `/votes`, `/actions`, `/documents`, `/notifications`, `/profile`, `/users`, `/audit` et `/dashboards/analytics`. Les routes `/users` et `/audit` sont réservées à l’administrateur technique.

## 6. Reprise des permissions côté backend

Cette section décrit les exigences de la prochaine phase, non une architecture serveur déjà implémentée.

Le serveur doit être la source d'autorité pour toutes les opérations. Le client ne doit jamais pouvoir décider lui-même de son rôle, de son identité, de la validité d'un vote ou de l'état d'un PV.

### 6.1. Modèle d'autorisation recommandé

Adopter une combinaison de RBAC (permissions selon le rôle) et de contrôles métier contextuels (propriété, mandat, présence, siège, statut).

Pour chaque opération :

1. Authentifier la session et vérifier que le compte est actif.
2. Vérifier le rôle et la permission requise.
3. Charger l'objet cible et contrôler le périmètre de lecture ou d'écriture.
4. Vérifier les conditions métier et les références associées.
5. Exécuter les changements de manière transactionnelle lorsque plusieurs entités sont affectées.
6. Générer les notifications uniquement après une mutation réussie, sans doublons involontaires.
7. Retourner un résultat ou une erreur explicite sans exposer de données non autorisées.

Le rôle, le signataire, le votant, l'archiveur et le destinataire ne doivent pas être acceptés aveuglément depuis le corps d'une requête. Les informations d'identité dérivent de la session authentifiée.

### 6.2. Contrôles techniques recommandés

- Sessions sécurisées, mots de passe hachés et secrets conservés hors du dépôt.
- Vérification des permissions à chaque requête serveur, y compris les lectures, téléchargements, recherches et mutations directes.
- Codes HTTP appropriés : 401 pour une session absente ou invalide, 403 pour une action interdite, 404 pour un objet introuvable (ou non divulguable selon la politique choisie), 409 pour un conflit d'état métier et 400/422 pour des données invalides.
- Contraintes PostgreSQL et transactions pour l'unicité des bulletins par scrutin et siège, les références, les transitions concurrentes et la signature simultanée réunion/PV.
- Conservation des résultats clôturés et instantanés des PV signés ; prévention des modifications historiques et des suppressions référencées.
- Journaliser les opérations sensibles avec acteur, opération, objet et horodatage. PostgreSQL protège les événements existants. Le service réserve la lecture à l’administrateur technique.
- Réutiliser les règles métier utiles de `demo-business.ts` et des utilitaires, mais ne pas transférer la confiance accordée au `localStorage` vers les API.

## 7. Checklist de validation

À utiliser pour la recette frontend puis les tests d'intégration backend. Une case non cochée ne signifie pas nécessairement que la fonctionnalité est absente ; elle indique que ce document ne certifie pas son test.

### 7.1. Identité et accès

- [ ] Chaque rôle dispose d'un compte de test actif ; titulaire et suppléant sont correctement reliés à leur membre et siège.
- [ ] Un compte désactivé ne peut pas se connecter ni continuer à utiliser une session autorisée.
- [ ] Un membre ne peut pas accéder à la gestion des comptes ou modifier son propre rôle.
- [ ] L'administrateur technique ne peut pas exercer les commandes du président, du secrétaire ou de l'archiviste.
- [ ] Les routes et mutations non autorisées sont refusées même sans passer par les boutons visibles.

### 7.2. Cycle de réunion et scrutin

- [ ] Le secrétaire crée une réunion planifiée et envoie les convocations ciblées.
- [ ] Seul le secrétaire peut annuler une réunion planifiée. Vérifier le statut `CANCELLED` et un avis interne par participant déjà convoqué et actif, sans avis pour les participants jamais convoqués.
- [ ] Les listes, le calendrier et le détail d’une réunion respectent le périmètre d’invitation et les accès métier existants.
- [ ] Vérifier la lecture des propositions d’autrui par le président, le secrétaire, le titulaire et le suppléant dans une réunion accessible, ainsi que le refus hors périmètre et l’absence de droits d’écriture liés à la lecture.
- [ ] Tester l’approbation et le rejet d’une proposition du secrétaire par le président. Refuser ces commandes aux autres rôles.
- [ ] Refuser tout rejet dont le motif est absent, vide ou composé uniquement d’espaces.
- [ ] À l’étape 04 de la simulation, saisir obligatoirement le motif indiqué pour le rejet. [Scénario PDF](Simulation_Workflow_Comite_Scientifique.pdf#page=5)
- [ ] Autoriser le réordonnancement des seuls points validés par le président tant que la réunion est planifiée. Refuser l’opération aux autres rôles et après le démarrage.
- [ ] Autoriser le retrait par l’auteur de sa proposition proposée ou rejetée et non référencée en réunion planifiée. Refuser le retrait par un tiers, sur un point validé ou référencé et après sortie de `PLANNED`.
- [ ] Seul le président peut créer une décision en attente pendant la séance. Vérifier le refus même par appel direct à la mutation.
- [ ] Seul le président peut démarrer et clôturer une réunion ; les sauts de statut sont refusés.
- [ ] Seuls le président et le secrétaire modifient les présences pendant la séance.
- [ ] Les deux écrans de présence utilisent la feuille de la réunion. Une mise à jour recalcule la représentation dans les scrutins ouverts.
- [ ] Le titulaire présent est prioritaire ; le suppléant éligible remplace le titulaire absent ; aucun double vote.
- [ ] Mandat expiré, compte inactif, absence, siège vacant et tentative de vote pour autrui sont testés.
- [ ] Les lectures de scrutin et de résultats n’exposent aucun choix nominatif d’un autre membre.
- [ ] Les cas limites de quorum, majorité, égalité et abstention sont testés.
- [ ] Une réunion ne peut pas être clôturée avec un scrutin ouvert.
- [ ] Un scrutin clôturé ne peut plus être modifié et conserve ses résultats historiques.

### 7.3. Documents, PV, actions et archives

- [ ] Le secrétaire rédige et soumet le PV. Après retour au statut Brouillon par le président, le secrétaire corrige puis resoumet. Vérifier la capture à chaque soumission et sa mise à jour après correction.
- [ ] Le président signe uniquement un PV soumis et associé à une réunion clôturée.
- [ ] La signature met à jour le statut de la réunion ; une seconde signature ou modification est refusée.
- [ ] Les données reprises dans le PV signé restent stables après modification des informations courantes.
- [ ] Seul le secrétaire peut créer un document, modifier un document non archivé et y déposer une version. Refuser toute suppression documentaire ordinaire pour chaque rôle et chaque statut.
- [ ] Seul le secrétaire valide un document ordinaire et attribue ou modifie sa visibilité parmi `COMMITTEE`, `PRESIDENCY` et `ARCHIVES`. Vérifier le refus sur document archivé et le maintien des droits de lecture.
- [ ] Seul l’archiviste archive les éléments autorisés, dont les documents éligibles. Refuser l’archivage d’un PV non signé.
- [ ] Un élément archivé ne peut plus être modifié via les opérations ordinaires.
- [ ] Les actions attribuées restent suivies après signature et archivage selon les droits retenus.
- [ ] Vérifier que président et secrétaire peuvent éditer, réattribuer, déplacer, réordonner et supprimer selon conservation, et qu’un membre ne modifie que le statut de sa propre action.
- [ ] Refuser la suppression d’une action mentionnée dans la capture d’un PV signé ou archivé, y compris pour le président et le secrétaire.
- [ ] Vérifier le filtre « Procès-verbal » et la recherche sans accents dans les archives en conservant les règles de visibilité.
- [ ] Les références supprimées, les documents inaccessibles et la recherche future respectent les permissions.

### 7.4. Notifications et non-régression

- [ ] Chaque compte ne voit et ne modifie que ses notifications.
- [ ] Seul l’administrateur technique peut ouvrir la liste du journal d’audit. L’interface et l’API n’autorisent aucune modification ni suppression d’événement.
- [ ] Le président est notifié à la soumission du PV, le secrétaire lors d'une correction, et les destinataires prévus lors de la signature.
- [ ] La cloche, le centre et les états lu/non lu sont synchronisés après changement de compte et rechargement.
- [ ] Les nouveaux événements de notification et rappels sont testés si leur implémentation a été terminée.
- [ ] Les mêmes droits sont appliqués en français, anglais et arabe/RTL.
- [ ] Les tests TypeScript, lint, build et Playwright sont exécutés sur le commit courant et les résultats consignés.

## 8. Points à arbitrer avant de figer les API

1. Préciser le périmètre serveur des champs de l’annuaire, des accès aux réunions hors invitation et des pièces d’agenda. Toute extension aux propositions proposées ou rejetées pour l’admin ou l’archiviste reste à décider.
2. Définir les opérations de resoumission ou de remise en attente d’une proposition et l’éventuelle obligation d’un motif de retour du PV. Le prototype propose ces transitions d’agenda et retourne le PV au brouillon sans exiger de motif.
3. Préciser la conservation des membres, mandats, pièces et actions, notamment le cas d’une action retirée entre soumission et signature du PV.
4. Confirmer les règles de séance encore ouvertes, le périmètre des résultats agrégés pendant un scrutin ouvert et l’éventuel avis de publication distinct d’une décision.
5. Préciser le ciblage des avis et le périmètre d’une éventuelle recherche avancée. Les archives et exports du prototype suivent la visibilité des objets accessibles.

Sources de référence et décisions d’harmonisation. [Architecture actuelle](ARCHITECTURE.md) · [Règles d’intégrité](database/REGLES_INTEGRITE.md) · [Revue de cohérence](REVUE_COHERENCE_FRONTEND_BDD.md)
