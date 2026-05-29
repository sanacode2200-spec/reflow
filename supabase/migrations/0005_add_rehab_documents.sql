CREATE TYPE "public"."rehab_doc_type" AS ENUM('comprehensive_plan');--> statement-breakpoint
CREATE TABLE "rehab_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"document_type" "rehab_doc_type" DEFAULT 'comprehensive_plan' NOT NULL,
	"document_date" date NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"content" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rehab_documents" ADD CONSTRAINT "rehab_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehab_documents" ADD CONSTRAINT "rehab_documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehab_documents" ADD CONSTRAINT "rehab_documents_created_by_staffs_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staffs"("id") ON DELETE no action ON UPDATE no action;
