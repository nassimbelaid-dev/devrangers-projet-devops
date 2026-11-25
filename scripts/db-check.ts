import "dotenv/config"

import { prisma } from "../src/lib/prisma"

async function checkDatabase() {
  try {
    const [accounts, profiles, members, seats, mandates, meetings, participants, proposals] = await prisma.$transaction([
      prisma.account.count(),
      prisma.accountProfile.count(),
      prisma.member.count(),
      prisma.seat.count(),
      prisma.mandate.count(),
      prisma.meeting.count(),
      prisma.meetingParticipant.count(),
      prisma.agendaProposal.count(),
    ])

    console.log("PostgreSQL connection verified.")
    console.table({ accounts, profiles, members, seats, mandates, meetings, participants, proposals })
  } catch {
    console.error("Prisma could not query the identity, mandate, meeting and agenda tables.")
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void checkDatabase()
