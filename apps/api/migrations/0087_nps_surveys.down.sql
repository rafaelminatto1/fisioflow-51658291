BEGIN;
DROP TRIGGER IF EXISTS trg_nps_on_response ON nps_surveys;
DROP TRIGGER IF EXISTS trg_nps_surveys_touch ON nps_surveys;
DROP FUNCTION IF EXISTS nps_on_response();
DROP FUNCTION IF EXISTS nps_surveys_touch();
DROP TABLE IF EXISTS nps_surveys;
COMMIT;
