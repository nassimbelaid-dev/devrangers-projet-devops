import "dotenv/config"

import { prisma } from "../src/lib/prisma"

async function checkDatabase() {
  try {
    const [
      [identity],
      accounts,
      profiles,
      members,
      seats,
      mandates,
      meetings,
      participants,
      proposals,
      decisions,
      ballots,
      votes,
      results,
      actions,
      documents,
      versions,
      files,
      minutes,
      notifications,
      auditEvents,
      accountSessions,
    ] = await prisma.$transaction([
      prisma.$queryRaw<
        { database: string }[]
      >`SELECT current_database() AS database`,
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
      prisma.document.count(),
      prisma.documentVersion.count(),
      prisma.storedFile.count(),
      prisma.meetingMinutes.count(),
      prisma.notification.count(),
      prisma.auditEvent.count(),
      prisma.accountSession.count(),
    ])

    const counts = {
      accounts,
      account_profiles: profiles,
      members,
      seats,
      mandates,
      meetings,
      meeting_participants: participants,
      agenda_proposals: proposals,
      decisions,
      ballots,
      ballot_votes: votes,
      ballot_results: results,
      actions,
      documents,
      document_versions: versions,
      stored_files: files,
      meeting_minutes: minutes,
      notifications,
      audit_events: auditEvents,
      account_sessions: accountSessions,
    }
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify({ database: identity.database, counts }))
    } else {
      console.log("PostgreSQL connection verified.")
      console.table(counts)
    }
  } catch {
    console.error("Prisma could not query the database tables.")
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void checkDatabase()
