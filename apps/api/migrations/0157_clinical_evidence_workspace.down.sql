-- Rollback destrutivo somente para ambientes sem dados que precisem ser preservados.
DROP TABLE IF EXISTS evidence_comparison_items;
DROP TABLE IF EXISTS evidence_comparisons;
DROP TABLE IF EXISTS evidence_reviews;
DROP TABLE IF EXISTS evidence_collection_items;
DROP TABLE IF EXISTS evidence_collections;
DROP TABLE IF EXISTS organization_evidence;
DROP TABLE IF EXISTS evidence_resources;
