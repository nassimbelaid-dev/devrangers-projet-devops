import type { Client } from "pg"

export async function one(db: Client, sql: string, params: unknown[] = []) {
  const { rows } = await db.query(sql, params)
  if (rows.length !== 1) throw Error("Une seule ligne de fixture est attendue.")
  return rows[0]
}

export const seedMeeting = (db: Client) =>
  one(db, "SELECT id FROM meetings WHERE status='PLANNED'")
export const archivist = (db: Client) =>
  one(db, "SELECT id FROM accounts WHERE role='ARCHIVIST'")

export async function openBallot(
  db: Client,
  meetingId: string,
  reference: string
) {
  const decision = await one(
    db,
    "INSERT INTO decisions(id,meeting_id,reference,title,decision_date) VALUES(gen_random_uuid(),$1,$2,'Test','2026-11-25') RETURNING id",
    [meetingId, reference]
  )
  return one(
    db,
    "INSERT INTO ballots(id,decision_id,meeting_id) VALUES(gen_random_uuid(),$1,$2) RETURNING id",
    [decision.id, meetingId]
  )
}

export const ballotState = (db: Client, ballotId: string) =>
  one(db, "SELECT state FROM ballots WHERE id=$1", [ballotId])

export const voter = (db: Client, meetingId: string) =>
  one(
    db,
    `SELECT p.id FROM meeting_participants p JOIN mandates m ON m.id=p.mandate_id
  WHERE p.meeting_id=$1 AND m.kind='TITULAR' ORDER BY p.id LIMIT 1`,
    [meetingId]
  )

export const castVote = (
  db: Client,
  ballotId: string,
  participationId: string
) =>
  db.query(
    `INSERT INTO ballot_votes
  (id,ballot_id,meeting_id,participation_id,mandate_id,seat_id,choice)
  SELECT gen_random_uuid(),$1,p.meeting_id,p.id,p.mandate_id,m.seat_id,'FOR'
  FROM meeting_participants p JOIN mandates m ON m.id=p.mandate_id WHERE p.id=$2`,
    [ballotId, participationId]
  )

export const closeBallot = (db: Client, ballotId: string) =>
  db.query("UPDATE ballots SET state='CLOSED' WHERE id=$1", [ballotId])

export const resultSql = `INSERT INTO ballot_results
  (id,ballot_id,quorum_percent,majority_percent,rule_version,active_seat_count,represented_seat_count,quorum_min_seats,
  participation_percent,for_count,against_count,abstain_count,votes_cast,uncast_count,expressed_count,quorum_reached,
  outcome,snapshot_version,representation_snapshot,presence_snapshot)
  VALUES(gen_random_uuid(),$1,60,50,'test',5,$2,3,20*$2,$2,0,0,$2,0,$2,false,'QUORUM_NOT_REACHED',1,'[]','[]')`

export const notification = (
  db: Client,
  recipientId: string,
  key: string | null
) =>
  one(
    db,
    `INSERT INTO notifications(id,recipient_account_id,kind,category,title,preview,detail,context,dedupe_key)
   VALUES(gen_random_uuid(),$1,'convocation','meetings','T','P','D','C',$2) RETURNING id`,
    [recipientId, key]
  )
