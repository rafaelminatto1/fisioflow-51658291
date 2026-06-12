-- Down migration for 0071_patient_media
DROP TABLE IF EXISTS patient_photos CASCADE;
DROP TABLE IF EXISTS patient_videos CASCADE;
DROP TABLE IF EXISTS medical_requests CASCADE;
