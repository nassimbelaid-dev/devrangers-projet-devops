import "dotenv/config"

import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"

import { Client } from "pg"

export const tables = [
  "accounts",
  "account_profiles",
  "members",
  "seats",
  "mandates",
  "meetings",
  "meeting_participants",
  "agenda_proposals",
  "decisions",
  "ballots",
  "ballot_votes",
  "ballot_results",
  "actions",
  "documents",
  "document_versions",
  "stored_files",
  "meeting_minutes",
  "notifications",
  "audit_events",
] as const

export function testTarget(value: string | undefined) {
  let url: URL
  try {
    url = new URL(value ?? "")
  } catch {
    throw Error("Configurez TEST_DATABASE_URL avec une URL PostgreSQL dédiée.")
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.port !== "5433" ||
    url.username !== "comite_dev" ||
    url.pathname !== "/comite_scientifique_test" ||
    url.search ||
    url.hash ||
    process.env.NODE_ENV === "production"
  ) {
    throw Error(
      "TEST_DATABASE_URL doit cibler comite_scientifique_test sur PostgreSQL Docker local (5433), hors production."
    )
  }
  return url
}

export function client(url: URL) {
  return new Client({
    connectionString: url.href,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    lock_timeout: 5_000,
  })
}

export async function verifyIdentity(connection: Client, database: string) {
  const { rows } = await connection.query(
    "SELECT current_database() AS name, current_user AS role, inet_server_port() AS port, pg_is_in_recovery() AS replica"
  )
  assert.deepEqual(rows[0], {
    name: database,
    role: "comite_dev",
    port: 5432,
    replica: false,
  })
}

export async function provision() {
  const controlUrl = testTarget(process.env.TEST_DATABASE_URL)
  const control = client(controlUrl)
  await control.connect()
  const database = `comite_scientifique_test_${randomBytes(8).toString("hex")}`
  try {
    await verifyIdentity(control, "comite_scientifique_test")
    await control.query(`CREATE DATABASE "${database}" TEMPLATE template0`)
  } finally {
    await control.end()
  }
  const url = new URL(controlUrl)
  url.pathname = `/${database}`
  const probe = client(url)
  await probe.connect()
  try {
    await verifyIdentity(probe, database)
    const { rows } = await probe.query(
      "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'"
    )
    assert.equal(rows[0].n, 0)
  } finally {
    await probe.end()
  }
  console.log(`Base de test vierge dédiée : ${database}`)
  return { url, password: randomBytes(32).toString("hex") }
}

export type TestRun = Awaited<ReturnType<typeof provision>>

export function pnpm(run: TestRun, script: string, nodeEnv = "test") {
  const executable = process.env.npm_execpath
  if (!executable) throw Error("Lancez la suite avec pnpm db:test.")
  const result = spawnSync(process.execPath, [executable, "run", script], {
    encoding: "utf8",
    timeout: 90_000,
    windowsHide: true,
    env: {
      ...process.env,
      DATABASE_URL: run.url.href,
      NODE_ENV: nodeEnv,
      SEED_DEMO_PASSWORD: run.password,
    },
  })
  return {
    status: result.status,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  }
}

export function runPnpm(run: TestRun, script: string) {
  const result = pnpm(run, script)
  if (result.status !== 0)
    throw Error(
      `${script} a échoué sur la base dédiée (code ${result.status ?? "timeout ou lancement"}).`
    )
  return result.output
}

export async function withConnection<T>(
  run: TestRun,
  fn: (db: Client) => Promise<T>
) {
  const db = client(run.url)
  await db.connect()
  try {
    return await fn(db)
  } finally {
    await db.end()
  }
}

export function rollback(run: TestRun, fn: (db: Client) => Promise<void>) {
  return withConnection(run, async (db) => {
    await db.query("BEGIN")
    try {
      await fn(db)
    } finally {
      await db.query("ROLLBACK")
    }
  })
}

export async function rejects(
  db: Client,
  code: string,
  sql: string,
  params: unknown[] = [],
  constraint?: string
) {
  await db.query("SAVEPOINT negative_case")
  try {
    await assert.rejects(db.query(sql, params), (error: unknown) => {
      const pg = error as { code?: string; constraint?: string }
      assert.equal(pg.code, code)
      if (constraint) assert.equal(pg.constraint, constraint)
      return true
    })
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT negative_case")
    await db.query("RELEASE SAVEPOINT negative_case")
  }
}
