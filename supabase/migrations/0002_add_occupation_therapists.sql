ALTER TABLE "patients" ADD COLUMN "pt_therapist_id" uuid REFERENCES "staffs"("id");
ALTER TABLE "patients" ADD COLUMN "ot_therapist_id" uuid REFERENCES "staffs"("id");
ALTER TABLE "patients" ADD COLUMN "st_therapist_id" uuid REFERENCES "staffs"("id");
