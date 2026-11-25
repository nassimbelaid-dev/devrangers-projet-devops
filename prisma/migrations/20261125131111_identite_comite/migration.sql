BEGIN;

-- Required for equality operators over UUIDs and enums in the GiST exclusions.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('ADMIN', 'PRESIDENT', 'SECRETARY', 'ARCHIVIST', 'MEMBER');

-- CreateEnum
CREATE TYPE "MandateFunction" AS ENUM ('PRESIDENT', 'SECRETARY', 'MEMBER', 'ARCHIVIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "MandateKind" AS ENUM ('TITULAR', 'SUBSTITUTE');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AccountRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "member_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_profiles" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "contact_email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "department" TEXT,
    "bio" TEXT,

    CONSTRAINT "account_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandates" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "function" "MandateFunction" NOT NULL,
    "kind" "MandateKind" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,

    CONSTRAINT "mandates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_member_id_key" ON "accounts"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_profiles_account_id_key" ON "account_profiles"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "seats_label_key" ON "seats"("label");

-- CreateIndex
CREATE INDEX "mandates_seat_id_start_date_idx" ON "mandates"("seat_id", "start_date");

-- CreateIndex
CREATE INDEX "mandates_member_id_start_date_idx" ON "mandates"("member_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "mandates_id_member_id_key" ON "mandates"("id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "mandates_id_seat_id_key" ON "mandates"("id", "seat_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "account_profiles" ADD CONSTRAINT "account_profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "mandates" ADD CONSTRAINT "mandates_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "mandates" ADD CONSTRAINT "mandates_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "accounts"
    ADD CONSTRAINT "accounts_email_canonical_check" CHECK ("email" <> '' AND "email" = lower(btrim("email"))),
    ADD CONSTRAINT "accounts_member_required_check" CHECK ("role" = 'ADMIN' OR "member_id" IS NOT NULL);

ALTER TABLE "members"
    ADD CONSTRAINT "members_email_canonical_check" CHECK ("email" <> '' AND "email" = lower(btrim("email")));

ALTER TABLE "mandates"
    ADD CONSTRAINT "mandates_date_order_check" CHECK ("start_date" <= "end_date");

ALTER TABLE "mandates"
    ADD CONSTRAINT "mandates_seat_kind_no_overlap"
    EXCLUDE USING gist ("seat_id" WITH =, "kind" WITH =, daterange("start_date", "end_date", '[]') WITH &&);

ALTER TABLE "mandates"
    ADD CONSTRAINT "mandates_member_no_overlap"
    EXCLUDE USING gist ("member_id" WITH =, daterange("start_date", "end_date", '[]') WITH &&);

ALTER TABLE "mandates"
    ADD CONSTRAINT "mandates_function_no_overlap"
    EXCLUDE USING gist ("function" WITH =, daterange("start_date", "end_date", '[]') WITH &&)
    WHERE ("function" IN ('PRESIDENT', 'SECRETARY', 'ARCHIVIST'));

COMMIT;
