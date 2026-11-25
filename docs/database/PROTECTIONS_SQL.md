# Protections historiques PostgreSQL

La migration `20261125151414_renforcer_integrite_historique` s’ajoute aux cinq migrations de structure. Elle vérifie les états des scrutins existants avant d’installer les triggers, sans convertir de données historiques. Le schéma Prisma reste identique.

## Fonctions et triggers

| Fonction | Triggers | Protection |
|---|---|---|
| `reject_history_mutation` | `audit_events_append_only` et les sept `<table>_reject_truncate` | L’audit accepte les insertions et refuse les mises à jour et suppressions. `TRUNCATE` est interdit sur l’audit, les scrutins, votes, résultats, décisions, PV et notifications, même quand la table est vide. |
| `protect_closed_ballot` | `ballots_protect_closed` | Un scrutin clos ne peut plus être modifié, rouvert ou supprimé. L’identifiant d’un scrutin ouvert reste immuable. |
| `protect_ballot_child` | `ballot_votes_protect_closed`, `ballot_results_protect_closed` | Les écritures de votes et résultats nécessitent un scrutin ouvert. Leur réaffectation vers un autre scrutin est interdite. |
| `check_ballot_result_state` | `ballots_check_result_state`, `ballot_results_check_state` | Deux constraint triggers différés contrôlent l’état final. Avec l’unicité existante de `ballot_results.ballot_id`, un scrutin clos a exactement un résultat et un scrutin ouvert n’en a aucun. |
| `protect_final_decision` | `decisions_protect_final` | Une décision définitive ne peut être modifiée ni supprimée. Son premier archivage peut renseigner uniquement la date, le compte d’archivage et le nom figé. La réunion doit être clôturée ou avoir un PV signé. Une décision déjà archivée est immuable. |
| `protect_signed_minutes` | `meeting_minutes_protect_signed` | Les PV signés et archivés sont protégés contre la modification et la suppression. Le passage `SIGNED → ARCHIVED` peut renseigner les métadonnées d’archivage et `updated_at`, avec une version identique ou incrémentée de un. Le contenu, les identités, la signature et l’instantané restent figés. Les transitions de correction avant signature restent possibles. |
| `protect_notification_history` | `notifications_protect_history` | Une notification active peut évoluer sur `read_at`, `archived_at` et `deleted_at`. Son destinataire et sa clé de déduplication sont immuables. Dès le retrait, toute mise à jour est refusée. Les suppressions physiques sont interdites. |

Les refus des triggers renvoient `23514`. La nouvelle migration ne change aucune FK, unicité, exclusion ou contrainte `CHECK` précédente.

## Transactions et ordre de verrouillage

Pour les opérations de présence, vote et clôture, verrouiller d’abord la ligne de la réunion, puis les scrutins concernés dans l’ordre croissant de leur UUID. Verrouiller ensuite les lignes dépendantes si nécessaire. Lire la présence, les mandats et les votes servant au calcul **après** l’acquisition des verrous. Créer le résultat pendant que le scrutin est ouvert, passer à `CLOSED`, mettre à jour la décision et enregistrer l’audit et les notifications dans la même transaction. Laisser les contraintes différées agir jusqu’au commit. Le seed suit la même séquence dans une transaction sérialisable.

Toute écriture d’un vote ou d’un résultat crée une nouvelle version de la ligne du scrutin parent, même si la valeur de son état ne change pas. Elle prend donc le même verrou que la clôture. Après une clôture concurrente, un dépôt en attente est refusé. En `REPEATABLE READ` ou `SERIALIZABLE`, un instantané obsolète peut produire `40001` et exige de rejouer la transaction complète avec un recalcul. Prévoir aussi une reprise bornée en cas de deadlock `40P01`, notamment si un chemin SQL prend un verrou enfant avant le parent. [PostgreSQL 18, isolation des transactions](https://www.postgresql.org/docs/18/transaction-iso.html)

## Frontière backend et privilèges

Le backend doit appliquer les droits d’acteur, vérifier le mandat, la présence et la suppléance, calculer le décompte et les instantanés à partir des données réelles, vérifier la provenance des décisions définitives, tracer les imports, et coordonner signature du PV et statut de la réunion. Les triggers préservent les résultats après clôture et contrôlent leur présence. La correspondance de leur contenu avec le vote et les transitions métier complètes relève du backend.

Le backend doit aussi filtrer les notifications retirées dans toutes les lectures, vérifier les cibles et les destinataires, émettre l’audit et les notifications avec les mutations, et exclure les secrets des détails d’audit. L’archivage vérifie qu’un compte est renseigné pour une nouvelle opération. Son rôle et l’authentification de l’acteur relèvent du service. L’insertion historique d’un PV signé ou d’une décision définitive reste possible sous les contraintes existantes. Elle permet de préserver les dates et identités inconnues sans assouplir les protections des lignes existantes.

Les protections s’appliquent au DML et au `TRUNCATE` ordinaires. Le propriétaire des tables peut modifier ou désactiver les triggers. Le superutilisateur peut également les contourner. Le compte actuel reste inchangé. La séparation future consiste à confier le DDL et les migrations à un rôle propriétaire, puis à utiliser un rôle d’exécution sans propriété des objets ni droits de modification du schéma. Accorder à ce rôle les seuls accès nécessaires, limiter l’audit à la lecture ou l’insertion selon le besoin, et retirer `TRUNCATE`. Les triggers qui verrouillent le scrutin nécessitent les droits SQL correspondants sur le parent. Valider les droits du rôle d’exécution avant déploiement.

## Vérifications

| Domaine | Résultat sur PostgreSQL 18.7 |
|---|---|
| Audit | INSERT accepté. UPDATE, DELETE et TRUNCATE refusés. |
| Scrutins et votes | Vote sur scrutin ouvert accepté. INSERT, UPDATE, DELETE et réaffectation de votes clos refusés. Réouverture, suppression et changement de seuils d’un scrutin clos refusés. TRUNCATE des votes refusé. |
| Résultats | INSERT, UPDATE, DELETE et réaffectation sur scrutin clos refusés. Clôture sans résultat et résultat restant sur un scrutin ouvert refusés lors du contrôle différé. Insertion du résultat puis clôture dans la même transaction acceptées. |
| Concurrence | Blocage observé avec `pg_blocking_pids` dans les deux ordres. Clôture d’abord, vote refusé après attente avec `23514`. Vote d’abord, instantané `REPEATABLE READ` en conflit avec `40001`, puis une nouvelle transaction voit le vote et clôture. |
| Décisions et PV | Contenu, statut et suppression de la décision définitive refusés. Archivage initial accepté, mise à jour ultérieure refusée. Modification du contenu, de l’instantané ou de la signature et suppression du PV signé refusées. Archivage signé accepté. Désarchivage et suppression du PV archivé refusés. Soumission et retour avant signature restent possibles. |
| Notifications | Lecture, retour à non lu, archivage, restauration et retrait logique acceptés. Changement de destinataire ou de clé, réactivation et suppression physique après retrait refusés. |
| Rejeu et seed | Six migrations rejouées sur la base dédiée vierge `comite_scientifique_test`. Seed initial de 84 lignes accepté et les 19 tables interrogées par `pnpm db:check`. Les tests unitaires SQL ont été annulés par transaction. Les courses ont été exécutées sur cette même base dédiée. |

Sur la base de développement, le second `migrate dev` a rejoué l’historique sans dérive dans la base shadow et `migrate status` a confirmé les six migrations. Le seed a inséré zéro ligne, `db:check` a interrogé les 19 tables et leur contenu complet est identique avant et après. Les 29 `CHECK` et les trois exclusions précédents ont été vérifiés par nom. La base dédiée reste disponible pour examiner les deux scénarios concurrents validés.
