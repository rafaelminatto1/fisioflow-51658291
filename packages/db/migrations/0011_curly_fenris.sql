DROP INDEX "idx_appointments_patient_id";--> statement-breakpoint
DROP INDEX "idx_appointments_therapist_date";--> statement-breakpoint
DROP INDEX "idx_appointments_status";--> statement-breakpoint
DROP INDEX "idx_appointments_room_id";--> statement-breakpoint
DROP INDEX "idx_patients_profile_id";--> statement-breakpoint
DROP INDEX "idx_patients_user_id";--> statement-breakpoint
DROP INDEX "idx_patients_is_active";--> statement-breakpoint
DROP INDEX "idx_patients_full_name";--> statement-breakpoint
CREATE INDEX "idx_appointments_org_therapist_date" ON "appointments" USING btree ("organization_id","therapist_id","date");--> statement-breakpoint
CREATE INDEX "idx_appointments_org_status" ON "appointments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_appointments_org_room" ON "appointments" USING btree ("organization_id","room_id");--> statement-breakpoint
CREATE INDEX "idx_patients_org_profile" ON "patients" USING btree ("organization_id","profile_id");--> statement-breakpoint
CREATE INDEX "idx_patients_org_user" ON "patients" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_patients_org_full_name" ON "patients" USING btree ("organization_id","full_name");