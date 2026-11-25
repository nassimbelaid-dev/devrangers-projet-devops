import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"

import type { TestRun } from "./environment"

import { rejects, rollback } from "./environment"
import {
  archivist,
  castVote,
  notification,
  one,
  openBallot,
  resultSql,
  seedMeeting,
  voter,
} from "./fixtures"

export function registerDomainTests(run: () => TestRun) {
  test("Identité : courriels, comptes, profils et sièges uniques", () =>
    rollback(run(), async (db) => {
      const member = await one(
        db,
        "SELECT id,email FROM members ORDER BY id LIMIT 1"
      )
      const account = await one(
        db,
        "SELECT id,email FROM accounts WHERE role='ADMIN'"
      )
      const linked = await one(
        db,
        "SELECT member_id FROM accounts WHERE role='PRESIDENT'"
      )
      await rejects(
        db,
        "23505",
        "INSERT INTO members(id,full_name,email) VALUES(gen_random_uuid(),'Test',$1)",
        [member.email],
        "members_email_key"
      )
      await rejects(
        db,
        "23514",
        "INSERT INTO members(id,full_name,email) VALUES(gen_random_uuid(),'Test',' INVALID@example.test ')",
        [],
        "members_email_canonical_check"
      )
      const create =
        "INSERT INTO accounts(id,first_name,last_name,email,password_hash,role,member_id) VALUES(gen_random_uuid(),'Test','Test',$1,'fixture-only',$2,$3)"
      await rejects(
        db,
        "23505",
        create,
        [account.email, "ADMIN", null],
        "accounts_email_key"
      )
      await rejects(
        db,
        "23514",
        create,
        [" INVALID@example.test ", "ADMIN", null],
        "accounts_email_canonical_check"
      )
      await rejects(
        db,
        "23514",
        create,
        ["test@example.test", "MEMBER", null],
        "accounts_member_required_check"
      )
      await rejects(
        db,
        "23505",
        create,
        ["test@example.test", "MEMBER", linked.member_id],
        "accounts_member_id_key"
      )
      assert.equal(
        (await db.query(create, [member.email, "ADMIN", null])).rowCount,
        1
      )
      const profile =
        "INSERT INTO account_profiles(id,account_id) VALUES(gen_random_uuid(),$1)"
      await db.query(profile, [account.id])
      await rejects(
        db,
        "23505",
        profile,
        [account.id],
        "account_profiles_account_id_key"
      )
      await rejects(
        db,
        "23505",
        "INSERT INTO seats(id,label) SELECT gen_random_uuid(),label FROM seats ORDER BY id LIMIT 1",
        [],
        "seats_label_key"
      )
    }))

  test("Mandats : trois exclusions, bornes inclusives et suppléance", () =>
    rollback(run(), async (db) => {
      const members = Array.from({ length: 3 }, () => randomUUID())
      const seat1 = randomUUID(),
        seat2 = randomUUID()
      await db.query(
        "INSERT INTO seats(id,label) VALUES($1,'Test A'),($2,'Test B')",
        [seat1, seat2]
      )
      for (const [index, id] of members.entries())
        await db.query(
          "INSERT INTO members(id,full_name,email) VALUES($1,'Test',$2)",
          [id, `mandat${index}@test.invalid`]
        )
      const mandate =
        'INSERT INTO mandates(id,member_id,seat_id,"function",kind,start_date,end_date) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6)'
      await db.query(mandate, [
        members[0],
        seat1,
        "PRESIDENT",
        "TITULAR",
        "2040-01-01",
        "2040-01-10",
      ])
      await rejects(
        db,
        "23514",
        mandate,
        [members[1], seat2, "MEMBER", "TITULAR", "2040-01-11", "2040-01-10"],
        "mandates_date_order_check"
      )
      await rejects(
        db,
        "23P01",
        mandate,
        [members[1], seat1, "MEMBER", "TITULAR", "2040-01-10", "2040-01-20"],
        "mandates_seat_kind_no_overlap"
      )
      await rejects(
        db,
        "23P01",
        mandate,
        [members[0], seat2, "MEMBER", "TITULAR", "2040-01-02", "2040-01-03"],
        "mandates_member_no_overlap"
      )
      await rejects(
        db,
        "23P01",
        mandate,
        [members[2], seat2, "PRESIDENT", "TITULAR", "2040-01-02", "2040-01-03"],
        "mandates_function_no_overlap"
      )
      assert.equal(
        (
          await db.query(mandate, [
            members[1],
            seat1,
            "MEMBER",
            "SUBSTITUTE",
            "2040-01-01",
            "2040-01-10",
          ])
        ).rowCount,
        1
      )
      assert.equal(
        (
          await db.query(mandate, [
            members[0],
            seat1,
            "PRESIDENT",
            "TITULAR",
            "2040-01-11",
            "2040-01-20",
          ])
        ).rowCount,
        1
      )
    }))

  test("Réunions : horaires, provenance et trois états de présence", () =>
    rollback(run(), async (db) => {
      const meetingId = randomUUID()
      const create =
        "INSERT INTO meetings(id,title,meeting_date,location,start_time,end_time) VALUES($1,'Test','2026-11-25','Salle','09:00',$2)"
      for (const time of ["08:00", "09:00"])
        await rejects(
          db,
          "23514",
          create,
          [meetingId, time],
          "meetings_time_order_check"
        )
      await db.query(create, [meetingId, "10:00"])
      await rejects(
        db,
        "23514",
        "UPDATE meetings SET started_at='2040-01-02',closed_at='2040-01-01' WHERE id=$1",
        [meetingId],
        "meetings_lifecycle_order_check"
      )
      const fixture = await one(
        db,
        "SELECT member_id,mandate_id FROM meeting_participants ORDER BY id LIMIT 1"
      )
      const wrong = await one(
        db,
        "SELECT id FROM mandates WHERE member_id<>$1 ORDER BY id LIMIT 1",
        [fixture.member_id]
      )
      const part =
        "INSERT INTO meeting_participants(id,meeting_id,member_id,mandate_id) VALUES(gen_random_uuid(),$1,$2,$3) RETURNING id,attendance"
      await rejects(
        db,
        "23503",
        part,
        [meetingId, fixture.member_id, wrong.id],
        "meeting_participants_mandate_id_member_id_fkey"
      )
      const participant = await one(db, part, [
        meetingId,
        fixture.member_id,
        fixture.mandate_id,
      ])
      assert.equal(participant.attendance, null)
      for (const attendance of [true, false])
        assert.equal(
          (
            await one(
              db,
              "UPDATE meeting_participants SET attendance=$2 WHERE id=$1 RETURNING attendance",
              [participant.id, attendance]
            )
          ).attendance,
          attendance
        )
      await rejects(
        db,
        "23505",
        part,
        [meetingId, fixture.member_id, fixture.mandate_id],
        "meeting_participants_meeting_id_member_id_key"
      )
    }))

  test("Agenda et décisions : ordre, référence et proposition de la même réunion", () =>
    rollback(run(), async (db) => {
      const meeting = await seedMeeting(db)
      const fixture = await one(
        db,
        "SELECT meeting_id,author_member_id FROM agenda_proposals WHERE meeting_id<>$1 ORDER BY id LIMIT 1",
        [meeting.id]
      )
      const sql =
        "INSERT INTO agenda_proposals(id,meeting_id,author_member_id,title,sort_order) VALUES(gen_random_uuid(),$1,$2,'Test',$3) RETURNING id"
      await rejects(
        db,
        "23514",
        sql,
        [fixture.meeting_id, fixture.author_member_id, -1],
        "agenda_proposals_sort_order_check"
      )
      const proposal = await one(db, sql, [
        fixture.meeting_id,
        fixture.author_member_id,
        0,
      ])
      const decision =
        "INSERT INTO decisions(id,meeting_id,agenda_proposal_id,reference,title,decision_date) VALUES(gen_random_uuid(),$1,$2,'TEST-AGENDA','Test','2026-11-25') RETURNING id"
      await rejects(
        db,
        "23503",
        decision,
        [meeting.id, proposal.id],
        "decisions_agenda_proposal_id_meeting_id_fkey"
      )
      assert((await one(db, decision, [fixture.meeting_id, proposal.id])).id)
      await rejects(
        db,
        "23505",
        decision,
        [fixture.meeting_id, null],
        "decisions_reference_key"
      )
    }))

  test("Décisions et actions : provenance, archivage et tâche autonome", () =>
    rollback(run(), async (db) => {
      const meeting = await seedMeeting(db)
      const ballot = await openBallot(db, meeting.id, "TEST-ACTION")
      const decision = await one(
        db,
        "SELECT decision_id FROM ballots WHERE id=$1",
        [ballot.id]
      )
      await rejects(
        db,
        "23514",
        "UPDATE decisions SET status='ADOPTED' WHERE id=$1",
        [decision.decision_id],
        "decisions_final_source_check"
      )
      await rejects(
        db,
        "23514",
        "UPDATE decisions SET final_source='BALLOT' WHERE id=$1",
        [decision.decision_id],
        "decisions_final_source_check"
      )
      await rejects(
        db,
        "23514",
        "UPDATE decisions SET archived_at=now() WHERE id=$1",
        [decision.decision_id],
        "decisions_archive_status_check"
      )
      const member = await one(db, "SELECT id FROM members ORDER BY id LIMIT 1")
      const action =
        "INSERT INTO actions(id,assignee_member_id,title,due_date,sort_order) VALUES(gen_random_uuid(),$1,'Test','2026-11-26',$2)"
      await rejects(
        db,
        "23514",
        action,
        [member.id, -1],
        "actions_sort_order_check"
      )
      await rejects(
        db,
        "23503",
        action,
        [randomUUID(), 0],
        "actions_assignee_member_id_fkey"
      )
      assert.equal((await db.query(action, [member.id, 0])).rowCount, 1)
    }))

  test("Scrutins et votes : FK composites et vote unique par siège", () =>
    rollback(run(), async (db) => {
      const meeting = await seedMeeting(db)
      const other = await one(
        db,
        "SELECT id FROM meetings WHERE status='MINUTES_SIGNED'"
      )
      const d = await one(
        db,
        "INSERT INTO decisions(id,meeting_id,reference,title,decision_date) VALUES(gen_random_uuid(),$1,'TEST-BALLOT','Test','2026-11-25') RETURNING id",
        [meeting.id]
      )
      const ballots =
        "INSERT INTO ballots(id,decision_id,meeting_id) VALUES(gen_random_uuid(),$1,$2) RETURNING id"
      await rejects(
        db,
        "23503",
        ballots,
        [d.id, other.id],
        "ballots_decision_id_meeting_id_fkey"
      )
      const b = await one(db, ballots, [d.id, meeting.id])
      await rejects(
        db,
        "23505",
        ballots,
        [d.id, meeting.id],
        "ballots_decision_id_key"
      )
      const foreign = await voter(db, other.id)
      const local = await one(
        db,
        `SELECT p.id,p.mandate_id,m.seat_id FROM meeting_participants p JOIN mandates m ON m.id=p.mandate_id
      WHERE p.meeting_id=$1 AND m.kind='TITULAR' AND EXISTS
       (SELECT FROM mandates k JOIN meeting_participants q ON q.mandate_id=k.id WHERE k.kind='SUBSTITUTE' AND k.seat_id=m.seat_id AND q.meeting_id=$1)`,
        [meeting.id]
      )
      const substitute = await one(
        db,
        `SELECT p.id,p.mandate_id FROM meeting_participants p JOIN mandates m ON m.id=p.mandate_id
      WHERE p.meeting_id=$1 AND m.seat_id=$2 AND m.kind='SUBSTITUTE'`,
        [meeting.id, local.seat_id]
      )
      const writeVote =
        "INSERT INTO ballot_votes(id,ballot_id,meeting_id,participation_id,mandate_id,seat_id,choice) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,'FOR')"
      const query =
        "SELECT p.mandate_id,m.seat_id FROM meeting_participants p JOIN mandates m ON m.id=p.mandate_id WHERE p.id=$1"
      const cross = await one(db, query, [foreign.id])
      await rejects(
        db,
        "23503",
        writeVote,
        [b.id, other.id, foreign.id, cross.mandate_id, cross.seat_id],
        "ballot_votes_ballot_id_meeting_id_fkey"
      )
      await rejects(
        db,
        "23503",
        writeVote,
        [b.id, meeting.id, foreign.id, cross.mandate_id, cross.seat_id],
        "ballot_votes_participation_id_meeting_id_mandate_id_fkey"
      )
      await rejects(
        db,
        "23503",
        writeVote,
        [b.id, meeting.id, local.id, substitute.mandate_id, local.seat_id],
        "ballot_votes_participation_id_meeting_id_mandate_id_fkey"
      )
      await rejects(
        db,
        "23503",
        writeVote,
        [b.id, meeting.id, local.id, local.mandate_id, randomUUID()],
        "ballot_votes_mandate_id_seat_id_fkey"
      )
      assert.equal((await castVote(db, b.id, local.id)).rowCount, 1)
      await rejects(
        db,
        "23505",
        writeVote,
        [b.id, meeting.id, substitute.id, substitute.mandate_id, local.seat_id],
        "ballot_votes_ballot_id_seat_id_key"
      )
      const distinct = await one(
        db,
        "SELECT p.id FROM meeting_participants p JOIN mandates m ON m.id=p.mandate_id WHERE p.meeting_id=$1 AND m.seat_id<>$2 ORDER BY p.id LIMIT 1",
        [meeting.id, local.seat_id]
      )
      assert.equal((await castVote(db, b.id, distinct.id)).rowCount, 1)
    }))

  test("Résultats : seuils, sommes, plafond, arrondi et majorité hors abstentions", () =>
    rollback(run(), async (db) => {
      const meeting = await seedMeeting(db)
      const b = await openBallot(db, meeting.id, "TEST-RESULT")
      await rejects(
        db,
        "23514",
        "UPDATE ballots SET quorum_percent=0 WHERE id=$1",
        [b.id],
        "ballots_thresholds_check"
      )
      await rejects(
        db,
        "23514",
        "UPDATE ballots SET majority_percent=100.01 WHERE id=$1",
        [b.id],
        "ballots_thresholds_check"
      )
      await rejects(
        db,
        "23514",
        "UPDATE ballots SET opened_at='2040-01-02',closed_at='2040-01-01' WHERE id=$1",
        [b.id],
        "ballots_lifecycle_order_check"
      )
      await db.query(resultSql, [b.id, 1])
      await rejects(
        db,
        "23505",
        resultSql,
        [b.id, 1],
        "ballot_results_ballot_id_key"
      )
      const bad = [
        ["for_count=-1", "counts"],
        ["votes_cast=2", "counts"],
        ["expressed_count=2", "counts"],
        ["quorum_min_seats=2", "quorum"],
        ["participation_percent=19", "participation"],
        ["snapshot_version=0", "snapshot_version"],
        ["quorum_percent=100.01,quorum_min_seats=6", "thresholds"],
        ["majority_percent=101", "thresholds"],
        ["outcome='ADOPTED'", "outcome"],
      ]
      for (const [set, check] of bad)
        await rejects(
          db,
          "23514",
          `UPDATE ballot_results SET ${set} WHERE ballot_id=$1`,
          [b.id],
          `ballot_results_${check}_check`
        )
      await db.query(
        "UPDATE ballot_results SET active_seat_count=7,quorum_percent=42.86,quorum_min_seats=4,participation_percent=14 WHERE ballot_id=$1",
        [b.id]
      )
      await db.query(
        "UPDATE ballot_results SET active_seat_count=0,represented_seat_count=0,quorum_min_seats=0,participation_percent=0,for_count=0,votes_cast=0,expressed_count=0 WHERE ballot_id=$1",
        [b.id]
      )
      await rejects(
        db,
        "23514",
        "UPDATE ballot_results SET quorum_reached=true,outcome='REJECTED' WHERE ballot_id=$1",
        [b.id],
        "ballot_results_quorum_check"
      )
      await db.query(
        "UPDATE ballot_results SET active_seat_count=5,quorum_percent=60,represented_seat_count=3,quorum_min_seats=3,participation_percent=60,for_count=1,against_count=1,abstain_count=1,votes_cast=3,expressed_count=2,quorum_reached=true,outcome='REJECTED' WHERE ballot_id=$1",
        [b.id]
      )
      await rejects(
        db,
        "23514",
        "UPDATE ballot_results SET outcome='ADOPTED' WHERE ballot_id=$1",
        [b.id],
        "ballot_results_outcome_check"
      )
      await db.query(
        "UPDATE ballot_results SET against_count=0,abstain_count=2,expressed_count=1,outcome='ADOPTED' WHERE ballot_id=$1",
        [b.id]
      )
      await rejects(
        db,
        "23514",
        "UPDATE ballot_results SET majority_percent=100 WHERE ballot_id=$1",
        [b.id],
        "ballot_results_outcome_check"
      )
      await db.query(
        "UPDATE ballot_results SET for_count=0,abstain_count=3,expressed_count=0,outcome='REJECTED' WHERE ballot_id=$1",
        [b.id]
      )
    }))

  test("Documents et fichiers : version, auteur, taille et rattachement exclusif", () =>
    rollback(run(), async (db) => {
      const meeting = await seedMeeting(db)
      const account = await archivist(db)
      const proposal = await one(
        db,
        "SELECT id FROM agenda_proposals ORDER BY id LIMIT 1"
      )
      const create =
        "INSERT INTO documents(id,reference,title,meeting_id) VALUES(gen_random_uuid(),$1,'Test',$2) RETURNING id"
      const doc1 = await one(db, create, ["DOC-TEST-1", meeting.id])
      const doc2 = await one(db, create, ["DOC-TEST-2", null])
      await rejects(
        db,
        "23505",
        create,
        ["DOC-TEST-1", null],
        "documents_reference_key"
      )
      await rejects(
        db,
        "23514",
        "UPDATE documents SET status='ARCHIVED' WHERE id=$1",
        [doc1.id],
        "documents_archive_status_check"
      )
      const version =
        "INSERT INTO document_versions(id,document_id,number,filename,author_account_id,is_historical) VALUES(gen_random_uuid(),$1,$2,'test.pdf',$3,$4) RETURNING id"
      await rejects(
        db,
        "23514",
        version,
        [doc1.id, 0, account.id, false],
        "document_versions_number_check"
      )
      await rejects(
        db,
        "23514",
        version,
        [doc1.id, 1, null, false],
        "document_versions_author_required_check"
      )
      const first = await one(db, version, [doc1.id, 1, account.id, false])
      assert((await one(db, version, [doc2.id, 1, null, true])).id)
      await rejects(
        db,
        "23505",
        version,
        [doc1.id, 1, account.id, false],
        "document_versions_document_id_number_key"
      )
      const file =
        "INSERT INTO stored_files(id,agenda_proposal_id,document_version_id,original_name,size_bytes,mime_type,storage_key) VALUES(gen_random_uuid(),$1,$2,'test.pdf',$3,'application/pdf',$4)"
      await rejects(
        db,
        "23514",
        file,
        [null, null, 0, "no-owner"],
        "stored_files_owner_check"
      )
      await rejects(
        db,
        "23514",
        file,
        [proposal.id, first.id, 0, "two-owners"],
        "stored_files_owner_check"
      )
      for (const size of [-1, 10485761])
        await rejects(
          db,
          "23514",
          file,
          [proposal.id, null, size, "invalid-size"],
          "stored_files_size_check"
        )
      await db.query(file, [proposal.id, null, 0, "agenda-file"])
      await db.query(file, [null, first.id, 10485760, "version-file"])
      await rejects(
        db,
        "23505",
        file,
        [null, first.id, 0, "duplicate-file"],
        "stored_files_document_version_id_key"
      )
      await rejects(
        db,
        "23505",
        file,
        [proposal.id, null, 0, "agenda-file"],
        "stored_files_storage_key_key"
      )
    }))

  test("PV : réunion et référence uniques, instantané obligatoire à la soumission", () =>
    rollback(run(), async (db) => {
      const meeting = await seedMeeting(db)
      const signed = await one(
        db,
        "SELECT reference FROM meeting_minutes WHERE status='SIGNED'"
      )
      const sql =
        "INSERT INTO meeting_minutes(id,meeting_id,reference) VALUES(gen_random_uuid(),$1,$2) RETURNING id"
      await rejects(
        db,
        "23505",
        sql,
        [meeting.id, signed.reference],
        "meeting_minutes_reference_key"
      )
      const draft = await one(db, sql, [meeting.id, "PV-TEST"])
      await rejects(
        db,
        "23505",
        sql,
        [meeting.id, "PV-OTHER"],
        "meeting_minutes_meeting_id_key"
      )
      await rejects(
        db,
        "23514",
        "UPDATE meeting_minutes SET version=0 WHERE id=$1",
        [draft.id],
        "meeting_minutes_version_check"
      )
      await rejects(
        db,
        "23514",
        "UPDATE meeting_minutes SET official_snapshot='{}' WHERE id=$1",
        [draft.id],
        "meeting_minutes_snapshot_pair_check"
      )
      await rejects(
        db,
        "23514",
        "UPDATE meeting_minutes SET snapshot_version=0,official_snapshot='{}' WHERE id=$1",
        [draft.id],
        "meeting_minutes_snapshot_version_check"
      )
      for (const status of ["TO_SIGN", "SIGNED"])
        await rejects(
          db,
          "23514",
          "UPDATE meeting_minutes SET status=$2 WHERE id=$1",
          [draft.id, status],
          "meeting_minutes_snapshot_required_check"
        )
      const closedMeeting = await one(
        db,
        "SELECT id FROM meetings WHERE status='CLOSED'"
      )
      await rejects(
        db,
        "23514",
        "INSERT INTO meeting_minutes(id,meeting_id,reference,status,archived_at) VALUES(gen_random_uuid(),$1,'PV-ARCHIVE-TEST','ARCHIVED',now())",
        [closedMeeting.id],
        "meeting_minutes_snapshot_required_check"
      )
      await db.query(
        "UPDATE meeting_minutes SET status='TO_SIGN',snapshot_version=1,official_snapshot='{}' WHERE id=$1",
        [draft.id]
      )
      await db.query("UPDATE meeting_minutes SET status='DRAFT' WHERE id=$1", [
        draft.id,
      ])
    }))

  test("Notifications et audit : déduplication, cible, acteur et référence historique", () =>
    rollback(run(), async (db) => {
      const account = await archivist(db)
      const other = await one(db, "SELECT id FROM accounts WHERE role='ADMIN'")
      const item = await notification(db, account.id, "test-occurrence")
      await notification(db, other.id, "test-occurrence")
      await notification(db, account.id, null)
      await notification(db, account.id, null)
      const sql =
        "INSERT INTO notifications(id,recipient_account_id,kind,category,title,preview,detail,context,dedupe_key) VALUES(gen_random_uuid(),$1,'convocation','meetings','T','P','D','C','test-occurrence')"
      await rejects(
        db,
        "23505",
        sql,
        [account.id],
        "notifications_recipient_account_id_dedupe_key_key"
      )
      await rejects(
        db,
        "23503",
        sql,
        [randomUUID()],
        "notifications_recipient_account_id_fkey"
      )
      const historical = randomUUID()
      const targeted =
        "INSERT INTO notifications(id,recipient_account_id,kind,category,title,preview,detail,context,target_type,target_id) VALUES(gen_random_uuid(),$1,'convocation','meetings','T','P','D','C',$2,$3)"
      await rejects(
        db,
        "23514",
        targeted,
        [account.id, "meeting", null],
        "notifications_target_pair_check"
      )
      await rejects(
        db,
        "23514",
        targeted,
        [account.id, null, historical],
        "notifications_target_pair_check"
      )
      await db.query(targeted, [account.id, "meeting", historical])
      await db.query("UPDATE notifications SET deleted_at=now() WHERE id=$1", [
        item.id,
      ])
      await rejects(
        db,
        "23505",
        sql,
        [account.id],
        "notifications_recipient_account_id_dedupe_key_key"
      )
      await notification(db, account.id, "test-next-occurrence")
      const audit =
        "INSERT INTO audit_events(id,actor_account_id,entity_type,entity_id,operation) VALUES(gen_random_uuid(),$1,'meeting',$2,'TEST')"
      await rejects(
        db,
        "23503",
        audit,
        [randomUUID(), historical],
        "audit_events_actor_account_id_fkey"
      )
      assert.equal(
        (await db.query(audit, [account.id, historical])).rowCount,
        1
      )
      assert.equal((await db.query(audit, [null, historical])).rowCount, 1)
    }))
}
