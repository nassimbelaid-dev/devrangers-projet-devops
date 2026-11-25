BEGIN;

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('PENDING', 'ADOPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DecisionFinalSource" AS ENUM ('BALLOT', 'HISTORICAL_IMPORT');

-- CreateEnum
CREATE TYPE "BallotState" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "BallotOutcome" AS ENUM ('ADOPTED', 'REJECTED', 'QUORUM_NOT_REACHED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "decisions" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "agenda_proposal_id" UUID,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "decision_date" DATE NOT NULL,
    "status" "DecisionStatus" NOT NULL DEFAULT 'PENDING',
    "final_source" "DecisionFinalSource",
    "archived_at" TIMESTAMPTZ(3),
    "archived_by_account_id" UUID,
    "archived_by_name" TEXT,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ballots" (
    "id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "state" "BallotState" NOT NULL DEFAULT 'OPEN',
    "quorum_percent" DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    "majority_percent" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "opened_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),

    CONSTRAINT "ballots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ballot_votes" (
    "id" UUID NOT NULL,
    "ballot_id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "participation_id" UUID NOT NULL,
    "mandate_id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "voted_at" TIMESTAMPTZ(3),

    CONSTRAINT "ballot_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ballot_results" (
    "id" UUID NOT NULL,
    "ballot_id" UUID NOT NULL,
    "captured_at" TIMESTAMPTZ(3),
    "quorum_percent" DECIMAL(5,2) NOT NULL,
    "majority_percent" DECIMAL(5,2) NOT NULL,
    "rule_version" TEXT NOT NULL,
    "active_seat_count" INTEGER NOT NULL,
    "represented_seat_count" INTEGER NOT NULL,
    "quorum_min_seats" INTEGER NOT NULL,
    "participation_percent" INTEGER NOT NULL,
    "for_count" INTEGER NOT NULL,
    "against_count" INTEGER NOT NULL,
    "abstain_count" INTEGER NOT NULL,
    "votes_cast" INTEGER NOT NULL,
    "uncast_count" INTEGER NOT NULL,
    "expressed_count" INTEGER NOT NULL,
    "snapshot_version" INTEGER NOT NULL,
    "quorum_reached" BOOLEAN NOT NULL,
    "outcome" "BallotOutcome" NOT NULL,
    "representation_snapshot" JSONB NOT NULL,
    "presence_snapshot" JSONB NOT NULL,

    CONSTRAINT "ballot_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" UUID NOT NULL,
    "decision_id" UUID,
    "assignee_member_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "due_date" DATE NOT NULL,
    "priority" "ActionPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "ActionStatus" NOT NULL DEFAULT 'TODO',
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decisions_reference_key" ON "decisions"("reference");

-- CreateIndex
CREATE INDEX "decisions_meeting_id_status_idx" ON "decisions"("meeting_id", "status");

-- CreateIndex
CREATE INDEX "decisions_agenda_proposal_id_idx" ON "decisions"("agenda_proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "decisions_id_meeting_id_key" ON "decisions"("id", "meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "ballots_decision_id_key" ON "ballots"("decision_id");

-- CreateIndex
CREATE UNIQUE INDEX "ballots_id_meeting_id_key" ON "ballots"("id", "meeting_id");

-- CreateIndex
CREATE INDEX "ballot_votes_participation_id_idx" ON "ballot_votes"("participation_id");

-- CreateIndex
CREATE INDEX "ballot_votes_mandate_id_seat_id_idx" ON "ballot_votes"("mandate_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "ballot_votes_ballot_id_seat_id_key" ON "ballot_votes"("ballot_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "ballot_votes_ballot_id_participation_id_key" ON "ballot_votes"("ballot_id", "participation_id");

-- CreateIndex
CREATE UNIQUE INDEX "ballot_results_ballot_id_key" ON "ballot_results"("ballot_id");

-- CreateIndex
CREATE INDEX "actions_assignee_member_id_status_due_date_idx" ON "actions"("assignee_member_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "actions_decision_id_idx" ON "actions"("decision_id");

-- CreateIndex
CREATE INDEX "actions_status_sort_order_idx" ON "actions"("status", "sort_order");

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_agenda_proposal_id_meeting_id_fkey" FOREIGN KEY ("agenda_proposal_id", "meeting_id") REFERENCES "agenda_proposals"("id", "meeting_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_archived_by_account_id_fkey" FOREIGN KEY ("archived_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ballots" ADD CONSTRAINT "ballots_decision_id_meeting_id_fkey" FOREIGN KEY ("decision_id", "meeting_id") REFERENCES "decisions"("id", "meeting_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ballot_votes" ADD CONSTRAINT "ballot_votes_ballot_id_meeting_id_fkey" FOREIGN KEY ("ballot_id", "meeting_id") REFERENCES "ballots"("id", "meeting_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ballot_votes" ADD CONSTRAINT "ballot_votes_participation_id_meeting_id_mandate_id_fkey" FOREIGN KEY ("participation_id", "meeting_id", "mandate_id") REFERENCES "meeting_participants"("id", "meeting_id", "mandate_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ballot_votes" ADD CONSTRAINT "ballot_votes_mandate_id_seat_id_fkey" FOREIGN KEY ("mandate_id", "seat_id") REFERENCES "mandates"("id", "seat_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ballot_results" ADD CONSTRAINT "ballot_results_ballot_id_fkey" FOREIGN KEY ("ballot_id") REFERENCES "ballots"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_assignee_member_id_fkey" FOREIGN KEY ("assignee_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "decisions"
    ADD CONSTRAINT "decisions_final_source_check" CHECK (
        ("status" = 'PENDING' AND "final_source" IS NULL)
        OR ("status" IN ('ADOPTED', 'REJECTED') AND "final_source" IS NOT NULL)
    ),
    ADD CONSTRAINT "decisions_archive_status_check" CHECK (
        "archived_at" IS NULL OR "status" IN ('ADOPTED', 'REJECTED')
    );

ALTER TABLE "ballots"
    ADD CONSTRAINT "ballots_thresholds_check" CHECK (
        "quorum_percent" BETWEEN 1 AND 100 AND "majority_percent" BETWEEN 1 AND 100
    ),
    ADD CONSTRAINT "ballots_lifecycle_order_check" CHECK (
        "opened_at" IS NULL OR "closed_at" IS NULL OR "opened_at" <= "closed_at"
    );

ALTER TABLE "ballot_results"
    ADD CONSTRAINT "ballot_results_thresholds_check" CHECK (
        "quorum_percent" BETWEEN 1 AND 100 AND "majority_percent" BETWEEN 1 AND 100
    ),
    ADD CONSTRAINT "ballot_results_counts_check" CHECK (
        "active_seat_count" >= 0
        AND "represented_seat_count" BETWEEN 0 AND "active_seat_count"
        AND "for_count" >= 0 AND "against_count" >= 0 AND "abstain_count" >= 0
        AND "expressed_count" >= 0 AND "votes_cast" >= 0 AND "uncast_count" >= 0
        AND "for_count"::bigint + "against_count" = "expressed_count"
        AND "expressed_count"::bigint + "abstain_count" = "votes_cast"
        AND "votes_cast"::bigint + "uncast_count" = "represented_seat_count"
    ),
    ADD CONSTRAINT "ballot_results_quorum_check" CHECK (
        "quorum_min_seats" = ceil("active_seat_count" * "quorum_percent" / 100)
        AND "quorum_reached" = ("active_seat_count" > 0 AND "represented_seat_count" >= "quorum_min_seats")
    ),
    ADD CONSTRAINT "ballot_results_participation_check" CHECK (
        "participation_percent" = COALESCE(
            round(100::numeric * "represented_seat_count" / NULLIF("active_seat_count", 0)),
            0
        )
    ),
    ADD CONSTRAINT "ballot_results_outcome_check" CHECK (
        CASE
            WHEN NOT "quorum_reached" THEN "outcome" = 'QUORUM_NOT_REACHED'
            WHEN "expressed_count" > 0 AND 100::numeric * "for_count" > "majority_percent" * "expressed_count"
                THEN "outcome" = 'ADOPTED'
            ELSE "outcome" = 'REJECTED'
        END
    ),
    ADD CONSTRAINT "ballot_results_snapshot_version_check" CHECK ("snapshot_version" > 0);

ALTER TABLE "actions"
    ADD CONSTRAINT "actions_sort_order_check" CHECK ("sort_order" >= 0);

COMMIT;
