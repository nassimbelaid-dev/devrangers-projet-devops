import "dotenv/config"

import { prisma } from "../src/lib/prisma"

async function checkDatabase() {
  try {
    const [accounts, profiles, members, seats, mandates] = await prisma.$transaction([
      prisma.account.count(),
      prisma.accountProfile.count(),
      prisma.member.count(),
      prisma.seat.count(),
      prisma.mandate.count(),
    ])

    console.log("PostgreSQL connection verified.")
    console.table({ accounts, profiles, members, seats, mandates })
  } catch {
    console.error("Prisma could not query the identity and mandate tables.")
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void checkDatabase()
