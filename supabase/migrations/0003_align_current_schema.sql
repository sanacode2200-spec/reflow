CREATE TYPE "public"."facility_grade" AS ENUM('grade_1', 'grade_2', 'grade_3');--> statement-breakpoint
ALTER TYPE "public"."onset_date_type" RENAME TO "onset_type";--> statement-breakpoint
ALTER TABLE "patients" RENAME COLUMN "name" TO "name_kanji";--> statement-breakpoint
ALTER TABLE "patients" RENAME COLUMN "diagnosis" TO "main_diagnosis";--> statement-breakpoint
ALTER TABLE "patients" RENAME COLUMN "onset_date_type" TO "onset_type";--> statement-breakpoint
ALTER TABLE "patients" RENAME COLUMN "is_care_insured" TO "is_nursing_care";--> statement-breakpoint
ALTER TABLE "patients" RENAME COLUMN "notes" TO "medical_history";--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "soap_note" TO "notes";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "disease_category" SET DATA TYPE text;--> statement-breakpoint
UPDATE "patients" SET "disease_category" = 'cardiovascular' WHERE "disease_category" = 'cardiac';--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "disease_category" SET DEFAULT 'musculoskeletal'::text;--> statement-breakpoint
DROP TYPE "public"."disease_category";--> statement-breakpoint
CREATE TYPE "public"."disease_category" AS ENUM('cerebrovascular', 'musculoskeletal', 'disuse_syndrome', 'cardiovascular', 'respiratory');--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "disease_category" SET DEFAULT 'musculoskeletal'::"public"."disease_category";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "disease_category" SET DATA TYPE "public"."disease_category" USING "disease_category"::"public"."disease_category";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "insurance_type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "patients" SET "insurance_type" = 'auto_liability' WHERE "insurance_type" = 'auto';--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "insurance_type" SET DEFAULT 'medical'::text;--> statement-breakpoint
DROP TYPE "public"."insurance_type";--> statement-breakpoint
CREATE TYPE "public"."insurance_type" AS ENUM('medical', 'workers_comp', 'auto_liability');--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "insurance_type" SET DEFAULT 'medical'::"public"."insurance_type";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "insurance_type" SET DATA TYPE "public"."insurance_type" USING "insurance_type"::"public"."insurance_type";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "onset_type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "patients" SET "onset_type" = 'acute_exacerbation' WHERE "onset_type" = 'exacerbation';--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "onset_type" SET DEFAULT 'onset'::text;--> statement-breakpoint
DROP TYPE "public"."onset_type";--> statement-breakpoint
CREATE TYPE "public"."onset_type" AS ENUM('onset', 'surgery', 'acute_exacerbation');--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "onset_type" SET DEFAULT 'onset'::"public"."onset_type";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "onset_type" SET DATA TYPE "public"."onset_type" USING "onset_type"::"public"."onset_type";--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "therapist_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "staffs" ADD COLUMN "staff_code" text;--> statement-breakpoint
ALTER TABLE "staffs" ADD COLUMN "icon" text DEFAULT 'zap' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "facility_grade" "facility_grade" DEFAULT 'grade_2' NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "comment" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "is_cancelled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "session_date" date;--> statement-breakpoint
UPDATE "sessions"
SET "session_date" = COALESCE("schedules"."start_at"::date, "sessions"."created_at"::date)
FROM "schedules"
WHERE "sessions"."schedule_id" = "schedules"."id";--> statement-breakpoint
UPDATE "sessions" SET "session_date" = "created_at"::date WHERE "session_date" IS NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "session_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "soap_subjective" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "soap_objective" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "soap_assessment" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "soap_plan" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "actual_start_time" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "actual_end_time" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "additions" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "started_at";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "ended_at";
