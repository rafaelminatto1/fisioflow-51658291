-- 0115_evidence_gateway.down.sql
DROP POLICY IF EXISTS evidence_links_org_isolation ON evidence_links;
DROP TABLE IF EXISTS evidence_links;
DROP TABLE IF EXISTS evidence_articles;
