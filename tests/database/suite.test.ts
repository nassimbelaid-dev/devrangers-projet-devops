import assert from "node:assert/strict"
import { createHash, scryptSync, timingSafeEqual } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import { before, test } from "node:test"

import type { TestRun } from "./environment"

import { registerDomainTests } from "./domains"
import {
  pnpm,
  provision,
  runPnpm,
  tables,
  testTarget,
  withConnection,
} from "./environment"
import { one } from "./fixtures"
import { registerHistoryTests } from "./history"

let run: TestRun
let initialRows: number

before(
  async () => {
    run = await provision()
    runPnpm(run, "db:migrate:deploy")
    const seeded = runPnpm(run, "db:seed")
    initialRows = Number(/Seed terminé : (\d+) ligne/.exec(seeded)?.[1])
  },
  { timeout: 190_000 }
)

test("Isolation : URL dédiée obligatoire, base locale de développement interdite", () => {
  assert.throws(() => testTarget(undefined), /TEST_DATABASE_URL/)
  assert.throws(
    () =>
      testTarget("postgresql://comite_dev@localhost:5433/comite_scientifique"),
    /dédiée|comite_scientifique_test/
  )
  assert.throws(
    () =>
      testTarget(
        "postgresql://comite_dev@example.invalid:5433/comite_scientifique_test"
      ),
    /comite_scientifique_test/
  )
  assert.throws(
    () =>
      testTarget(
        "postgresql://comite_dev@localhost:5433/comite_scientifique_test?options=x"
      ),
    /comite_scientifique_test/
  )
})

test("Structure : 19 tables, six migrations, FK, index, contraintes et triggers", () =>
  withConnection(run, async (db) => {
    const paths = (await readdir("prisma/migrations", { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
    assert.equal(paths.length, 6)
    const sql = await Promise.all(
      paths.map((path) =>
        readFile(`prisma/migrations/${path}/migration.sql`, "utf8")
      )
    )
    const metadata = await db.query(
      'SELECT migration_name,checksum,finished_at IS NOT NULL AND rolled_back_at IS NULL AS applied FROM "_prisma_migrations" ORDER BY migration_name'
    )
    assert.deepEqual(
      metadata.rows.map((row) => row.migration_name),
      paths
    )
    for (const [index, row] of metadata.rows.entries()) {
      assert(row.applied)
      const source = sql[index]
      assert(
        [
          source,
          source.replace(/\r\n/g, "\n"),
          source.replace(/\r?\n/g, "\r\n"),
        ].some(
          (text) =>
            createHash("sha256").update(text).digest("hex") === row.checksum
        ),
        `Checksum de migration ${paths[index]}`
      )
    }

    const tableList = await db.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename"
    )
    assert.deepEqual(
      tableList.rows.map((row) => row.tablename),
      [...tables].sort()
    )
    const expectedConstraints = [
      ...sql
        .join("\n")
        .matchAll(
          /(?:ADD\s+)?CONSTRAINT "([^"]+)"\s+(?:FOREIGN KEY|CHECK|EXCLUDE|PRIMARY KEY)/g
        ),
    ]
      .map((match) => match[1])
      .sort()
    const actual =
      await db.query(`SELECT conname,contype,confdeltype::text,confupdtype::text FROM pg_constraint
    WHERE connamespace='public'::regnamespace AND contype IN ('f','c','x','p') AND conrelid<>'_prisma_migrations'::regclass ORDER BY conname`)
    assert.deepEqual(
      actual.rows.map((row) => row.conname).sort(),
      expectedConstraints
    )
    for (const row of actual.rows.filter((row) => row.contype === "f")) {
      assert.equal(row.confdeltype, "r")
      assert.equal(row.confupdtype, "r")
    }
    assert.equal(actual.rows.filter((row) => row.contype === "c").length, 29)
    assert.equal(actual.rows.filter((row) => row.contype === "x").length, 3)
    assert.equal(
      (
        await one(
          db,
          "SELECT extversion FROM pg_extension WHERE extname='btree_gist'"
        )
      ).extversion,
      "1.8"
    )

    const declaredIndexes = [
      ...sql.join("\n").matchAll(/CREATE (UNIQUE )?INDEX "([^"]+)"/g),
    ]
    const indexes =
      await db.query(`SELECT i.relname AS name,x.indisunique,x.indpred IS NULL AS unconditional FROM pg_index x
    JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=i.relnamespace WHERE n.nspname='public'`)
    for (const [, unique, name] of declaredIndexes) {
      const index = indexes.rows.find((row) => row.name === name)
      assert(index, name)
      assert.equal(index.indisunique, Boolean(unique), name)
      assert(index.unconditional, name)
    }
    const declaredTriggers = [
      ...sql.join("\n").matchAll(/CREATE (CONSTRAINT )?TRIGGER (\w+)/g),
    ]
    assert.equal(declaredTriggers.length, 16)
    const triggers =
      await db.query(`SELECT tgname,tgenabled::text,tgdeferrable,tginitdeferred FROM pg_trigger
    WHERE NOT tgisinternal AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace)`)
    assert.equal(triggers.rowCount, declaredTriggers.length)
    for (const [, constraint, name] of declaredTriggers) {
      const trigger = triggers.rows.find((row) => row.tgname === name)
      assert.deepEqual(trigger, {
        tgname: name,
        tgenabled: "O",
        tgdeferrable: Boolean(constraint),
        tginitdeferred: Boolean(constraint),
      })
    }
  }))

test(
  "Seed : 84 lignes à l'installation et réexécution sans modification",
  { timeout: 95_000 },
  () =>
    withConnection(run, async (db) => {
      assert.equal(initialRows, 84)
      const snapshot = `SELECT md5(concat_ws('|',${tables.map((table) => `(SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id)::text,'[]') FROM "${table}" r)`).join(",")})) AS digest`
      const before = await one(db, snapshot)
      assert(/0 ligne/.test(runPnpm(run, "db:seed")))
      assert.equal((await one(db, snapshot)).digest, before.digest)
    })
)

test("Seed : liens métier, provenance, résultat et PV reconstruits", () =>
  withConnection(run, async (db) => {
    const roles = await db.query(
      "SELECT role::text AS role FROM accounts ORDER BY role::text"
    )
    assert.deepEqual(
      roles.rows.map((row) => row.role),
      [
        "ADMIN",
        "ARCHIVIST",
        "MEMBER",
        "MEMBER",
        "MEMBER",
        "PRESIDENT",
        "SECRETARY",
      ]
    )
    const participation = await one(
      db,
      `SELECT count(*)::int AS n,count(*) FILTER (WHERE p.attendance IS TRUE)::int AS present,
    bool_and(p.member_id=d.member_id AND m.meeting_date BETWEEN d.start_date AND d.end_date) AS valid
    FROM meeting_participants p JOIN meetings m ON m.id=p.meeting_id JOIN mandates d ON d.id=p.mandate_id`
    )
    assert.deepEqual(participation, { n: 13, present: 4, valid: true })
    const ballot =
      await db.query(`SELECT r.outcome::text,r.for_count,r.against_count,r.abstain_count,r.active_seat_count,
    r.represented_seat_count,r.quorum_min_seats,r.participation_percent,jsonb_array_length(r.representation_snapshot) AS representations,
    jsonb_array_length(r.presence_snapshot) AS presences FROM ballot_results r JOIN ballots b ON b.id=r.ballot_id
    JOIN decisions d ON d.id=b.decision_id WHERE d.reference LIKE 'DEC-%' ORDER BY r.outcome::text`)
    const shared = {
      abstain_count: 1,
      active_seat_count: 5,
      represented_seat_count: 4,
      quorum_min_seats: 3,
      participation_percent: 80,
      representations: 5,
      presences: 4,
    }
    assert.deepEqual(ballot.rows, [
      { outcome: "ADOPTED", for_count: 3, against_count: 0, ...shared },
      { outcome: "REJECTED", for_count: 1, against_count: 2, ...shared },
    ])
    const votes = await one(
      db,
      `SELECT count(*)::int AS n,bool_and(p.attendance AND m.seat_id=v.seat_id AND EXISTS
    (SELECT FROM jsonb_array_elements(r.representation_snapshot) rep
      WHERE rep->>'seatId'=v.seat_id::text AND rep->'representative'->>'mandateId'=v.mandate_id::text)) AS valid
    FROM ballot_votes v JOIN ballots b ON b.id=v.ballot_id JOIN decisions d ON d.id=b.decision_id
    JOIN meeting_participants p ON p.id=v.participation_id JOIN mandates m ON m.id=v.mandate_id JOIN ballot_results r ON r.ballot_id=b.id
    WHERE d.reference LIKE 'DEC-%'`
    )
    assert.deepEqual(votes, { n: 8, valid: true })
    assert.equal(
      (
        await one(
          db,
          `SELECT count(*)::int AS n FROM decisions d JOIN audit_events a ON a.entity_id=d.id
    WHERE d.final_source='HISTORICAL_IMPORT' AND a.operation='IMPORT_HISTORICAL_DECISION' AND NOT EXISTS
    (SELECT FROM ballots b WHERE b.decision_id=d.id)`
        )
      ).n,
      2
    )
    assert.equal(
      (
        await one(
          db,
          `SELECT count(*)::int AS n FROM decisions d JOIN ballots b ON b.decision_id=d.id
    JOIN ballot_results r ON r.ballot_id=b.id WHERE d.reference LIKE 'DEC-%' AND d.final_source='BALLOT'
    AND d.status::text=r.outcome::text AND b.state='CLOSED' AND b.quorum_percent=r.quorum_percent AND b.majority_percent=r.majority_percent`
        )
      ).n,
      2
    )
    assert.equal(
      (
        await one(
          db,
          `SELECT count(*)::int AS n FROM actions a JOIN decisions d ON d.id=a.decision_id
    WHERE d.status='ADOPTED' AND a.due_date>=d.decision_date`
        )
      ).n,
      6
    )
    const pv = await one(
      db,
      `SELECT p.official_snapshot AS snapshot,p.snapshot_version,p.signed_at,m.status::text AS status,
    p.summary,m.id FROM meeting_minutes p JOIN meetings m ON m.id=p.meeting_id WHERE p.status='SIGNED'`
    )
    assert.equal(pv.status, "MINUTES_SIGNED")
    assert.equal(pv.snapshot_version, 1)
    assert.equal(pv.signed_at, null)
    assert.equal(pv.snapshot.sourceDates.precision, "day")
    assert.equal(pv.snapshot.meeting.id, pv.id)
    assert.equal(pv.snapshot.summary, pv.summary)
    assert.deepEqual(
      ["participants", "agenda", "decisions", "actions"].map(
        (key) => pv.snapshot[key].length
      ),
      [4, 2, 4, 6]
    )
    assert.equal(
      (
        await one(
          db,
          "SELECT count(*)::int AS n FROM document_versions WHERE is_historical"
        )
      ).n,
      4
    )
    assert.equal(
      (await one(db, "SELECT count(*)::int AS n FROM stored_files")).n,
      0
    )
  }))

test("Seed : sept empreintes scrypt vérifiées et sels distincts", () =>
  withConnection(run, async (db) => {
    const { rows } = await db.query("SELECT password_hash FROM accounts")
    assert.equal(rows.length, 7)
    const salts = new Set<string>()
    for (const row of rows) {
      const [algorithm, params, saltText, hashText, ...rest] =
        row.password_hash.split("$")
      // Use boolean assertions so a failure never prints an unexpected secret.
      assert(
        algorithm === "scrypt" &&
          params === "ln=17,r=8,p=1" &&
          saltText &&
          hashText &&
          rest.length === 0
      )
      const salt = Buffer.from(saltText, "base64url")
      const stored = Buffer.from(hashText, "base64url")
      assert(salt.length === 16 && stored.length === 64)
      assert(!salts.has(salt.toString("hex")))
      salts.add(salt.toString("hex"))
      assert(
        timingSafeEqual(
          stored,
          scryptSync(run.password, salt, 64, {
            N: 131072,
            r: 8,
            p: 1,
            maxmem: 256 * 1024 * 1024,
          })
        )
      )
    }
  }))

test("Seed : exécution en production refusée", { timeout: 95_000 }, () => {
  const res = pnpm(run, "db:seed", "production")
  assert(res.status !== null && res.status !== 0)
  assert(/interdit en production/.test(res.output))
})

test(
  "Prisma Client : db:check interroge les 19 modèles",
  { timeout: 95_000 },
  () =>
    withConnection(run, async (db) => {
      const { status, stdout, stderr } = pnpm(run, "db:check", "test", [
        "--json",
      ])
      assert.equal(
        status,
        0,
        `db:check a échoué (stderr : ${Buffer.byteLength(stderr)} octets).`
      )

      const expected = await Promise.all(
        tables.map(async (table) => {
          const { count } = await one(
            db,
            `SELECT count(*)::int AS count FROM "${table}"`
          )
          return [table, count] as const
        })
      )
      assert.equal(expected.length, 19)
      const { name } = await one(db, "SELECT current_database() AS name")
      assert.equal(name, run.url.pathname.slice(1))
      assert.deepEqual(JSON.parse(stdout), {
        database: name,
        counts: Object.fromEntries(expected),
      })
    })
)

registerDomainTests(() => run)
registerHistoryTests(() => run)
