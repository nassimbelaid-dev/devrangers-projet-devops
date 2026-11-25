import assert from "node:assert/strict"
import { test } from "node:test"
import { setTimeout as pause } from "node:timers/promises"

import type { Client } from "pg"
import type { TestRun } from "./environment"

import { client, rejects, rollback, withConnection } from "./environment"
import {
  archivist,
  ballotState,
  castVote,
  closeBallot,
  notification,
  one,
  openBallot,
  resultSql,
  seedMeeting,
  voter,
} from "./fixtures"

async function waitForBlock(observer: Client, waiter: Client, holder: Client) {
  const a = await one(waiter, "SELECT pg_backend_pid() AS pid")
  const b = await one(holder, "SELECT pg_backend_pid() AS pid")
  return async () => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const row = await one(
        observer,
        "SELECT $2::int = ANY(pg_blocking_pids($1::int)) AS blocked",
        [a.pid, b.pid]
      )
      if (row.blocked) return
      await pause(30)
    }
    throw Error("Le verrou concurrent attendu n'a pas été observé.")
  }
}

export function registerHistoryTests(run: () => TestRun) {
  test("Historique : audit append-only et TRUNCATE des sept tables protégé", () =>
    rollback(run(), async (db) => {
      const meeting = await seedMeeting(db)
      const audit = await one(
        db,
        "INSERT INTO audit_events(id,operation,entity_type,entity_id) VALUES(gen_random_uuid(),'TEST','meeting',$1) RETURNING id",
        [meeting.id]
      )
      await rejects(
        db,
        "23514",
        "UPDATE audit_events SET operation='EDIT' WHERE id=$1",
        [audit.id]
      )
      await rejects(db, "23514", "DELETE FROM audit_events WHERE id=$1", [
        audit.id,
      ])
      for (const table of [
        "audit_events",
        "ballots",
        "ballot_votes",
        "ballot_results",
        "decisions",
        "meeting_minutes",
        "notifications",
      ]) {
        await rejects(db, "23514", `TRUNCATE TABLE "${table}" CASCADE`)
      }
      await rejects(db, "23514", "TRUNCATE TABLE accounts CASCADE")
    }))

  test("Historique : scrutin clos, votes, résultat et réaffectations immuables", () =>
    rollback(run(), async (db) => {
      const closed = await one(
        db,
        "SELECT id FROM ballots WHERE state='CLOSED' ORDER BY id LIMIT 1"
      )
      const participant = await one(
        db,
        "SELECT participation_id AS id FROM ballot_votes WHERE ballot_id=$1 ORDER BY id LIMIT 1",
        [closed.id]
      )
      const meeting = await seedMeeting(db)
      const open = await openBallot(db, meeting.id, "TEST-IMMUTABLE")
      const writeVote = `INSERT INTO ballot_votes(id,ballot_id,meeting_id,participation_id,mandate_id,seat_id,choice)
      SELECT gen_random_uuid(),ballot_id,meeting_id,participation_id,mandate_id,seat_id,choice
      FROM ballot_votes WHERE ballot_id=$1 AND participation_id=$2`
      await rejects(db, "23514", writeVote, [closed.id, participant.id])
      for (const sql of [
        "UPDATE ballots SET state='OPEN' WHERE id=$1",
        "UPDATE ballots SET quorum_percent=55 WHERE id=$1",
        "DELETE FROM ballots WHERE id=$1",
        "UPDATE ballot_votes SET choice='AGAINST' WHERE ballot_id=$1",
        "DELETE FROM ballot_votes WHERE ballot_id=$1",
        "UPDATE ballot_results SET rule_version='EDIT' WHERE ballot_id=$1",
        "DELETE FROM ballot_results WHERE ballot_id=$1",
      ])
        await rejects(db, "23514", sql, [closed.id])
      await rejects(db, "23514", resultSql, [closed.id, 0])
      for (const table of ["ballot_votes", "ballot_results"]) {
        await rejects(
          db,
          "23514",
          `UPDATE ${table} SET ballot_id=$2 WHERE ballot_id=$1`,
          [closed.id, open.id]
        )
      }
    }))

  test("Historique : décisions et PV, archivage initial uniquement", () =>
    rollback(run(), async (db) => {
      const signer = await archivist(db)
      const decision = await one(
        db,
        "SELECT id FROM decisions WHERE status='ADOPTED' ORDER BY id LIMIT 1"
      )
      const pv = await one(
        db,
        "SELECT id FROM meeting_minutes WHERE status='SIGNED'"
      )
      for (const sql of [
        "UPDATE decisions SET title='EDIT' WHERE id=$1",
        "UPDATE decisions SET status='PENDING',final_source=NULL WHERE id=$1",
        "UPDATE decisions SET final_source='HISTORICAL_IMPORT' WHERE id=$1",
        "DELETE FROM decisions WHERE id=$1",
      ])
        await rejects(db, "23514", sql, [decision.id])
      assert.equal(
        (
          await db.query(
            "UPDATE decisions SET archived_at=now(),archived_by_account_id=$2 WHERE id=$1",
            [decision.id, signer.id]
          )
        ).rowCount,
        1
      )
      await rejects(
        db,
        "23514",
        "UPDATE decisions SET archived_by_name='EDIT' WHERE id=$1",
        [decision.id]
      )
      for (const sql of [
        "UPDATE meeting_minutes SET summary='EDIT' WHERE id=$1",
        "UPDATE meeting_minutes SET president_name='EDIT' WHERE id=$1",
        "UPDATE meeting_minutes SET official_snapshot='{}' WHERE id=$1",
        "UPDATE meeting_minutes SET signed_at=now() WHERE id=$1",
        "DELETE FROM meeting_minutes WHERE id=$1",
      ])
        await rejects(db, "23514", sql, [pv.id])
      assert.equal(
        (
          await db.query(
            "UPDATE meeting_minutes SET status='ARCHIVED',archived_at=now(),archived_by_account_id=$2,updated_at=now(),version=version+1 WHERE id=$1",
            [pv.id, signer.id]
          )
        ).rowCount,
        1
      )
      await rejects(
        db,
        "23514",
        "UPDATE meeting_minutes SET status='SIGNED',archived_at=NULL WHERE id=$1",
        [pv.id]
      )
      await rejects(db, "23514", "DELETE FROM meeting_minutes WHERE id=$1", [
        pv.id,
      ])
    }))

  test("Historique : notification active modifiable, retrait terminal", () =>
    rollback(run(), async (db) => {
      const account = await archivist(db)
      const item = await notification(db, account.id, "test-terminal")
      const states = async (read: boolean, archived: boolean) => {
        const row = await one(
          db,
          "SELECT read_at IS NOT NULL AS read,archived_at IS NOT NULL AS archived FROM notifications WHERE id=$1",
          [item.id]
        )
        assert.deepEqual(row, { read, archived })
      }
      await states(false, false)
      await db.query(
        "UPDATE notifications SET read_at=now(),archived_at=now() WHERE id=$1",
        [item.id]
      )
      await states(true, true)
      await db.query(
        "UPDATE notifications SET read_at=NULL,archived_at=NULL WHERE id=$1",
        [item.id]
      )
      await states(false, false)
      await rejects(
        db,
        "23514",
        "UPDATE notifications SET dedupe_key='EDIT' WHERE id=$1",
        [item.id]
      )
      await rejects(db, "23514", "DELETE FROM notifications WHERE id=$1", [
        item.id,
      ])
      await db.query("UPDATE notifications SET deleted_at=now() WHERE id=$1", [
        item.id,
      ])
      await rejects(
        db,
        "23514",
        "UPDATE notifications SET deleted_at=NULL WHERE id=$1",
        [item.id]
      )
      await rejects(db, "23514", "DELETE FROM notifications WHERE id=$1", [
        item.id,
      ])
    }))

  test(
    "Transactions : contrôles différés au COMMIT et clôture atomique",
    { timeout: 20_000 },
    () =>
      withConnection(run(), async (db) => {
        const meeting = await seedMeeting(db)
        const b = await openBallot(db, meeting.id, "TEST-DEFERRED")
        const p = await voter(db, meeting.id)
        await db.query("BEGIN")
        await closeBallot(db, b.id)
        await assert.rejects(db.query("COMMIT"), { code: "23514" })
        assert.equal((await ballotState(db, b.id)).state, "OPEN")
        await db.query("BEGIN")
        await db.query(resultSql, [b.id, 0])
        await assert.rejects(db.query("COMMIT"), { code: "23514" })
        assert.equal(
          (
            await one(
              db,
              "SELECT count(*)::int AS n FROM ballot_results WHERE ballot_id=$1",
              [b.id]
            )
          ).n,
          0
        )
        await db.query("BEGIN")
        assert.equal((await castVote(db, b.id, p.id)).rowCount, 1)
        await db.query(resultSql, [b.id, 1])
        await closeBallot(db, b.id)
        await db.query("COMMIT")
        assert.equal((await ballotState(db, b.id)).state, "CLOSED")
        assert.equal(
          (
            await one(
              db,
              "SELECT count(*)::int AS n FROM ballot_results WHERE ballot_id=$1",
              [b.id]
            )
          ).n,
          1
        )
      })
  )

  test(
    "Concurrence : la clôture précède le vote et le fait refuser",
    { timeout: 20_000 },
    () =>
      withConnection(run(), async (db) => {
        const meeting = await seedMeeting(db)
        const b = await openBallot(
          db,
          meeting.id,
          "TEST-CONCURRENT-CLOSE-FIRST"
        )
        const p = await voter(db, meeting.id)
        await race(run(), async (first, second) => {
          const blocked = await waitForBlock(db, second, first)
          await first.query("BEGIN")
          await second.query("BEGIN")
          await dbResult(first, b.id)
          await closeBallot(first, b.id)
          const late = castVote(second, b.id, p.id).then(
            () => null,
            (error) => error.code
          )
          await blocked()
          await first.query("COMMIT")
          assert.equal(await late, "23514")
          await second.query("ROLLBACK")
        })
        assert.equal(
          (
            await one(
              db,
              "SELECT count(*)::int AS n FROM ballot_votes WHERE ballot_id=$1",
              [b.id]
            )
          ).n,
          0
        )
      })
  )

  test(
    "Concurrence : le vote précède la clôture et impose de rejouer une lecture périmée",
    { timeout: 20_000 },
    () =>
      withConnection(run(), async (db) => {
        const meeting = await seedMeeting(db)
        const b = await openBallot(db, meeting.id, "TEST-CONCURRENT-VOTE-FIRST")
        const p = await voter(db, meeting.id)
        await race(run(), async (first, second) => {
          const blocked = await waitForBlock(db, second, first)
          await first.query("BEGIN")
          await second.query("BEGIN ISOLATION LEVEL REPEATABLE READ")
          await ballotState(second, b.id)
          await castVote(first, b.id, p.id)
          const stale = second
            .query("SELECT id FROM ballots WHERE id=$1 FOR UPDATE", [b.id])
            .then(
              () => null,
              (error) => error.code
            )
          await blocked()
          await first.query("COMMIT")
          assert.equal(await stale, "40001")
          await second.query("ROLLBACK")
          await second.query("BEGIN")
          await second.query("SELECT id FROM meetings WHERE id=$1 FOR UPDATE", [
            meeting.id,
          ])
          await second.query("SELECT id FROM ballots WHERE id=$1 FOR UPDATE", [
            b.id,
          ])
          const { n } = await one(
            second,
            "SELECT count(*)::int AS n FROM ballot_votes WHERE ballot_id=$1",
            [b.id]
          )
          assert.equal(n, 1)
          await dbResult(second, b.id, n)
          await closeBallot(second, b.id)
          await second.query("COMMIT")
        })
        assert.equal(
          (
            await one(
              db,
              "SELECT votes_cast FROM ballot_results WHERE ballot_id=$1",
              [b.id]
            )
          ).votes_cast,
          1
        )
      })
  )
}

function dbResult(db: Client, ballotId: string, votes = 0) {
  return db.query(resultSql, [ballotId, votes])
}

async function race(
  run: TestRun,
  fn: (first: Client, second: Client) => Promise<void>
) {
  const first = client(run.url),
    second = client(run.url)
  try {
    await first.connect()
    await second.connect()
    await fn(first, second)
  } finally {
    await Promise.all([first.end(), second.end()])
  }
}
