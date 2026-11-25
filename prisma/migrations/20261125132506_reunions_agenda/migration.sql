BEGIN;

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'CLOSED', 'MINUTES_SIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgendaStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "meeting_date" DATE NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "MeetingStatus" NOT NULL DEFAULT 'PLANNED',
    "invitations_sent_at" TIMESTAMPTZ(3),
    "started_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_participants" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "mandate_id" UUID NOT NULL,
    "attendance" BOOLEAN,
    "attendance_recorded_at" TIMESTAMPTZ(3),

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_proposals" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "author_member_id" UUID NOT NULL,
    "reviewer_member_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AgendaStatus" NOT NULL DEFAULT 'PROPOSED',
    "sort_order" INTEGER,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMPTZ(3),

    CONSTRAINT "agenda_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meetings_status_meeting_date_idx" ON "meetings"("status", "meeting_date");

-- CreateIndex
CREATE INDEX "meeting_participants_member_id_idx" ON "meeting_participants"("member_id");

-- CreateIndex
CREATE INDEX "meeting_participants_mandate_id_idx" ON "meeting_participants"("mandate_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participants_meeting_id_member_id_key" ON "meeting_participants"("meeting_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participants_id_meeting_id_mandate_id_key" ON "meeting_participants"("id", "meeting_id", "mandate_id");

-- CreateIndex
CREATE INDEX "agenda_proposals_meeting_id_status_sort_order_idx" ON "agenda_proposals"("meeting_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "agenda_proposals_author_member_id_idx" ON "agenda_proposals"("author_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "agenda_proposals_id_meeting_id_key" ON "agenda_proposals"("id", "meeting_id");

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_mandate_id_member_id_fkey" FOREIGN KEY ("mandate_id", "member_id") REFERENCES "mandates"("id", "member_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "agenda_proposals" ADD CONSTRAINT "agenda_proposals_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "agenda_proposals" ADD CONSTRAINT "agenda_proposals_author_member_id_fkey" FOREIGN KEY ("author_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "agenda_proposals" ADD CONSTRAINT "agenda_proposals_reviewer_member_id_fkey" FOREIGN KEY ("reviewer_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "meetings"
    ADD CONSTRAINT "meetings_time_order_check" CHECK ("start_time" < "end_time"),
    ADD CONSTRAINT "meetings_lifecycle_order_check" CHECK (
        "started_at" IS NULL OR "closed_at" IS NULL OR "started_at" <= "closed_at"
    );

ALTER TABLE "agenda_proposals"
    ADD CONSTRAINT "agenda_proposals_sort_order_check" CHECK ("sort_order" IS NULL OR "sort_order" >= 0);

COMMIT;
