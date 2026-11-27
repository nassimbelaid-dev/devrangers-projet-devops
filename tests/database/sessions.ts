import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import { test } from "node:test"

import type { TestRun } from "./environment"

import { rejects, rollback } from "./environment"
import { archivist, one } from "./fixtures"

const insertSession = `INSERT INTO account_sessions(id, account_id, token_hash, expires_at)
  VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP + interval '1 hour')
  RETURNING account_id, created_at, expires_at`

const firstHash = createHash("sha256").update("test-session-one").digest("hex")
const secondHash = createHash("sha256").update("test-session-two").digest("hex")

export function registerSessionTests(run: () => TestRun) {
  test("Sessions : compte obligatoire, plusieurs sessions et révocation ciblée", () =>
    rollback(run(), async (db) => {
      const { id: accountId } = await one(
        db,
        `INSERT INTO accounts(id, first_name, last_name, email, password_hash, role)
         VALUES(gen_random_uuid(), 'Test', 'Session', 'session@example.test', 'fixture-only', 'ADMIN')
         RETURNING id`
      )
      const session = await one(db, insertSession, [accountId, firstHash])
      assert.equal(session.account_id, accountId)
      const { now } = await one(db, "SELECT CURRENT_TIMESTAMP(3) AS now")
      assert.deepEqual(session.created_at, now)
      assert.equal(session.expires_at.getTime() - now.getTime(), 3_600_000)
      await rejects(db, "23502", insertSession, [null, secondHash])
      await rejects(
        db,
        "23503",
        insertSession,
        [randomUUID(), secondHash],
        "account_sessions_account_id_fkey"
      )
      await rejects(
        db,
        "23001",
        "DELETE FROM accounts WHERE id = $1",
        [accountId],
        "account_sessions_account_id_fkey"
      )
      await rejects(
        db,
        "23001",
        "UPDATE accounts SET id = gen_random_uuid() WHERE id = $1",
        [accountId],
        "account_sessions_account_id_fkey"
      )

      await db.query(insertSession, [accountId, secondHash])
      const revoked = await db.query(
        "DELETE FROM account_sessions WHERE token_hash = $1",
        [firstHash]
      )
      assert.equal(revoked.rowCount, 1)
      const remaining = await one(
        db,
        "SELECT token_hash FROM account_sessions WHERE account_id = $1",
        [accountId]
      )
      assert.equal(remaining.token_hash, secondHash)
    }))

  test("Sessions : empreinte unique entre comptes", () =>
    rollback(run(), async (db) => {
      const { id: accountId } = await archivist(db)
      const { id: otherId } = await one(
        db,
        "SELECT id FROM accounts WHERE role = 'ADMIN'"
      )
      await db.query(insertSession, [accountId, firstHash])
      await rejects(
        db,
        "23505",
        insertSession,
        [otherId, firstHash],
        "account_sessions_token_hash_key"
      )
    }))

  test("Sessions : empreinte hexadécimale et expiration finie après la création", () =>
    rollback(run(), async (db) => {
      const { id: accountId } = await archivist(db)
      for (const invalidHash of [
        "raw-session-token",
        firstHash.slice(1),
        firstHash + "0",
        firstHash.toUpperCase(),
        "g".repeat(64),
      ]) {
        await rejects(
          db,
          "23514",
          insertSession,
          [accountId, invalidHash],
          "account_sessions_token_hash_format_check"
        )
      }

      const insertWithDates = `INSERT INTO account_sessions(id, account_id, token_hash, created_at, expires_at)
        VALUES(gen_random_uuid(), $1, $2, $3, $4)`
      const createdAt = "2026-01-01T12:00:00Z"
      const later = "2026-01-01T13:00:00Z"
      for (const [creation, expiration] of [
        [createdAt, "2026-01-01T11:00:00Z"],
        [createdAt, createdAt],
        [createdAt, "infinity"],
        ["-infinity", later],
      ]) {
        await rejects(
          db,
          "23514",
          insertWithDates,
          [accountId, firstHash, creation, expiration],
          "account_sessions_expiration_check"
        )
      }
      assert.equal(
        (
          await db.query(insertWithDates, [
            accountId,
            firstHash,
            createdAt,
            later,
          ])
        ).rowCount,
        1
      )
    }))
}
