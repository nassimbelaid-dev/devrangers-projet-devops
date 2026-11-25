import "dotenv/config"

import { prisma } from "../src/lib/prisma"

async function checkDatabase() {
  try {
    const [
      accounts, profiles, members, seats, mandates, meetings, participants, proposals,
      decisions, ballots, votes, results, actions,
    ] = await prisma.$transaction([
      prisma.account.count(),
      prisma.accountProfile.count(),
      prisma.member.count(),
      prisma.seat.count(),
      prisma.mandate.count(),
      prisma.meeting.count(),
      prisma.meetingParticipant.count(),
      prisma.agendaProposal.count(),
      prisma.decision.count(),
      prisma.ballot.count(),
      prisma.ballotVote.count(),
      prisma.ballotResult.count(),
      prisma.committeeAction.count(),
    ])

    console.log("PostgreSQL connection verified.")
    console.table({
      accounts, profiles, members, seats, mandates, meetings, participants, proposals,
      decisions, ballots, votes, results, actions,
    })
  } catch {
    console.error("Prisma could not query the database tables.")
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void checkDatabase()
