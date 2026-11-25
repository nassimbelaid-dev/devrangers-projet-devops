import "dotenv/config"

import { randomBytes, scryptSync } from "node:crypto"
import { config } from "dotenv"

import { buildSeedData } from "./seed/data"

class SeedError extends Error {}

function developmentPassword() {
  if (process.env.NODE_ENV === "production") {
    throw new SeedError("Seed de démonstration interdit en production.")
  }

  let database: URL
  try {
    database = new URL(process.env.DATABASE_URL ?? "")
  } catch {
    throw new SeedError("DATABASE_URL est absente ou invalide.")
  }
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) ||
    database.port !== "5433" ||
    database.pathname !== "/comite_scientifique" ||
    database.username !== "comite_dev"
  ) {
    throw new SeedError(
      "Seed réservé à la base de développement locale comite_scientifique sur le port 5433."
    )
  }

  let password = process.env.SEED_DEMO_PASSWORD
  if (password === undefined) {
    const localEnv: Record<string, string> = {}
    config({ path: ".env.local", processEnv: localEnv, quiet: true })
    password = localEnv.SEED_DEMO_PASSWORD
  }
  if (
    !password ||
    password.trim().length < 8 ||
    Buffer.byteLength(password) > 1024
  ) {
    throw new SeedError(
      "Définissez SEED_DEMO_PASSWORD avec au moins 8 caractères et au plus 1 024 octets."
    )
  }
  return password
}

function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64, {
    N: 131072,
    r: 8,
    p: 1,
    maxmem: 256 * 1024 * 1024,
  })
  return `scrypt$ln=17,r=8,p=1$${salt.toString("base64url")}$${hash.toString("base64url")}`
}

async function seed() {
  const password = developmentPassword()
  const data = buildSeedData()
  const { prisma } = await import("../src/lib/prisma")

  try {
    const inserted = await prisma.$transaction(
      async (tx) => {
        function batch<Row extends { id: string }>(
          table: string,
          rows: Row[],
          count: (ids: string[]) => Promise<number>,
          insert: (rows: Row[]) => Promise<{ count: number }>
        ) {
          return {
            table,
            size: rows.length,
            existing: () => count(rows.map((row) => row.id)),
            insert: () => insert(rows),
          }
        }

        const batches = [
          batch(
            "seats",
            data.seats,
            (ids) => tx.seat.count({ where: { id: { in: ids } } }),
            (rows) => tx.seat.createMany({ data: rows })
          ),
          batch(
            "members",
            data.members,
            (ids) => tx.member.count({ where: { id: { in: ids } } }),
            (rows) => tx.member.createMany({ data: rows })
          ),
          batch(
            "mandates",
            data.mandates,
            (ids) => tx.mandate.count({ where: { id: { in: ids } } }),
            (rows) => tx.mandate.createMany({ data: rows })
          ),
          batch(
            "accounts",
            data.accounts,
            (ids) => tx.account.count({ where: { id: { in: ids } } }),
            (rows) =>
              tx.account.createMany({
                data: rows.map((account) => ({
                  ...account,
                  passwordHash: hashPassword(password),
                })),
              })
          ),
          batch(
            "meetings",
            data.meetings,
            (ids) => tx.meeting.count({ where: { id: { in: ids } } }),
            (rows) => tx.meeting.createMany({ data: rows })
          ),
          batch(
            "meeting_participants",
            data.participations,
            (ids) =>
              tx.meetingParticipant.count({ where: { id: { in: ids } } }),
            (rows) => tx.meetingParticipant.createMany({ data: rows })
          ),
          batch(
            "agenda_proposals",
            data.proposals,
            (ids) => tx.agendaProposal.count({ where: { id: { in: ids } } }),
            (rows) => tx.agendaProposal.createMany({ data: rows })
          ),
          batch(
            "decisions",
            data.decisions,
            (ids) => tx.decision.count({ where: { id: { in: ids } } }),
            (rows) => tx.decision.createMany({ data: rows })
          ),
          batch(
            "actions",
            data.actions,
            (ids) => tx.committeeAction.count({ where: { id: { in: ids } } }),
            (rows) => tx.committeeAction.createMany({ data: rows })
          ),
          batch(
            "ballots",
            data.ballots,
            (ids) => tx.ballot.count({ where: { id: { in: ids } } }),
            (rows) => tx.ballot.createMany({ data: rows })
          ),
          batch(
            "ballot_votes",
            data.votes,
            (ids) => tx.ballotVote.count({ where: { id: { in: ids } } }),
            (rows) => tx.ballotVote.createMany({ data: rows })
          ),
          batch(
            "ballot_results",
            data.results,
            (ids) => tx.ballotResult.count({ where: { id: { in: ids } } }),
            (rows) => tx.ballotResult.createMany({ data: rows })
          ),
          batch(
            "documents",
            data.documents,
            (ids) => tx.document.count({ where: { id: { in: ids } } }),
            (rows) => tx.document.createMany({ data: rows })
          ),
          batch(
            "document_versions",
            data.versions,
            (ids) => tx.documentVersion.count({ where: { id: { in: ids } } }),
            (rows) => tx.documentVersion.createMany({ data: rows })
          ),
          batch(
            "meeting_minutes",
            data.minutes,
            (ids) => tx.meetingMinutes.count({ where: { id: { in: ids } } }),
            (rows) => tx.meetingMinutes.createMany({ data: rows })
          ),
          batch(
            "audit_events",
            data.audits,
            (ids) => tx.auditEvent.count({ where: { id: { in: ids } } }),
            (rows) => tx.auditEvent.createMany({ data: rows })
          ),
        ]

        const existing = await Promise.all(
          batches.map((item) => item.existing())
        )
        if (existing.every((count, index) => count === batches[index].size))
          return 0
        if (existing.some((count) => count > 0)) {
          throw new SeedError(
            "Jeu de démonstration partiel. Aucune donnée ne sera écrasée ou recréée automatiquement."
          )
        }
        for (const item of batches) {
          try {
            const result = await item.insert()
            if (result.count !== item.size)
              throw new Error("Unexpected insert count.")
          } catch (error) {
            const code =
              typeof error === "object" && error && "code" in error
                ? String(error.code)
                : "inconnu"
            throw new SeedError(
              `Insertion impossible dans ${item.table} (${code}). La transaction est annulée.`
            )
          }
        }
        return batches.reduce((total, item) => total + item.size, 0)
      },
      { isolationLevel: "Serializable", timeout: 30_000 }
    )
    console.log(`Seed terminé : ${inserted} ligne(s) insérée(s).`)
  } finally {
    await prisma.$disconnect()
  }
}

void seed().catch((error) => {
  console.error(
    error instanceof SeedError
      ? error.message
      : "Échec du seed. Vérifiez les fixtures et l'accès à la base locale."
  )
  process.exitCode = 1
})
