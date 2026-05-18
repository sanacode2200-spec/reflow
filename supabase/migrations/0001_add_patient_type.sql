CREATE TYPE "public"."patient_type" AS ENUM('inpatient', 'outpatient');--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "patient_type" "patient_type" DEFAULT 'outpatient' NOT NULL;
