BEGIN;

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AGENDA', 'MINUTES', 'REPORT', 'INVITATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('COMMITTEE', 'PRESIDENCY', 'ARCHIVES');

-- CreateEnum
CREATE TYPE "MinutesStatus" AS ENUM ('DRAFT', 'TO_SIGN', 'SIGNED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "meeting_id" UUID,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "DocumentType" NOT NULL DEFAULT 'REPORT',
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'COMMITTEE',
    "updated_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "archived_by_account_id" UUID,
    "archived_by_name" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "version_date" DATE,
    "author_account_id" UUID,
    "author_name" TEXT,
    "is_historical" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "agenda_proposal_id" UUID,
    "document_version_id" UUID,
    "original_name" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "checksum" TEXT,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_minutes" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "next_steps" TEXT NOT NULL DEFAULT '',
    "status" "MinutesStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(3),
    "submitted_at" TIMESTAMPTZ(3),
    "returned_at" TIMESTAMPTZ(3),
    "signed_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "correction_note" TEXT,
    "secretary_account_id" UUID,
    "signed_by_account_id" UUID,
    "archived_by_account_id" UUID,
    "secretary_name" TEXT,
    "president_name" TEXT,
    "signed_by_name" TEXT,
    "archived_by_name" TEXT,
    "snapshot_version" INTEGER,
    "official_snapshot" JSONB,

    CONSTRAINT "meeting_minutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_reference_key" ON "documents"("reference");

-- CreateIndex
CREATE INDEX "documents_meeting_id_idx" ON "documents"("meeting_id");

-- CreateIndex
CREATE INDEX "documents_status_visibility_idx" ON "documents"("status", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_number_key" ON "document_versions"("document_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_document_version_id_key" ON "stored_files"("document_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_storage_key_key" ON "stored_files"("storage_key");

-- CreateIndex
CREATE INDEX "stored_files_agenda_proposal_id_idx" ON "stored_files"("agenda_proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_minutes_meeting_id_key" ON "meeting_minutes"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_minutes_reference_key" ON "meeting_minutes"("reference");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_archived_by_account_id_fkey" FOREIGN KEY ("archived_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_author_account_id_fkey" FOREIGN KEY ("author_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_agenda_proposal_id_fkey" FOREIGN KEY ("agenda_proposal_id") REFERENCES "agenda_proposals"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_secretary_account_id_fkey" FOREIGN KEY ("secretary_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_signed_by_account_id_fkey" FOREIGN KEY ("signed_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_archived_by_account_id_fkey" FOREIGN KEY ("archived_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "documents"
    ADD CONSTRAINT "documents_archive_status_check" CHECK (("status" = 'ARCHIVED') = ("archived_at" IS NOT NULL));

ALTER TABLE "document_versions"
    ADD CONSTRAINT "document_versions_number_check" CHECK ("number" > 0),
    ADD CONSTRAINT "document_versions_author_required_check" CHECK ("is_historical" OR "author_account_id" IS NOT NULL);

ALTER TABLE "stored_files"
    ADD CONSTRAINT "stored_files_size_check" CHECK ("size_bytes" BETWEEN 0 AND 10485760),
    ADD CONSTRAINT "stored_files_owner_check" CHECK (("agenda_proposal_id" IS NOT NULL) <> ("document_version_id" IS NOT NULL));

ALTER TABLE "meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_archive_status_check" CHECK (("status" = 'ARCHIVED') = ("archived_at" IS NOT NULL)),
    ADD CONSTRAINT "meeting_minutes_version_check" CHECK ("version" > 0),
    ADD CONSTRAINT "meeting_minutes_snapshot_pair_check" CHECK (("snapshot_version" IS NULL) = ("official_snapshot" IS NULL)),
    ADD CONSTRAINT "meeting_minutes_snapshot_version_check" CHECK ("snapshot_version" > 0),
    ADD CONSTRAINT "meeting_minutes_snapshot_required_check" CHECK (
        "status" NOT IN ('TO_SIGN', 'SIGNED', 'ARCHIVED') OR "official_snapshot" IS NOT NULL
    );

COMMIT;
