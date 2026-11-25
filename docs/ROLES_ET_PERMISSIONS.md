# Gestion des rôles et des permissions

**Projet :** Gestion du comité scientifique — Dev Rangers  
**Branche de référence :** `refactoring/nettoyage-shadboard`  
**Dernier état documenté par Codex :** `af73ad3`  
**Objet :** référentiel fonctionnel des droits d'accès, des règles métier et des contrôles à reproduire lors de l'intégration du backend Next.js / PostgreSQL.

> Ce document s'appuie sur les exigences du professeur, les décisions prises durant le développement et le rapport d'architecture Codex (notamment les commits `f9572c4` et `af73ad3`). Le dépôt source courant n'a pas été inspecté directement. Les droits indiqués comme documentés sont rapportés par Codex, et non certifiés par une nouvelle exécution des tests. Les droits complémentaires à confirmer sont explicitement signalés. Le chantier de finalisation des notifications a été demandé après ce rapport, mais sa réalisation complète n'est pas confirmée.

## 1. Principes généraux

L'application distingue deux notions :

- **Rôle du compte utilisateur :** détermine les modules accessibles et les opérations autorisées.
- **Qualité de membre du comité :** détermine notamment la fonction, le type titulaire ou suppléant, le siège, le mandat et les conditions d'éligibilité au vote.

Les permissions doivent respecter le principe du moindre privilège. Un acteur ne peut pas effectuer une opération réservée à un autre acteur au seul motif qu'il possède un rôle d'administration technique.

Les autorisations dépendent également de l'état de l'objet métier (réunion, scrutin, PV, archive), de ses relations et, lorsque nécessaire, de l'identité du propriétaire ou du responsable.

Le système actuel est un prototype frontend : les sessions, les comptes et les collections sont simulés dans le navigateur. Les contrôles d'interface et du magasin local ne constituent pas une sécurité serveur.

## 2. Acteurs et responsabilités

| Acteur fonctionnel | Rôle de connexion | Responsabilités principales |
| --- | --- | --- |
| Président | `president` | Valider l'ordre du jour, diriger les réunions, gérer les présences, organiser les scrutins, voter si éligible, contrôler et signer les PV. |
| Secrétaire | `secretary` | Préparer les réunions, gérer les participants et les convocations, gérer les présences, rédiger et soumettre les PV, voter si éligible. |
| Membre titulaire | `member` | Consulter les informations autorisées, proposer des points, voter si éligible et suivre ses actions. |
| Membre suppléant | `member` | Mêmes droits généraux qu'un membre titulaire, avec un droit de vote conditionné au remplacement effectif du titulaire. |
| Administration / responsable des archives | `archivist` | Consulter les informations nécessaires à l'archivage et archiver les PV signés, les décisions et les documents autorisés. |
| Administrateur technique | `admin` | Administrer les comptes, les rôles et les paramètres autorisés ; gérer les membres et mandats selon le périmètre fonctionnel retenu. |

**Distinctions essentielles :**

- `archivist` représente l'administration chargée des archives au sens du sujet du professeur. Il ne s'agit pas du rôle `admin`.
- Le suppléant n'est pas un sixième rôle technique. Il partage le rôle `member` et est distingué par son type de membre et son siège.
- Le président et le secrétaire ne disposent pas d'un vote supplémentaire en raison de leur fonction : ils restent soumis aux règles de mandat, de siège et de présence.
- L'administrateur technique ne valide pas l'ordre du jour, ne conduit pas les réunions, ne vote pas, ne signe pas les PV et n'archive pas en lieu et place des acteurs métier.

## 3. Matrice des droits

### 3.1. Convention de lecture

| Symbole | Signification |
| --- | --- |
| `O` | Autorisé d'après la matrice du rapport Codex ou un comportement explicitement décrit dans ce rapport. |
| `C` | Autorisé sous conditions métier documentées ; voir les sections suivantes. |
| `P` | Droit prévu dans les décisions ou prompts précédents, ou proposition complémentaire ; implémentation exacte à confirmer dans le code. |
| `—` | Non autorisé selon la séparation des responsabilités retenue. Pour les lignes marquées **À confirmer**, correspond à la politique proposée, non à un contrôle source vérifié. |
| `?` | Droit non suffisamment documenté ; vérifier la matrice réelle avant de conclure. |

Les colonnes **Tit.** et **Sup.** représentent deux catégories du même rôle de connexion `member`. Les droits de consultation sont toujours limités aux modules et aux données autorisés ; `O` n'implique pas une visibilité sur toutes les données de l'application.

### 3.2. Matrice principale — réunions, ordre du jour, votes et PV

Cette matrice reprend les responsabilités expressément décrites dans le dernier rapport Codex, complétées par l'envoi des convocations confirmé dans son compte-rendu précédent.

| Action | Président | Secrétaire | Tit. | Sup. | Archives | Admin |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Consulter les modules métier autorisés | O | O | O | O | O | O |
| Créer et planifier une réunion | — | O | — | — | — | — |
| Modifier une réunion planifiée | — | O | — | — | — | — |
| Envoyer / renvoyer les convocations internes | — | C | — | — | — | — |
| Proposer un point d'ordre du jour | O | O | O | O | — | — |
| Valider ou rejeter une proposition | C | — | — | — | — | — |
| Démarrer une réunion | C | — | — | — | — | — |
| Gérer les présences pendant la réunion | C | C | — | — | — | — |
| Organiser et paramétrer un scrutin | C | — | — | — | — | — |
| Voter | C | C | C | C | — | — |
| Clôturer une réunion | C | — | — | — | — | — |
| Rédiger et soumettre un PV | — | C | — | — | — | — |
| Demander une correction du PV | C | — | — | — | — | — |
| Signer le PV | C | — | — | — | — | — |
| Archiver les PV, décisions et documents | — | — | — | — | C | — |
| Gérer les comptes, rôles et paramètres utilisateur | — | — | — | — | — | O |

### 3.3. Matrice complémentaire — administration, réunions et documents

Certaines opérations détaillées ne figurent pas individuellement dans la matrice finale du rapport Codex. Les lignes suivantes définissent les droits déjà envisagés ou à arbitrer. Les `P` et `?` doivent être confrontés à `rolePermissions`, aux contrôles de mutation du magasin et aux composants concernés avant de les considérer comme acquis.

| Action | Président | Secrétaire | Tit. | Sup. | Archives | Admin |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Consulter l'annuaire et les mandats autorisés | P | P | P | P | ? | P |
| Ajouter, modifier ou retirer un membre | — | — | — | — | — | P |
| Gérer les mandats et l'association des sièges | — | — | — | — | — | P |
| Gérer la liste des participants d'une réunion planifiée | — | P | — | — | — | — |
| Supprimer / annuler une réunion planifiée (si prévu) | — | ? | — | — | — | — |
| Modifier sa propre proposition non validée | P | P | P | P | — | — |
| Retirer une proposition non validée | ? | ? | ? | ? | — | — |
| Ordonnancer les points validés | ? | ? | — | — | — | — |
| Déposer un document de séance | ? | P | ? | ? | — | — |
| Modifier ou remplacer un document non verrouillé | ? | P | ? | ? | — | — |
| Supprimer un document non référencé et non archivé | ? | ? | ? | ? | — | — |
| Imprimer / exporter un PV consultable | P | P | P | P | P | ? |
| Consulter les archives autorisées | P | P | P | P | O | P |
| Rechercher dans les archives (filtres existants) | P | P | P | P | O | P |
| Rechercher dans le contenu des PV et décisions | P | P | P | P | P | P |

La recherche plein texte est une exigence du professeur, mais son implémentation n'est pas établie dans le dernier rapport. Le droit de recherche doit être limité aux contenus que l'acteur peut consulter.

### 3.4. Matrice complémentaire — décisions, actions et espace personnel

Les droits précis de création, de publication et de modification des décisions et actions ne sont pas détaillés dans le rapport final. La politique suivante est une **proposition à valider** avec l'équipe ; elle ne remplace pas la matrice réellement implémentée.

| Action | Président | Secrétaire | Tit. | Sup. | Archives | Admin |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Enregistrer une décision de séance | P | P | — | — | — | — |
| Ouvrir / clôturer le scrutin d'une décision | P | — | — | — | — | — |
| Publier une décision validée, si action distincte | P | P | — | — | — | — |
| Créer et attribuer une action de suivi | P | P | — | — | — | — |
| Modifier le responsable ou l'échéance d'une action | P | P | — | — | — | — |
| Faire évoluer le statut d'une action qui lui est attribuée | P | P | P | P | — | — |
| Consulter ses notifications | C | C | C | C | C | C |
| Marquer ses notifications comme lues / non lues | P | P | P | P | P | P |
| Archiver ses propres notifications | P | P | P | P | P | P |
| Consulter son profil | P | P | P | P | P | P |
| Modifier ses informations personnelles autorisées | P | P | P | P | P | P |
| Modifier son propre rôle ou mandat via le profil | — | — | — | — | — | — |

**À confirmer impérativement :** création et suppression des décisions, droits de publication, attribution et réattribution des actions, droits de modification des documents par leur auteur, accès précis aux archives et aux données de profil. L'équipe doit arrêter ces détails avant de figer les contrats d'API. Ne pas créer de privilèges supplémentaires sans justification fonctionnelle.

## 4. Logique métier par domaine

### 4.1. Comptes, membres, mandats et sièges

- La connexion et les pages privées nécessitent un compte valide et actif. La gestion des comptes (création, édition, activation, désactivation et attribution de rôle) relève de l'administrateur ; elle est décrite comme implémentée dans le rapport Codex.
- Le compte de connexion et le membre sont deux objets distincts, reliés par `memberId` lorsqu'une correspondance est nécessaire.
- Un mandat possède une période de validité. Les contrôles de cohérence des périodes et des sièges existent dans le module Membres ; vérifier notamment les chevauchements de mandats de même type sur un même siège.
- La présence n'est pas un attribut global permanent du membre : elle est propre à une réunion. Le siège, le type de membre et le mandat déterminent la représentation possible.
- Un compte sans membre rattaché ne doit pas voter en tant que membre. Une association absente doit aussi être prise en compte lors du ciblage des convocations.
- Pour le backend, garantir l'intégrité des relations compte–membre–mandat–siège. Valider la règle d'unicité du président et du secrétaire si le fonctionnement du comité l'impose ; cette règle n'était pas confirmée dans l'audit initial.
- Un changement de rôle, de mandat ou de siège ne doit pas réécrire les résultats et documents historiques.

### 4.2. Cycle de vie des réunions

Le statut initial d'une nouvelle réunion est `Planifiée`. Le statut ne doit pas être modifiable librement depuis un formulaire générique. Les transitions doivent passer par des commandes métier dédiées.

| Transition | Acteur | Conditions et effets |
| --- | --- | --- |
| Création → Planifiée | Secrétaire | Renseigner les informations de réunion ; préparer participants et ordre du jour. |
| Planifiée → En cours | Président | Informations obligatoires complètes ; au moins un point validé selon le scénario de workflow demandé. Vérifier ce dernier prédicat dans le code. Enregistrer le démarrage effectif. |
| En cours → Clôturée | Président | Aucun scrutin associé ne doit rester ouvert. Enregistrer la clôture effective et verrouiller les opérations de séance. |
| Clôturée → PV signé | Président | Uniquement en signant le PV associé, après soumission par le secrétaire. Mettre à jour les deux états de manière cohérente. |

Règles à conserver :

- Aucun saut d'étape ni retour arbitraire vers un état antérieur.
- Pendant la planification, le secrétaire peut préparer la réunion et envoyer ses convocations ; le président valide les propositions d'ordre du jour.
- Pendant la séance, le président et le secrétaire peuvent renseigner les présences. Les membres éligibles votent. L'ordre du jour officiel et les informations initiales ne doivent plus être librement modifiables.
- Après clôture, aucun nouveau scrutin ne peut être lancé ; les présences, résultats et éléments de séance doivent être préservés.
- La signature du PV ne met pas fin au suivi des actions issues de la réunion.
- L'archivage est distinct du statut de réunion : une réunion au statut `PV signé` peut avoir un PV non encore archivé.

### 4.3. Ordre du jour collaboratif

- Les membres titulaires et suppléants, le président et le secrétaire peuvent proposer des points.
- Chaque proposition identifie son auteur, son contenu et sa réunion lorsqu'elle lui est rattachée.
- Seul le président peut valider ou rejeter une proposition. Une proposition non validée ne doit pas intégrer l'ordre du jour officiel comme point approuvé.
- Le magasin répercute les points validés vers la réunion concernée. Une modification d'une proposition ne doit pas créer de copies incohérentes entre les deux modules.
- Les règles de modification par l'auteur, de retrait, de réordonnancement et de verrouillage après validation sont à confirmer dans les sources ; préserver l'ordre du jour historique après clôture.

### 4.4. Présences, suppléance et vote

La présence est gérée depuis les détails de la réunion ou le module Votes et résultats. Les deux interfaces partagent la même information métier. Seuls le président et le secrétaire gèrent les présences pendant une réunion en cours ; après clôture, elles sont consultables uniquement.

Un vote est autorisé si les conditions suivantes sont remplies :

1. Le compte correspond à un membre habilité à voter, avec mandat actif selon la date pertinente de la séance.
2. Le membre est présent et représente effectivement son siège.
3. La réunion est en cours et le scrutin est ouvert.
4. Le vote porte sur un scrutin autorisé et ne conduit pas à un double vote pour le même siège.

**Règle de représentation :**

| Situation | Représentant du siège |
| --- | --- |
| Titulaire actif et présent | Titulaire |
| Titulaire absent et suppléant actif présent | Suppléant |
| Titulaire et suppléant présents | Titulaire uniquement |
| Aucun représentant éligible présent | Aucun vote pour ce siège |

Le cas d'un siège vacant ou d'un mandat expiré doit être vérifié explicitement avant d'autoriser une suppléance en dehors de l'absence du titulaire.

Le vote est enregistré par siège. Lorsque les présences changent, seuls les scrutins ouverts sont actualisés et les bulletins devenus invalides sont retirés. Un scrutin clôturé conserve son état historique, ses participants et son résultat.

**Quorum et majorité :** le président paramètre le scrutin. D'après l'audit, le quorum est calculé à partir des sièges représentés par rapport aux sièges actifs (seuil entier arrondi au supérieur). Les abstentions ne sont pas comptées dans les suffrages exprimés servant à la majorité. La règle auditée est strictement supérieure au seuil : `pour × 100 / (pour + contre) > seuilMajorité`. Une égalité ne suffit donc pas à adopter une décision selon cette règle ; aucun suffrage exprimé ou quorum non atteint ne doit conduire à une adoption. Vérifier ces modalités avec les exigences du professeur et tester les cas limites avant leur implémentation serveur.

**Point de sécurité futur :** la simulation peut présenter des bulletins de plusieurs participants dans une même interface ; le serveur doit déterminer l'identité du votant à partir de sa session. Un membre ne doit pas pouvoir voter à la place d'un autre membre par modification d'un identifiant envoyé par le client.

### 4.5. Décisions et actions

- Une décision est rattachée à une réunion et, si applicable, à un point de l'ordre du jour et à un scrutin. Tous les points ne nécessitent pas un vote.
- Le résultat d'une décision issue d'un scrutin doit être cohérent avec le résultat clôturé. Une décision rejetée ne doit pas apparaître comme adoptée.
- Une action découle d'une décision, possède un responsable, une échéance et un statut : À faire, En cours, Terminée/Clos.
- Le responsable d'une action doit pouvoir suivre son avancement selon les permissions retenues. La modification de l'attribution ou de l'échéance est à distinguer de la mise à jour du statut.
- Le suivi des actions reste possible après clôture, signature et archivage des documents de séance. Le contenu historique d'un PV signé ne doit pas évoluer rétroactivement lorsque les actions avancent.
- Les suppressions ne doivent pas casser les références entre réunions, points, scrutins, décisions et actions.

Les droits de création, publication, suppression et réattribution sont à confirmer conformément à la matrice complémentaire. Les règles de calcul des retards doivent utiliser une date de référence cohérente ; une action terminée ne peut pas être considérée comme en retard au titre du suivi courant.

### 4.6. Documents de séance

Les documents peuvent être associés à une réunion et, si pertinent, à un point de l'ordre du jour. Conserver leurs métadonnées et les versions utiles selon le modèle existant.

- Le dépôt par le secrétaire est prévu dans les exigences précédemment fixées ; les droits précis des autres auteurs restent à confirmer.
- Un document archivé ne doit plus être modifiable ni supprimable via les actions ordinaires.
- L'archivage est une action dédiée : le statut Archivé ne doit pas pouvoir être sélectionné dans un formulaire de modification générique.
- La consultation et le téléchargement sont soumis aux mêmes autorisations que l'accès au document. Un lien direct ne doit pas contourner ces droits.
- Les métadonnées sont persistées localement dans la version actuelle, mais pas le contenu binaire des pièces jointes. Le stockage et le contrôle d'accès aux fichiers seront à implémenter côté serveur.

### 4.7. Procès-verbaux : rédaction, correction et signature

Le secrétaire saisit uniquement les notes et informations complémentaires nécessaires. Le PV est généré à partir du modèle structuré et des données disponibles de la réunion : participants, présences, ordre du jour, décisions, résultats, actions et clôture. Ne pas inventer des informations manquantes.

| État du PV | Secrétaire | Président | Administration |
| --- | --- | --- | --- |
| Brouillon | Rédiger, modifier, prévisualiser, soumettre lorsque la réunion est clôturée | Consulter si autorisé | Pas d'archivage |
| À signer | Consulter ; pas de modification du contenu soumis | Consulter, demander une correction ou signer | Pas d'archivage |
| À corriger | Corriger et soumettre de nouveau | Attendre la nouvelle soumission | Pas d'archivage |
| Signé | Consulter ; modification interdite | Consulter ; seconde signature interdite | Consulter et archiver |
| Archivé | Consulter si autorisé | Consulter si autorisé | Consulter ; pas de modification ordinaire |

Le retour pour correction existe dans le workflow documenté ; vérifier le nom exact de l'état ou sa représentation dans les types actuels. Les libellés ci-dessus sont fonctionnels, pas des valeurs d'enum certifiées.

- La signature est réservée au président et ne peut intervenir que sur le PV soumis d'une réunion clôturée. Elle est simulée dans le frontend.
- Enregistrer l'identité du signataire et l'horodatage ; coordonner la signature et le passage de la réunion à `PV signé`.
- Un PV signé doit conserver le contenu validé, y compris les données reprises des autres modules. Vérifier qu'une modification ultérieure d'un membre, d'une action ou d'une traduction ne réécrit pas son contenu historique ; prévoir un instantané immuable au backend si nécessaire.
- L'aperçu, l'impression et l'export PDF navigateur existent selon le rapport. Aucune signature électronique cryptographique ou qualifiée n'est prévue dans ce périmètre.

### 4.8. Archivage et historique

L'administration (`archivist`) archive les PV signés, les décisions et les documents autorisés. Les métadonnées d'archivage (`archivedAt`, `archivedBy` ou équivalents) conservent la date et l'auteur de l'opération.

- Un PV non signé ne peut pas être archivé.
- Les éléments archivés sont consultables mais non modifiables via les opérations ordinaires. La restauration ou la désarchivation n'est pas une permission établie : ne pas l'introduire sans décision explicite.
- L'archivage des décisions et documents doit respecter les relations existantes ; ne pas archiver prématurément des informations nécessaires à une séance en cours. Les conditions précises par type d'objet restent à contrôler dans le code.
- Les archives sont une vue de consultation et de filtrage du module Documents/PV. Ne pas supposer qu'elles constituent une collection ou une table SQL distincte.
- La recherche plein texte future doit appliquer les mêmes filtres d'accès que la consultation, y compris pour les extraits de résultats.

### 4.9. Notifications internes

Les notifications sont exclusivement internes à l'application. Aucun e-mail, SMS ou service de notification externe n'est prévu.

| Événement documenté | Destinataire |
| --- | --- |
| Envoi ou renvoi de convocations | Comptes associés aux participants concernés |
| Soumission / resoumission du PV | Président |
| Demande de correction du PV | Secrétaire |
| Signature du PV | Secrétaire |
| PV disponible pour archivage | Responsable des archives |

Les notifications ciblées sont stockées avec un `recipientId`. La cloche et le centre filtrent selon le compte courant. Chaque compte doit agir uniquement sur ses notifications (lecture, archivage, restauration selon les fonctions disponibles). L'administrateur ne doit pas recevoir automatiquement les notifications des autres utilisateurs. Le lien vers l'objet métier ne confère aucun droit supplémentaire.

Les notifications de modification de réunion, rappels, validation/rejet des points, publication de décision, attribution/réattribution et échéance d'action ont été demandées dans un chantier ultérieur. Leur état d'implémentation reste à vérifier. Les délais de rappel de 24 heures (réunion) et 48 heures (action) sont des propositions configurables, non des exigences imposées. Les rappels réels lorsque l'application est fermée nécessiteront un mécanisme backend.

### 4.10. Tableau de bord, navigation et internationalisation

- La navigation, les raccourcis et les boutons doivent refléter les permissions. Un accès interdit doit rester interdit même par URL directe.
- Le tableau de bord ne doit afficher que les informations et statistiques autorisées ; sa personnalisation détaillée selon les rôles est une amélioration proposée, non une fonctionnalité intégralement confirmée.
- Les trois langues FR, EN et AR utilisent les mêmes règles d'autorisation. Le changement de langue ne modifie ni les droits ni les données métier.
- Traduire uniquement les libellés, catégories prédéfinies, statuts et messages système ; ne pas traduire automatiquement les saisies utilisateur ni les données fictives. Préserver le RTL arabe.

## 5. Emplacement de la logique dans le projet

| Fichier / dossier | Responsabilité actuelle |
| --- | --- |
| `src/lib/static-auth.ts` | Comptes et session fictifs, rôles, association compte–membre, `rolePermissions`, `hasPermission`, mapping route–module. |
| `src/components/auth/static-auth-guard.tsx` | Garde des pages privées côté client. |
| `src/middleware.ts` | Routage localisé et contrôle du cookie de démonstration. |
| `src/features/users/users-client.tsx` | Gestion des comptes par l'administrateur. |
| `src/lib/demo-store.ts` | Collections partagées, contrôle des mutations par acteur, persistance locale et appel des règles métier. |
| `src/lib/demo-business.ts` | Transitions réunion/PV, convocations, synchronisations, notifications et contrôles transversaux. |
| `src/features/members/utils.ts` | Validations des mandats et sièges. |
| `src/features/votes/utils.ts` | `seatRepresentations`, `calculateBallot`, règles de représentation et calcul des résultats ; présence des fonctions à confirmer sur le HEAD courant. |
| `src/features/meetings/` | Formulaire, détail, convocations, feuille de présence et workflow. |
| `src/features/agenda/` | Proposition, validation et rattachement des points. |
| `src/features/votes/` | Organisation, participation, paramètres et résultats des scrutins. |
| `src/features/decisions/` | Décisions, attribution et suivi des actions. |
| `src/features/documents/` | Dépôt, PV, aperçu, signature et archives. |
| `src/features/notifications/` | Centre, types, utilitaires, filtrage et interactions sur les notifications. |
| `src/components/layout/notification-dropdown.tsx` | Cloche, compteur et accès rapide aux notifications. |
| `src/data/navigations.ts` et `src/components/layout/` | Navigation et affichage conditionnel des modules. |
| `src/features/ui-text.ts`, dictionnaires FR/EN/AR | Libellés localisés, dont les rôles et messages d'autorisation. |

Routes métier localisées par `/fr`, `/en` ou `/ar` : `/members`, `/meetings`, `/agenda`, `/votes`, `/actions`, `/documents`, `/notifications`, `/profile`, `/users` et `/dashboards/analytics`. L'accès exact à chaque route doit être vérifié dans le mapping de `static-auth.ts`.

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
- Traçabilité minimale des opérations sensibles : acteur, opération, objet et horodatage. Ne pas confondre cette recommandation avec une piste d'audit déjà implémentée.
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
- [ ] Un membre propose un point ; seul le président peut l'approuver ou le rejeter.
- [ ] Seul le président peut démarrer et clôturer une réunion ; les sauts de statut sont refusés.
- [ ] Seuls le président et le secrétaire modifient les présences pendant la séance.
- [ ] La présence est synchronisée avec les scrutins ouverts dans les deux sens.
- [ ] Le titulaire présent est prioritaire ; le suppléant éligible remplace le titulaire absent ; aucun double vote.
- [ ] Mandat expiré, compte inactif, absence, siège vacant et tentative de vote pour autrui sont testés.
- [ ] Les cas limites de quorum, majorité, égalité et abstention sont testés.
- [ ] Une réunion ne peut pas être clôturée avec un scrutin ouvert.
- [ ] Un scrutin clôturé ne peut plus être modifié et conserve ses résultats historiques.

### 7.3. PV, actions et archives

- [ ] Le secrétaire rédige, soumet et corrige le PV ; un membre ordinaire ne le fait pas à sa place.
- [ ] Le président signe uniquement un PV soumis et associé à une réunion clôturée.
- [ ] La signature met à jour le statut de la réunion ; une seconde signature ou modification est refusée.
- [ ] Les données reprises dans le PV signé restent stables après modification des informations courantes.
- [ ] Seule l'administration archive les éléments autorisés ; un PV non signé ne peut pas être archivé.
- [ ] Un élément archivé ne peut plus être modifié via les opérations ordinaires.
- [ ] Les actions attribuées restent suivies après signature et archivage selon les droits retenus.
- [ ] Les références supprimées, les documents inaccessibles et la recherche future respectent les permissions.

### 7.4. Notifications et non-régression

- [ ] Chaque compte ne voit et ne modifie que ses notifications.
- [ ] Le président est notifié à la soumission du PV, le secrétaire lors d'une correction, et les destinataires prévus lors de la signature.
- [ ] La cloche, le centre et les états lu/non lu sont synchronisés après changement de compte et rechargement.
- [ ] Les nouveaux événements de notification et rappels sont testés si leur implémentation a été terminée.
- [ ] Les mêmes droits sont appliqués en français, anglais et arabe/RTL.
- [ ] Les tests TypeScript, lint, build et Playwright sont exécutés sur le commit courant et les résultats consignés.

## 8. Points à arbitrer avant de figer les API

1. Vérifier la matrice exhaustive réellement présente dans `rolePermissions` et dans les contrôles d'écriture de `demo-store.ts`, y compris les permissions fines signalées `P` et `?` dans ce document.
2. Fixer les règles exactes de mandat, de siège vacant, d'unicité des fonctions de président/secrétaire, de quorum et de majorité, sans présumer d'un règlement officiel non fourni.
3. Confirmer les droits précis de création, publication, modification et suppression des décisions, documents, propositions et actions.
4. Confirmer le périmètre de visibilité des archives, documents et données personnelles pour chaque acteur.
5. Vérifier le dernier état de la recherche plein texte et du chantier des notifications avant de planifier leur intégration.
6. Définir les règles d'immutabilité historique, les transactions, la gestion des comptes désactivés et le stockage réel des pièces jointes.

**Sources de référence :** énoncé du professeur ; audit fonctionnel frontend transmis dans la conversation (état antérieur) ; rapport Codex « Historique des modifications Codex et architecture de l'application », HEAD `af73ad3` ; demandes de finalisation des rôles, du workflow, de l'archivage et des notifications. Le document ne contient aucun identifiant de connexion ni mot de passe. Aucun fichier du dépôt n'a été modifié.
