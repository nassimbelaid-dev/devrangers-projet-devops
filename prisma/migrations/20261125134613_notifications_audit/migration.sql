BEGIN;

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('convocation', 'reunion-modifiee', 'reunion-annulee', 'rappel-reunion', 'proposition-agenda', 'revue-agenda', 'echeance-action', 'action-attribuee', 'action-reattribuee', 'action-echeance-modifiee', 'rappel-action', 'action-en-retard', 'avis-decision', 'pv-signature', 'pv-correction', 'pv-signe', 'pv-archives');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('meetings', 'agenda', 'decisions', 'actions', 'minutes');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('normale', 'importante');

-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('meeting', 'agenda', 'decision', 'action', 'ballot', 'minutes');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_account_id" UUID NOT NULL,
    "sender_account_id" UUID,
    "sender_name" TEXT,
    "kind" "NotificationKind" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'normale',
    "title" TEXT NOT NULL,
    "preview" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "title_key" TEXT,
    "message_key" TEXT,
    "template_values" JSONB,
    "dedupe_key" TEXT,
    "target_type" "NotificationTargetType",
    "target_id" UUID,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_account_id" UUID,
    "operation" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "details" JSONB,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_recipient_account_id_created_at_idx" ON "notifications"("recipient_account_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_account_id_archived_at_read_at_idx" ON "notifications"("recipient_account_id", "archived_at", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_recipient_account_id_dedupe_key_key" ON "notifications"("recipient_account_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_occurred_at_idx" ON "audit_events"("entity_type", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_account_id_occurred_at_idx" ON "audit_events"("actor_account_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_account_id_fkey" FOREIGN KEY ("recipient_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_account_id_fkey" FOREIGN KEY ("sender_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_target_pair_check" CHECK (("target_type" IS NULL) = ("target_id" IS NULL));

COMMIT;
