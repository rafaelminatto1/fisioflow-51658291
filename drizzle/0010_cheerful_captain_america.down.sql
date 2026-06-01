DROP INDEX IF EXISTS "idx_appointments_org_patient";
DROP INDEX IF EXISTS "idx_patient_pathologies_org_patient";
DROP INDEX IF EXISTS "idx_contas_financeiras_org_patient";
DROP INDEX IF EXISTS "idx_patients_org_status";
DROP INDEX IF EXISTS "idx_patients_org_active";
DROP INDEX IF EXISTS "idx_media_gallery_type";
DROP INDEX IF EXISTS "idx_media_gallery_folder";
DROP INDEX IF EXISTS "idx_media_gallery_org_id";
DROP INDEX IF EXISTS "idx_exercise_media_order";
DROP INDEX IF EXISTS "idx_exercise_media_exercise_id";

DROP POLICY IF EXISTS "policy_patient_pathologies_isolation" ON "patient_pathologies";
ALTER TABLE "patient_pathologies" DISABLE ROW LEVEL SECURITY;

ALTER TABLE "media_gallery" DROP CONSTRAINT IF EXISTS "media_gallery_organization_id_organizations_id_fk";
ALTER TABLE "exercise_media_attachments" DROP CONSTRAINT IF EXISTS "exercise_media_attachments_media_id_media_gallery_id_fk";
ALTER TABLE "exercise_media_attachments" DROP CONSTRAINT IF EXISTS "exercise_media_attachments_exercise_id_exercises_id_fk";

DROP TABLE IF EXISTS "media_gallery";
DROP TABLE IF EXISTS "exercise_media_attachments";

DROP TYPE IF EXISTS "public"."media_type";